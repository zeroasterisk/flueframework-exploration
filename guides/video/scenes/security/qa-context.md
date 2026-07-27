Title: Agent Platform Security — Governing AI Like Everything Else (v4)

Target audience: Developers and architects who already understand IAM, service
accounts, and microservice governance; evaluating AI agents at scale; skeptical
of vague "AI governance" marketing claims.

Purpose: Show that Agent Platform gives every AI agent its own workload
identity (like a service account) plus a central gateway that enforces policy
and full request tracing, so agents can be governed the same way people and
cloud services already are.

Narrative arc (IMPORTANT — this is a deliberate multi-act structure):

- Scene 1 (~0:00-0:15) "The Agent Landscape": establishes that agents come
  from two different starting points — Agent Frameworks (ADK, LangChain,
  CrewAI, AG2, Pydantic: building blocks for writing a custom agent) and
  Agent Harnesses (Antigravity, Claude Code, Codex, Pi, Hermes, OpenClaw:
  more fully built agents ready for users, sub-divided into coding agents and
  personal-assistant agents). The message is "different starting points,
  similarly capable agents" — this is a taxonomy/context-setting vignette,
  not the problem yet.

- Scene 2 (~0:15-0:20): the video narrows focus to six representative agents
  (three frameworks, three harnesses) that recur through the rest of the
  video — explicitly framed as "let's follow six of them."

- Scene 3 (~0:20-0:45) "The Sprawl Problem": these six agents connect to
  services (LLM Inference, BigQuery, Secret Manager, Pub/Sub, External API)
  with NO structure. This scene is INTENTIONALLY chaotic: lines cross,
  overlap, and tint red to visually represent "nobody knows what's calling
  what." This clutter is the point — a deliberately messy, overwhelming
  network diagram meant to feel unmanageable, not a polish defect. Do not
  penalize this scene for looking "cluttered."

- Scenes 4-4b (~0:45-1:05) "Workload Identity" + identity taxonomy: workload
  identity is issued to the agent process at startup, before any request
  arrives — independent of, but coexisting with, end-user identity. A
  follow-up vignette places this in context: there are actually four types of
  agent identity (User Identity, Agent On-Behalf-Of Identity, Agent Workload
  Identity — just covered — and Agent Workforce Identity). The chaotic
  network from Scene 3 is dimmed to a faint background texture during these
  scenes (visible at low opacity) — intentional, not a rendering bug.

- Scene 5 (~1:05-1:35) "Agent Gateway": a central gateway enforces three
  layers — Authentication, Authorization/Policy, Ingress/Egress — for every
  agent regardless of framework or harness. Demonstrates a blocked request
  with TWO sequential denial reasons (an IAM policy check, then a separate
  natural-language "semantic governance" policy check) before an ACCESS
  BLOCKED banner. Other agents continue normally afterward (per-agent policy,
  not a global killswitch).

- Scene 6 (~1:35-1:55) "Observability": PAYOFF — the exact same chaotic
  network from Scene 3 is restored and transformed in place into a clean,
  traceable hub-spoke topology ("same network, now legible"). This is then
  followed by a deeper mechanism reveal: an OpenTelemetry span/trace
  waterfall (Cloud Trace style horizontal Gantt chart) showing the actual
  request path — User Request contains an Agent Framework span, which in
  turn contains three sequential child spans (an LLM planning call, a
  BigQuery tool call, an LLM summarization call). This is a legitimate
  observability-tooling visualization (nested span bars with millisecond
  tick marks), not a data table or generic UI — evaluate it as such.

- Scene 7 (~1:55-2:15): the single "aha" — a three-column table (People /
  Cloud Services / AI Agents) showing the AI Agents column maps onto the same
  governance model (Identity / Policy / Audit) developers already use for
  people and cloud services. Ends on: "Govern agents the same way you govern
  everything else," followed by a smaller closing line about extended
  capabilities on a secure platform.

Visual style: Google brand + partner-brand palette on a light background
(#F8F9FA). Blue (#4285F4) = authorized/controlled. Red (#EA4335) =
problem/blocked, used sparingly. Green (#34A853) = confirmed/success. Each
agent framework/harness has its own consistent identity color throughout
(e.g. ADK blue, LangChain purple, Claude Code terracotta). Helvetica Neue
font throughout.

When scoring visual_clarity and professional_polish for Scene 3 (the sprawl
network), evaluate whether the clutter reads as an intentional "this is the
problem" moment given the title text ("Who's calling what? / What can each
agent reach?"), not as an unstructured diagram that should be simplified. The
same network resolves into a clean layout later (Scene 6) — judge Scene 3 in
that context.

When scoring Scene 6's span waterfall, judge it against observability
dashboard conventions (Cloud Trace, Jaeger, Honeycomb) — nested horizontal
bars indicating parent/child span relationships and duration are the
established idiom for this content, not a stylistic choice to critique.
