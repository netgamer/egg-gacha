#!/usr/bin/env python3
"""Realistic dragon part compositor — master-anchor pipeline.

Everything is derived from one master painting (master/base.png, 1122x1402).
Each `images --edit` variant keeps that painting's pose, so a variant's changed
pixels are, by construction, the pixels of exactly one slot.  This script

  1. slices every variant into an RGBA part (body / eyes / horns / acc / wings / bg)
     with edge-feathered, colour-decontaminated alpha,
  2. bakes physical contact into each part (socket occlusion for eyes, root
     shadow for horns, cast shadow for the collar, wing-on-body occlusion),
  3. composites any combination with shared environment light: rim light and
     light wrap taken from the background, an environment tone pass, one
     bloom/grain/vignette finishing grade.

    python3 pipeline.py parts          # slice parts -> out/layers/
    python3 pipeline.py combo fire body fire eyes ... --out x.png
    python3 pipeline.py sheet          # 3x3 proof grid + 2 card previews
"""
import itertools
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.abspath(f"{ROOT}/../..")
MASTER = f"{ROOT}/master/base.png"
VAR = f"{ROOT}/out/variants"
LAY = f"{ROOT}/out/layers"
SHOTS = f"{PROJ}/shots"
PUBLIC = f"{PROJ}/public/parts"
SLOTS = ("bg", "wings", "body", "eyes", "horns", "acc")

# Production part registry: (id, element, rarity, Korean adjective).
# 8 egg themes + 4 cross-rarity designs = 12 parts per slot x 6 slots = 72.
PARTS = [
    ("ivory", "white", "common", "상아빛"),
    ("spotted", "spotted", "common", "점박이"),
    ("moss", "forest", "common", "이끼빛"),
    ("sandstone", "white", "common", "사암빛"),
    ("magma", "fire", "rare", "용암"),
    ("frost", "ice", "rare", "빙하"),
    ("pearl", "ice", "rare", "진주"),
    ("storm", "thunder", "epic", "뇌광"),
    ("gilded", "gold", "epic", "황금"),
    ("tempest", "thunder", "epic", "폭풍"),
    ("prism", "diamond", "legendary", "다이아"),
    ("opal", "diamond", "legendary", "오팔"),
]
SLOT_KO = {"bg": "배경", "wings": "날개", "body": "비늘", "eyes": "눈", "horns": "뿔", "acc": "목걸이"}
SLOT_LABEL = {"bg": "배경", "wings": "날개", "body": "몸", "eyes": "눈", "horns": "뿔", "acc": "장식"}
PART_IDS = [p[0] for p in PARTS]
EXPORT_W, EXPORT_H = 640, 800
THUMB_W, THUMB_H = 192, 240

W, H = 1122, 1402
F32 = np.float32


# --------------------------------------------------------------------------- io
def load(p):
    im = Image.open(p).convert("RGB")
    if im.size != (W, H):
        im = im.resize((W, H), Image.LANCZOS)
    return np.asarray(im, F32) / 255.0


def save_rgba(rgb, a, p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    arr = np.concatenate([rgb, a[..., None]], 2)
    Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(p)


def save_rgb(img, p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB").save(p)


def save_mask(m, p):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8), "L").save(p)


# ---------------------------------------------------------------------- masks
def blur(a, s):
    return cv2.GaussianBlur(a.astype(F32), (0, 0), s, borderType=cv2.BORDER_REPLICATE)


def norm_silhouette(x):
    return (x - x.min()) / max(1e-6, x.max() - x.min())


def harden(a, thr=0.5):
    return (a > thr).astype(F32)


def biggest(m):
    b = (m > 0.5).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(b, 8)
    if n <= 1:
        return m
    i = 1 + int(np.argmax(stats[1:, 4]))
    return (lab == i).astype(F32)


def fill_holes(m):
    f = (m > 0.5).astype(np.uint8)
    h, w = f.shape
    ff = np.pad(f, 1, constant_values=0).copy()
    mask = np.zeros((h + 4, w + 4), np.uint8)
    cv2.floodFill(ff, mask, (0, 0), 1)
    holes = (ff[1:-1, 1:-1] == 0).astype(F32)
    return np.clip(f + holes, 0, 1).astype(F32)


def fill_small_holes(m, max_area=4000):
    """Close pinholes (dark metal between bright rims) but never fill a real
    opening, such as the neck seen through a collar."""
    f = fill_holes(m)
    holes = (f - (m > 0.5).astype(F32)).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(holes, 8)
    out = (m > 0.5).astype(F32)
    for i in range(1, n):
        if stats[i, 4] <= max_area:
            out[lab == i] = 1
    return out


def feather(m, sigma=1.4):
    """Antialias a binary mask: soft 2*sigma ramp, interior stays solid."""
    m = m.astype(F32)
    return np.clip(cv2.GaussianBlur(m, (0, 0), sigma, borderType=cv2.BORDER_REPLICATE), 0, 1)


def sil_from_flat_bg(img, tol=0.055):
    """Silhouette of a subject painted on a flat neutral background."""
    border = np.concatenate(
        [img[:12].reshape(-1, 3), img[-12:].reshape(-1, 3), img[:, :12].reshape(-1, 3), img[:, -12:].reshape(-1, 3)]
    )
    bg = np.median(border, 0)
    d = np.abs(img - bg).max(2)
    bgm = (d <= tol).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(bgm, 8)
    keep = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
    bgm = np.isin(lab, [l for l in keep if stats[l, 4] > 500]).astype(F32)
    sil = 1.0 - bgm
    sil = biggest(sil)
    return fill_holes(sil)


def ellipse(cx, cy, rx, ry, soft=0.0):
    m = np.zeros((H, W), F32)
    cv2.ellipse(m, (int(cx * W), int(cy * H)), (int(rx * W), int(ry * H)), 0, 0, 360, 1.0, -1)
    return blur(m, soft * W) if soft else m


def nearest_bg(img, m, passes=8):
    """Push-pull fill: blur the image *outward* into the masked area only."""
    w = (1.0 - m).astype(F32)          # known pixels
    f = img * w[..., None]
    cur_f, cur_w = f, w
    stack = []
    for _ in range(passes):
        stack.append((cur_f, cur_w))
        cur_f = cv2.pyrDown(cur_f)
        cur_w = cv2.pyrDown(cur_w)
        if min(cur_f.shape[:2]) < 6:
            break
    # coarsest level: normalise
    cf = cur_f / np.maximum(cur_w, 1e-4)[..., None]
    cf[cur_w < 1e-3] = cf[cur_w < 1e-3].mean(0) if (cur_w < 1e-3).any() else 0.5
    for f_l, w_l in reversed(stack):
        up = cv2.resize(cf, (f_l.shape[1], f_l.shape[0]), interpolation=cv2.INTER_LINEAR)
        wl = np.clip(w_l, 0, 1)[..., None]
        cf = f_l + up * (1 - wl)
    return cf


def edge_extend(rgb, a, sigma=2.0, iters=5):
    """Decontaminate the alpha fringe: outside the solid core the layer carries
    only its own colour, pushed outward, so no grey plate leaks into the edge."""
    core = np.clip((a - 0.45) / 0.35, 0, 1)
    f = rgb * core[..., None]
    w = core.copy()
    for _ in range(iters):
        f = blur(f, sigma)
        w = blur(w, sigma)
    pushed = f / np.maximum(w, 1e-4)[..., None]
    k = (1 - core)[..., None]
    return rgb * (1 - k) + pushed * k


# ------------------------------------------------------------- master geometry
class Geo:
    def __init__(self):
        self.master = load(MASTER)
        self.sil = sil_from_flat_bg(self.master)
        self.sil_f = feather(self.sil, 1.1)
        ys, xs = np.nonzero(self.sil > 0.5)
        self.bbox = (xs.min(), xs.max(), ys.min(), ys.max())
        self.eye = (0.355, 0.283)                       # measured socket centre
        coarse = ellipse(*self.eye, 0.064, 0.054, soft=0.008)
        # the socket itself, grown by ~20px: dark irises barely differ from the
        # black socket, so the zone has to come from the geometry, not the diff
        lum = self.master.mean(2)
        sock = ((lum < 0.18) & (coarse > 0.5)).astype(np.uint8)
        sock = fill_holes(sock.astype(F32)).astype(np.uint8)
        self.socket = feather(cv2.dilate(sock, np.ones((7, 7), np.uint8)).astype(F32), 1.6)
        # tight oval the iris always fills; a dark iris differs from the empty hole
        # by a couple of levels only, so geometry has to carry the matte
        self.eye_core = ellipse(0.374, 0.300, 0.050, 0.052, soft=0.004)
        sock = cv2.dilate(sock, np.ones((41, 41), np.uint8))
        self.eye_zone = feather(np.clip(sock.astype(F32), 0, 1), 8.0)
        # brow / crown line: below it the skull belongs to the body layer,
        # above it the crown+horns patch owns the pixels.
        self.brow = [(0.02, 0.315), (0.10, 0.275), (0.16, 0.245), (0.22, 0.222),
                     (0.27, 0.232), (0.31, 0.212), (0.36, 0.205), (0.41, 0.212),
                     (0.45, 0.228), (0.49, 0.256), (0.53, 0.292), (0.57, 0.330),
                     (0.62, 0.372), (0.67, 0.418), (0.72, 0.470)]
        bx = np.array([p[0] for p in self.brow]) * W
        by = np.array([p[1] for p in self.brow]) * H
        xs = np.arange(W)
        self.brow_y = np.interp(xs, bx, by).astype(F32)
        yy = np.mgrid[0:H, 0:W][0]
        # 1 above the brow line (crown), 0 below, 34px ramp
        self.crown_ramp = np.clip((self.brow_y[None, :] - yy) / 34.0, 0, 1).astype(F32)
        self.horn_zone = np.clip(ellipse(0.45, 0.16, 0.52, 0.26, soft=0.02), 0, 1)
        self.crown_ramp2 = np.clip((self.brow_y[None, :] + 40.0 - yy) / 40.0, 0, 1).astype(F32)
        self.acc_zone = ellipse(0.545, 0.735, 0.30, 0.20, soft=0.03)
        self.body_d = feather(np.clip(blur(self.sil, 4.0) * 1.0, 0, 1), 1.0)
        # the throat notch between jaw and neck is open to the plate, but it is
        # part of the dragon's outline: closing it keeps wings/horns out of the
        # one place where a stray plate-coloured patch would read as a hole
        closed = cv2.morphologyEx(self.sil.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((41, 41), np.uint8))
        self.body_fill = feather(fill_holes(closed.astype(F32)), 1.0)
        # The throat notch: plate that sits inside the head's outline (between jaw
        # and neck).  Every variant may seal it with its own wings, so it has to be
        # identified on the master and kept out of every part.
        box = np.zeros((H, W), F32)
        box[int(0.40 * H) : int(0.645 * H), int(0.31 * W) : int(0.53 * W)] = 1
        plate_here = (np.abs(self.master - 0.47).max(2) < 0.055).astype(F32)
        notch = plate_here * (1 - self.sil) * box
        notch = cv2.dilate(notch.astype(np.uint8), np.ones((21, 21), np.uint8)).astype(F32)
        notch = notch * (1 - self.sil) * box
        self.notch = feather(notch, 2.0)


GEO = None


def geo():
    global GEO
    if GEO is None:
        GEO = Geo()
    return GEO


def bg_dist(img, tol=0.055):
    border = np.concatenate(
        [img[:12].reshape(-1, 3), img[-12:].reshape(-1, 3), img[:, :12].reshape(-1, 3), img[:, -12:].reshape(-1, 3)]
    )
    bg = np.median(border, 0)
    return np.abs(img - bg).max(2)


# ------------------------------------------------------------------ extraction


def bg_flood(v, thr=0.075):
    """Background as the region the frame border can reach without crossing an
    edge.  Colour alone fails here: the generator leaves a soft gradient plate and
    pale wings can be almost the same value as it, but the wing outline is still a
    hard edge, so an edge-barrier flood separates them cleanly."""
    gray = cv2.GaussianBlur(v.mean(2).astype(F32), (0, 0), 1.0)
    gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    edge = (np.hypot(gx, gy) > thr).astype(np.uint8)
    edge = cv2.dilate(edge, np.ones((3, 3), np.uint8))
    ff = (edge == 0).astype(np.uint8)
    mask = np.zeros((H + 2, W + 2), np.uint8)
    for seed in ((0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)):
        if ff[seed[1], seed[0]] == 1:
            cv2.floodFill(ff, mask, seed, 2)
    return ff == 2


def bg_model(img, body, iters=4):
    """Robust smooth background estimate: fit a quadratic surface to the pixels
    outside the body, rejecting the wings/horns themselves as outliers.  The
    generator often leaves a soft gradient behind even when asked for a flat
    plate, and a fixed grey would matte that gradient as if it were art."""
    yy, xx = np.mgrid[0:H, 0:W].astype(F32)
    x = xx / W
    y = yy / H
    feat = np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], -1)
    sel = (body < 0.5)
    # coarse grid keeps the fit cheap and unbiased
    sel = sel & ((xx.astype(np.int32) % 4) == 0) & ((yy.astype(np.int32) % 4) == 0)
    idx = np.nonzero(sel)
    A = feat[idx]
    w = np.ones(len(idx[0]), bool)
    coef = None
    for _ in range(iters):
        if w.sum() < 500:
            break
        coef, *_ = np.linalg.lstsq(A[w], img[idx][w], rcond=None)
        res = np.abs(A @ coef - img[idx]).max(1)
        w = res < max(0.035, np.percentile(res, 70))
    if coef is None:
        coef, *_ = np.linalg.lstsq(A, img[idx], rcond=None)
    est = np.clip(feat @ coef, 0, 1).astype(F32)
    d = np.abs(img - est).max(2)
    return d, est


def local_std(img, k=9):
    m = cv2.blur(img.mean(2), (k, k))
    m2 = cv2.blur((img.mean(2) ** 2), (k, k))
    return np.sqrt(np.clip(m2 - m * m, 0, None))



def plate_field(v):
    """How far each pixel is from the plate, with the plate extended into the
    subject by push-pull from the background the border can actually reach.  This
    separates pale horns and membrane from a soft grey gradient far better than a
    fixed or fitted plate colour, and it drops enclosed pockets of plate too."""
    bgm = bg_flood(v)
    plate = nearest_bg(v, (~bgm).astype(F32))
    return np.abs(v - plate).max(2), plate


def part_body(g, v, acc_key=None):
    """Soft alpha straight off the painting's own antialiased contour."""
    d = bg_dist(v)
    a = np.clip((d - 0.035) / 0.045, 0, 1)
    solid = fill_holes(biggest(harden(d > 0.06)))
    a = np.maximum(a, solid * 0.999)
    a = np.clip(cv2.GaussianBlur(a, (0, 0), 0.9), 0, 1)
    lim = feather(np.clip(blur(g.sil, 9.0), 0, 1), 1.0)
    a = np.clip(a * lim, 0, 1)
    rgb = edge_extend(v, a, 2.2, 4)
    # bust bleed: the card crops the bust at the frame, so a body that stops short
    # of the bottom is continued downward instead of ending on a shelf
    rows = np.arange(H)[:, None]
    idx = np.where(a > 0.5, rows, -1)
    lastrow = idx.max(0).astype(np.int32)
    sil_bottom = np.where(g.sil > 0.5, rows, -1).max(0).astype(np.int32)
    cols_ok = (lastrow > 0.85 * H) & (sil_bottom > 0.95 * H)
    ext = (rows > lastrow[None, :]) & cols_ok[None, :]
    if ext.any():
        take = np.clip(lastrow, 0, H - 1)[None, :, None].repeat(3, 2)
        col_rgb = np.take_along_axis(rgb, take, 0)[0]          # (W,3) colour of each bottom pixel
        fill = np.broadcast_to(col_rgb[None, :, :], (H, W, 3)).copy()
        fill = blur(fill, 10.0)
        ramp = np.clip((rows - lastrow[None, :]) / np.maximum(H - lastrow[None, :], 1), 0, 1)
        fill = fill * (1 - 0.86 * ramp[..., None] ** 0.7)
        rgb = np.where(ext[..., None], fill, rgb)
        a = np.where(ext, 1.0, a)
        a = np.clip(a, 0, 1)
    return rgb, a


def part_eyes(g, v, acc_key=None):
    """The eye lives in a fixed socket, so its alpha is the socket itself: a dark
    iris barely differs from the empty hole, and diff-only mattes clip it.  Any
    light the eye spills beyond the socket is added back on top."""
    d = np.abs(v - g.master).max(2)
    spill = harden(harden(d > 0.10) * g.eye_zone, 0.5)
    spill = cv2.morphologyEx(spill, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(F32)
    m = np.clip(np.clip(g.eye_core, 0, 1) + spill, 0, 1)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    m = biggest(m)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    a = feather(m, 1.3)
    rgb = edge_extend(v, a, 2.0, 4)
    return rgb, a


def part_horns(g, v, acc_key=None):
    """Horns only.

    Protrusions are taken whole (plate-difference against the body outline), and
    inside the body only crown pixels connected to a protrusion come along, so a
    horn carries its root but never another theme's cheek, jaw or throat."""
    body = harden(g.body_fill, 0.5)
    d_all = np.abs(v - g.master).max(2)
    dp, _ = plate_field(v)
    hp = d_all - blur(d_all, 25.0)
    upper = (np.arange(H)[:, None] < 0.50 * H).astype(F32)
    prot = np.clip(1 - body, 0, 1) * upper * (g.horn_zone > 0.5) * (dp > 0.045) * (1 - g.notch)
    prot = cv2.morphologyEx((prot > 0.5).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(F32)
    near = np.clip(cv2.dilate((prot > 0.5).astype(np.uint8), np.ones((45, 45), np.uint8)).astype(F32), 0, 1)
    inside = body * (g.crown_ramp2 > 0.5).astype(F32) * near * np.clip((hp - 0.022) / 0.020, 0, 1)
    m = np.clip(prot + inside, 0, 1)
    m = cv2.morphologyEx((m > 0.5).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(F32)
    m = fill_small_holes(m, 3000)
    n, lab, stats, _ = cv2.connectedComponentsWithStats((m > 0.5).astype(np.uint8), 8)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, 4] > 1200:
            keep[lab == i] = 1
    m = keep
    a = np.clip(cv2.GaussianBlur(m, (0, 0), 1.3), 0, 1)
    rgb = edge_extend(v, a, 2.4, 4)
    ao = np.clip(blur(prot, 0.016 * W) * body * (1 - m), 0, 1) * 0.55
    a_out = np.clip(a + ao * (1 - a), 0, 1)
    rgb_out = (rgb * a[..., None] + (rgb * 0.22 + 0.02) * ao[..., None]) / np.maximum(a_out, 1e-4)[..., None]
    return rgb_out, a_out


def grabcut_mask(img, zone, fg_seed, bg_seed, iters=6):
    m = np.full((H, W), cv2.GC_PR_BGD, np.uint8)
    m[~zone] = cv2.GC_BGD
    m[bg_seed] = cv2.GC_BGD
    m[fg_seed] = cv2.GC_FGD
    bgm = np.zeros((1, 65), np.float64)
    fgm = np.zeros((1, 65), np.float64)
    img8 = cv2.cvtColor((np.clip(img, 0, 1) * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
    cv2.grabCut(img8, m, None, bgm, fgm, iters, cv2.GC_INIT_WITH_MASK)
    return ((m == cv2.GC_FGD) | (m == cv2.GC_PR_FGD)).astype(F32)


def part_acc(g, v, acc_key=None):
    """The collar is an opaque object on the neck: hard-diff core, bridged along
    the band, trimmed back to strong-change pixels, then seated in a soft cast
    shadow so its edge never betrays the body underneath."""
    d = np.abs(v - g.master).max(2)
    m = harden(d > 0.19)
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8)).astype(F32)
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(F32)
    m = m * (g.acc_zone > 0.5)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    keep = np.zeros_like(m)
    if n > 1:
        big = stats[1:, 4].max()
        for i in range(1, n):
            if stats[i, 4] > 0.30 * big:
                keep[lab == i] = 1
    core = fill_small_holes(keep, 5000)
    # thin chains and fine filigree fall under the hard-diff threshold: grow the
    # band a few pixels and take back anything that clearly changed there
    grown = cv2.dilate(core.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(F32)
    grown = grown * (g.acc_zone > 0.5) * np.clip((d - 0.075) / 0.05, 0, 1)
    core = np.clip(core + grown, 0, 1)
    for x0, y0, x1, y1 in STRAY_REJECT.get(acc_key, []):
        core[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)] = 0
    a_core = feather(core, 1.1)
    rgb_core = edge_extend(v, a_core, 2.2, 4)
    # the take bakes the collar's cast shadow into the neck: that shadow holds the
    # *source* body's scales, so cut it out and let the compositor cast it instead
    lum = rgb_core.mean(2)
    sel = core > 0.5
    if sel.any():
        bright = lum[sel] > np.median(lum[sel])
        ys = np.nonzero(sel)[0]
        y_med = np.median(ys[bright]) if bright.any() else np.median(ys)
        dark = np.clip((0.62 * np.median(lum[sel][bright]) - lum) / (0.3 * np.median(lum[sel][bright]) + 1e-4), 0, 1)
        below = (np.arange(H)[:, None] > y_med).astype(F32)
        a_core = a_core * (1 - 0.94 * dark * below)
    ring = feather(cv2.dilate(core.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(F32), 2.2)
    ring = np.clip(ring - a_core, 0, 1) * 0.50
    a = a_core + ring * (1 - a_core)
    shadow = rgb_core * 0.20 + 0.030
    rgb = (rgb_core * a_core[..., None] + shadow * ring[..., None]) / np.maximum(a, 1e-4)[..., None]
    return rgb, a


def part_wings(g, v, acc_key=None):
    """Wings only: outside the body, and clearly not the plate."""
    body = harden(g.body_fill, 0.5)
    d, _ = plate_field(v)
    # the plate itself is flat and neutral: in the throat notch (open to the
    # plate but outside the silhouette) it would otherwise be matted as wing
    lum = v.mean(2)
    plate = np.median(np.concatenate([lum[:120, :120].ravel(), lum[:120, -120:].ravel(),
                                      lum[-120:, :120].ravel(), lum[-120:, -120:].ravel()]))
    neutral = np.abs(v - plate).max(2) < 0.045
    flat = local_std(v, 9) < 0.012
    m = np.clip(1 - body, 0, 1) * (d > 0.05) * ~(neutral & flat) * (1 - g.notch)
    m = cv2.morphologyEx((m > 0.5).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)).astype(F32)
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(F32)
    m = fill_small_holes(m, 2500)
    n, lab, stats, _ = cv2.connectedComponentsWithStats((m > 0.5).astype(np.uint8), 8)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, 4] > 2500:
            keep[lab == i] = 1
    m = keep
    a = feather(m, 1.5)
    rgb = edge_extend(v, a, 2.4, 5)
    return rgb, a


def ring_inpaint(img, ring, radius=6):
    """Inpaint a narrow band from both of its edges - the cheap, high quality way
    to clear whatever the anchor subject left just outside the silhouette."""
    m = (ring > 0.35).astype(np.uint8) * 255
    out = cv2.inpaint(cv2.cvtColor((img * 255).astype(np.uint8), cv2.COLOR_RGB2BGR), m, radius, cv2.INPAINT_TELEA)
    return cv2.cvtColor(out, cv2.COLOR_BGR2RGB).astype(F32) / 255.0


def part_bg(g, v, acc_key=None):
    """Background plate.  The body layer paints the dragon, so the plate only has
    to stop holding a ghost of it right where the two meet."""
    outer = feather(cv2.dilate(g.sil.astype(np.uint8), np.ones((25, 25), np.uint8)).astype(F32), 5.0)
    inner = feather(cv2.erode(g.sil.astype(np.uint8), np.ones((41, 41), np.uint8)).astype(F32), 6.0)
    ring = np.clip(outer - inner, 0, 1)
    fill = ring_inpaint(v, ring, 6)
    rgb = v * (1 - ring[..., None]) + fill * ring[..., None]
    # the subject casts a soft shadow on the plate behind it
    shade = np.clip(blur(ring, 30.0) * (1 - outer), 0, 1) * 0.22
    rgb = rgb * (1 - shade[..., None])
    return np.clip(rgb, 0, 1), np.ones((H, W), F32)


# A take can carry a patch of relit skin that no automatic matte separates from the
# metal (the generator re-lights scales around a new object).  These are explicit
# art touch-ups: (layer, x0, y0, x1, y1) in normalised frame coordinates.  A scaled
# run should replace them with hand-painted mattes once per part.
STRAY_REJECT = {}

# Parts whose background bleed had to be trimmed by hand: checked by the QC pass
# and reported, so a new stray patch is never silently baked into the bundle.


SLICE = {"body": part_body, "eyes": part_eyes, "horns": part_horns, "acc": part_acc, "wings": part_wings, "bg": part_bg}


# --------------------------------------------------------------- part finishing
def bake_shadow(rgb, a, g, dy=0.006, sigma=0.010, strength=0.55, clip_body=True):
    """Contact shadow beneath a part, clipped to the dragon so it never hits the bg."""
    sh = np.roll(a, int(dy * H), axis=0)
    sh = blur(sh, sigma * W)
    sh = np.clip(sh - a, 0, 1) * (1 - a)
    if clip_body:
        sh = sh * np.clip(blur(g.sil, 3.0) * 1.2, 0, 1)
    sh = np.clip(sh * strength, 0, 1)
    shadow_rgb = np.zeros_like(rgb) + 0.02
    out_a = a + sh * (1 - a)
    out_rgb = (rgb * a[..., None] + shadow_rgb * (sh * (1 - a))[..., None]) / np.maximum(out_a, 1e-4)[..., None]
    return out_rgb, out_a


def bake_ao_ring(rgb, a, sigma=0.006, strength=0.5):
    """Darken just outside a part's edge — how a raised object sits in its recess."""
    ring = np.clip(blur(a, sigma * W) - a, 0, 1) * (1 - a)
    ring = np.clip(ring * strength * 2.2, 0, 1)
    out_a = a + ring * (1 - a)
    out_rgb = (rgb * a[..., None] + 0.03 * ring[..., None]) / np.maximum(out_a, 1e-4)[..., None]
    return out_rgb, out_a


def tint(c, k):
    return np.array(c, F32) * k


def lighten(rgb, a, color, strength):
    return np.clip(rgb + a[..., None] * np.array(color, F32) * strength, 0, 1)


def build_parts():
    """Slice all 72 parts, export the mobile bundle and write the QC report."""
    g = geo()
    meta = {}
    for pid, element, rarity, adj in PARTS:
        for s in SLOTS:
            v = load(f"{VAR}/{pid}__{s}.png")
            rgb, a = SLICE[s](g, v, acc_key=f"{pid}__{s}" if s == "acc" else None)
            if s == "eyes":
                rgb, a = bake_ao_ring(rgb, a, 0.008, 0.55)
                # a whisper of warm light on the socket rim only (the bloom pass
                # does the rest; a wide halo reads as crust on a cool body)
                halo = np.clip(blur(a, 0.005 * W) - a, 0, 1) * 0.10
                rgb = lighten(rgb, halo, rgb.reshape(-1, 3).mean(0) * 1.1, 1.0)
                a = np.clip(a + halo * (1 - a), 0, 1)
            if s == "horns":
                rgb, a = bake_shadow(rgb, a, g, dy=0.008, sigma=0.011, strength=0.65)
            if s == "acc":
                rgb, a = bake_shadow(rgb, a, g, dy=0.010, sigma=0.013, strength=0.7)
            if s == "wings":
                rgb, a = bake_shadow(rgb, a, g, dy=0.0, sigma=0.028, strength=0.55, clip_body=False)
            save_rgba(rgb, a, f"{LAY}/{pid}__{s}.png")
            # thumbnails for inspection
            prev = rgb * a[..., None] + 0.45 * (1 - a[..., None])
            save_rgb(prev, f"{LAY}/_preview/{pid}__{s}.png")
            meta[f"{pid}__{s}"] = qc_part(g, pid, s, v, rgb, a)
            export_part(pid, s, rgb, a)
    save_mask(g.sil, f"{LAY}/_masks/sil.png")
    save_mask(g.eye_zone, f"{LAY}/_masks/eye_zone.png")
    save_mask(g.horn_zone, f"{LAY}/_masks/horn_zone.png")
    save_mask(g.acc_zone, f"{LAY}/_masks/acc_zone.png")
    write_catalog()
    with open(f"{ROOT}/out/qc.json", "w") as fh:
        json.dump(meta, fh, indent=1, sort_keys=True)
    flags = {k: v["flags"] for k, v in meta.items() if v["flags"]}
    print(f"parts {len(meta)} · flags {len(flags)}")
    for k, v in sorted(flags.items()):
        print(f"  ! {k}: {', '.join(v)}")
    total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(PUBLIC) for f in fs)
    print(f"bundle public/parts = {total/1024/1024:.2f} MB")


# ---------------------------------------------------------------------- export
def export_part(pid, slot, rgb, a):
    """Full 768x960 WebP for the card + 192x240 thumbs for the gallery bake."""
    arr = np.concatenate([rgb, a[..., None]], 2)
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    full = im.resize((EXPORT_W, EXPORT_H), Image.LANCZOS)
    d = f"{PUBLIC}/{slot}"
    os.makedirs(d, exist_ok=True)
    full.save(f"{d}/{pid}.webp", "WEBP", quality=86, method=6, exact=True)
    t = f"{PUBLIC}/thumb/{slot}"
    os.makedirs(t, exist_ok=True)
    full.resize((THUMB_W, THUMB_H), Image.LANCZOS).save(
        f"{t}/{pid}.webp", "WEBP", quality=80, method=6, exact=True
    )


def write_catalog():
    layers = []
    for s in SLOTS:
        parts = []
        for pid, element, rarity, adj in PARTS:
            parts.append(
                {
                    "id": pid,
                    "name": f"{adj} {SLOT_KO[s]}",
                    "element": element,
                    "rarity": rarity,
                    "img": f"parts/{s}/{pid}.webp",
                    "thumb": f"parts/thumb/{s}/{pid}.webp",
                }
            )
        layers.append({"id": s, "ko": SLOT_LABEL[s], "parts": parts})
    body = "// AUTO-GENERATED by tools/proto-art/pipeline.py — do not edit by hand.\n"
    body += "export const DRAGON_LAYERS = " + json.dumps(layers, ensure_ascii=False, indent=1) + ";\n\n"
    body += "export const LAYER_KO = " + json.dumps({s: SLOT_LABEL[s] for s in SLOTS}, ensure_ascii=False, indent=1) + ";\n\n"
    body += (
        "export const PART_BY_ID = Object.fromEntries(\n"
        "  DRAGON_LAYERS.flatMap((l) => l.parts.map((p) => [`${l.id}:${p.id}`, p]))\n"
        ");\n"
    )
    with open(f"{PROJ}/src/dragon-parts.js", "w") as fh:
        fh.write(body)
    print(f"catalog: {len(layers)} layers x {len(PARTS)} parts")


# -------------------------------------------------------------------------- qc
def qc_part(g, pid, slot, variant, rgb, a):
    """Cheap objective checks: coverage, where the alpha actually is, and how much
    of the part's colour is just the neutral-grey studio background bleeding in."""
    flags = []
    sel = a > 0.35
    cov = float(a.mean())
    info = {"coverage": round(cov, 4), "flags": flags}
    if cov < 0.0008:
        flags.append("empty")
    if sel.any():
        ys, xs = np.nonzero(sel)
        info["bbox"] = [round(xs.min() / W, 3), round(xs.max() / W, 3), round(ys.min() / H, 3), round(ys.max() / H, 3)]
        lum = rgb[sel].mean(1)
        # the studio backdrop is a flat mid grey: a part made mostly of it, outside
        # the silhouette, is a matte failure rather than art
        greyish = float((np.abs(rgb[sel] - 0.47).max(1) < 0.06).mean())
        info["grey_fraction"] = round(greyish, 3)
        if slot in ("horns", "wings", "acc") and greyish > 0.55:
            flags.append("bg-bleed")
        if slot == "eyes":
            z = g.eye_zone > 0.5
            out = float((sel & ~z).sum() / max(1, sel.sum()))
            info["outside_eye_zone"] = round(out, 3)
            if out > 0.05:
                flags.append("eye-spill")
        if slot == "acc":
            z = g.acc_zone > 0.5
            out = float((sel & ~z).sum() / max(1, sel.sum()))
            info["outside_acc_zone"] = round(out, 3)
            if out > 0.10:
                flags.append("acc-spill")
        if slot in ("horns", "wings"):
            inside = float((sel & (g.sil > 0.5)).sum() / max(1, sel.sum()))
            info["inside_body"] = round(inside, 3)
        if slot == "body":
            # the body must cover the anchor: its alpha should hold most of the silhouette
            cover = float((sel & (g.sil > 0.5)).sum() / max(1, (g.sil > 0.5).sum()))
            info["silhouette_cover"] = round(cover, 3)
            if cover < 0.94:
                flags.append("body-gap")
    else:
        flags.append("empty")
    return info


# -------------------------------------------------------------------- composite
def over(dst, src, a):
    return dst * (1 - a[..., None]) + src * a[..., None]


def screen(dst, src, k):
    return 1 - (1 - dst) * (1 - np.clip(src * k, 0, 1))


def compose(slots, finish=True, seed=3, scale=1.0):
    """slots: {'bg': part, 'wings': part, ...}; scale<1 renders a preview faster."""
    g = geo()
    w, h = int(W * scale), int(H * scale)
    sil = g.sil if scale == 1.0 else cv2.resize(g.sil, (w, h), interpolation=cv2.INTER_AREA)

    def L(slot, theme):
        return load_rgba(f"{LAY}/{theme}__{slot}.png")

    def load_rgba(p):
        im = Image.open(p).convert("RGBA")
        if im.size != (w, h):
            im = im.resize((w, h), Image.LANCZOS)
        arr = np.asarray(im, F32) / 255.0
        return arr[..., :3], arr[..., 3]

    bg, _ = L("bg", slots["bg"])
    comp = bg.copy()

    for slot in ("wings", "body", "eyes", "horns", "acc"):
        t = slots.get(slot)
        if not t:
            continue
        rgb, a = L(slot, t)
        if slot == "body":
            # body alpha is the silhouette: keep it crisp against the bg
            a = np.clip(a * 1.02, 0, 1)
        comp = over(comp, rgb, a)
        # keep the body mask for the light passes
        if slot == "body":
            body_a = a

    if not finish:
        return comp

    # ---- environment light: rim + light wrap taken from the background --------
    env = blur(bg, 0.030 * w)
    lum_env = env.mean(2)
    # rim: a band just outside the body silhouette, catching the bg's own light
    band_out = np.clip(blur(body_a, 0.004 * w) - body_a, 0, 1)
    rim = screen(comp, env * (0.55 + 0.9 * lum_env[..., None]), band_out[..., None] * 0.55)
    comp = comp * (1 - (band_out * 0.35)[..., None]) + rim * (band_out * 0.35)[..., None]

    # light wrap: bg light bleeding onto the dragon's edge inside the silhouette
    wrap = np.clip(body_a * blur(1 - body_a, 0.012 * w), 0, 1)
    comp = comp + env * wrap[..., None] * 0.55
    comp = np.clip(comp, 0, 1)

    # ---- environment tone pass: one colour of light over the whole painting ---
    tone = blur(bg, 0.09 * w)
    tmean = tone.reshape(-1, 3).mean(0) + 1e-4
    factor = np.clip(tone / tmean, 0.72, 1.30)
    comp = np.clip(comp * (0.72 + 0.28 * factor), 0, 1)

    # ---- bloom ---------------------------------------------------------------
    hi = np.clip(comp - 0.62, 0, 1)
    comp = screen(comp, blur(hi, 0.020 * w) * 1.15, 0.38)

    # ---- deep contact at the bottom of the bust -------------------------------
    vb = np.clip((np.arange(h)[:, None].astype(F32) / h - 0.84) / 0.16, 0, 1) ** 1.5
    vb = np.broadcast_to(vb, (h, w))
    comp = comp * (1 - 0.62 * vb[..., None] * np.clip(blur(sil, 6), 0, 1)[..., None])

    # ---- one canvas over everything -----------------------------------------
    rng = np.random.default_rng(seed)
    grain = rng.normal(0, 1, (h // 2, w // 2)).astype(F32)
    grain = cv2.resize(grain, (w, h), interpolation=cv2.INTER_CUBIC)
    comp = comp * (1 + 0.045 * grain[..., None])

    canvas = (rng.normal(0, 1, (h // 3, w // 3)) + rng.normal(0, 1, (h // 3, w // 3))) * 0.5
    canvas = cv2.resize(canvas.astype(F32), (w, h), interpolation=cv2.INTER_CUBIC)
    comp = comp * (1 + 0.030 * canvas[..., None])

    # ---- grade: vignette, subtle contrast, saturation ------------------------
    yy, xx = np.mgrid[0:h, 0:w].astype(F32)
    r = np.sqrt(((xx - w * 0.5) / (w * 0.62)) ** 2 + ((yy - h * 0.44) / (h * 0.62)) ** 2)
    vig = np.clip(1.0 - 0.34 * np.clip(r - 0.35, 0, 2) ** 1.5, 0.40, 1)
    comp = comp * vig[..., None]

    comp = np.clip((comp - 0.5) * 1.030 + 0.5, 0, 1)
    g_ = comp.mean(2, keepdims=True)
    comp = np.clip(g_ + (comp - g_) * 1.04, 0, 1)
    return comp



def export_all():
    """Re-export the mobile bundle from the sliced layers (no re-matting)."""
    for pid, element, rarity, adj in PARTS:
        for s in SLOTS:
            im = Image.open(f"{LAY}/{pid}__{s}.png").convert("RGBA")
            if im.size != (W, H):
                im = im.resize((W, H), Image.LANCZOS)
            arr = np.asarray(im, F32) / 255.0
            export_part(pid, s, arr[..., :3], arr[..., 3])
    write_catalog()
    total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(PUBLIC) for f in fs)
    print(f"exported {len(PARTS) * len(SLOTS)} parts + thumbs · {total/1024/1024:.2f} MB")


# ------------------------------------------------------------------------ sheets
def card(img, label="", sub=""):
    """Full card: thin frame, caption strip."""
    pad = 0
    im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")
    im = im.filter(ImageFilter.UnsharpMask(radius=2.2, percent=42, threshold=2))
    return im, label, sub


def grid_sheet(tiles, cols, path, tw=760, bg=(16, 16, 18)):
    """tiles: [(label, rgb array)] -> labelled contact sheet."""
    th = int(tw * H / W)
    pad, lab = 18, 34
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * pad, rows * (th + lab) + (rows + 1) * pad), bg)
    d = ImageDraw.Draw(sheet)
    for i, (name, img) in enumerate(tiles):
        im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")
        im = im.resize((tw, th), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2.0, 35, 2))
        x = pad + (i % cols) * (tw + pad)
        y = pad + (i // cols) * (th + lab + pad)
        sheet.paste(im, (x, y + lab))
        d.text((x + 4, y + 9), f"{i + 1}. {name}", fill=(228, 226, 220))
        d.rectangle([x - 1, y + lab - 1, x + tw, y + lab + th], outline=(70, 68, 66))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sheet.save(path)
    print("sheet", path, sheet.size)
    return sheet


def make_sheet():
    same = [(p[0].upper(), dict.fromkeys(SLOTS, p[0])) for p in PARTS]
    for i, (name, s) in enumerate(same):
        save_rgb(compose(s, seed=11 + i), f"{ROOT}/out/combos/theme-{i + 1:02d}.png")
    grid_sheet([(n, compose(s, seed=11 + i)) for i, (n, s) in enumerate(same)], 4,
               f"{SHOTS}/proto-real-dragon-themes.png")

    cross = [
        ("FROST 몸 + MAGMA 눈 + PRISM 뿔 + GILDED 목걸이",
         dict(bg="prism", wings="opal", body="frost", eyes="magma", horns="prism", acc="gilded")),
        ("MAGMA 몸 + FROST 눈 + OPAL 뿔 + PEARL 목걸이",
         dict(bg="frost", wings="pearl", body="magma", eyes="frost", horns="opal", acc="pearl")),
        ("GILDED 몸 + STORM 눈 + MOSS 뿔 + PRISM 목걸이",
         dict(bg="moss", wings="gilded", body="gilded", eyes="storm", horns="moss", acc="prism")),
        ("OPAL 몸 + GILDED 눈 + TEMPEST 뿔 + SPOTTED 목걸이",
         dict(bg="tempest", wings="storm", body="opal", eyes="gilded", horns="tempest", acc="spotted")),
        ("SPOTTED 몸 + PEARL 눈 + SANDSTONE 뿔 + IVORY 목걸이",
         dict(bg="ivory", wings="spotted", body="spotted", eyes="pearl", horns="sandstone", acc="ivory")),
        ("STORM 몸 + PRISM 눈 + MAGMA 뿔 + TEMPEST 목걸이",
         dict(bg="storm", wings="tempest", body="storm", eyes="prism", horns="magma", acc="tempest")),
        ("PEARL 몸 + OPAL 눈 + FROST 뿔 + GILDED 목걸이",
         dict(bg="opal", wings="pearl", body="pearl", eyes="opal", horns="frost", acc="gilded")),
        ("TEMPEST 몸 + MOSS 눈 + IVORY 뿔 + MAGMA 목걸이",
         dict(bg="moss", wings="moss", body="tempest", eyes="moss", horns="ivory", acc="magma")),
    ]
    grid_sheet([(n, compose(s, seed=31 + i)) for i, (n, s) in enumerate(cross)], 3,
               f"{SHOTS}/proto-real-dragon-grid.png")

    # two full-card close-ups
    big = [("프리즘 24K", cross[0][1], 21), ("영혼의 오팔", cross[1][1], 22)]
    for n, (label, s, seed) in enumerate(big):
        img = compose(s, seed=seed)
        im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")
        im = im.filter(ImageFilter.UnsharpMask(2.2, 45, 2))
        im.save(f"{SHOTS}/proto-real-dragon-{n + 1}.png")
        print("card", n + 1, im.size, label)


def make_atlas():
    """Contact sheet of all 72 parts, one row per slot."""
    cols = len(PARTS) + 1
    tw = 236
    th = int(tw * H / W)
    pad, lab = 10, 24
    rows = len(SLOTS)
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * pad, rows * (th + lab) + (rows + 1) * pad), (26, 28, 32))
    d = ImageDraw.Draw(sheet)
    for r, slot in enumerate(SLOTS):
        for c, (pid, *_rest) in enumerate(PARTS):
            im = Image.open(f"{LAY}/{pid}__{slot}.png").convert("RGBA").resize((tw, th), Image.LANCZOS)
            back = Image.new("RGBA", (tw, th), (44, 46, 52, 255) if slot != "bg" else (20, 20, 24, 255))
            tile = Image.alpha_composite(back, im).convert("RGB")
            x = pad + c * (tw + pad)
            y = pad + r * (th + lab + pad)
            sheet.paste(tile, (x, y + lab))
            d.text((x + 2, y + 6), f"{pid} · {slot}", fill=(226, 224, 218))
            d.rectangle([x - 1, y + lab - 1, x + tw, y + lab + th], outline=(64, 66, 72))
    os.makedirs(SHOTS, exist_ok=True)
    sheet.save(f"{SHOTS}/proto-real-dragon-parts.png")
    print("atlas", sheet.size)


def make_atlas_enriched():
    """The real delivered art: composite every part over the master body (or its own
    slot rest), so clipped necklaces and stray patches are visible at a glance."""
    cols = len(PARTS) + 1
    tw = 236
    th = int(tw * H / W)
    pad, lab = 10, 24
    base = dict(bg="ivory", wings="ivory", body="ivory", eyes="ivory", horns="ivory", acc="ivory")
    sheet = Image.new("RGB", (cols * tw + (cols + 1) * pad, len(SLOTS) * (th + lab) + (len(SLOTS) + 1) * pad), (26, 28, 32))
    d = ImageDraw.Draw(sheet)
    for r, slot in enumerate(SLOTS):
        for c, (pid, *_rest) in enumerate(PARTS):
            slots = dict(base)
            slots[slot] = pid
            img = compose(slots, seed=5, scale=0.24)
            im = Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB").resize((tw, th), Image.LANCZOS)
            x = pad + c * (tw + pad)
            y = pad + r * (th + lab + pad)
            sheet.paste(im, (x, y + lab))
            d.text((x + 2, y + 6), f"{pid} · {slot}", fill=(226, 224, 218))
            d.rectangle([x - 1, y + lab - 1, x + tw, y + lab + th], outline=(64, 66, 72))
    os.makedirs(SHOTS, exist_ok=True)
    sheet.save(f"{SHOTS}/proto-real-dragon-mix.png")
    print("mix atlas", sheet.size)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "parts"
    if cmd == "parts":
        build_parts()
    elif cmd == "export":
        export_all()
    elif cmd == "sheet":
        make_sheet()
    elif cmd == "atlas":
        make_atlas()
    elif cmd == "mix":
        make_atlas_enriched()
    elif cmd == "combo":
        args = sys.argv[2:]
        slots = dict(zip(*[iter(args)] * 2))
        out = f"{ROOT}/out/combos/test.png"
        if "--out" in args:
            out = args[args.index("--out") + 1]
            slots = dict(zip(*[iter([a for a in args if a not in ("--out", out)])] * 2))
        save_rgb(compose(slots), out)
        print(out)


