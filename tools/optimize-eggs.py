#!/usr/bin/env python3
"""assets-src/eggs/*.png (1254px 생성 원본) → src/assets/eggs/*.webp (512px, 모바일용)"""
import glob
import os
import shutil

from PIL import Image

SRC = "assets-src/eggs/*.png"
OUT = "src/assets/eggs"
SIZE = 512
QUALITY = 86

os.makedirs(OUT, exist_ok=True)
for path in sorted(glob.glob(SRC)):
    name = os.path.basename(path).replace(".png", "")
    im = Image.open(path).convert("RGB")
    im = im.resize((SIZE, SIZE), Image.LANCZOS)
    webp = os.path.join(OUT, f"{name}.webp")
    im.save(webp, "WEBP", quality=QUALITY, method=6)
    print(f"{webp:44s} {os.path.getsize(webp) / 1024:6.1f} KB")
