#!/usr/bin/env python3
"""Contact sheet of every part in a layer from build/parts-png (for auditing).

  python3 tools/audit-sheet.py --layer body --out shots/audit-body.png [--cell 200] [--bg 0a0616]
"""
import argparse
import os
from PIL import Image, ImageDraw

SRC = "build/parts-png"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--layer", default="body")
    ap.add_argument("--out", default=None)
    ap.add_argument("--cell", type=int, default=200)
    ap.add_argument("--cols", type=int, default=5)
    ap.add_argument("--bg", default="0a0616")
    ap.add_argument("--composite", default="")  # comma list of layer:part to underlay (e.g. bg:magma)
    args = ap.parse_args()

    ids = sorted(
        n[:-4].split("__", 1)[1] for n in os.listdir(SRC) if n.startswith(args.layer + "__") and n.endswith(".png")
    )
    base_under = []
    for item in filter(None, args.composite.split(",")):
        l, pid = item.split(":")
        base_under.append(os.path.join(SRC, f"{l}__{pid}.png"))

    cols = min(args.cols, len(ids))
    rows = (len(ids) + cols - 1) // cols
    c = args.cell
    sheet = Image.new("RGB", (cols * c, rows * (c + 18)), tuple(int(args.bg[i : i + 2], 16) for i in (0, 2, 4)))
    draw = ImageDraw.Draw(sheet)
    for i, pid in enumerate(ids):
        cell = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        for p in base_under:
            cell.alpha_composite(Image.open(p).convert("RGBA"))
        cell.alpha_composite(Image.open(os.path.join(SRC, f"{args.layer}__{pid}.png")).convert("RGBA"))
        cell = cell.resize((c, c), Image.LANCZOS)
        x = (i % cols) * c
        y = (i // cols) * (c + 18)
        sheet.paste(cell, (x, y), cell)
        draw.text((x + 3, y + c + 3), pid[:28], fill=(210, 200, 240))
    out = args.out or f"shots/audit-{args.layer}.png"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    sheet.save(out)
    print("wrote", out, len(ids), "parts")


if __name__ == "__main__":
    main()
