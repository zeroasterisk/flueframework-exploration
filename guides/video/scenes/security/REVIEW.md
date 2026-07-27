# Security Deep Dive — Review Log (v4)

> Persistent feedback tracker across sessions. Update status as items are fixed
> and verified. Don't rely on chat history alone — this is the source of truth.

Status legend: `OPEN` (not started) · `WIP` (in progress) · `FIXED` (changed,
not yet re-rendered/verified) · `VERIFIED` (confirmed in a fresh render).

## Round 1 feedback (2026-07-05, after v3 QA-approved render)

### Product / content

| # | Feedback | Status | Notes |
|---|---|---|---|
| 1 | "Vertex AI" → we don't use that name anymore. Use "LLM" / "LLM Inference", note it's provided by Gemini Enterprise Agent Platform (don't abbreviate to GEAP) | FIXED | Service node renamed to "LLM Inference"; full provider name shown once as a fading caption on first appearance (sprawl scene), not repeated on every node |
| 2 | Replace AutoGen/Custom A/Custom B nodes | FIXED | See #3 |
| 3 | Split nodes into two labeled groups: **Agent Frameworks** (ADK, LangChain, CrewAI, AG2, Pydantic) — "building blocks and coding abstractions to write your own agent with a custom harness"; **Agent Harnesses** (Antigravity, Claude Code, Codex, Pi, Hermes, OpenClaw) — "more fully built agent ready for users", sub-divided into code-focused (Antigravity, Claude Code, Codex) and general/personal-assistant (Pi, Hermes, OpenClaw) | FIXED | New opening vignette (Scene 1, "The Agent Landscape") shows the full 11-node taxonomy in two labeled/sub-divided boxes. A representative 6-node subset (ADK, LangChain, CrewAI, Claude Code, Codex, Pi) then carries forward through the rest of the video ("Let's follow six of them") to keep the sprawl/gateway diagrams legible — see scope decision below |
| 4 | 00:38 Agent Gateway box should show: Authentication, Authorization/Policy, Ingress/Egress | FIXED | Replaced Access Auth / AI Security / Observability panels |

### Video / technical

| # | Feedback | Status | Notes |
|---|---|---|---|
| 5 | Font kerning wonky in many scenes (Verdana). Migrate if needed | FIXED | Switched to Helvetica Neue throughout (tested vs Arial/Roboto/Google Sans/Avenir Next — cleanest kerning, no crowding) |
| 6 | 00:23 subtext bleeds outside the "Identity Issuer" hexagon (SPIFFE / Workload CA) | FIXED | Hexagon radius 1.2→1.35, subtext `fit_width`'d to 1.75 |
| 7 | 00:23 change key text to "Agent identity = the agent process. Used with end user identity." | FIXED | |
| 8 | 00:32 change text to "Every Agent from any framework or harness, it's own identity." | FIXED | Verbatim as given |
| 9 | Add vignette: 4 types of agent identity | FIXED | New Scene 4b, 2x2 card grid, sourced from `identity_02.png` generic taxonomy (User / On-Behalf-Of / Workload / Workforce), ID-3 (Workload) highlighted green with "Already covered" tag since Scene 4 just built it in depth |
| 10 | 00:39 blue dot doesn't follow the arrow trajectory closely | FIXED | Root cause: the dot travelled a `set_points_smoothly` curve while the drawn connector was a straight `Line` — they diverged. Rewrote so the dot's `MoveAlongPath` uses the exact same `Line` object (same start/end points) as the drawn connector |
| 11 | 00:45 change blocked-policy text to "Policy: Secret Manager [READ] --> DENY" (IAM policy) | FIXED | |
| 12 | 00:45 add 2nd DENY reason after the IAM one: "Semantic Governance Policy --> DENY" (natural-language policy) | FIXED | Two sequential flash+caption beats before the ACCESS BLOCKED banner |
| 13 | 00:51 subtext → "Granular control, Every Agent, Every Task, Every Tool or Agent" | FIXED | Verbatim as given |
| 14 | 1:04 Observability: rebuild as full request path — User → Agent Framework → LLM → Agent Framework → BigQuery → Agent Framework → LLM → User. Emit OTel logs to Cloud for each hop. Visualize as an OpenTelemetry span/trace waterfall chart (Cloud Trace style) | FIXED | New `_otel_trace_waterfall()`: nested span bars (User Request → Agent Framework → [LLM: plan, BigQuery query, LLM: summarize] sequential children), horizontal Cloud-Trace-style Gantt chart. Kept the existing chaos-network restore/transform reveal *before* the waterfall (that payoff tested well in v3 QA), then layered the waterfall as "here's the mechanism" |
| 15 | 1:20 change bottom text → "Extended capabilities for any Agents, on top of our mature and secure platform." | FIXED | Interpreted as the smallest/bottom-most closing sub-line, not the main aha line — **please confirm this interpretation on next review** |

### Process feedback (applied, not video content)

- QA should run earlier/incrementally on rough drafts of individual scenes,
  not only once at the end on the full production render. → Added
  "Incremental QA" section to `video-qa` SKILL.md. Applying it to this v4
  rebuild: per-scene `.py` files under `parts/`, `-ql` + Pass-1 QA each before
  assembling.
- Video review mechanism: no better tool available in this CLI than
  timestamped chat notes (which is what Alan used and is quite effective).
  Added this `REVIEW.md` as a persistent cross-session feedback tracker.
  Offered (not yet requested): burned-in-timecode contact sheets for more
  precise frame references.

## Scope decisions (confirmed with Alan, 2026-07-05)

1. **Identity vignette content**: use the 4-type taxonomy from
   `identity_02.png` (User / On-Behalf-Of / Workload / Workforce) — generic,
   no internal codenames (Remy, Obi, Sojo, Sobi excluded per instruction).
2. **Optimization flywheel vignette**: this is the content brief for the
   separate, not-yet-started **Video 3: Optimization Deep Dive** — NOT a
   Scene 7 appended to this Security video. Source: `agents-cli`
   `google-agents-cli-eval` SKILL.md "Quality Flywheel" (5 stages: Prepare
   Data → Run Inference → Grade Traces → Analyze Failures → Optimize & Code
   Fix). Alan noted sections could be chaptered together or kept separate —
   default to separate for now, chapter later if useful.
3. **Font**: tested Verdana / Helvetica Neue / Arial / Roboto / Google Sans /
   Avenir Next at -ql on a sample string. Roboto showed irregular spacing;
   Google Sans looked cramped. **Chose Helvetica Neue** — evenly kerned,
   clean numerals, no crowding. Migrating all `Text(..., font="Verdana")` →
   `font="Helvetica Neue"`.
4. **Rebuild structure**: Manim's "persistence contract" (chaos network
   dimmed in Scene 2 → restored/transformed in Scene 5) requires those
   mobjects to live in one continuous `Scene.construct()` call — a literal
   multi-file final video can't share that state cleanly. Pragmatic
   interpretation: build + `-ql` + Pass-1 QA the riskiest **new** visual
   pieces as standalone throwaway test scenes first (new 11-node landscape
   layout, OTel trace waterfall, dual-policy DENY sequence), then port
   working code into the one final assembled `security_deep_dive.py`. Same
   tight-loop benefit, without fighting Manim's scene-continuity model.

## v4 render + QA results (2026-07-05)

All round-1 feedback items above are FIXED and verified in a fresh -ql +
-qh render (visual spot-check on every scene — no clipping, no path-bug,
correct text). Full QA on the 1080p60 production render:

| Pass | Model | Score | Result |
|---|---|---|---|
| 1 designer | `gemini-3.1-flash-lite` | 9.0/10 (was 8.3 in v3) | ✅ gate passed |
| 2 PM | `gemini-3.5-flash` | 8.7/10 (was 8.5 in v3) | ✅ APPROVED |

Video: `media/videos/security_deep_dive/1080p60/SecurityDeepDive.mp4`
(106s, up from 82s in v3 — landscape vignette + identity-types vignette +
OTel waterfall added ~25s).

**Awaiting Alan's review** before commit (per standing rule: never commit
renders without explicit go-ahead). Item #15 (closing sub-line placement)
flagged above for confirmation — implemented as the smallest/bottom-most
line, may not be what was intended.

## Not yet started

- Video 3 (Optimization Deep Dive) — brief drafted in
  `guides/video/plans.md` (5-stage Quality Flywheel from `google-agents-cli-eval`
  SKILL.md: Prepare Data → Run Inference → Grade Traces → Analyze Failures →
  Optimize & Code Fix, framed as DevOps → MLOps → AgentOps). No scenes
  written yet. Continuation of this video's OTel trace-waterfall ending.
