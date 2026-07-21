#!/usr/bin/env bash
set -Eeuo pipefail

WORKDIR="${1:-${RUNNER_TEMP:-/tmp}/salp-build}"
OUTPUT="${2:-${GITHUB_WORKSPACE:-$PWD}/salp-browser.ext2}"
IMAGE_SIZE="${IMAGE_SIZE:-1600M}"
REPO_ROOT="${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ADDITION="$REPO_ROOT/image/Dockerfile.addition.txt"
UPSTREAM="${UPSTREAM_REPO:-https://github.com/leaningtech/alpine-image.git}"
IMAGE_TAG="salp-linux-browser:v1.9"
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
[[ "$IMAGE_SIZE" =~ ^[0-9]+[MG]$ ]] || fail "IMAGE_SIZE must look like 1600M or 2G"

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
if ! find "$rootfs/usr/bin" "$rootfs/usr/local/bin" -maxdepth 1 -type f \
  \( -name 'netsurf' -o -name 'netsurf-gtk' -o -name 'netsurf-gtk3' \) \
  -print -quit | grep -q .; then
  fail "NetSurf binary is missing from the built root filesystem"
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
  echo 'salp Linux v1.9 Browser Image'
  echo "built_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "image_size=$IMAGE_SIZE"
  echo 'architecture=i386'
  echo 'browser=netsurf'
  echo "upstream=$UPSTREAM"
  echo
  cat "$rootfs/etc/salp-release"
} > "$OUTPUT.manifest.txt"

ls -lh "$OUTPUT" "$OUTPUT.sha256" "$OUTPUT.manifest.txt"
log "Build completed: $OUTPUT"
