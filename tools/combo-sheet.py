#!/usr/bin/env python3
"""Composite named dragon combinations into one contact sheet for visual review.

  python3 tools/combo-sheet.py --out shots/combo-sheet.png --cell 300
"""
import argparse
import os
from PIL import Image, ImageDraw

SRC = "build/parts-png"
LAYERS = ["bg", "wings", "body", "eyes", "head", "acc"]

COMBOS = [
    # the exact combination from the user's screenshot (fire / magma / sunset wings)
    dict(name="user-shot", bg="magma", wings="solar", body="magma", eyes="ember-glow", head="angel-halo", acc="moon-pendant"),
    # fire family
    dict(name="fire-ember", bg="ember", wings="ember", body="furnace", eyes="fierce", head="ember-horns", acc="ember-pendant"),
    dict(name="fire-magma2", bg="ember", wings="bat", body="magma", eyes="dragon-slits", head="rainbow-halo", acc="gold-medallion"),
    # ice
    dict(name="ice-frost", bg="glacier", wings="ice-crystal", body="frost", eyes="icy-blue", head="frost-crown", acc="ice-necklace"),
    dict(name="ice-perma", bg="snowfall", wings="aurora-veil", body="permafrost", eyes="star-struck", head="bubble-crown", acc="moon-pendant"),
    # diamond / obsidian
    dict(name="diamond", bg="prism", wings="diamond-prism", body="faceted-diamond", eyes="galaxy", head="diamond-tiara", acc="diamond-core"),
    dict(name="obsidian", bg="nebula", wings="cosmic-galaxy", body="obsidian-neon", eyes="void-eyes", head="cosmic-antlers", acc="hologram-crest"),
    # gold / royal cape
    dict(name="gold-cape", bg="temple", wings="angelic-gold", body="gold24", eyes="golden-laser", head="golden-crown", acc="royal-cape"),
    # beanie / horns
    dict(name="beanie", bg="mint", wings="stubby", body="spotted", eyes="wink", head="beanie", acc="polka-scarf"),
    dict(name="horns", bg="forest", wings="leaf", body="mossy", eyes="gentle", head="small-horns", acc="leaf-scarf"),
    dict(name="horns2", bg="storm", wings="thunder-arc", body="storm-slate", eyes="electric-spark", head="storm-horns", acc="thunder-chain"),
    # extras
    dict(name="emerald", bg="emerald-grove", wings="petal", body="emerald", eyes="rainbow-awakened", head="flower-crown", acc="acorn-charm"),
    dict(name="aurora", bg="hexgrid", wings="bubble", body="aurora-prism", eyes="sleepy", head="leaf-sprout", acc="aurora-sash"),
    dict(name="plasma", bg="prism", wings="mecha", body="violet-plasma", eyes="sunglasses", head="lightning-crest", acc="silk-ribbon"),
    dict(name="ivory", bg="sakura", wings="angelic-gold", body="ivory", eyes="gentle", head="rainbow-halo", acc="silk-ribbon"),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="shots/combo-sheet.png")
    ap.add_argument("--cell", type=int, default=300)
    ap.add_argument("--cols", type=int, default=4)
    args = ap.parse_args()
    cols = args.cols
    rows = (len(COMBOS) + cols - 1) // cols
    c = args.cell
    sheet = Image.new("RGB", (cols * c, rows * (c + 16)), (8, 5, 16))
    d = ImageDraw.Draw(sheet)
    for i, combo in enumerate(COMBOS):
        base = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
        for l in LAYERS:
            path = os.path.join(SRC, f"{l}__{combo[l]}.png")
            base.alpha_composite(Image.open(path).convert("RGBA"))
        im = base.convert("RGB").resize((c, c), Image.LANCZOS)
        x = (i % cols) * c
        y = (i // cols) * (c + 16)
        sheet.paste(im, (x, y))
        d.text((x + 4, y + c + 2), combo["name"], fill=(210, 200, 240))
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    sheet.save(args.out)
    print("wrote", args.out)


if __name__ == "__main__":
    main()
