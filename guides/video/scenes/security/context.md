Video type: animated-explainer

Title: Security Deep Dive — GCP Agent Security Stack

Target audience: Senior developers and technical architects who have already deployed
a Flue agent on Google Cloud (they've seen Video 1: Deployment Story) and are now
evaluating whether GCP's security model meets enterprise requirements. They are
skeptical of marketing claims and will notice vague hand-waving.

Purpose / intended message:
GCP automatically provisions five interlocking security layers when you deploy a
Flue agent — Agent Identity (SPIFFE/mTLS), Agent Gateway (egress policy), IAP
(inbound policy), Agent Registry (controlled catalog), and Semantic Governance +
Model Armor (content policies). The key insight: zero security code written by the
developer. This is GCP's differentiator over other deployment targets.

The video should feel earned (satisfying) rather than promotional (alarming or salesy).
The developer should finish watching thinking "I already have this" — not "I need to
buy this."

Script / narration notes:
- Opens with anxiety hook: "Who's watching the door?" — mild concern, not alarm
- Grey "?" nodes represent unknown, uncontrolled callers (scene 1)
- Each subsequent scene adds one security layer, turning grey elements purple
- Scene 5 payoff: all five layers snap into a ring around the agent
- Closing beat: "zero security code written" — this is the aha moment; it lands quietly
- Tone throughout: calm, confident, informational — NOT a sales pitch

Visual style (3Blue1Brown-influenced):
- Dark background (#1C1C1C)
- PURPLE_ACC (#9B59B6) used EXCLUSIVELY for all security elements (intentional color discipline)
- GREEN_ACC (#83C167) for the Flue Agent node — consistent with Video 1
- Text hierarchy: 32pt bold title / 20pt descriptor / 17pt italic action text in grey
- No Manim-specific artifacts should be visible (no axes, grids, or math notation)

Duration target: ~30 seconds. 5 chapters.

Auto-detected video metadata:
Duration: 30.6s  |  h264 1920×1080 @ 60fps
