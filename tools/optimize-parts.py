#!/usr/bin/env python3
"""build/parts-png/<layer>__<id>.png → public/parts/<layer>/<id>.webp (512px, quality 88)."""
import os
from PIL import Image

SRC = "build/parts-png"
DST = "public/parts"
# Small variants used to bake gallery thumbnails without decoding 512px layers.
THUMB = 192


def main():
    total_before = total_after = 0
    for name in sorted(os.listdir(SRC)):
        if not name.endswith(".png"):
            continue
        layer, pid = name[:-4].split("__", 1)
        out_dir = os.path.join(DST, layer)
        os.makedirs(out_dir, exist_ok=True)
        src = os.path.join(SRC, name)
        im = Image.open(src).convert("RGBA")
        if im.size != (512, 512):
            im = im.resize((512, 512), Image.LANCZOS)
        out = os.path.join(out_dir, pid + ".webp")
        im.save(out, "WEBP", quality=88, method=6, exact=True)
        tdir = os.path.join(DST, "thumb", layer)
        os.makedirs(tdir, exist_ok=True)
        small = im.resize((THUMB, THUMB), Image.LANCZOS)
        small.save(os.path.join(tdir, pid + ".webp"), "WEBP", quality=80, method=6, exact=True)
        total_before += os.path.getsize(src)
        total_after += os.path.getsize(out)
    print(
        f"webp: {total_before/1024:.0f}KB png → {total_after/1024:.0f}KB webp "
        f"({100*total_after/max(1,total_before):.0f}%)"
    )


if __name__ == "__main__":
    main()
