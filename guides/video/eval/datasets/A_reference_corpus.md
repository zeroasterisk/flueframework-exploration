# Dataset A — Reference corpus with human ground truth

Purpose: **calibration anchors.** Establish what the top and bottom of the
scale actually look like, and provide human-labeled items to validate the
grader's ranking against.

We have never scored a real 3Blue1Brown video. Until we do, we do not know
whether our rubric would even pass the thing we are trying to imitate — and
a rubric that fails its own exemplar is measuring the wrong thing.

---

## A1. Positive anchors — real 3Blue1Brown

Licensing: fetch for **local, internal evaluation only.** Do not
redistribute, do not commit the media files, do not upload to shared
buckets. Keep under `eval/corpus/3b1b/` (gitignored).

Use **60–90 second excerpts**, not full videos — cheaper, and matches the
length of what we produce. Prefer excerpts that are pure visual explanation
(skip intros/sponsor reads).

| id | source | why chosen | excerpt |
|---|---|---|---|
| `3b1b-linalg-vectors` | Essence of Linear Algebra, Ch.1 "Vectors" | canonical morph-driven geometry; minimal text | 02:00–03:30 |
| `3b1b-nn-what-is` | "But what *is* a neural network?" Ch.1 | node/edge network diagrams — closest structural analogue to our agent-topology scenes | 03:00–04:30 |
| `3b1b-fourier` | "But what is a Fourier series?" | dense simultaneous motion done well; tests our "one thing at a time" assumption | 01:30–03:00 |
| `3b1b-eulers-formula` | "Euler's formula with introductory group theory" | abstract concept made concrete via a single sustained visual metaphor | 04:00–05:30 |

Fetch (requires `yt-dlp`; run manually, not committed):

```bash
mkdir -p eval/corpus/3b1b && cd eval/corpus/3b1b
# resolve URLs from https://www.3blue1brown.com/ ; then per clip:
yt-dlp -f "bestvideo[height<=1080]+bestaudio" --merge-output-format mp4 \
       --download-sections "*02:00-03:30" -o "3b1b-linalg-vectors.mp4" "<URL>"
```

**Normalize before use** so encode settings can't leak (see METHODOLOGY §2):

```bash
ffmpeg -i in.mp4 -vf "scale=1920:1080,fps=60" -c:v libx264 -crf 20 -an out.mp4
```

Audio: strip it (`-an`). Our videos have none; leaving narration in gives
3b1b an unfair channel and confounds the comparison.

## A2. Negative & mid anchors — our own renders

**These already have human ground-truth labels.** Alan's reactions are the
most valuable data in this project and cost nothing extra to use.

| id | path | Alan's verdict (ground truth) | band |
|---|---|---|---|
| `ours-v1` | `scenes/security/renders/SecurityDeepDive-1080p60.mp4` | rejected | LOW |
| `ours-v2` | `scenes/security/renders/SecurityDeepDive-1080p60-v2.mp4` | rejected | LOW |
| `ours-v3` | **LOST** — render and source overwritten by v4 | approved by QA, then ~15 substantive corrections from Alan | MID |
| `ours-v4` | `scenes/security/media/videos/security_deep_dive/1080p60/SecurityDeepDive.mp4` | "looks a lot better" + still: kerning, animation, timing problems | MID |
| `ours-a2a` | `scenes/a2a-protocol/renders/A2AProtocolExplainer-1080p60.mp4` | approved & shipped | MID-HIGH |
| `ours-pilot1` | `style-pilots/media/videos/pilot_01_identity_ceremony/1080p60/IdentityCeremony.mp4` | **pending** | ? |

> **Recover v3 if possible** (`git log`/`git show` on `security_deep_dive.py`).
> It is our only item with rich, itemized human feedback. Going forward:
> archive render + source together, per version.

### Known ordering constraints (partial ground truth)

From Alan's own statements, these must hold in any valid ranking:

```
3b1b-*        >  ours-pilot1?     (target vs first attempt at target)
ours-v4       >  ours-v2 > ours-v1   ("looks a lot better"; v1/v2 rejected)
ours-a2a      >  ours-v1, ours-v2    (shipped vs rejected)
```

The grader must reproduce these. **It currently does not:** v4 scored 9.0/10
— higher than anything else measured — despite Alan immediately listing
kerning, animation, and timing defects. A grader whose top score goes to a
video the human then sends back is anti-correlated where it matters most.

## A3. Human ranking task *(the one irreplaceable input)*

Ask Alan for **forced-choice pairwise judgments**, not scores. Humans are
unreliable at absolute scoring and reliable at comparison.

Protocol:
- 8 clips → present ~15 pairs (not all 28; use a sorting-efficient subset).
- Randomize order and left/right position.
- One question only: *"Which is closer to the target: a patient, idea-first
  technical explainer in the 3Blue1Brown tradition?"*
- Allow "too close to call."
- ~20 minutes total.

Derive a Bradley-Terry / Elo ranking from the pairs. That ranking is ground
truth for Phase 3's Spearman ρ.

**Store results in** `datasets/A_human_ranking.json` (create when collected):

```json
{
  "collected": "YYYY-MM-DD",
  "judge": "alanblount",
  "pairs": [
    {"a": "ours-v4", "b": "3b1b-nn-what-is", "winner": "3b1b-nn-what-is",
     "note": "optional free text"}
  ]
}
```

## A4. What we learn from this dataset

1. **Where does real 3b1b score on our rubric?** If it fails the 6.5 gate,
   the rubric is invalid — full stop. This is the single most informative
   number we can collect and it costs one API call.
2. **Does the grader reproduce the known ordering?** (Spearman ρ ≥ 0.7)
3. **Does it put v4 above or below a12/pilot?** Currently it ranks v4 top,
   which contradicts the human.
4. **What is the actual score range?** If everything lands 7–9, the
   instrument has no resolution and the thresholds are meaningless.
