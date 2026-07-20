#!/usr/bin/env bash
set -Eeuo pipefail

WORKDIR="${1:-${RUNNER_TEMP:-/tmp}/salp-build}"
OUTPUT="${2:-${GITHUB_WORKSPACE:-$PWD}/salp-browser.ext2}"
IMAGE_SIZE="${IMAGE_SIZE:-1400M}"
REPO_ROOT="${GITHUB_WORKSPACE:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
ADDITION="$REPO_ROOT/image/Dockerfile.addition.txt"
UPSTREAM="${UPSTREAM_REPO:-https://github.com/leaningtech/alpine-image.git}"

cleanup() {
  if [[ -n "${container:-}" ]]; then
    buildah umount "$container" >/dev/null 2>&1 || true
    buildah rm "$container" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

[[ -f "$ADDITION" ]] || { echo "Missing: $ADDITION" >&2; exit 1; }
rm -rf "$WORKDIR"
mkdir -p "$WORKDIR" "$(dirname "$OUTPUT")"

git clone --depth 1 "$UPSTREAM" "$WORKDIR/source"
cd "$WORKDIR/source"

# Dockerfile命令はCMDの後ろにRUNを追加しても有効。上流の構造に依存せず追記する。
printf '\n' >> Dockerfile
cat "$ADDITION" >> Dockerfile

echo '--- salp Dockerfile tail ---'
tail -n 80 Dockerfile

buildah bud --platform linux/386 --format docker -t salp-linux-browser:v1.5 .
container="$(buildah from salp-linux-browser:v1.5)"
rootfs="$(buildah mount "$container")"

rm -f "$OUTPUT" "$OUTPUT.sha256"
truncate -s "$IMAGE_SIZE" "$OUTPUT"
mkfs.ext2 -F -b 4096 -L SALP_LINUX -d "$rootfs" "$OUTPUT"
e2fsck -fn "$OUTPUT" || status=$?
if [[ "${status:-0}" -gt 1 ]]; then
  echo "e2fsck failed with status $status" >&2
  exit "$status"
fi
sha256sum "$OUTPUT" > "$OUTPUT.sha256"

ls -lh "$OUTPUT" "$OUTPUT.sha256"
echo "Built: $OUTPUT"
