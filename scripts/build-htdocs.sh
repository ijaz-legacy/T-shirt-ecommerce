#!/usr/bin/env bash
# Assemble the folder you upload to InfinityFree's htdocs.
#
# Copies the product photography and sticker artwork out of public/images into
# htdocs/images so the PHP store serves them as plain static files.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUBLIC="$ROOT/public/images"
OUT="$ROOT/htdocs/images"

mkdir -p "$OUT/products" "$OUT/stickers"

if [ -d "$PUBLIC/products" ]; then
  find "$PUBLIC/products" -maxdepth 1 -type f \( -name '*.webp' -o -name '*.jpg' -o -name '*.png' \) \
    -exec cp -f {} "$OUT/products/" \;
fi

if [ -d "$PUBLIC/products/new images" ]; then
  find "$PUBLIC/products/new images" -maxdepth 1 -type f -name '*.png' \
    -exec cp -f {} "$OUT/stickers/" \;
fi

# Rename the sticker files so their names are readable, e.g.
# "pngwing.com (3).png" -> "sticker-3.png"
if [ -d "$OUT/stickers" ]; then
  i=0
  for f in "$OUT"/stickers/pngwing.com*.png; do
    [ -e "$f" ] || continue
    i=$((i + 1))
    mv -f "$f" "$OUT/stickers/sticker-$i.png"
  done
  for f in "$OUT"/stickers/*Pngtree*.png; do
    [ -e "$f" ] || continue
    i=$((i + 1))
    mv -f "$f" "$OUT/stickers/sticker-$i.png"
  done
fi

[ -f "$PUBLIC/hero.webp" ] && cp -f "$PUBLIC/hero.webp" "$OUT/hero.webp"
[ -f "$PUBLIC/og.jpg" ] && cp -f "$PUBLIC/og.jpg" "$OUT/og.jpg"

printf 'htdocs/images is ready:\n'
printf '  products: %s files\n' "$(find "$OUT/products" -type f | wc -l | tr -d ' ')"
printf '  stickers: %s files\n' "$(find "$OUT/stickers" -type f | wc -l | tr -d ' ')"
echo
echo "Upload everything inside htdocs/ to your InfinityFree htdocs folder."
