# A2A Protocol Explainer — Scene

3Blue1Brown-style explainer of the A2A protocol. ~26.6s, 5 chapters, 32 animations.

- Scene source: [`a2a_protocol.py`](a2a_protocol.py) (`A2AProtocolExplainer`)
- Storyboard + feedback log: [`STORYBOARD.md`](STORYBOARD.md)
- Style guide: [`../../plans.md`](../../plans.md)

## Render

```bash
# prereqs (macOS): brew install cairo pango pkgconf && uv tool install manim
manim -ql --format=mp4 a2a_protocol.py A2AProtocolExplainer   # 480p15 iterate
manim -qm --format=mp4 a2a_protocol.py A2AProtocolExplainer   # 720p30 review
manim -qh --format=mp4 a2a_protocol.py A2AProtocolExplainer   # 1080p60 production
```

Output lands in `media/videos/a2a_protocol/<quality>/A2AProtocolExplainer.mp4`
(`media/` is gitignored).

## Outputs

| Version | Spec | Location | Notes |
|---|---|---|---|
| v1 | 1080p60, 26.6s, 1.6MB | [`renders/A2AProtocolExplainer-1080p60.mp4`](renders/A2AProtocolExplainer-1080p60.mp4) | committed as exception — GCS auth unavailable at render time |
| v1 | GCS | `gs://alanblount-demo_cloudbuild/manim-output/A2AProtocolExplainer-1080p60.mp4` | **pending upload** — run `gsutil cp renders/*.mp4 gs://alanblount-demo_cloudbuild/manim-output/` after `gcloud auth login`, then remove the committed MP4 |

## Review notes (v1, from -ql frame review)

- Ch2 title transform overlaps briefly at ~5s (Transform between different-length
  titles) — acceptable at speed; could switch to FadeOut/FadeIn crossfade in v2
- Mesh edges clipped to node boundaries via `get_boundary_point` — keeps labels clean
- Text uses default font; consider CMU Serif or Inter for closer 3b1b look in v2
