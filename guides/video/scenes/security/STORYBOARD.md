# Video 2: Security Deep Dive — Storyboard

**Slug:** `security` | **Target:** ~30s, 1080p60 (720p30 for review)
**Style:** 3Blue1Brown per `guides/video/plans.md` (palette, text hierarchy, arrows, `make_node`)
**Palette anchor:** `PURPLE_ACC` (#9B59B6) for all security elements

## Narrative

A Flue agent is deployed (Video 1). But who can call it, and what can it call? We walk through
five layers of GEAP's governance stack — one per chapter — until the agent is surrounded by an
interlocking purple security ring. The payoff: the developer wrote zero security code. GCP
provisioned it all automatically.

**Pattern:** Pattern 3 (Two Perspectives → Unity) adapted as Unprotected → Protected.

## Chapters & Beats

### Chapter 1: The Unprotected Agent (~5s)
- **Beat 1:** Flue Agent (GREEN) at center. Two anonymous "?" caller nodes slide in from the
  left on thick grey open arrows. Two grey target nodes appear on the right with grey outbound
  arrows. No checkpoints, no gatekeeping.
- TITLE: "Who's watching the door?" · ACTION: "any caller · any outbound call · no audit trail"
- `Indicate` on the open arrows (YELLOW_ACC) to signal "this is the problem."

### Chapter 2: Agent Identity (~6s)
- **Beat 2:** TITLE transforms to PURPLE_ACC "Agent Identity."
- Two "?" nodes merge → single `make_node("SPIFFE ID", PURPLE_ACC)` node. X.509 cert badge
  appears above it.
- **Beat 3:** Inbound arrow turns PURPLE_ACC; padlock glyph appears at midpoint. `Circumscribe`
  the SPIFFE node.
- DESCRIPTOR: "SPIFFE ID · X.509 certificate · automatically provisioned"
- ACTION: "no key files to rotate · mTLS between agents"

### Chapter 3: Agent Gateway (~6s)
- **Beat 4:** TITLE rewrites to "Agent Gateway."
- Dashed gateway barrier appears right of center → transforms to `make_node("Agent Gateway",
  PURPLE_ACC)`. Egress arrows reroute through it.
- **Beat 5:** IAP badge slides onto the inbound arrow. `Flash` on gateway node.
- DESCRIPTOR: "policy enforcement point · inbound + outbound"
- ACTION: "IAP gates callers · Gateway gates egress · dry-run mode available"

### Chapter 4: Registry & Governance (~6s)
- **Beat 6:** TITLE rewrites to "Registry · Governance."
- Registry card slides down from above; dashed association line draws from agent to card.
- **Beat 7:** Policy strip slides up from below; policy text types in (Write, 1.5s).
  `Indicate` on policy text (YELLOW_ACC).
- Model Armor badge fades onto outbound arrow.
- DESCRIPTOR: "catalog + natural-language policies + content protection"

### Chapter 5: The Closed Ring (~7s)
- **Beat 8:** All elements except Flue Agent FadeOut. Agent moves to center.
- Five security nodes fade in around agent at pentagon positions. PURPLE_ACC ring draws
  around all of them (`Create`, 1.2s).
- TITLE: "Identity · Gateway · Registry · Governance · Armor" (font_size=22, PURPLE_ACC)
- DESCRIPTOR: "provisioned automatically on GCP"
- ACTION: "zero security code written" ← the aha moment. Pause after.
- `Flash` from center. Hold 1.5s. FadeOut to dark.

## Feedback Log

| Date | Reviewer | Feedback | Resolution |
|---|---|---|---|
| 2026-07-01 | (initial) | — | v1 storyboard drafted |

## Renders

| Version | Quality | Output | Notes |
|---|---|---|---|
| — | — | — | not yet rendered |
