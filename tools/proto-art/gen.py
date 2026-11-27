#!/usr/bin/env python3
"""Generate the realistic dragon part matrix from the single master anchor.

Every variant is produced by `images --edit master/base.png` with a prompt that
pins pose / camera / framing / lighting and changes exactly one slot, so all
variants share the master's pixel coordinates.

    12 parts x 6 slots = 72 parts
    8 egg themes (white, spotted, forest, fire, ice, thunder, gold, diamond)
    + 4 cross-rarity designs (sandstone, pearl, tempest, opal)

    python3 gen.py                 # generate everything still missing
    python3 gen.py magma eyes      # generate one slot
    python3 gen.py -j 4            # parallel workers
    python3 gen.py --check         # re-measure existing variants only
"""
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
MASTER = f"{ROOT}/master/base.png"
OUT = f"{ROOT}/out/variants"
os.makedirs(OUT, exist_ok=True)

# The invariant part of every prompt: this is what keeps the pixels aligned.
KEEP = (
    "Keep the identical dragon pose, camera angle, crop, framing, silhouette, "
    "scale, light direction and the flat uniform neutral-grey background exactly "
    "as in the reference. Do not move, resize or re-draw the head, jaw, eye "
    "socket, horns, neck or chest. Change only the following: "
)
NOEXTRAS = (
    " Absolutely nothing else may change: no new armour plates, no chest piece, no rocks, "
    "no extra crystals, no new background elements, and the scales around the object keep "
    "exactly the same colour, texture and lighting as the reference."
)

# part id -> element / rarity / Korean name.  Slot text below is keyed by the
# same ids; the element decides the 80% affinity roll, the rarity the weight.
PARTS = {
    "ivory": ("white", "common", "상아빛 비늘"),
    "spotted": ("spotted", "common", "점박이 비늘"),
    "moss": ("forest", "common", "이끼 숲 비늘"),
    "sandstone": ("white", "common", "사암 비늘"),
    "magma": ("fire", "rare", "용암 흑요석"),
    "frost": ("ice", "rare", "빙하 서리"),
    "pearl": ("ice", "rare", "진주 비늘"),
    "storm": ("thunder", "epic", "뇌광 플라스마"),
    "gilded": ("gold", "epic", "24K 황금"),
    "tempest": ("thunder", "epic", "폭풍 강철"),
    "prism": ("diamond", "legendary", "다이아 크리스탈"),
    "opal": ("diamond", "legendary", "오팔 오로라"),
}

# Slot templates.  {x} is filled with the per-theme material sentence.
SLOT_TMPL = {
    "body": (
        "repaint the dragon's scales and armour plates as {x}. "
        "Skin material only - no jewellery, no extra horns, no crown ornament, "
        "the eyes stay empty dark sockets and the crest crest keeps its exact shape."
    ),
    "eyes": (
        "fill the existing empty eye socket with one fierce reptilian eye: {x}. "
        "Eye only - the rest of the head and body is untouched."
    ),
    "horns": (
        "grow one pair of swept-back dragon horns out of the crown of the skull, rising "
        "above and behind the head so they clearly stand free of the silhouette: {x}. "
        "Horns only - the skull scales, crest, eye socket and jaw stay untouched."
    ),
    "acc": (
        "add one heavy ceremonial collar around the base of the neck where the neck meets "
        "the shoulders, resting on the scales with a soft contact shadow: {x}. "
        "Accessory only - everything else untouched."
    ),
    "wings": (
        "grow huge dragon wings behind the neck and shoulders, spread wide behind the "
        "body: {x}. Wings behind the body only - the dragon itself is unchanged."
    ),
    "bg": (
        "replace only the flat grey background with {x}, key light from the upper left "
        "matching the dragon's own lighting and a dark vignette in the corners. "
        "The dragon itself is unchanged."
    ),
}

# --------------------------------------------------------------------- slot art
ART = {
    # ------------------------------------------------------------------ ivory
    "ivory": {
        "body": "warm ivory bone: overlapping pale cream plates like polished bone and "
        "antler, soft candle-lit highlights, dusty tan shadows in the crevices, faint "
        "hairline cracks",
        "eyes": "a warm amber iris with a vertical black slit pupil, honey-gold inner "
        "glow and a dark scaled eyelid",
        "horns": "horns of pale carved bone with fine growth ridges and cracked ivory tips",
        "acc": "a bone-and-bronze torque: a wide bronze band with carved bone beads, an "
        "ivory tusk pendant in the centre and a soft shadow under the metal",
        "wings": "leathery bone-white membrane wings on pale bone fingers, cream membrane "
        "with faint veining and a soft glow behind them",
        "bg": "a sunlit ivory temple hall: pale stone pillars, drifting dust motes and "
        "warm cream light",
    },
    # ---------------------------------------------------------------- spotted
    "spotted": {
        "body": "pale mint-turquoise hide covered in round darker teal rosette spots, "
        "each spot ringed by a bright rim, glossy smooth plates between them",
        "eyes": "a turquoise iris with darker spots inside it, a black slit pupil and a "
        "pale mint rim around the socket",
        "horns": "horns of mottled sea-glass with round dark teal spots inlaid along them "
        "and smooth polished tips",
        "acc": "a turquoise beaded necklace: strands of round mint beads, small shell "
        "charms and a polished teal cabochon at the centre",
        "wings": "membrane wings of pale mint skin scattered with round dark teal spots, "
        "translucent at the edges",
        "bg": "a mint-tinted misty lagoon: floating bubbles, round glowing spores drifting "
        "in the air and pale teal mist",
    },
    # ------------------------------------------------------------------- moss
    "moss": {
        "body": "deep forest green: bark-like layered scales with living moss in the "
        "crevices, small lichen patches and amber sap glinting in the joints",
        "eyes": "an emerald green iris with amber flecks and a black slit pupil, a rim of "
        "tiny moss fronds at the eyelid",
        "horns": "horns of dark driftwood growing like antlers, moss creeping along them "
        "and small glowing green leaves at the tips",
        "acc": "a woven vine collar: twisted living vines and roots with a large green "
        "amber pendant, small acorns and a leaf clasp",
        "wings": "wings of layered green leaves and moss over a dark bark frame, veins "
        "glowing faint green",
        "bg": "an ancient mossy forest: huge roots, shafts of golden light through the "
        "canopy, floating pollen and fireflies",
    },
    # -------------------------------------------------------------- sandstone
    "sandstone": {
        "body": "matte desert sandstone: layered ochre and rust rock plates like carved "
        "canyon stone, dry dusty surface, wind-worn edges and pale sand in the seams",
        "eyes": "a dusty copper-brown iris with a black slit pupil and a dry cracked "
        "eyelid rim",
        "horns": "horns of weathered layered sandstone, flat ochre strata and wind-carved "
        "tips",
        "acc": "a carved sandstone and copper collar: a wide band of incised desert stone "
        "with a copper clasp and a small sun disc",
        "wings": "wide desert membrane wings of tan hide stretched on sandstone-coloured "
        "fingers, dust drifting off the trailing edge",
        "bg": "an endless desert at dusk: rolling ochre dunes, distant mesa silhouettes, "
        "dust haze and a low warm sun",
    },
    # ------------------------------------------------------------------ magma
    "magma": {
        "body": "volcanic obsidian and magma: glossy black basalt armour plates with "
        "glowing orange-red molten fissures between them, ember light leaking from the "
        "cracks, hot rim light on the plate edges",
        "eyes": "a molten gold iris with a vertical black slit pupil, a hot white-orange "
        "glowing core and faint ember sparks at the eye corner",
        "horns": "horns of charred basalt with glowing magma seams running along them and "
        "ember-glowing ridged tips, ash-grey crust",
        "acc": "a molten-gold gorget: riveted dark iron and gold band, a large glowing "
        "ember ruby at its centre and hanging chain links",
        "wings": "bat-like wings of charred black skin over obsidian finger bones, glowing "
        "orange magma veins through the membrane and ember glow behind them",
        "bg": "a volcanic caldera: churning ash clouds, distant erupting peaks, glowing "
        "lava rivers and floating embers",
    },
    # ------------------------------------------------------------------ frost
    "frost": {
        "body": "glacial ice: pale blue-white translucent frost scales, rime crust in the "
        "crevices, icy blue subsurface glow and cold white rim light on the edges",
        "eyes": "a glowing icy cyan iris with a vertical black slit pupil, a frozen white "
        "core and frost crystals on the eyelid",
        "horns": "horns of translucent blue ice crystal, faceted like glacier shards, "
        "frost dust at the base and a cold inner glow",
        "acc": "an etched silver gorget: a wide silver band with an ice-crystal pendant, "
        "frozen chain links and blue crystal inlay",
        "wings": "wings of translucent pale blue ice crystal shards and frozen membrane, "
        "frosted edges and a cold glow behind them",
        "bg": "a frozen glacier valley: towering ice peaks, drifting snow and pale teal "
        "aurora ribbons",
    },
    # ------------------------------------------------------------------ pearl
    "pearl": {
        "body": "iridescent mother-of-pearl: smooth nacre plates with a pink and green "
        "sheen, soft pearl highlights and deep violet shadows in the seams",
        "eyes": "a pearlescent silver-pink iris with a black slit pupil, a soft rainbow "
        "sheen and a smooth nacre eyelid",
        "horns": "horns of nacre and pearl: smooth spiral horns with a pink-green "
        "iridescent sheen and a soft glow",
        "acc": "a pearl strand collar: three rows of large lustrous pearls with a silver "
        "clasp and a silver shell pendant",
        "wings": "wings of translucent pearlescent membrane with a rainbow sheen, white "
        "nacre finger bones and soft lavender glow",
        "bg": "a moonlit mother-of-pearl shore: pale shells, pearly mist and soft silver "
        "moonlight on calm water",
    },
    # ------------------------------------------------------------------ storm
    "storm": {
        "body": "dark storm slate: black-blue metal-hard plates with violet plasma "
        "fissures, arcs of purple lightning crawling between the scales and a cold "
        "electric rim",
        "eyes": "an electric violet iris with a black slit pupil, tiny lightning arcs "
        "inside it and a white-hot core",
        "horns": "horns of jagged dark metal with violet lightning arcing between them and "
        "glowing purple tips",
        "acc": "a dark steel and plasma collar: a heavy riveted band with a glowing violet "
        "plasma gem in a claw setting",
        "wings": "wings of storm-grey membrane with violet lightning arcs racing over them "
        "and thin blue-white sparks at the tips",
        "bg": "a thunderstorm sky: towering black clouds, violet lightning bolts over dark "
        "mountains and cold blue light",
    },
    # ----------------------------------------------------------------- gilded
    "gilded": {
        "body": "polished 24k gold: mirror-bright gold armour plates with engraved "
        "filigree scrollwork, deep amber reflections, dark seams between the plates",
        "eyes": "a molten pure-gold iris with a coin-ring pattern, a black slit pupil and "
        "a bright gold sparkle",
        "horns": "horns of ornate gold: heavy gilded horns with engraved filigree bands "
        "and a bright polished sheen",
        "acc": "a royal gold gorget: a massive engraved gold band with a round gold "
        "medallion, a hanging coin chain and deep amber gems",
        "wings": "wings of gilded metal feathers: golden blades with engraved patterns, "
        "warm gold glow and ornate tips",
        "bg": "a golden palace treasury: vaulted gold columns, coins and golden chains "
        "piled in the dark, warm amber light",
    },
    # ----------------------------------------------------------------- tempest
    "tempest": {
        "body": "rain-slick storm steel: cold blue-grey scales with a wet sheen, white "
        "lightning cracks etched into the plates and deep slate shadows",
        "eyes": "a stormy white-blue iris with a crack of lightning across it, a black "
        "slit pupil and a wet glassy rim",
        "horns": "horns of cold storm steel with white lightning cracks and dark "
        "weathered tips",
        "acc": "a heavy iron chain collar: rusted links wrapped twice around the neck with "
        "a rough storm crystal pendant",
        "wings": "wings of rain-dark membrane with water beading on them, slate finger "
        "bones and faint white lightning at the trailing edge",
        "bg": "a raging sea storm: black waves, sheet rain, white lightning over a dark "
        "ocean horizon",
    },
    # ------------------------------------------------------------------ prism
    "prism": {
        "body": "cut diamond over black obsidian: faceted crystalline plates with sharp "
        "specular facets, deep black gaps between them, tiny star sparkles inside the "
        "facets and violet-blue refracting highlights",
        "eyes": "a galaxy iris: deep violet nebula with stars and a vertical black slit "
        "pupil, glowing ring around the iris",
        "horns": "horns of black obsidian inlaid with fine gold lines and star-flecked "
        "crystal, sharp faceted ridges and glitter along the tips",
        "acc": "a royal gorget: wide engraved gold band with a large faceted diamond "
        "medallion, hanging gold chains and deep red gem accents",
        "wings": "wings of translucent nebula membrane filled with stars, violet galaxy "
        "dust and crystal veins, faint starlight glow behind them",
        "bg": "deep space: a violet nebula, star fields, glowing cosmic dust and a faint "
        "planet in cold blue-violet light",
    },
    # ------------------------------------------------------------------- opal
    "opal": {
        "body": "black opal: dark plates that flash aurora fire green, cyan and magenta as "
        "the light moves, smooth polished surfaces and deep black seams",
        "eyes": "a rainbow opal iris: shifting green, cyan and magenta fire with a black "
        "slit pupil and a bright white glint",
        "horns": "horns of black opal with aurora fire running through the facets and "
        "polished rounded tips",
        "acc": "a silver filigree collar holding one large black opal pendant with green "
        "and magenta fire, fine silver chains",
        "wings": "wings of iridescent opal membrane: thin translucent film flashing "
        "aurora colours, dark opal finger bones and a soft coloured glow",
        "bg": "an aurora sky over black mountains: green and magenta aurora curtains, cold "
        "stars and dark snow below",
    },
}


def variants():
    out = {}
    for pid in PARTS:
        for slot, tmpl in SLOT_TMPL.items():
            tail = NOEXTRAS if slot == "acc" else ""
            out[(pid, slot)] = KEEP + tmpl.format(x=ART[pid][slot]) + tail
    return out


# ------------------------------------------------------------------- silhouette
def silhouette(path, tol=0.055):
    im = Image.open(path).convert("RGB")
    if im.size != (1122, 1402):
        im = im.resize((1122, 1402), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255.0
    border = np.concatenate(
        [a[:12].reshape(-1, 3), a[-12:].reshape(-1, 3), a[:, :12].reshape(-1, 3), a[:, -12:].reshape(-1, 3)]
    )
    bg = np.median(border, 0)
    return np.abs(a - bg).max(2) > tol


def iou(a, b):
    u = (a | b).sum()
    return float((a & b).sum() / u) if u else 0.0


def gen(key, prompt, master_sil):
    pid, slot = key
    out = f"{OUT}/{pid}__{slot}.png"
    if os.path.exists(out) and os.path.getsize(out) > 40000:
        return ("skip", key, iou(silhouette(out), master_sil), 0)
    cmd = ["images", prompt, "--edit", MASTER, "--out", os.path.relpath(out, "/workspace")]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if not os.path.exists(out):
        return ("fail", key, 0.0, 1)
    return ("ok", key, iou(silhouette(out), master_sil), 1)


def main():
    args = [a for a in sys.argv[1:]]
    jobs = 3
    if "-j" in args:
        i = args.index("-j")
        jobs = int(args[i + 1])
        del args[i : i + 2]
    only = None
    if len(args) == 2:
        only = [(args[0], args[1])]
    elif len(args) == 1 and not args[0].startswith("-"):
        only = [k for k in variants() if k[0] == args[0]]

    V = variants()
    keys = only if only else list(V)
    master_sil = silhouette(MASTER)
    todo = [k for k in keys if not (os.path.exists(f"{OUT}/{k[0]}__{k[1]}.png") and os.path.getsize(f"{OUT}/{k[0]}__{k[1]}.png") > 40000)]
    print(f"{len(keys)} variants · {len(todo)} to generate · {jobs} workers")

    report = {}
    with ThreadPoolExecutor(max_workers=jobs) as ex:
        futs = [ex.submit(gen, k, V[k], master_sil) for k in todo]
        for f in futs:
            st, key, v, _ = f.result()
            report[f"{key[0]}__{key[1]}"] = round(v, 4)
            print(f"{st:4s} {key[0]}/{key[1]}  silhouetteIoU={v:.3f}", flush=True)

    # measure everything that exists now (so skipped files are still reported)
    allrep = {}
    for k in keys:
        p = f"{OUT}/{k[0]}__{k[1]}.png"
        if os.path.exists(p):
            allrep[f"{k[0]}__{k[1]}"] = round(iou(silhouette(p), master_sil), 4)
    with open(f"{ROOT}/out/gen-report.json", "w") as fh:
        json.dump(allrep, fh, indent=1, sort_keys=True)
    bad = {k: v for k, v in allrep.items() if v < 0.90}
    print(f"\nmeasured {len(allrep)} variants · below 0.90 IoU: {len(bad)}")
    for k, v in sorted(bad.items(), key=lambda t: t[1]):
        print(f"  low {k} {v}")


if __name__ == "__main__":
    main()
