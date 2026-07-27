# Style Pilot Log

Tracks each small calibration pilot: what was tested, QA results, and what
we learned. Read `../visual-style.md` and `../storytelling-cheatsheet.md`
first for the vocabulary and spec these pilots are calibrating against.

---

## Pilot 1: Workload Identity Ceremony (2026-07-05)

**File:** `pilot_01_identity_ceremony.py` (Scene: `IdentityCeremony`, 35s)

**What it tested:** the full visual-style.md pivot in one small, self-contained
beat — dark near-black background, thin unfilled/low-opacity shapes instead
of card-style UI chrome, Roboto font, slow patient pacing (run_time 1.5-3s,
wait 2-4s), a `MovingCameraScene` push-in instead of a hard cut, exactly one
caption (appearing only after the visual fully resolves), and a single
reserved Google-brand color (Green) for the one semantic "confirmed" moment.

**Results:**

| Render | Pass 1 (visual designer) |
|---|---|
| `-ql` 480p15 | 7.5/10 — gate passed |
| `-qh` 1080p60 | **8.8/10** — gate passed |

Ran Pass 1 only (`--no-gate`) with a pilot-specific context file explaining
this is a calibration exercise, not finished marketing content — told the
QA model explicitly not to penalize minimal text, sparse frames, or absence
of a CTA (see `pilot-context.md`).

**What worked (keep doing this):**
- Color discipline scored 10/10 at production quality — blue (generic
  agent) / gold (special entity) / green (reserved, confirmed-state-only)
  read as clearly intentional, not arbitrary.
- The dark canvas + thin stroke + low fill_opacity look reads as "idea
  explainer," not "software dashboard" — directly addresses the "card-itis"
  anti-pattern named in visual-style.md.
- Single end-of-beat caption (vs. v1-v4's multiple simultaneous text labels)
  scored well on readability and didn't compete with the visual.
- Camera push-in (`MovingCameraScene`) scored well on transition_quality —
  cheap to add, clear improvement over a hard cut.

**What to fix / watch:**
- The -ql (15fps) preview render itself looked "stuttery" to the QA model —
  expected, but means style judgments should wait for a `-qh` pass, not the
  `-ql` iteration render. Don't over-index on `-ql` visual quality during
  the fast dev loop; use it for layout/timing correctness only.
- Suggestion from QA: ease the hexagon's `Create` animation curve to feel
  more "organic" — minor, worth trying in the next pilot.
- Not yet tested: how this style handles MORE than 2 entities on screen at
  once (this pilot only ever has 2 objects visible). The real video's
  sprawl/gateway/table scenes have far more simultaneous elements — that's
  the harder test of whether "thin unfilled shapes + generous negative
  space" still reads clearly at higher density. Good candidate for Pilot 2.

**Verdict:** proceed with this direction. Confirmed Roboto font fix carries
over cleanly (no phantom-gap issues in this render either).
