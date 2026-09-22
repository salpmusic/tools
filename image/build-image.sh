#!/usr/bin/env bash
set -Eeuo pipefail

WORKDIR="${1:-${RUNNER_TEMP:-/tmp}/salp-build}"
OUTPUT="${2:-${GITHUB_WORKSPACE:-$PWD}/salp-browser.ext2}"
IMAGE_SIZE="${IMAGE_SIZE:-800M}"
REPO_ROOT="${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ADDITION="$REPO_ROOT/image/Dockerfile.addition.txt"
UPSTREAM="${UPSTREAM_REPO:-https://github.com/leaningtech/alpine-image.git}"
IMAGE_TAG="salp-linux-browser:v1.10.11"
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

log "Append salp browser layer"
printf '\n' >> Dockerfile
cat "$ADDITION" >> Dockerfile

tail -n 120 Dockerfile

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

log "Measure root filesystem before creating ext2"
rootfs_mb="$(du -sm "$rootfs" | awk '{print $1}')"
log "Root filesystem payload: ${rootfs_mb} MiB"
# Keep enough free space for ext2 metadata and runtime writes. If this fails,
# slim packages instead of silently growing beyond the Pages-friendly target.
if [[ "$IMAGE_SIZE" =~ ^([0-9]+)M$ ]]; then
  image_mb="${BASH_REMATCH[1]}"
  if (( rootfs_mb + 80 > image_mb )); then
    fail "Root filesystem (${rootfs_mb} MiB) is too large for ${IMAGE_SIZE}; prune packages or choose a Pages-safe size below 1GB"
  fi
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
