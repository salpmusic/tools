#!/usr/bin/env bash
set -Eeuo pipefail

WORKDIR="${1:-${RUNNER_TEMP:-/tmp}/salp-build}"
OUTPUT="${2:-${GITHUB_WORKSPACE:-$PWD}/salp-browser.ext2}"
IMAGE_SIZE="${IMAGE_SIZE:-800M}"
REPO_ROOT="${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ADDITION="$REPO_ROOT/image/Dockerfile.addition.txt"
UPSTREAM="${UPSTREAM_REPO:-https://github.com/leaningtech/alpine-image.git}"
IMAGE_TAG="salp-linux-browser:v1.10.11"
# Soft Pages budget: refuse to mkfs if used rootfs is clearly too large for IMAGE_SIZE=800M.
MAX_ROOTFS_MB="${MAX_ROOTFS_MB:-780}"
container=""
rootfs=""

log() { printf '\n[ salp-build ] %s\n' "$*"; }
fail() { printf '\n[ salp-build ERROR ] %s\n' "$*" >&2; exit 1; }

cleanup() {
  if [[ -n "$container" ]]; then
    buildah umount "$container" >/dev/null 2>&1 || true
    buildah rm "$container" >/dev/null 2>&1 || true
  fi
  buildah rmi "$IMAGE_TAG" >/dev/null 2>&1 || true
}
trap cleanup EXIT

[[ -f "$ADDITION" ]] || fail "Missing $ADDITION"
[[ "$IMAGE_SIZE" =~ ^[0-9]+[MG]$ ]] || fail "IMAGE_SIZE must look like 800M or 1G"

rm -rf "$WORKDIR"
mkdir -p "$WORKDIR" "$(dirname "$OUTPUT")"

log "Clone WebVM Alpine image source"
git clone --depth 1 "$UPSTREAM" "$WORKDIR/source"
cd "$WORKDIR/source"
[[ -f Dockerfile ]] || fail "Upstream Dockerfile was not found"

log "Slim upstream Dockerfile (drop fat GUI/devtools; keep xterm+pcmanfm)"
# Drop edge/testing — we will not install sgt-puzzles@testing.
sed -i '/@testing https:\/\/dl-cdn.alpinelinux.org\/alpine\/edge\/testing/d' Dockerfile || true

# terminal apps: bash already present in base; skip vim/python3/nodejs/gcc/nano/openssh
if grep -qE '^RUN apk add vim python3 nodejs gcc nano openssh' Dockerfile; then
  sed -i 's/^RUN apk add vim python3 nodejs gcc nano openssh.*/RUN true  # slim: skip vim python3 nodejs gcc nano openssh/' Dockerfile
fi

# gui apps: only xterm + pcmanfm
if grep -qE '^RUN apk add .*xterm.*pcmanfm' Dockerfile; then
  sed -i 's/^RUN apk add .*xterm.*pcmanfm.*/RUN apk add xterm pcmanfm/' Dockerfile
fi

# Remove sgt-puzzles desktop fix (package no longer installed)
sed -i '/sgt-\*\.desktop/d' Dockerfile || true
sed -i '/the sgt-puzzles package has broken desktop files/d' Dockerfile || true

# Skip xpdf-only moves (package no longer installed); keep .Xresources move
sed -i 's|^RUN mv /home/user/\.config/\.xpdfrc /home/user/.*|RUN true  # slim: skip .xpdfrc (xpdf not installed)|' Dockerfile
sed -i 's|^RUN mv /home/user/\.config/xpdf\.desktop /usr/share/applications/.*|RUN true  # slim: skip xpdf.desktop (xpdf not installed)|' Dockerfile

log "Append salp browser layer"
printf '\n' >> Dockerfile
cat "$ADDITION" >> Dockerfile

log "Effective Dockerfile (tail)"
tail -n 160 Dockerfile

log "Build i386 container image"
buildah bud \
  --platform linux/386 \
  --format docker \
  --layers=false \
  -t "$IMAGE_TAG" .

log "Mount built root filesystem"
container="$(buildah from --platform linux/386 "$IMAGE_TAG")"
rootfs="$(buildah mount "$container")"
[[ -d "$rootfs" ]] || fail "Could not mount the built root filesystem"

log "Validate browser files before creating ext2"
[[ -x "$rootfs/usr/local/bin/salp-browser" ]] || fail "salp-browser launcher is missing"
[[ -f "$rootfs/etc/salp-release" ]] || fail "/etc/salp-release is missing"
if [[ ! -x "$rootfs/usr/bin/firefox-esr" && ! -x "$rootfs/usr/bin/firefox" ]]; then
  fail "Firefox ESR binary is missing from the built root filesystem"
fi
if ! find "$rootfs/usr/bin" "$rootfs/usr/local/bin" -maxdepth 1 -type f \
  \( -name 'netsurf' -o -name 'netsurf-gtk' -o -name 'netsurf-gtk3' \) \
  -print -quit | grep -q .; then
  fail "NetSurf fallback binary is missing from the built root filesystem"
fi

[[ -x "$rootfs/usr/bin/xterm" ]] || fail "xterm is missing from the built root filesystem"
[[ -x "$rootfs/usr/bin/pcmanfm" ]] || fail "PCManFM is missing from the built root filesystem"
[[ -x "$rootfs/usr/local/bin/salp-terminal" ]] || fail "salp-terminal launcher is missing"
[[ -x "$rootfs/usr/local/bin/salp-files" ]] || fail "salp-files launcher is missing"
[[ -x "$rootfs/usr/local/bin/salp-gui-start" ]] || fail "salp-gui-start launcher is missing"
[[ -x "$rootfs/usr/local/bin/salp-session" ]] || fail "salp-session launcher is missing"

log "Aggressive rootfs cleanup before mkfs"
rm -rf \
  "$rootfs/var/cache/apk/"* \
  "$rootfs/usr/share/man" \
  "$rootfs/usr/share/doc" \
  "$rootfs/usr/share/info" \
  "$rootfs/tmp/"* \
  "$rootfs/var/tmp/"* \
  "$rootfs/root/.cache" \
  "$rootfs/home/user/.cache" \
  2>/dev/null || true
find "$rootfs/var/cache" -mindepth 1 -maxdepth 2 -type f -delete 2>/dev/null || true
find "$rootfs/usr/share/locale" -mindepth 1 -maxdepth 1 ! -name 'en*' ! -name 'C' -exec rm -rf {} + 2>/dev/null || true

used_kb="$(du -sk "$rootfs" | awk '{print $1}')"
used_mb=$(( used_kb / 1024 ))
log "Rootfs used size after cleanup: ${used_mb}M ($(du -sh "$rootfs" | awk '{print $1}'))"
if (( used_mb > MAX_ROOTFS_MB )); then
  fail "Rootfs used size ${used_mb}M exceeds ${MAX_ROOTFS_MB}M budget for IMAGE_SIZE=${IMAGE_SIZE}. Slim further or raise MAX_ROOTFS_MB carefully (Pages soft limit ~800M)."
fi

log "Create ext2 image ($IMAGE_SIZE)"
rm -f "$OUTPUT" "$OUTPUT.sha256" "$OUTPUT.manifest.txt"
truncate -s "$IMAGE_SIZE" "$OUTPUT"
mkfs.ext2 -F -b 4096 -L SALP_LINUX -d "$rootfs" "$OUTPUT"

log "Check ext2 image"
set +e
e2fsck -fn "$OUTPUT"
status=$?
set -e
if (( status > 1 )); then
  fail "e2fsck failed with status $status"
fi

sha256sum "$OUTPUT" > "$OUTPUT.sha256"
{
  echo 'salp Linux v1.10.11 Firefox Browser Image'
  echo "built_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "image_size=$IMAGE_SIZE"
  echo "rootfs_used_mb=$used_mb"
  echo 'architecture=i386'
  echo 'browser=firefox-esr'
  echo 'fallback=netsurf'
  echo 'terminal=xterm'
  echo 'file_manager=pcmanfm'
  echo 'gui_launcher=salp-gui-start'
  echo "upstream=$UPSTREAM"
  echo
  cat "$rootfs/etc/salp-release"
} > "$OUTPUT.manifest.txt"

ls -lh "$OUTPUT" "$OUTPUT.sha256" "$OUTPUT.manifest.txt"
log "Build completed: $OUTPUT"
