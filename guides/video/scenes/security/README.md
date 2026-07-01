# Security Deep Dive — Scene

Five-layer GEAP security stack for Flue agents on Google Cloud. ~30.6s, 5 chapters, 48 animations.
Narrative pattern: Unprotected → Protected (Pattern 3: Two Perspectives → Unity).

- Scene source: [`security_deep_dive.py`](security_deep_dive.py) (`SecurityDeepDive`)
- Scene plan (manim-composer output): [`SCENES.md`](SCENES.md)
- Storyboard: [`STORYBOARD.md`](STORYBOARD.md)
- Style guide: [`../../plans.md`](../../plans.md)

## Process notes

**Planned correctly this time:** used the `manim-composer` skill (via subagent to Opus) to
produce `SCENES.md` before writing any code. Scene plan details: narrative pattern, pentagon
ring positions, color exclusivity (PURPLE_ACC only for security), implementation order (Scene 5
first to pin positions). Scene implemented per `manimce-best-practices` skill (smooth rate
functions, 0.4–1.2s per animation, `self.wait()` pacing, Transform residue handling).

## Render

```bash
export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
# prereqs: brew install cairo pango pkgconf ffmpeg && uv tool install manim
manim -ql --format=mp4 security_deep_dive.py SecurityDeepDive   # 480p15 iterate
manim -qm --format=mp4 security_deep_dive.py SecurityDeepDive   # 720p30 review
manim -qh --format=mp4 security_deep_dive.py SecurityDeepDive   # 1080p60 production
```

## Outputs

| Version | Spec | Location | Notes |
|---|---|---|---|
| v1 | 1080p60, 30.6s, 1.8MB | [`renders/SecurityDeepDive-1080p60.mp4`](renders/SecurityDeepDive-1080p60.mp4) | committed; GCS upload pending |
| v1 | GCS | `gs://alanblount-demo_cloudbuild/manim-output/SecurityDeepDive-1080p60.mp4` | **pending** — run `gsutil cp renders/*.mp4 gs://...` after `gcloud auth login` |

## Review notes (v1)

- Transform residue: Manim keeps original mobject on-screen after `Transform(src, dst)` — the
  `src` callers VGroup was explicitly added to `to_fade` in Scene 5 to avoid ghost duplicates
- IAP badge positioning: attached to inbound arrow midpoint + UP offset — visually clear but
  somewhat detached from the arrow. v2: use `always_redraw` or anchor to arrow directly
- Scene 3 Gateway: gateway and Flue Agent nodes overlap slightly at -ql; fine at 1080p
- v2 ideas: add subtle DashedVMobject silo rings in Scene 1 (mirror Video 4), add CurvedArrow
  between ring nodes in Scene 5 to reinforce "interlocking" metaphor
