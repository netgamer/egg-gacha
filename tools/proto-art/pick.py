#!/usr/bin/env python3
"""Generate alternate takes for one slot and keep the one whose mask is cleanest.

The edit model sometimes re-lights the scales around a new object; that relit
skin is what makes a part drag foreign colour into a combination.  We measure it
as the fraction of the object mask that sits on weakly-changed pixels and keep
the take with the least of it.

    python3 pick.py acc
"""
import os
import shutil
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image

import pipeline as P
import gen as G

TAKES = 3


def mask_quality(v, slot, geo):
    d = np.abs(v - geo.master).max(2)
    if slot == "acc":
        m = P.harden(d > 0.19)
        m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)).astype(P.F32)
        m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(P.F32)
        m = P.fill_holes(m) * (geo.acc_zone > 0.5)
        n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
        if n > 1:
            big = st[1:, 4].max()
            keep = np.zeros_like(m)
            for i in range(1, n):
                if st[i, 4] > 0.30 * big:
                    keep[lab == i] = 1
            m = keep
    else:
        m = P.harden(d > 0.05)
    sel = m > 0.5
    if sel.sum() < 2000:
        return 9.0, m
    weak = (1 - np.clip((d - 0.25) / 0.15, 0, 1))[sel].mean()
    return float(weak), m


def main(slot):
    geo = P.geo()
    for theme in P.THEMES:
        base = f"{P.VAR}/{theme}__{slot}.png"
        cands = []
        if os.path.exists(base):
            cands.append(base)
        for i in range(TAKES):
            out = f"{P.VAR}/_try/{theme}__{slot}_{i}.png"
            os.makedirs(os.path.dirname(out), exist_ok=True)
            prompt = G.KEEP + G.VARIANTS[(theme, slot)] + (G.NOEXTRAS if slot == "acc" else "")
            subprocess.run(["images", prompt, "--edit", P.MASTER, "--out", out], capture_output=True, text=True)
            if os.path.exists(out):
                cands.append(out)
        scored = []
        for c in cands:
            v = P.load(c)
            q, _ = mask_quality(v, slot, geo)
            scored.append((q, c))
            print(f"  {theme} {os.path.basename(c):22s} contamination={q:.3f}")
        scored.sort()
        best = scored[0][1]
        print(f"{theme}/{slot}: keep {os.path.basename(best)} ({scored[0][0]:.3f})")
        if best != base:
            shutil.copyfile(best, base)
        for q, c in scored[1:]:
            os.remove(c)


if __name__ == "__main__":
    main(sys.argv[1])
