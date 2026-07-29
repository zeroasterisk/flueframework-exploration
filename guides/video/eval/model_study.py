#!/usr/bin/env python3
"""
Model comparison study: forced-choice video grading with Gemini models.
Each model is asked to pick the better video for a given property.
Ground truth: clean (none.mp4) always beats the defect video.
"""

import base64
import json
import os
import re
import time
from pathlib import Path

from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CORPUS = Path("/Users/alanblount/Workspaces/scratchpad/open-source/flueframework-exploration/guides/video/eval/corpus_abl")
OUTPUT = CORPUS.parent / "model_study.json"

BASELINE = "none.mp4"

PAIRS = {
    "font_ttc_bug":  "correct, unbroken rendering of every word",
    "rushed_pacing": "pacing that gives a viewer time to absorb each idea",
    "card_itis":     "a minimal idea-first visual style rather than a software-UI look",
    "color_spray":   "disciplined, restrained use of colour",
    "text_flood":    "restraint in the amount of on-screen text",
    "light_bg":      "conformance to a dark, theatrical explainer aesthetic",
    "cut_not_morph": "visual continuity when one idea becomes another",
    "overlap_nodes": "a clean layout with no colliding or overlapping elements",
}

MODELS = [
    "publishers/google/models/gemini-2.0-flash-001",
    "publishers/google/models/gemini-2.0-flash-lite-001",
    "publishers/google/models/gemini-2.5-flash",
    "publishers/google/models/gemini-2.5-flash-lite",
    "publishers/google/models/gemini-3.1-flash-lite",
    "publishers/google/models/gemini-3.5-flash",
    "publishers/google/models/gemini-3.6-flash",
]

SEEDS = [0, 1]
INTER_CALL_SLEEP = 10   # seconds between calls
RATE_LIMIT_SLEEP = [60, 120, 240]  # backoff for 429

PROMPT_TEMPLATE = """\
You are shown two short silent videos, A and B. They show the same animation and differ in exactly one respect.

Which better exhibits: {prop}?

Reply with strict JSON only — no markdown, no explanation outside the JSON:
{{"choice": "A" or "B", "because": "<one sentence: what you observed that decided it>"}}"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
client = genai.Client(vertexai=True, project="alanblount-sandbox", location="global")


def load_video_bytes(path: Path) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def video_part(data: bytes) -> types.Part:
    return types.Part.from_bytes(data=data, mime_type="video/mp4")


def parse_choice(text: str) -> str | None:
    """Extract 'A' or 'B' from JSON response, handling markdown fences."""
    # strip markdown fences
    text = re.sub(r"```[a-z]*\n?", "", text).strip()
    try:
        obj = json.loads(text)
        c = obj.get("choice", "").strip().upper()
        if c in ("A", "B"):
            return c
    except json.JSONDecodeError:
        pass
    # fallback: regex scan
    m = re.search(r'"choice"\s*:\s*"([AB])"', text, re.IGNORECASE)
    if m:
        return m.group(1).upper()
    return None


def call_model(model: str, video_a: bytes, video_b: bytes, prop: str) -> dict:
    """Send one forced-choice request. Returns dict with choice, because, raw."""
    prompt = PROMPT_TEMPLATE.format(prop=prop)
    contents = [
        video_part(video_a),
        video_part(video_b),
        types.Part.from_text(text=prompt),
    ]
    for attempt, backoff in enumerate([0] + RATE_LIMIT_SLEEP):
        if backoff:
            print(f"      [429 backoff {backoff}s attempt {attempt}]")
            time.sleep(backoff)
        try:
            resp = client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    max_output_tokens=800,
                    temperature=0.0,
                ),
            )
            raw = resp.text or ""
            choice = parse_choice(raw)
            return {"choice": choice, "raw": raw[:400]}
        except Exception as e:
            msg = str(e)
            if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
                if attempt < len(RATE_LIMIT_SLEEP):
                    continue
            return {"choice": None, "raw": f"ERROR: {msg[:200]}"}
    return {"choice": None, "raw": "ERROR: max retries exceeded"}


def run_pair(model: str, defect_name: str, prop: str,
             clean_bytes: bytes, defect_bytes: bytes) -> dict:
    """
    Run both orderings for both seeds.
    Returns per-seed results.
    """
    results = []
    for seed in SEEDS:
        seed_result = {"seed": seed, "order1": None, "order2": None}

        # Order 1: A=clean (correct=A)
        print(f"    seed={seed} order=AB (clean=A) ...", flush=True)
        r1 = call_model(model, clean_bytes, defect_bytes, prop)
        seed_result["order1"] = {**r1, "correct_answer": "A"}
        time.sleep(INTER_CALL_SLEEP)

        # Order 2: A=defect (correct=B)
        print(f"    seed={seed} order=BA (clean=B) ...", flush=True)
        r2 = call_model(model, defect_bytes, clean_bytes, prop)
        seed_result["order2"] = {**r2, "correct_answer": "B"}
        time.sleep(INTER_CALL_SLEEP)

        results.append(seed_result)

    return {"defect": defect_name, "prop": prop, "seeds": results}


def classify_pair_result(seeds: list) -> str:
    """
    Aggregate both orderings across both seeds.
    Returns: correct | inverted | position_A | position_B | undecided
    """
    o1_choices = [s["order1"]["choice"] for s in seeds]
    o2_choices = [s["order2"]["choice"] for s in seeds]

    # check parse failures
    all_choices = o1_choices + o2_choices
    if all(c is None for c in all_choices):
        return "undecided"

    # For order1: correct=A, for order2: correct=B
    correct_count = sum(
        1 for c in o1_choices if c == "A"
    ) + sum(
        1 for c in o2_choices if c == "B"
    )
    total_valid = sum(
        1 for c in o1_choices + o2_choices if c is not None
    )
    wrong_count = total_valid - correct_count

    all_A = all(c == "A" for c in all_choices if c is not None)
    all_B = all(c == "B" for c in all_choices if c is not None)

    if total_valid == 0:
        return "undecided"
    if all_A:
        return "position_A"
    if all_B:
        return "position_B"
    if correct_count > wrong_count:
        return "correct"
    if wrong_count > correct_count:
        return "inverted"
    # tie
    return "undecided"


def accuracy_for_pair(seeds: list) -> float | None:
    """Returns fraction correct out of valid trials."""
    o1_choices = [s["order1"]["choice"] for s in seeds]
    o2_choices = [s["order2"]["choice"] for s in seeds]
    all_choices = o1_choices + o2_choices

    correct = sum(1 for c in o1_choices if c == "A") + sum(1 for c in o2_choices if c == "B")
    total_valid = sum(1 for c in all_choices if c is not None)
    if total_valid == 0:
        return None
    return correct / total_valid


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    print("Loading video bytes...", flush=True)
    clean_bytes = load_video_bytes(CORPUS / BASELINE)
    defect_bytes_map = {
        name: load_video_bytes(CORPUS / f"{name}.mp4")
        for name in PAIRS
    }
    print(f"  Loaded {len(defect_bytes_map)+1} videos\n")

    all_results = {}

    for model in MODELS:
        short = model.split("/")[-1]
        print(f"\n{'='*60}")
        print(f"MODEL: {short}")
        print(f"{'='*60}")
        model_results = {}

        for defect_name, prop in PAIRS.items():
            print(f"  Pair: {defect_name}", flush=True)
            pair_data = run_pair(
                model, defect_name, prop,
                clean_bytes, defect_bytes_map[defect_name]
            )
            pair_data["classification"] = classify_pair_result(pair_data["seeds"])
            pair_data["accuracy"] = accuracy_for_pair(pair_data["seeds"])
            model_results[defect_name] = pair_data
            print(f"    -> {pair_data['classification']} (acc={pair_data['accuracy']})")

        all_results[model] = model_results

    # Save JSON
    print(f"\nSaving results to {OUTPUT}...")
    with open(OUTPUT, "w") as f:
        json.dump(all_results, f, indent=2)
    print("Done.")

    # Print summary tables
    print_summary(all_results)


def print_summary(all_results: dict):
    defect_names = list(PAIRS.keys())
    model_names = list(all_results.keys())
    short_models = [m.split("/")[-1] for m in model_names]

    print("\n" + "="*80)
    print("ACCURACY TABLE (model vs defect)")
    print("="*80)

    # Header
    col_w = 14
    print(f"{'Model':<26}", end="")
    for d in defect_names:
        print(f"{d[:col_w]:>{col_w}}", end="")
    print(f"{'MEAN':>{col_w}}")

    print("-" * (26 + col_w * (len(defect_names) + 1)))

    model_means = {}
    for model, short in zip(model_names, short_models):
        mdata = all_results[model]
        accs = []
        print(f"{short:<26}", end="")
        for d in defect_names:
            acc = mdata[d]["accuracy"]
            cls = mdata[d]["classification"]
            if acc is None:
                cell = "?"
            else:
                cell = f"{acc:.0%}"
                if cls == "undecided":
                    cell = "?"
            print(f"{cell:>{col_w}}", end="")
            if acc is not None:
                accs.append(acc)
        mean = sum(accs) / len(accs) if accs else 0.0
        model_means[model] = mean
        print(f"{mean:.0%}".rjust(col_w))

    print("\n" + "="*80)
    print("PER-MODEL SUMMARY")
    print("="*80)
    for model, short in zip(model_names, short_models):
        mdata = all_results[model]
        mean = model_means[model]
        reliable = [d for d in defect_names if mdata[d]["accuracy"] is not None and mdata[d]["accuracy"] >= 0.85]
        weak = [d for d in defect_names if mdata[d]["accuracy"] is not None and 0.60 <= mdata[d]["accuracy"] < 0.85]
        inverted = [d for d in defect_names if mdata[d]["classification"] == "inverted"]
        print(f"\n{short}")
        print(f"  Mean accuracy: {mean:.1%}")
        print(f"  Reliable (>=85%): {reliable or 'none'}")
        print(f"  Weak (60-84%): {weak or 'none'}")
        print(f"  Inverted: {inverted or 'none'}")

    # Overall winner
    best_model = max(model_means, key=model_means.get)
    best_short = best_model.split("/")[-1]
    print(f"\n{'='*80}")
    print(f"BEST MODEL: {best_short} (mean acc={model_means[best_model]:.1%})")
    print("="*80)


if __name__ == "__main__":
    main()
