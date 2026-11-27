#!/usr/bin/env python3
"""Composites random dragon combinations into a contact sheet for eyeballing alignment.

  python3 tools/art-sheet.py [--seed 7] [--out shots/dev-sheet.png] [--cols 4] [--rows 3]
"""
import argparse
import os
import random
from PIL import Image, ImageDraw

SRC = "build/parts-png"
LAYERS = ["bg", "wings", "body", "eyes", "head", "acc"]
CELL = 256


def index():
    out = {l: [] for l in LAYERS}
    for name in sorted(os.listdir(SRC)):
        if name.endswith(".png"):
            layer, pid = name[:-4].split("__", 1)
            out[layer].append(pid)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default="shots/dev-sheet.png")
    ap.add_argument("--cols", type=int, default=4)
    ap.add_argument("--rows", type=int, default=3)
    args = ap.parse_args()

    idx = index()
    rnd = random.Random(args.seed)
    n = args.cols * args.rows
    sheet = Image.new("RGBA", (args.cols * CELL, args.rows * (CELL + 20)), (10, 6, 20, 255))
    draw = ImageDraw.Draw(sheet)
    picks = []
    for i in range(n):
        combo = {l: rnd.choice(idx[l]) for l in LAYERS}
        picks.append(combo)
        base = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        for l in LAYERS:
            im = Image.open(os.path.join(SRC, f"{l}__{combo[l]}.png")).convert("RGBA")
            base.alpha_composite(im)
        base = base.resize((CELL, CELL), Image.LANCZOS)
        x = (i % args.cols) * CELL
        y = (i // args.cols) * (CELL + 20)
        sheet.paste(base, (x, y), base)
        label = " ".join(f"{l[:2]}:{combo[l]}" for l in LAYERS)
        draw.text((x + 4, y + CELL + 4), label[:48], fill=(200, 190, 230))
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    sheet.convert("RGB").save(args.out, quality=92)
    print(f"wrote {args.out}  ({args.cols}x{args.rows} combos, seed {args.seed})")


if __name__ == "__main__":
    main()
