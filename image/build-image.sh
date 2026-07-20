#!/usr/bin/env bash
set -euo pipefail

WORKDIR="${1:-$PWD/build}"
OUTPUT="${2:-$PWD/salp-browser.ext2}"
IMAGE_SIZE="${IMAGE_SIZE:-1400M}"
REPO_ROOT="${GITHUB_WORKSPACE:-$(cd "$(dirname "$0")/../.." && pwd)}"
ADDITION="$REPO_ROOT/tools/image/Dockerfile.addition.txt"

rm -rf "$WORKDIR"
mkdir -p "$WORKDIR"
cd "$WORKDIR"

git clone --depth 1 https://github.com/leaningtech/alpine-image.git source
cd source

if [ ! -f "$ADDITION" ]; then
  echo "Missing: $ADDITION" >&2
  exit 1
fi

python3 - "$ADDITION" <<'PY2'
from pathlib import Path
import sys
addition=Path(sys.argv[1]).read_text()
dockerfile=Path('Dockerfile')
text=dockerfile.read_text()
markers=['CMD [ "/bin/sh" ]', "CMD ["/bin/sh"]"]
for marker in markers:
    if marker in text:
        dockerfile.write_text(text.replace(marker, addition+'
'+marker))
        break
else:
    dockerfile.write_text(text+'
'+addition+'
')
PY2

buildah bud --platform linux/i386 -t salp-linux-browser .
container="$(buildah from salp-linux-browser)"
mountpoint="$(buildah mount "$container")"
trap 'buildah umount "$container" >/dev/null 2>&1 || true; buildah rm "$container" >/dev/null 2>&1 || true' EXIT
mkfs.ext2 -F -b 4096 -d "$mountpoint" "$OUTPUT" "$IMAGE_SIZE"
buildah umount "$container"
buildah rm "$container"
trap - EXIT
buildah rmi salp-linux-browser >/dev/null 2>&1 || true
sha256sum "$OUTPUT" > "$OUTPUT.sha256"
ls -lh "$OUTPUT" "$OUTPUT.sha256"
