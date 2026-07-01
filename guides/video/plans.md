# Video Production Plans — Flue Framework Exploration

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

### Status: Rendered ✅
- Scene: `projects/flue-deployment/flue_deployment.py` (494 lines)
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

### Video 2: Security Deep Dive
- Agent Identity (SPIFFE, X.509, mTLS)
- Agent Gateway (policy enforcement, IAP)
- Agent Registry (centralized catalog)
- Semantic Governance (natural language policies)
- Model Armor (content protection)

### Video 3: Optimization Deep Dive
- Defining success metrics
- Instrumenting agent behavior (OpenTelemetry, Cloud Trace)
- Evaluation scoring (Exgentic, PinchBench)
- Simulation of scenarios
- Continuous improvement loop

### Video 4: A2A Protocol Explainer
- What is A2A (agents talking to agents)
- Agent Cards (discovery)
- Message lifecycle (send → working → completed)
- Multi-framework interop (ADK + CrewAI + Flue via A2A)
- AgentMsg relay for NAT traversal

### Video 5: Per-Framework A2A Integration
- For each framework in the A2A Integration Factory
- Show: before (isolated) → after (connected via A2A)
- Benchmark results from Exgentic
- How to deploy on GEAP

## Production Workflow

1. **Script** — write narrative + storyboard in this doc
2. **Code** — write Manim scene (use OpenMontage skills for best practices)
3. **Render low-quality** — `manim -ql` for fast iteration
4. **Review** — code review + visual review (use Gemini Flash for video analysis when possible)
5. **Iterate** — fix issues, re-render
6. **Render production** — `manim -qh` or `-qk` for final
7. **Upload** — GCS bucket, generate shareable link
8. **Deliver** — send link via Telegram or embed in repo
