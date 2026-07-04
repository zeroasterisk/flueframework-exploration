# Session State — Reboot File

> Last updated: 2026-07-04
> Purpose: Complete context dump so a new CloudCode session can resume exactly where we left off.

---

## Current Active Work

### Security Deep Dive Video — v3 (IN PROGRESS)

**Status:** SCENES.md written (818 lines). Ready to implement.

**Next immediate action:**
```
Load skill: manimce-best-practices
Then implement:
  ~/Workspaces/scratchpad/open-source/flueframework-exploration/guides/video/scenes/security/security_deep_dive.py
  (replace from scratch — v1 and v2 are both rejected)
Then render -ql (low quality) for frame review
Then render -qh (1080p60) for production
Then run QA:
  GOOGLE_CLOUD_PROJECT=alanblount-sandbox GOOGLE_CLOUD_LOCATION=global GOOGLE_GENAI_USE_ENTERPRISE=true \
  ~/Workspaces/open-source/OpenMontage/.venv/bin/python \
  ~/Workspaces/open-source/OpenMontage/.claude/skills/video-qa/tools/video_qa.py \
  <rendered_mp4_path>
Then commit if APPROVED (P1 ≥6.5, P2 ≥7.5)
```

**Key files:**
```
SCENES.md (v3 — new):
  ~/Workspaces/scratchpad/open-source/flueframework-exploration/guides/video/scenes/security/SCENES.md
  818 lines. Complete scene-by-scene plan with Manim implementation notes.

Scene source (to be written):
  ~/Workspaces/scratchpad/open-source/flueframework-exploration/guides/video/scenes/security/security_deep_dive.py

PDF visual analysis (source material):
  ~/Downloads/pdf-slides/combined_analysis.md           — cross-deck synthesis
  ~/Downloads/pdf-slides/governance/analysis.md         — governance deck (most relevant)
  ~/Downloads/pdf-slides/pitch/analysis.md              — pitch deck
  ~/Downloads/pdf-slides/differentiators/analysis.md    — differentiators deck

Copies in repo:
  ~/Workspaces/scratchpad/open-source/flueframework-exploration/guides/video/scenes/security/pdf_visual_analysis.md
  ~/Workspaces/scratchpad/open-source/flueframework-exploration/guides/video/scenes/security/pdf_governance_analysis.md

Old renders (REJECTED — do not use as reference):
  guides/video/scenes/security/renders/SecurityDeepDive-1080p60.mp4       (v1)
  guides/video/scenes/security/renders/SecurityDeepDive-1080p60-v2.mp4    (v2)
```

---

## Alan's Corrections (MUST respect in v3)

1. **Agent workload identity is INDEPENDENT of the human caller.**
   It is the agent-AS-SERVICE identity (like a Cloud Run service account).
   SPIFFE/X.509 attests the workload. Show: identity issued at agent startup, BEFORE any request arrives.
   SCENES.md Scene 3 implements this via explicit timeline: `[Agent starts]` → `[Identity issued]` → `[Request arrives]`
   Key text: "Identity = the agent process. Not who called it."

2. **NOT Flue-centric.**
   Show 6 framework nodes throughout: ADK (blue `#4285F4`), LangChain (purple `#9B59B6`),
   CrewAI (orange `#FF8C00`), AutoGen (teal `#16A085`), Custom A (gray `#7F8C8D`), Custom B (gray `#95A5A6`).
   These persist through ALL scenes. "Flue" does not appear.

3. **Single coherent aha moment:**
   "Govern agents the same way you govern everything else."
   Scene 6 shows three-column parallel table:
     People → Login/SSO → IAM Roles → Audit Logs
     Cloud Services → Service Account → IAM Roles → Cloud Trace
     AI Agents → Workload Identity → Agent Gateway → Observability

---

## SCENES.md Summary (v3)

| Scene | Name | Duration | Purpose |
|-------|------|----------|---------|
| 1 | The Agent Explosion | ~8s | Establish 6 framework nodes, proliferation as neutral fact |
| 2 | The Sprawl Problem | ~18s | Nodes connect to everything, lines go chaotic, red alert |
| 3 | Workload Identity | ~22s | Identity issued at startup (before request), hexagonal badge/seal |
| 4 | The Gateway | ~22s | All 6 frameworks route through one tower; ACCESS BLOCKED moment |
| 5 | Observable Topology | ~20s | Chaos transforms to clean traced network; telemetry appears |
| 6 | The Aha Moment | ~20s | Three-column parallel table; "govern like everything else" |

**Persistence contract (critical for visual continuity):**
- `chaos_lines`, `service_nodes`, `agent_nodes` from Scene 2 are DIMMED (opacity=0.08) in Scenes 3-4
- They are RESTORED and TRANSFORMED in Scene 5 — never FadeOut entirely

---

## Video Series Status

| # | Video | Status |
|---|-------|--------|
| 1 | Flue Deployment Story | DONE |
| 2 | Security Deep Dive | v3 IN PROGRESS (SCENES.md ready, implement next) |
| 3 | Optimization Deep Dive | NOT STARTED |
| 4 | A2A Protocol Explainer | APPROVED (P1:7.7, P2:8.7) |
| 5 | Per-Framework A2A Series | BLOCKED (needs factory Phase 2) |

---

## Environment & Commands

### Manim render
```bash
export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
cd ~/Workspaces/scratchpad/open-source/flueframework-exploration/guides/video/scenes/security

# Low quality (frame review):
~/Workspaces/open-source/OpenMontage/.venv/bin/manim -ql security_deep_dive.py SecurityDeepDive

# Production (1080p60):
~/Workspaces/open-source/OpenMontage/.venv/bin/manim -qh --fps 60 security_deep_dive.py SecurityDeepDive
```

### QA tool
```bash
GOOGLE_CLOUD_PROJECT=alanblount-sandbox \
GOOGLE_CLOUD_LOCATION=global \
GOOGLE_GENAI_USE_ENTERPRISE=true \
~/Workspaces/open-source/OpenMontage/.venv/bin/python \
~/Workspaces/open-source/OpenMontage/.claude/skills/video-qa/tools/video_qa.py \
<path_to_mp4>
```
QA gates: Pass 1 (gemini-3.1-flash-lite) ≥6.5, Pass 2 (gemini-3.5-flash) ≥7.5 = APPROVED
Hard floor: broken/overlapping visuals cap score at ≤4 regardless of content.

### Python venv
```bash
# OpenMontage venv (Manim + google-genai + pyopenssl):
~/Workspaces/open-source/OpenMontage/.venv/bin/python
~/Workspaces/open-source/OpenMontage/.venv/bin/manim

# Never use bare `python` or `python3` — always explicit path or activate venv
```

### PDF slide images (already rendered, available for re-analysis)
```
~/Downloads/pdf-slides/pitch/         (72 slides)
~/Downloads/pdf-slides/differentiators/ (25 slides)
~/Downloads/pdf-slides/governance/    (96 slides)
~/Downloads/pdf-slides/analyze_slides.py   # re-run to regenerate analysis
```

---

## Key Gotchas

- **Transform residue**: After `Transform(src, dst)`, Manim keeps `src` on screen. Always include `src` in FadeOut groups explicitly.
- **`\n` in Text()**: Works for line breaks in ManimCE.
- **Verdana font**: Available on macOS, use throughout for consistency with other videos.
- **Background color**: `#F8F9FA` (light Google brand), set at class level. Text uses `#3C4043`, NOT WHITE.
- **FFmpeg PATH**: Must `export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"` before rendering.
- **No SVGMobject for logos**: Licensing. Use RoundedRectangle + Text label for framework nodes.
- **Files API not available** in Gemini enterprise client — use `Part.from_bytes()` inline or GCS URIs.
- **PyOpenSSL** must be installed in OpenMontage venv for Gemini API calls.

---

## A2A Integration Factory Status

Repo: `~/Workspaces/scratchpad/open-source/a2a-integration-factory/`

| Framework | Status |
|-----------|--------|
| agno | QA1+2 done, ai-catalog done, QA3 pending |
| smolagents | QA1+2 done, ai-catalog done, QA3 pending |
| pydantic-ai | QA1 done, ai-catalog done, QA3 pending |
| strands | RESEARCH.md done — native A2A in strands-agents[a2a] 1.45.0, lane pivoted to conformance |
| mastra | RESEARCH.md done — native A2A in @mastra/core 1.48.0, lane pivoted to conformance |
| flue | Phase 1+2 complete, Phase 3 pending (blocked on gcloud auth) |

Next for factory: QA round 3 (vs Flue reference), conformance suite in `tools/conformance/`.

---

## GCP Config

- Project: `alanblount-sandbox`
- Region: `us-east5`
- App credentials: `~/alanblount-sandbox-b4787d905b28.json` (local only, never commit)
- Vertex AI: `CLAUDE_CODE_USE_VERTEX=1`, `CLOUD_ML_REGION=us-east5`
- Gemini enterprise: `GOOGLE_CLOUD_PROJECT=alanblount-sandbox GOOGLE_CLOUD_LOCATION=global GOOGLE_GENAI_USE_ENTERPRISE=true`
