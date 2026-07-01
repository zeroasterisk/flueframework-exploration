# Video 4: A2A Protocol Explainer — Storyboard

**Slug:** `a2a-protocol` | **Target:** ~32s, 1080p (720p30 for review)
**Style:** 3Blue1Brown per `guides/video/plans.md` (palette, text hierarchy, arrows, `make_node`)
**Palette anchor:** `YELLOW_ACC` (#FFFF00) for A2A connections, consistent with Video 1

## Narrative

Agents built in different frameworks are islands. A2A is the protocol that lets any agent
discover and talk to any other agent — regardless of framework — via three simple ideas:
Agent Cards (discovery), message:send (communication), and the task lifecycle (progress).

## Chapters & Beats

### Chapter 1: The Problem — Isolated Agents (~6s)
- **Beat 1:** Three agent nodes appear, spread apart: "ADK Agent" (blue), "CrewAI Agent"
  (orange), "Flue Agent" (green). Each gets a faint dashed circle around it (its silo).
- TITLE: "Agents are islands" · ACTION: "each framework speaks its own dialect"
- No connections. Slight pulse to emphasize isolation.

### Chapter 2: Agent Cards — Discovery (~7s)
- **Beat 2:** Silos fade. A small card (rounded rect, white border) slides out from the Flue
  agent labeled `/.well-known/agent-card.json`, with three tiny rows: `name`, `skills`,
  `endpoint`.
- TITLE: "Agent Cards" · DESCRIPTOR: "a public JSON card says who I am and what I can do"
- **Beat 3:** Magnifier-style highlight from the ADK agent toward the card (dashed yellow line
  = association, not flow) — discovery in action.

### Chapter 3: message:send — Communication (~8s)
- **Beat 4:** Card shrinks away. Thick yellow arrow (primary path) from ADK Agent to Flue
  Agent labeled `message:send`. A small message chip travels along the arrow.
- TITLE: "message:send" · DESCRIPTOR: "one HTTP call, JSON in, task out"
- **Beat 5:** Task lifecycle strip appears under the arrow: `submitted → working → completed`
  nodes lighting up left to right (GREY → BLUE → GREEN). Include small `failed / canceled`
  branch in grey below, thin arrows.

### Chapter 4: The Ecosystem — Interop (~7s)
- **Beat 6:** Zoom out. Five agents now (add "Agno" purple, "Mastra" teal-blue), all
  connected by medium yellow lines into a mesh. Lines pulse.
- TITLE: "Any agent ↔ any agent" · ACTION: "frameworks stop mattering at the boundary"

### Chapter 5: Call to Action (~4s)
- **Beat 7:** Mesh condenses to a badge: "A2A" in yellow ring. Text below:
  DESCRIPTOR: "a2a-protocol.org" · ACTION: "add A2A to your framework — see the
  A2A Integration Factory"
- Fade out.

## Feedback Log

| Date | Reviewer | Feedback | Resolution |
|---|---|---|---|
| 2026-07-01 | (initial) | — | v1 storyboard drafted |
| 2026-07-01 | coordinator visual review of -ql render | Ch3 lifecycle strip overlapped the message arrow; failed/canceled branch clutter at 480p | moved strip down 0.4, thinned branch labels |

## Renders

| Version | Quality | Output | Notes |
|---|---|---|---|
| v1 | -ql 480p15 | local only | layout check |
| v1 | -qm 720p30 | see README.md | review copy |
