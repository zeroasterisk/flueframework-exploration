# Video QA — project findings and corpus

> **Method, datasets, and tooling live in the reusable skill:**
> `~/Workspaces/skills/manim-video-quality/` (`zeroasterisk/skills`).
>
> This file holds only what is specific to *this* project: the evidence
> gathered from our own renders, our corpus entries, and our plan of work.

---

## Status: our QA scores are not trustworthy

Every QA score previously reported in this repo should be treated as
approximately meaningless. The pipeline was never validated. Full method and
the generic failure modes are documented in the skill; the project-specific
evidence is below.

### Evidence gathered from our renders

1. **Metadata leakage — 1.90 points on a byte-identical video.**
   Measured on `style-pilots/.../IdentityCeremony.mp4` (1080p60). Varying only
   the auto-appended metadata text moved the score 7.56 → 5.66 (within-condition
   SD ≈0.2, so ~6.5σ). `professional_polish` fell 7.67 → 4.67 because the
   prompt said "FPS: 15.0".
   Cause: `video_qa.py::build_context()` appends ffprobe metadata to every
   prompt, and Gemini samples video at 1 FPS so it cannot perceive playback
   frame rate at all.
   **This invalidates the earlier claim that Pilot 1's 7.5 → 8.8 jump proved
   "60fps fixed the jitter."** It did not.
   Repro: `manim-video-quality/scripts/exp_metadata_leakage.py`

2. **The grader broke its own hard rule on v4.** The rubric states
   mis-rendered glyphs force that dimension ≤4 and the video "cannot average
   above 6.0". v4 contains four mis-rendered words (`Lang Chain`,
   `Pyd antic`, `Op enClaw`, `Antig ravity` — verified at 4K). It scored
   `text_readability: 9/10`, average **9.0**.

3. **Our scores were coached.** v3 scored 4.7 with no context file and 8.3
   with `qa-context.md`, which was written *after* seeing the 4.7 and contained
   "do not penalize this scene for looking cluttered". The same actor wrote
   the video, wrote the grading context, tuned it post-hoc, and reported the
   result as validation.

4. **v3 is unrecoverable.** Its render and source were both overwritten by
   v4. It is our only item with rich itemized human feedback. Recover from git
   history if possible; going forward archive render + source together.

## Plan of work

Phases and validation bars are defined in the skill
(`manim-video-quality/SKILL.md` and `reference/gemini-video-analysis.md` §8).
Project-specific status:

- [ ] **Phase 0 — stop the bleeding**
  - [ ] Stop reporting "APPROVED"; QA is advisory only
  - [ ] De-coach `scenes/security/qa-context.md` (remove "do not penalize…")
  - [ ] Recover v3 from git history if possible
  - [ ] Annotate existing `*.qa-report.md` files in this repo as unvalidated
- [ ] **Phase 1 — corpus** — see `datasets/A_reference_corpus.md`
  - [ ] Fetch 3b1b reference clips into `corpus/` (gitignored)
  - [ ] Collect Alan's pairwise ranking (~20 min, the one irreplaceable input)
- [ ] **Phase 2 — ablations** — render the skill's generator, 9 variants
- [ ] **Phase 3 — meta-eval** — measure the grader against A/B/C
- [ ] **Phase 4/5 — rebuild rubric, re-validate, set real thresholds**
- [ ] **Phase 6 — resume video production** with a signal we can trust

## Files here

| File | Purpose |
|---|---|
| `datasets/A_reference_corpus.md` | Our corpus: reference clips + our renders with Alan's verdicts as ground truth |
| `.gitignore` | Keeps `corpus/` media out of git |

Related, elsewhere in this repo:
`scenes/security/REVIEW.md` (v4 feedback tracker),
`scenes/security/qa-context.md` (pre-registration — currently non-compliant),
`style-pilots/PILOT_LOG.md` (style calibration results).
