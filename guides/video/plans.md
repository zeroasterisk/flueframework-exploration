# Video Production Plans — Flue Framework Exploration

> **For agents:** Each video below is an independent work unit. Before starting one, read
> "Repo Layout & Asset Provenance" and the video's brief (status, prerequisites, acceptance
> criteria). Scene source code MUST be committed to this repo under `guides/video/scenes/<slug>/`
> — do not leave source only in an OpenMontage workspace or scratch dir.

## Video Pipeline Status

| # | Video | Scene source in repo | Rendered | Delivered | Ready to start? |
|---|---|---|---|---|---|
| 1 | Flue Deployment Story (V2) | ⚠️ NOT in repo (see provenance) | ✅ 720p30 (GCS) | ✅ | Recovery task open |
| 2 | Security Deep Dive | ⬜ | ⬜ | ⬜ | Yes — brief below |
| 3 | Optimization Deep Dive | ⬜ | ⬜ | ⬜ | Yes — brief below |
| 4 | A2A Protocol Explainer | ✅ [`scenes/a2a-protocol/`](scenes/a2a-protocol/) | ✅ v1 1080p60 26.6s | 🔶 GCS upload pending auth | Iterate v2 (see scene README review notes) |
| 5 | Per-Framework A2A Integration (series) | ⬜ | ⬜ | ⬜ | Blocked: needs each framework's Phase 2 results from [a2a-integration-factory](https://github.com/zeroasterisk/a2a-integration-factory) |

## Repo Layout & Asset Provenance

**⚠️ Known gap:** the Video 1 scene source (`projects/flue-deployment/flue_deployment.py`, 494
lines) was written inside an OpenMontage workspace that is not part of this repo, and only the
rendered MP4 was uploaded to GCS (`gs://alanblount-demo_cloudbuild/manim-output/FlueDeploymentV2-720p30.mp4`).
**Recovery task:** locate that file (OpenMontage checkout or old sandbox) and commit it to
`guides/video/scenes/flue-deployment/`; if unrecoverable, ask Alan before re-creating.

**Rule going forward** — every video keeps all of its inputs in this repo:

```
guides/video/
├── plans.md                      # this file — index, style guide, workflow
└── scenes/
    └── <video-slug>/
        ├── <scene>.py            # ManimCE scene source (committed BEFORE rendering "done")
        ├── STORYBOARD.md         # narrative, beats, timings, feedback log
        └── README.md             # render commands, output locations (GCS links)
```

Rendered MP4s stay out of git (upload to GCS, link from the scene README).

## Tools & Setup

### Primary: OpenMontage + Manim
- **OpenMontage** ([github.com/calesthio/OpenMontage](https://github.com/calesthio/OpenMontage)) — agentic video production system with 12 pipelines, 52 tools, 500+ skills
- **ManimCE** (Manim Community Edition v0.20.1) — 3Blue1Brown-style animation engine
- **ECC** ([github.com/affaan-m/ECC](https://github.com/affaan-m/ECC)) — generalizable skills/plugins/tools with Manim skill

### Skills to Use
From OpenMontage:
- `.claude/skills/manim-composer` — orchestrates Manim scenes
- `.claude/skills/manimce-best-practices` — style guide and patterns
- `.claude/skills/manimgl-best-practices` — alternative renderer patterns

### Installation
```bash
# OpenMontage (includes Manim setup)
git clone https://github.com/calesthio/OpenMontage.git
cd OpenMontage && make setup

# Or standalone ManimCE
pip install manim  # v0.20.1, no external ffmpeg needed since v0.19
```

### Rendering
```bash
# Low quality for iteration (480p, 15fps)
manim -ql --format=mp4 scene.py ClassName

# Medium quality for review (720p, 30fps)
manim -qm --format=mp4 scene.py ClassName

# High quality for production (1080p, 60fps)
manim -qh --format=mp4 scene.py ClassName

# 4K for final delivery
manim -qk --format=mp4 scene.py ClassName
```

## Visual Style Guide

### 3Blue1Brown Palette
```python
BG_COLOR   = "#1C1C1C"   # Dark background
BLUE_ACC   = "#58C4DD"   # Primary (info, Cloud Run)
GREEN_ACC  = "#83C167"   # Success (GEAP, managed)
ORANGE_ACC = "#FF8C00"   # Warning (GKE, flexible)
YELLOW_ACC = "#FFFF00"   # Highlight (A2A, connections)
WHITE_TXT  = "#FFFFFF"   # Primary text
GREY_SUB   = "#AAAAAA"   # Subtitles, secondary text
PURPLE_ACC = "#9B59B6"   # Security
```

### Text Hierarchy
- **TITLE** — section headers, `font_size=32`, `weight=BOLD`, primary color
- **DESCRIPTOR** — what something is, `font_size=22`, regular weight, white
- **ACTION** — what human/agent does, `font_size=18`, italic, grey
- **LABEL** — node labels, `font_size=20`, bold, node color

### Arrow Conventions
- **Thin** (stroke_width=1.5) — options, alternatives
- **Medium** (stroke_width=2.5) — flow, progression
- **Thick** (stroke_width=3.5) — primary path, main narrative
- **Dashed** — connections, associations (not flow)

### Node Style
```python
def make_node(label, color, width=2.2, height=0.65):
    rect = RoundedRectangle(
        corner_radius=0.15, width=width, height=height,
        color=color, fill_color=color, fill_opacity=0.18, stroke_width=2
    )
    txt = Text(label, font_size=22, color=color, weight=BOLD)
    txt.move_to(rect.get_center())
    return VGroup(rect, txt)
```

## Video 1: Flue Deployment Story (V2)

### Status: Rendered ✅ — but scene source NOT committed ⚠️
- Scene: `projects/flue-deployment/flue_deployment.py` (494 lines) — **path is inside an OpenMontage workspace, not this repo**; see "Repo Layout & Asset Provenance" for the recovery task
- Output: `output/FlueDeploymentV2.mp4` (26.6s, 720p30, 742KB)
- GCS: `gs://alanblount-demo_cloudbuild/manim-output/FlueDeploymentV2-720p30.mp4`

### Storyboard (5 chapters, 8 beats, ~26 seconds)

**Chapter 1: Building the Agent (~8s)**
- Beat 1: LLM Selection — 5 named options (Gemini highlighted) + 30 background boxes
- Beat 2: Tools — Skills + MCP Servers + highlighted GCP tools
- Beat 3: Instructions — human directive text

**Chapter 2: Deploying (~6s)**
- Beat 4: Runtime — 3 options fan out (GEAP Runtime / Cloud Run / GKE) with descriptors
- Beat 5: Sandbox — GEAP Sandbox + GKE Sandbox, connected from all runtimes

**Chapter 3: Communication (~8s)**
- Beat 6: Zoom out — everything fits inside "Flue Agent" circle
- Beat 7: Channels — lines to Slack, Discord, Telegram (humans) + A2A (agents)
- Beat 8: Ecosystem — multiple agents connected via A2A

**Chapter 4: Security (~2s placeholder)**
- Agent Identity · Agent Gateway · Policies

**Chapter 5: Optimization (~2s placeholder)**
- Instrument · Evaluate · Simulate · Improve

### Feedback Received
- Help text positioning inconsistent — fixed with rubric (ACTION/DESCRIPTOR/TITLE)
- Flue takes 3 things (LLM, Tools, Instructions) then 2 (Deploy, Sandbox) → agent
- LLM needs 5+ options with background boxes for "many more"
- Tools needs Skills, MCP Servers, highlighted GCP servers
- Deploy/Sandbox: all runtimes connect to both sandboxes
- GEAP = "easy and fully managed", GKE = "flexible, cloud-native K8s"
- Communication: zoom out to agent envelope, channels to humans vs A2A to agents
- Security + Optimization are independent chapters (placeholders for now)

## Future Videos (Planned)

> Each brief is self-contained for an agent to execute end-to-end via the Production Workflow
> below. Shared acceptance criteria for ALL videos:
> 1. Scene source + STORYBOARD.md + README.md committed under `guides/video/scenes/<slug>/`
> 2. Follows the Visual Style Guide (palette, text hierarchy, arrows, `make_node`)
> 3. Target ~30s, 5-chapter structure unless the storyboard argues otherwise
> 4. Reviewed at low quality before production render; production render uploaded to GCS with
>    link recorded in the scene README
> 5. Status table at the top of this file updated

### Video 2: Security Deep Dive
- **Slug:** `security` | **Content source:** [`guides/security-and-governance.md`](../security-and-governance.md)
- Expands the 2s placeholder chapter from Video 1; reuse its node/zoom-out visual language
- Beats: Agent Identity (SPIFFE, X.509, mTLS) → Agent Gateway (policy enforcement, IAP) → Agent Registry (centralized catalog) → Semantic Governance (natural language policies) → Model Armor (content protection)
- Palette anchor: `PURPLE_ACC` for security elements

### Video 3: Optimization Deep Dive
- **Slug:** `optimization` | **Content source:** exploration READMEs + Exgentic/PinchBench results (a2a-integration-factory `frameworks/flue/STATUS.md`)
- Expands the 2s placeholder chapter from Video 1
- Beats: define success metrics → instrument (OpenTelemetry, Cloud Trace) → evaluate (Exgentic, PinchBench) → simulate scenarios → continuous improvement loop (circular arrow motif)

### Video 4: A2A Protocol Explainer
- **Slug:** `a2a-protocol` | **Content source:** [A2A spec](https://a2a-protocol.org/latest/specification/), [`guides/tutorial-add-a2a-to-flue.md`](../tutorial-add-a2a-to-flue.md), `05-a2a-channel/`
- Beats: what is A2A → Agent Cards (discovery) → message lifecycle (send → working → completed) → multi-framework interop (ADK + CrewAI + Flue) → AgentMsg relay for NAT traversal
- Palette anchor: `YELLOW_ACC` for A2A connections (consistent with Video 1)

### Video 5: Per-Framework A2A Integration (series)
- **Slug:** `a2a-<framework>` (one scene dir per framework)
- **Blocked until** the framework's Phase 2 (Exgentic verification) completes in [a2a-integration-factory](https://github.com/zeroasterisk/a2a-integration-factory) — benchmark numbers are a required beat
- Beats per framework: before (isolated agent) → after (connected via A2A) → Exgentic benchmark results → deploy on GEAP
- Design once as a parameterized template scene (framework name, logo color, benchmark numbers) so per-framework production is fast; Flue is the pilot (Phase 2 done: 3/3, score 1.0)

## Production Workflow

1. **Script** — write narrative + storyboard in `guides/video/scenes/<slug>/STORYBOARD.md`
2. **Code** — write Manim scene in `guides/video/scenes/<slug>/` (use OpenMontage skills for best practices); **commit the source**
3. **Render low-quality** — `manim -ql` for fast iteration
4. **Review** — code review + visual review (use Gemini Flash for video analysis when possible); log feedback in STORYBOARD.md
5. **Iterate** — fix issues, re-render
6. **Render production** — `manim -qh` or `-qk` for final
7. **Upload** — GCS bucket (`gs://alanblount-demo_cloudbuild/manim-output/`), record link in scene README
8. **Deliver** — send link via Telegram or embed in repo; update the Video Pipeline Status table in this file
