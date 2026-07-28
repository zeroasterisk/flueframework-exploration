#!/usr/bin/env python
"""Measure ink coverage, static-hold and distinct-hue stats for reference clips."""
import json
import os
import subprocess
import sys

import numpy as np

DIR = os.path.dirname(os.path.abspath(__file__))
INK_FPS = 2.0
MOTION_FPS = 5.0
MOTION_W, MOTION_H = 320, 180
STATIC_THRESH = 2.0
QUANT = 24
LEVELS = 256 // QUANT + 1  # 0..240 -> 11 levels
SAT_MIN = 0.25
VAL_MIN = 0.15
HUE_BUCKETS = 12
HUE_MIN_FRAC = 0.005


def ffmpeg_frames(path, fps, width, height, gray=False):
    """Yield frames as numpy arrays sampled at `fps`."""
    pix = "gray" if gray else "rgb24"
    chans = 1 if gray else 3
    vf = f"fps={fps},scale={width}:{height}"
    cmd = [
        "ffmpeg", "-v", "error", "-i", path,
        "-vf", vf, "-pix_fmt", pix, "-f", "rawvideo", "-",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    nbytes = width * height * chans
    try:
        while True:
            buf = proc.stdout.read(nbytes)
            if len(buf) < nbytes:
                break
            a = np.frombuffer(buf, dtype=np.uint8)
            yield a.reshape((height, width) if gray else (height, width, 3))
    finally:
        proc.stdout.close()
        err = proc.stderr.read().decode(errors="replace")
        proc.wait()
        if proc.returncode not in (0, None) and err.strip():
            print(f"  [ffmpeg warn {path}] {err.strip()[:200]}", file=sys.stderr)


def ink_fraction(frame):
    """Fraction of pixels whose quantized colour is not the modal (background) colour."""
    q = (frame // QUANT).astype(np.int32)
    code = q[..., 0] * (LEVELS * LEVELS) + q[..., 1] * LEVELS + q[..., 2]
    flat = code.ravel()
    counts = np.bincount(flat, minlength=LEVELS ** 3)
    bg_count = counts.max()
    total = flat.size
    return 1.0 - (bg_count / total)


def rgb_to_hsv(frame):
    """frame uint8 HxWx3 -> (h_deg float32, s float32, v float32) in [0,360), [0,1], [0,1]."""
    a = frame.astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    maxc = np.max(a, axis=-1)
    minc = np.min(a, axis=-1)
    delta = maxc - minc
    v = maxc
    s = np.where(maxc > 0, delta / np.maximum(maxc, 1e-12), 0.0)
    h = np.zeros_like(maxc)
    nz = delta > 1e-12
    # branch by which channel is max
    rmax = nz & (maxc == r)
    gmax = nz & (maxc == g) & ~rmax
    bmax = nz & ~rmax & ~gmax
    d = np.where(nz, delta, 1.0)
    h[rmax] = (((g - b) / d) % 6.0)[rmax]
    h[gmax] = (((b - r) / d) + 2.0)[gmax]
    h[bmax] = (((r - g) / d) + 4.0)[bmax]
    h = (h * 60.0) % 360.0
    return h, s, v


def distinct_hues(frame):
    h, s, v = rgb_to_hsv(frame)
    total = h.size
    mask = (s >= SAT_MIN) & (v >= VAL_MIN)
    if not mask.any():
        return 0
    buckets = (h[mask] / (360.0 / HUE_BUCKETS)).astype(np.int32)
    buckets = np.clip(buckets, 0, HUE_BUCKETS - 1)
    counts = np.bincount(buckets, minlength=HUE_BUCKETS)
    return int((counts > HUE_MIN_FRAC * total).sum())


def measure(path):
    ink, hues = [], []
    for frame in ffmpeg_frames(path, INK_FPS, 1280, 720):
        ink.append(ink_fraction(frame))
        hues.append(distinct_hues(frame))

    diffs = []
    prev = None
    for frame in ffmpeg_frames(path, MOTION_FPS, MOTION_W, MOTION_H, gray=True):
        cur = frame.astype(np.float32)
        if prev is not None:
            diffs.append(float(np.abs(cur - prev).mean()))
        prev = cur

    diffs_a = np.array(diffs, dtype=np.float64)
    static = diffs_a < STATIC_THRESH
    pct_static = 100.0 * static.mean() if static.size else 0.0
    # longest consecutive run of static pairs
    longest = cur_run = 0
    for flag in static:
        cur_run = cur_run + 1 if flag else 0
        longest = max(longest, cur_run)
    longest_sec = longest / MOTION_FPS

    return {
        "n_ink_frames": len(ink),
        "ink_median": float(np.median(ink)),
        "ink_p90": float(np.percentile(ink, 90)),
        "ink_min": float(np.min(ink)),
        "ink_max": float(np.max(ink)),
        "n_frame_pairs": int(diffs_a.size),
        "static_pct": float(pct_static),
        "longest_static_run_sec": float(longest_sec),
        "mean_abs_diff_median": float(np.median(diffs_a)) if diffs_a.size else 0.0,
        "hue_median": float(np.median(hues)),
        "hue_min": int(np.min(hues)),
        "hue_max": int(np.max(hues)),
    }


def main():
    clips = sorted(f for f in os.listdir(DIR) if f.endswith(".mp4"))
    results = {}
    for name in clips:
        print(f"measuring {name} ...", flush=True)
        results[name] = measure(os.path.join(DIR, name))

    keys = [
        ("ink_median", "ink coverage (median)"),
        ("ink_p90", "ink coverage (p90)"),
        ("static_pct", "static frame-pairs %"),
        ("longest_static_run_sec", "longest static run (s)"),
        ("hue_median", "distinct hues (median)"),
    ]
    pooled = {}
    for k, _ in keys:
        vals = [results[c][k] for c in clips]
        pooled[k] = {
            "median": float(np.median(vals)),
            "min": float(np.min(vals)),
            "max": float(np.max(vals)),
        }

    out = {
        "config": {
            "ink_fps": INK_FPS, "ink_quant": QUANT,
            "motion_fps": MOTION_FPS, "motion_size": [MOTION_W, MOTION_H],
            "static_threshold_mean_abs_diff": STATIC_THRESH,
            "hue_sat_min": SAT_MIN, "hue_val_min": VAL_MIN,
            "hue_buckets": HUE_BUCKETS, "hue_min_frac_of_frame": HUE_MIN_FRAC,
            "normalization": "1280x720 / 30fps / crf22 / 25s",
        },
        "clips": results,
        "pooled": pooled,
        "n_clips": len(clips),
    }
    with open(os.path.join(DIR, "ref_motion.json"), "w") as fh:
        json.dump(out, fh, indent=2)

    # per-clip table
    hdr = f"{'clip':<20} {'ink_med':>8} {'ink_p90':>8} {'static%':>8} {'run_s':>7} {'hues':>5} {'pairs':>6}"
    print("\n" + hdr)
    print("-" * len(hdr))
    for c in clips:
        r = results[c]
        print(f"{c[:-4]:<20} {r['ink_median']:>8.4f} {r['ink_p90']:>8.4f} "
              f"{r['static_pct']:>8.1f} {r['longest_static_run_sec']:>7.2f} "
              f"{r['hue_median']:>5.1f} {r['n_frame_pairs']:>6d}")

    print("\nPOOLED across clips")
    hdr2 = f"{'metric':<26} {'median':>10} {'min':>10} {'max':>10}"
    print(hdr2)
    print("-" * len(hdr2))
    for k, label in keys:
        p = pooled[k]
        print(f"{label:<26} {p['median']:>10.4f} {p['min']:>10.4f} {p['max']:>10.4f}")


if __name__ == "__main__":
    main()
