# Agent Platform Security: Governing AI Like Everything Else

## Overview

- **Topic**: Google Cloud AI Agent Platform — workload identity, gateway enforcement, and
  observable topology as a unified governance model for AI agents
- **Hook**: "Agents are proliferating across your infrastructure. Every framework, every team,
  connecting to everything. Nobody knows who they are or what they can reach."
- **Target Audience**: Developers and architects who already understand IAM, service accounts,
  and microservice governance; are evaluating AI agents at scale; are skeptical of vague
  "AI governance" claims
- **Estimated Length**: ~2 minutes (6 scenes, ~110s content + transitions)
- **Key Insight**: "Agent Platform gives every agent its own identity — the same concept as a
  service account for a Cloud Run service — plus a central gateway that enforces policy.
  You can govern AI agents the same way you govern everything else."

## Narrative Arc

Act 1 establishes the reality: AI agents are multiplying across teams and frameworks,
creating an unmanageable sprawl of unidentified connections to critical systems. Act 2
introduces the three primitives that solve it — workload identity (issued to the agent
process at startup, before any request), gateway enforcement (one control point for all
agent traffic, any framework), and observable topology (the same chaotic network, now
traceable). Act 3 delivers the conceptual unlock: these primitives map onto a governance
pattern developers already know from IAM and service accounts, making AI agent governance
a first-class citizen of the existing security model.

---

## Scene 1: The Agent Explosion

**Duration**: ~8s
**Purpose**: Establish framework diversity and agent proliferation as a neutral fact before
it becomes a problem. Introduce the five framework types that persist throughout the video.
Create visual energy and a sense of scale.

### Visual Elements

- Background: `#F8F9FA` (light Google brand) — set at class level
- 6 RoundedRectangle agent nodes, different colors, appearing in LaggedStart sequence
- Agent labels and colors:
  - "ADK" — `#4285F4` (Google Blue)
  - "LangChain" — `#9B59B6` (Purple)
  - "CrewAI" — `#FF8C00` (Orange)
  - "AutoGen" — `#16A085` (Teal)
  - "Custom A" — `#7F8C8D` (Medium Gray)
  - "Custom B" — `#95A5A6` (Light Gray)
- Node size: width=1.4, height=0.55, corner_radius=0.25, fill_opacity=0.14
- Title text: `#3C4043` (dark gray) on light background — no white text on light bg

### Content

1. Scene opens on `#F8F9FA`. Title writes in: `"AI agents are everywhere."`
2. One agent (ADK, blue) fades in at center with `FadeIn(scale=0.85)`.
3. `LaggedStart`: 5 more agents fade in at spread positions, each with a slight pop
   (FadeIn with `scale=0.85`), lag_ratio=0.3.
4. Agents subtly pulse (`Indicate` on the group) to show they are running processes.
5. Title rewrites: `"Different frameworks. Different teams."`
6. Hold 0.8s. Scene continues directly into Scene 2 (no hard cut).

### Narration Notes

- Tone: observational, neutral. This is just a fact about modern development.
- "AI agents are everywhere — ADK, LangChain, CrewAI, dozens of frameworks — each built
  by a different team for a different job."
- Do NOT flag this as a problem yet. Save the concern for Scene 2.

### Technical Notes

- `config.background_color = "#F8F9FA"` at class level; all text uses `"#3C4043"` not WHITE
- Agent node factory:
  ```python
  def make_agent(label, color, width=1.4, height=0.55):
      rect = RoundedRectangle(
          corner_radius=0.25, width=width, height=height,
          fill_color=color, fill_opacity=0.14,
          stroke_color=color, stroke_width=2.0
      )
      txt = Text(label, font="Verdana", font_size=16, color=color, weight=BOLD)
      txt.move_to(rect.get_center())
      return VGroup(rect, txt)
  ```
- Spread positions for 6 agents (pre-sprawl — tighter than Scene 2):
  ```python
  agent_start_positions = [
      UP*1.5 + LEFT*4.0,   # ADK
      UP*1.5 + LEFT*1.0,   # LangChain
      UP*1.5 + RIGHT*2.0,  # CrewAI
      DOWN*0.8 + LEFT*3.0, # AutoGen
      DOWN*0.8 + RIGHT*1.0,# Custom A
      DOWN*2.2 + LEFT*0.5, # Custom B
  ]
  ```
- Store agents as `self.agent_nodes` (list, same order throughout video)
- `Indicate(VGroup(*self.agent_nodes), color="#4285F4", run_time=0.7)` for the pulse

---

## Scene 2: The Sprawl Problem

**Duration**: ~20s
**Purpose**: Transform the neutral observation of Scene 1 into a concrete governance
problem. Agents connect to everything — uncontrolled, unidentified, unauditable.
The chaotic network built here is the SAME visual object transformed in Scene 5;
it must be stored as instance variables, never removed with FadeOut.

### Visual Elements

- Agents from Scene 1 animate to wider spread positions (more screen real estate)
- Service nodes appear at edges and corners:
  - "Vertex AI" (top right) — `#4285F4` border
  - "BigQuery" (right) — `#4285F4` border
  - "Secret Manager" (bottom right) — `#EA4335` border (sensitive)
  - "Pub/Sub" (bottom) — `#9AA0A6` border
  - "External API" (bottom left) — `#9AA0A6` border
- Phase 1: 4 `DashedLine` connections drawn slowly — looks almost manageable
- Phase 2: 8 more `DashedLine` connections, overlapping, crossing
- Phase 3: All lines tint red (`#EA4335` at opacity=0.5), 4 more crossing lines added
- Problem text: `"Who's calling what?"` in `#EA4335`, top center
- Sub-text: `"What can each agent reach?"` in `#5F6368`

### Content

1. Agents animate (`animate.move_to`) to wider positions (scene continues from S1).
2. Service nodes `FadeIn` at edge positions with `LaggedStart`, lag_ratio=0.2.
3. Phase 1: 4 `DashedLine` connections draw in one by one (1.5s total). Looks structured.
4. Phase 2: `LaggedStart` adds 8 more DashedLines rapidly (1.0s total). Lines cross each other.
5. Phase 3: `animate.set_color("#EA4335")` on first 8 lines simultaneously; 4 more lines appear.
6. Problem text `Write`s in from top: `"Who's calling what?"` (red).
7. Sub-text fades in: `"What can each agent reach?"` (gray).
8. Hold 1.5s on the chaotic mess.
9. Chaos network dims to `opacity=0.08` — stored for Scene 5. Scene 3 begins.

### Narration Notes

- "And every one of them can reach your databases, your secrets, your APIs."
- As lines multiply: "Without identity, without a policy checkpoint, without a trace —
  nobody knows what's calling what. Nobody knows what each agent is allowed to reach."
- Keep the tone matter-of-fact, not apocalyptic. This is a solvable engineering problem.

### Technical Notes

- **CRITICAL**: store chaos network as instance variables for Scene 5 reuse:
  ```python
  self.chaos_lines = []   # list of DashedLine mobjects
  self.service_nodes = [] # list of service node VGroups
  # Also re-reference self.agent_nodes from Scene 1
  ```
- `DashedLine` parameters:
  ```python
  DashedLine(
      start, end,
      dash_length=0.12, dashed_ratio=0.5,
      stroke_width=1.8, stroke_color="#9AA0A6"
  )
  ```
- Choose connection endpoints to ensure visible crossings in Phase 2:
  ```python
  # Diagonal crossings look most chaotic:
  crossing_pairs = [
      (agent_nodes[0].get_center(), service_nodes[3].get_center()),  # upper-left → bottom
      (agent_nodes[4].get_center(), service_nodes[0].get_center()),  # lower-right → top
      (agent_nodes[1].get_center(), service_nodes[4].get_center()),  # upper → bottom-left
      ...
  ]
  ```
- Red tint Phase 3:
  ```python
  self.play(
      AnimationGroup(*[
          line.animate.set_color("#EA4335").set_stroke(opacity=0.52)
          for line in self.chaos_lines[:8]
      ], lag_ratio=0.0, run_time=0.6)
  )
  ```
- **DO NOT** use `FadeOut` on chaos_lines or service_nodes at end of scene.
  Use `animate.set_opacity(0.08)` to dim them into the background:
  ```python
  self.play(
      AnimationGroup(*[
          mob.animate.set_opacity(0.08)
          for mob in self.chaos_lines + self.service_nodes + self.agent_nodes
      ], run_time=0.8)
  )
  ```
- Service node factory (smaller than agent nodes):
  ```python
  def make_service(label, color):
      rect = RoundedRectangle(
          corner_radius=0.2, width=1.3, height=0.5,
          fill_color=color, fill_opacity=0.06,
          stroke_color=color, stroke_width=1.5
      )
      txt = Text(label, font="Verdana", font_size=13, color=color)
      txt.move_to(rect.get_center())
      return VGroup(rect, txt)
  ```

---

## Scene 3: Identity First — The Agent-as-Service

**Duration**: ~25s
**Purpose**: Introduce workload identity as Pillar 1. The critical conceptual point: this
identity belongs to the AGENT PROCESS, not to any human caller. It is established at
startup, before any request arrives. A horizontal timeline makes the temporal ordering
unmistakable. Then show that all framework types get their own identity — the platform
is framework-agnostic.

### Visual Elements

- Background: dimmed chaos network at opacity=0.08 (texture, not focus)
- Single agent node (ADK, blue) at center-left — isolated to show the concept clearly
- Credential issuer at center-right: vault-style visual (hexagonal container with "stamp" border)
- Horizontal timeline below: three labeled dots — `[Agent Starts]` → `[Identity Issued]` → `[Request Arrives]`
- SPIFFE/X.509 badge:
  - `RegularPolygon(n=6)` (hexagon) with green fill/stroke
  - `DashedVMobject(Circle)` surrounding it as a "certificate border"
  - Small text label "SPIFFE" inside hexagon
- After identity sequence: 3 more framework agents appear, each receiving their own badge
- Key clarification text: `"Identity = the agent process. Not who called it."`

### Content

1. Title `Write`s: `"Pillar 1: Workload Identity."`
2. Single ADK agent node `FadeIn` at center-left. Other agents remain dimmed.
3. Timeline draws in at bottom of frame: horizontal Line with 3 Dot markers.
4. Timeline label 1 appears at first dot: `"Agent starts"` — dot glows blue.
5. Credential issuer `FadeIn` at center-right (vault visual, drawn with Create border).
6. Agent animates toward issuer (`animate.move_to` to midpoint, then back).
7. Issuer "stamps": `Flash` on issuer; hexagonal SPIFFE badge grows from issuer center
   (`FadeIn(badge, scale=0.4→1.0)`).
8. Badge animates to attach to agent (moves to agent's upper-right corner).
9. Timeline dot 2 glows green: `"Identity issued"` label appears. Color: `#34A853`.
10. KEY TEXT slides in below agent: `"Identity = the agent process. Not who called it."`
11. Timeline dot 3 appears (gray): `"Request arrives"` — a small arrow comes from the right.
12. The badged agent is already identified. It handles the request. No badge change needed.
13. Key text fades; 3 more framework agents slide in with their own badges via `LaggedStart`.
14. Final text: `"Every agent. Any framework. Its own identity."`

### Narration Notes

- "The first thing Agent Platform gives each agent is its own identity — not a shared
  credential, not the caller's identity. Its own."
- "This is a SPIFFE workload certificate. It's issued when the agent process starts. Before
  any user makes a request."
- During timeline: "Watch the sequence. The agent starts. The identity is issued. Then —
  only then — a request arrives. The platform already knows who this agent is before
  the first byte of traffic."
- "This is the same concept as a service account for a Cloud Run service. Except it's for
  an AI agent. And it doesn't matter which framework built that agent."
- Avoid explaining SPIFFE internals. Name it. Show the result.

### Technical Notes

- Credential issuer visual:
  ```python
  issuer_border = RegularPolygon(n=6, radius=1.2,
                                  stroke_color="#4285F4", stroke_width=2.5,
                                  fill_color="#4285F4", fill_opacity=0.06)
  issuer_label = Text("Identity\nIssuer", font="Verdana", font_size=18,
                       color="#4285F4", weight=BOLD)
  issuer_sub = Text("SPIFFE / Workload CA", font="Verdana", font_size=11,
                     color="#4285F4")
  issuer = VGroup(issuer_border, issuer_label, issuer_sub.next_to(issuer_label, DOWN, buff=0.15))
  ```
- SPIFFE badge:
  ```python
  hex_shape = RegularPolygon(n=6, radius=0.32,
                              fill_color="#34A853", fill_opacity=0.18,
                              stroke_color="#34A853", stroke_width=2.2)
  cert_ring = DashedVMobject(
      Circle(radius=0.48, stroke_color="#34A853", stroke_width=1.5),
      num_dashes=20
  )
  badge_text = Text("SPIFFE", font="Verdana", font_size=9, color="#34A853", weight=BOLD)
  badge = VGroup(cert_ring, hex_shape, badge_text.move_to(hex_shape.get_center()))
  ```
- Timeline construction:
  ```python
  tl_line = Line(LEFT*4.5, RIGHT*4.5, stroke_color="#9AA0A6", stroke_width=1.5)
  tl_line.move_to(DOWN*2.8)
  t1 = Dot(tl_line.point_from_proportion(0.1), radius=0.07, color="#4285F4")
  t2 = Dot(tl_line.point_from_proportion(0.5), radius=0.07, color="#34A853")
  t3 = Dot(tl_line.point_from_proportion(0.9), radius=0.07, color="#9AA0A6")
  t1_label = Text("Agent starts", font="Verdana", font_size=12, color="#4285F4").next_to(t1, DOWN)
  t2_label = Text("Identity issued", font="Verdana", font_size=12, color="#34A853").next_to(t2, DOWN)
  t3_label = Text("Request arrives", font="Verdana", font_size=12, color="#9AA0A6").next_to(t3, DOWN)
  ```
- Badge attachment:
  ```python
  badge.move_to(issuer.get_center())
  self.play(Flash(issuer.get_center(), color="#34A853", flash_radius=0.6, num_lines=8))
  self.play(FadeIn(badge, scale=0.5))
  self.play(badge.animate.scale(0.65).move_to(agent.get_right() + RIGHT*0.28 + UP*0.28))
  ```
- Multi-agent badge sequence:
  ```python
  # Three more agents slide in from left with their own badges already attached
  # (showing the result, not re-playing the full ceremony)
  def agent_with_badge(label, color, pos):
      a = make_agent(label, color)
      b = badge.copy().set_color(color).scale(0.65)
      b.move_to(a.get_right() + RIGHT*0.28 + UP*0.28)
      return VGroup(a, b).move_to(pos)
  ```
- Tricky: `DashedVMobject` requires the inner VMobject be complete before passing in.
  If rendering artifacts appear, fall back to: `Circle(stroke_color="#34A853", stroke_width=1.5,
  stroke_opacity=0.7)` (solid, thin ring).

---

## Scene 4: Gateway Control — Policy in Action

**Duration**: ~25s
**Purpose**: Introduce the Agent Gateway as Pillar 2 — the central policy enforcement point
for all agent traffic. Show that framework-diverse agents all route through one gateway
regardless of what built them. Deliver the dramatically satisfying ACCESS BLOCKED moment,
then show that only the blocked agent is affected — other agents continue normally.

### Visual Elements

- Clean layout: Gateway tower at center (tall, blue)
- 5 framework agent nodes in semi-arc at left — all different colors/labels (ADK, LangChain,
  CrewAI, AutoGen, Custom)
- 3 service nodes at right:
  - "Vertex AI" — green border (allowed)
  - "BigQuery" — green border (allowed)
  - "Secret Manager" — red border (restricted)
- Agent Gateway tower:
  - Tall `RoundedRectangle`, `#4285F4` border, width=1.8, height=3.5
  - 3 stacked sub-panels inside: "Access Auth" (green), "AI Security" (yellow), "Observability" (blue)
  - Label "Agent Gateway" above tower
- Request Dot (`#4285F4`, radius=0.09) travels agent → gateway → allowed service
- Blocked Dot (`#EA4335`) travels agent → gateway → intercept
- `ACCESS BLOCKED` rectangle: red fill, white text, dramatic appearance
- Policy flash text (brief): `"Policy: Secret Manager → RESTRICTED"`

### Content

1. Title `Write`s: `"Pillar 2: Agent Gateway."`
2. Gateway tower `Create`s from bottom up (run_time=0.8).
3. 5 framework agents `FadeIn` at left in `LaggedStart`. Service nodes `FadeIn` at right.
4. Curved arrows (`CurvedArrow` or `Arrow`) from each agent to gateway left side.
5. Arrows from gateway right side to each service node.
6. **Happy path** demo:
   - Blue Dot spawns at ADK agent.
   - `MoveAlongPath`: ADK → gateway left → (pause 0.3s while gateway lights up) → gateway right → Vertex AI.
   - As Dot passes through gateway: sub-panels highlight in sequence (Access Auth green → AI Security yellow → Observability blue), each lasting 0.2s.
   - Gateway briefly glows green `#34A853`. Dot arrives at Vertex AI. Target node flashes green.
7. **Blocked path** demo:
   - Red Dot spawns at Custom agent.
   - `MoveAlongPath`: Custom → gateway left → gateway STOPS dot (Dot stops at gateway center).
   - "Access Auth" sub-panel turns red (`#EA4335`).
   - Policy text flashes above: `"Policy: Secret Manager → RESTRICTED"` (0.8s, then fade).
   - `ACCESS BLOCKED` rectangle slams in with `FadeIn(scale=1.3)` + red `Flash`.
   - Red Dot dissolves (`FadeOut` at gateway position). Custom agent dims slightly.
8. Other agents continue — LangChain Dot makes a normal transit to BigQuery (shows life goes on).
9. Text below: `"Granular control. Per-agent. Any framework."`

### Narration Notes

- "All agent traffic — ADK, LangChain, CrewAI, whatever framework built it — routes through
  one gateway. It doesn't matter what framework. The gateway is the enforcement point."
- During happy path: "The gateway checks authorization, scans for AI security risks, logs
  the request. Automatically. On every call."
- During blocked path: "One agent tries to reach Secret Manager. The gateway intercepts.
  Policy says: no."
- After ACCESS BLOCKED: "The other agents keep running. This is per-agent policy, not a
  global killswitch."
- "You write the policy once. The gateway enforces it everywhere."

### Technical Notes

- Gateway tower:
  ```python
  gateway_base = RoundedRectangle(
      corner_radius=0.2, width=1.8, height=3.5,
      fill_color="#4285F4", fill_opacity=0.07,
      stroke_color="#4285F4", stroke_width=2.5
  )
  gateway_label = Text("Agent\nGateway", font="Verdana", font_size=18,
                        color="#4285F4", weight=BOLD).next_to(gateway_base, UP, buff=0.15)

  def make_sub_panel(label, color):
      panel = RoundedRectangle(
          corner_radius=0.1, width=1.4, height=0.65,
          fill_color=color, fill_opacity=0.12,
          stroke_color=color, stroke_width=1.5
      )
      txt = Text(label, font="Verdana", font_size=10, color=color)
      txt.move_to(panel.get_center())
      return VGroup(panel, txt)

  sub_auth = make_sub_panel("Access Auth", "#34A853").move_to(gateway_base.get_top() + DOWN*0.6)
  sub_ai   = make_sub_panel("AI Security", "#FBBC04").move_to(gateway_base.get_center())
  sub_obs  = make_sub_panel("Observability", "#4285F4").move_to(gateway_base.get_bottom() + UP*0.6)
  ```
- Request dot path (smooth curve through gateway):
  ```python
  def make_path(start, mid_enter, mid_exit, end):
      path = VMobject()
      path.set_points_smoothly([start, mid_enter, mid_exit, end])
      return path

  dot = Dot(radius=0.09, color="#4285F4")
  dot.move_to(adk_agent.get_right())
  self.play(MoveAlongPath(dot, make_path(
      adk_agent.get_right(),
      gateway_base.get_left(),
      gateway_base.get_right(),
      vertex_node.get_left()
  ), rate_func=smooth, run_time=1.5))
  ```
- Sub-panel highlight sequence (while dot is in gateway):
  ```python
  self.play(sub_auth.animate.set_fill("#34A853", opacity=0.5).set_stroke(color="#34A853"), run_time=0.2)
  self.play(sub_ai.animate.set_fill("#FBBC04", opacity=0.5).set_stroke(color="#FBBC04"), run_time=0.2)
  self.play(sub_obs.animate.set_fill("#4285F4", opacity=0.5).set_stroke(color="#4285F4"), run_time=0.2)
  # Reset panels:
  self.play(AnimationGroup(sub_auth.animate.set_fill(opacity=0.12), ..., run_time=0.3))
  ```
- ACCESS BLOCKED:
  ```python
  from manim import WHITE
  blocked_rect = RoundedRectangle(
      corner_radius=0.15, width=3.2, height=0.75,
      fill_color="#EA4335", fill_opacity=0.94,
      stroke_color="#EA4335", stroke_width=2
  ).move_to(gateway_base.get_center() + RIGHT*2.5)

  blocked_text = Text("ACCESS BLOCKED", font="Verdana", font_size=22,
                       color=WHITE, weight=BOLD)
  blocked_text.move_to(blocked_rect.get_center())

  self.play(
      FadeIn(VGroup(blocked_rect, blocked_text), scale=1.3, run_time=0.4),
      Flash(gateway_base.get_center(), color="#EA4335", flash_radius=1.0,
            num_lines=10, run_time=0.4)
  )
  self.wait(0.8)
  self.play(FadeOut(VGroup(blocked_rect, blocked_text), run_time=0.4))
  ```
- Policy text flash (brief, above the gateway):
  ```python
  policy_flash = Text("Policy: Secret Manager → RESTRICTED",
                       font="Verdana", font_size=14, color="#EA4335")
  policy_flash.next_to(gateway_base, UP, buff=0.5)
  self.play(FadeIn(policy_flash, run_time=0.2))
  self.wait(0.6)
  self.play(FadeOut(policy_flash, run_time=0.3))
  ```
- Known risk: `MoveAlongPath` with `VMobject().set_points_smoothly` needs at least 4 distinct
  points or it may render as a straight line. Add an intermediate point inside the gateway
  if the path looks wrong: `[start, gateway.get_left(), gateway.get_center(), gateway.get_right(), end]`.

---

## Scene 5: Observability — The Legible Network

**Duration**: ~17s
**Purpose**: Close the loop on Act 1's chaos. The exact mobjects from Scene 2 are restored
to full opacity and TRANSFORMED — not replaced — into a clean, navigable topology. A request
dot traces a complete path through the network, leaving a glowing blue trail. The message:
the problem wasn't too many connections, it was untraced connections.

### Visual Elements

- RESTORE: `chaos_lines` and `service_nodes` and `agent_nodes` animate to full opacity
- TRANSFORM: all `DashedLine` objects → clean `Line` objects (blue, solid) simultaneously
- Nodes rearrange to a clean hub-spoke layout (Gateway at center, agents left, services right)
- "User" node added top-left as request origin
- Request Dot (`#4285F4`, radius=0.10) travels: User → Gateway → ADK Agent → Vertex AI → back
- At each waypoint: small telemetry mini-card slides in (white, tiny bar chart + latency label)
- Traversed path edges stay highlighted blue after Dot passes
- Final: entire traced path glows; untraced edges are light gray

### Content

1. Title `Write`s: `"Pillar 3: Observability."`
2. All chaos network elements animate from opacity=0.08 to opacity=1.0 (run_time=0.8).
3. Simultaneous `Transform`: every `DashedLine` → clean `Line`, same endpoints, blue stroke.
   Nodes animate to clean hub-spoke positions simultaneously (run_time=1.5).
4. Pause 0.5s. Text: `"Same network."` — then rewrites: `"Now you can see it."`
5. "User" node fades in top-left.
6. Blue Dot spawns at User. `MoveAlongPath` begins: User → Gateway → ADK → Vertex AI → User.
7. At each node the Dot touches: a telemetry mini-card slides in from that node.
8. Each traversed edge glows brighter blue and stays that way.
9. Full path traced. Dot stops at User.
10. Text: `"Every request. Every hop. Visible."`

### Narration Notes

- "This is the same network you saw at the start."
- "The same agents. The same services."
- "The difference is: now every request has a trace. Every hop is logged."
- "You can zoom in on any agent, any service, and see exactly what passed through it,
  when, and whether it was authorized."
- Tone: satisfying payoff. The chaos from Act 1 is the same scene — transformed.

### Technical Notes

- **CRITICAL**: This scene reuses `self.chaos_lines`, `self.service_nodes`, `self.agent_nodes`.
  Do not construct new mobjects for the network — transform the stored ones.
- Restore animation:
  ```python
  self.play(
      AnimationGroup(*[
          mob.animate.set_opacity(1.0)
          for mob in self.chaos_lines + self.service_nodes + self.agent_nodes
      ], run_time=0.8)
  )
  ```
- Transform DashedLines to clean Lines:
  ```python
  clean_lines = []
  for dash_line in self.chaos_lines:
      cl = Line(
          dash_line.get_start(), dash_line.get_end(),
          stroke_color="#4285F4", stroke_width=2.0, stroke_opacity=0.4
      )
      clean_lines.append(cl)
  self.play(
      AnimationGroup(*[
          Transform(dl, cl) for dl, cl in zip(self.chaos_lines, clean_lines)
      ], run_time=1.5)
  )
  ```
- Clean hub-spoke positions:
  ```python
  clean_agent_pos = {
      "ADK":       LEFT*4.5 + UP*1.5,
      "LangChain": LEFT*4.5 + UP*0.5,
      "CrewAI":    LEFT*4.5 + DOWN*0.5,
      "AutoGen":   LEFT*4.5 + DOWN*1.5,
      "Custom A":  LEFT*4.5 + DOWN*2.5,
  }
  clean_service_pos = {
      "Vertex AI":      RIGHT*4.5 + UP*1.5,
      "BigQuery":       RIGHT*4.5 + UP*0.5,
      "Secret Manager": RIGHT*4.5 + DOWN*0.5,
      "Pub/Sub":        RIGHT*4.5 + DOWN*1.5,
      "External API":   RIGHT*4.5 + DOWN*2.5,
  }
  gateway_pos = ORIGIN
  self.play(AnimationGroup(*[
      node.animate.move_to(pos) for node, pos in zip(self.agent_nodes, clean_agent_pos.values())
  ] + [
      node.animate.move_to(pos) for node, pos in zip(self.service_nodes, clean_service_pos.values())
  ], run_time=1.5))
  ```
- Telemetry mini-card:
  ```python
  def make_telemetry_card(node, latency_ms):
      card = RoundedRectangle(
          corner_radius=0.1, width=1.5, height=0.7,
          fill_color=WHITE, fill_opacity=0.95,
          stroke_color="#E8EAED", stroke_width=1
      )
      b1 = Rectangle(width=0.12, height=0.18, fill_color="#4285F4", fill_opacity=0.8,
                      stroke_width=0).shift(LEFT*0.3 + DOWN*0.05)
      b2 = Rectangle(width=0.12, height=0.28, fill_color="#4285F4", fill_opacity=0.8,
                      stroke_width=0).shift(LEFT*0.1 + DOWN*0.0)
      b3 = Rectangle(width=0.12, height=0.12, fill_color="#4285F4", fill_opacity=0.8,
                      stroke_width=0).shift(RIGHT*0.1 + DOWN*0.08)
      val = Text(f"{latency_ms}ms", font="Verdana", font_size=10, color="#3C4043"
                 ).move_to(card.get_right() + LEFT*0.35 + DOWN*0.05)
      telemetry = VGroup(card, b1, b2, b3, val)
      telemetry.next_to(node, UP, buff=0.1)
      return telemetry
  ```
- Edge glow after Dot passes — update stroke opacity on the specific traversed Line:
  ```python
  self.play(traversed_line.animate.set_stroke(opacity=1.0, width=2.8), run_time=0.2)
  ```
- Implementation risk: `Transform(DashedLine, Line)` works if both are VMobjects with the
  same endpoint count. If it stutters, fall back to `ReplacementTransform` or
  `FadeOut(dash_line) / FadeIn(clean_line)` in parallel.

---

## Scene 6: The Aha — Same Governance, New Agents

**Duration**: ~15s
**Purpose**: The conceptual payoff. Draw the explicit parallel between how Google Cloud
already governs people (IAM) and services (service accounts), and how Agent Platform
governs AI agents (workload identity + gateway). The developer's moment of recognition:
this is a governance model they already know.

### Visual Elements

- Clean, minimal layout — no network, no nodes. Just the table and text.
- Background: `#F8F9FA`
- Three-column parallel table:
  - Column headers: "People" | "Cloud Services" | **"AI Agents"** (blue, hero column)
  - Column 1 icon: geometric person (Circle for head + Lines for body)
  - Column 2 icon: geometric gear (Circle + 6 small Rectangle teeth)
  - Column 3 icon: RoundedRectangle (agent node, hero blue)
  - Row 1 "Identity": `"Login / SSO"` | `"Service Account"` | **`"Workload Identity"`** (green)
  - Row 2 "Policy":   `"IAM Roles"` | `"IAM Roles"` | **`"Agent Gateway"`** (green)
  - Row 3 "Audit":    `"Audit Logs"` | `"Cloud Trace"` | **`"Agent Observability"`** (green)
- Column 3 has a subtle blue highlight background rectangle
- Horizontal separator lines between rows
- Final text (larger, centered below table): `"Govern agents the same way you govern everything else."`
- Sub-text: `"Agent Platform  ·  Any framework  ·  Any agent"`

### Content

1. Previous scene fades to clean. Title `Write`s: `"Same governance model."`
2. Three column headers `FadeIn` with `LaggedStart`, left to right.
3. Column icons appear below headers.
4. Row 1 writes in across all three columns, left to right with slight lag.
5. Horizontal separator draws between Row 1 and Row 2.
6. Row 2 writes in the same way.
7. Separator draws.
8. Row 3 writes in.
9. Column 3 background highlight glow `FadeIn` (blue, low opacity, rounded rect).
10. Hold 0.5s. The table is complete. Let the viewer read it.
11. Final text `Write`s slowly (run_time=1.8): `"Govern agents the same way you govern everything else."`
12. Sub-text `FadeIn` below: `"Agent Platform  ·  Any framework  ·  Any agent"`
13. Hold 1.5s. Fade to `#F8F9FA`.

### Narration Notes

- "You already know this model."
- "For people: IAM. For Cloud services: service accounts. For AI agents: workload identity
  and the Agent Gateway."
- Pause while the table is complete: let the viewer read it.
- Final line, spoken slowly and clearly: "Govern agents the same way you govern everything else."
- One beat of silence after that line before the sub-text fades in.
- Tone: quiet confidence. This is the insight. It doesn't need amplification.

### Technical Notes

- Column positions and row heights:
  ```python
  COL_X   = [-4.2, 0.0, 4.2]   # left, center, right
  ROW_Y   = [0.8, 0.0, -0.8]   # row 1, row 2, row 3
  HEADER_Y = 2.0
  ICON_Y   = 1.5
  ```
- Person icon (no SVG, pure geometry):
  ```python
  head = Circle(radius=0.18, fill_color="#9AA0A6", fill_opacity=0.3,
                 stroke_color="#9AA0A6", stroke_width=1.5)
  body = Line(ORIGIN, DOWN*0.35, stroke_color="#9AA0A6", stroke_width=2.5)
  arms = Line(LEFT*0.22 + DOWN*0.12, RIGHT*0.22 + DOWN*0.12,
               stroke_color="#9AA0A6", stroke_width=2.0)
  person = VGroup(head.move_to(UP*0.18), body, arms)
  ```
- Gear icon (pure geometry):
  ```python
  gear_body = Circle(radius=0.22, fill_color="#9AA0A6", fill_opacity=0.3,
                      stroke_color="#9AA0A6", stroke_width=1.5)
  from numpy import cos, sin, pi
  teeth = VGroup(*[
      Rectangle(width=0.09, height=0.14,
                 fill_color="#9AA0A6", fill_opacity=0.5, stroke_width=0
      ).rotate(i * pi/3).move_to(0.32 * np.array([cos(i*pi/3), sin(i*pi/3), 0]))
      for i in range(6)
  ])
  gear = VGroup(gear_body, teeth)
  ```
- Column 3 background highlight:
  ```python
  col3_bg = RoundedRectangle(
      corner_radius=0.2, width=3.0, height=4.2,
      fill_color="#4285F4", fill_opacity=0.05,
      stroke_color="#4285F4", stroke_width=1.5
  ).move_to([4.2, 0, 0])
  self.play(FadeIn(col3_bg, run_time=0.8))
  ```
- Row text colors:
  - Column 1 & 2 body text: `color="#5F6368"` (subdued)
  - Column 3 body text: `color="#34A853"`, `weight=BOLD` (hero, green for success/confirmed)
  - Row labels (left margin "Identity", "Policy", "Audit"): `color="#3C4043"`, `weight=BOLD`
- Horizontal separators:
  ```python
  sep = Line(LEFT*6, RIGHT*6, stroke_color="#E8EAED", stroke_width=1.0)
  self.play(Create(sep, run_time=0.4))
  ```
- Final text:
  ```python
  final = Text(
      "Govern agents the same way you govern everything else.",
      font="Verdana", font_size=26, color="#3C4043", weight=BOLD
  ).move_to(DOWN*2.5)
  self.play(Write(final, run_time=1.8))
  self.wait(1.5)
  ```
- Known risk: `Text` with Verdana at font_size=26 may be slightly wider than frame at 16:9.
  Pre-check with `assert final.width < config.frame_width - 0.5` and reduce to font_size=22
  if needed.

---

## Transitions & Flow

### Scene-to-Scene Logic

- **S1 → S2**: No hard cut. Agents animate to wider spread positions; services appear.
  Seamless continuation — the viewer reads it as the same "world" getting more complex.

- **S2 → S3**: Chaos network dims to `opacity=0.08` and recedes to background texture.
  `"Pillar 1"` title writes in. The dimming communicates "we're about to solve this"
  without hiding the problem.

- **S3 → S4**: Chaos stays at `opacity=0.08`. Identity-focused elements `FadeOut`.
  Gateway tower draws in. `"Pillar 2"` writes in. Clean transition — Gateway is new context.

- **S4 → S5**: Gateway elements `FadeOut` (except the abstract gateway node). Chaos network
  elements animate from `opacity=0.08` back to `opacity=1.0`. This is the most dramatic
  moment in the video — the viewer has forgotten the sprawl, and its return is a reveal.
  Then it immediately begins to transform. The transformation is the payoff.

- **S5 → S6**: Network fades out entirely (first FadeOut since Scene 2). Clean slate —
  signals a conceptual shift from "mechanics" to "principle." The table layout is
  deliberately minimal after all the visual complexity.

### The Persistence Contract

**This is the implementation invariant that must not be broken:**

Mobjects created in Scene 2 (stored as `self.chaos_lines: list`, `self.service_nodes: list`,
`self.agent_nodes: list`) must NEVER be removed via `FadeOut` or `self.remove()` between
Scene 2 and Scene 5. They are dimmed with `animate.set_opacity(0.08)` and brought back
with `animate.set_opacity(1.0)`. The Scene 5 `Transform` animations depend on these
objects being alive in the scene graph.

If a scene needs a "clean" background, move the stored objects to a BackgroundRectangle
layer or use a `Group.set_opacity(0.08)` on the combined group, not `FadeOut`.

### Recurring Visual Motifs

- **Framework diversity**: 4-5 differently-colored agent boxes whenever agents appear as a
  group. The only exception is Scene 3, where isolation of a single agent serves the
  pedagogical purpose of explaining the identity ceremony clearly.
- **Blue = authorized/controlled**: `#4285F4` for identity badges, clean connections, gateway,
  authorized paths. By Scene 5, the viewer reads blue = "governed" without needing text.
- **Red = problem/blocked**: `#EA4335` for chaotic lines, ACCESS BLOCKED, restricted nodes.
  Red is used sparingly — only where the problem is the visual focus.
- **Green = confirmed**: `#34A853` for SPIFFE badges, confirmed authorization, success states,
  Column 3 in the aha table.
- **Text rhythm**: Title establishes the concept name; Content text shows the developer-
  relevant implication. Kept short — no bullet-point walls.

---

## Color Palette

| Name | Hex | Role |
|---|---|---|
| Background | `#F8F9FA` | All scenes — light Google brand background |
| Google Blue | `#4285F4` | Identity badges, gateway, authorized paths, hero column |
| Google Red | `#EA4335` | ACCESS BLOCKED, restricted nodes, chaotic lines (Phase 3) |
| Google Yellow | `#FBBC04` | AI Security sub-panel, warning states only |
| Google Green | `#34A853` | SPIFFE badges, confirmed authorization, Column 3 in aha |
| Dark Gray | `#3C4043` | All titles and primary body text (on light bg) |
| Medium Gray | `#5F6368` | Descriptor text, Column 1-2 table content |
| Sub Gray | `#9AA0A6` | Uncontrolled connections, unemphasized elements |
| White | `#FFFFFF` | ACCESS BLOCKED text, telemetry card backgrounds |

**Intentional constraint**: Purple (`#9B59B6`) from v2 is not used. That video was Flue-centric
and used purple to mean "security layer." This video uses Google brand colors throughout —
blue for controlled/authorized, red for blocked, green for confirmed — because the message
is "this is GCP's standard governance model" not "this is a special Flue feature."

---

## Mathematical/Formula Content

None. This video expresses all technical complexity through geometry, network topology,
and motion. No LaTeX, no equations, no Manim axes (except optionally for the acceleration
gap context in Scene 2, which is an enhancement if runtime allows).

---

## Implementation Order

1. **Scene 2 sprawl network first** — build `chaos_lines`, `service_nodes`, and the final
   spread node positions. These are the structural foundation. Confirm `DashedLine`
   rendering at -ql quality.

2. **Scene 5 transform** — validate `Transform(DashedLine → Line)` and coordinated
   `animate.move_to` for node rearrangement. The persistence contract (chaos → dim →
   restore → transform) is the most complex animation chain in the video. Get it working
   before building other scenes.

3. **Scene 3 identity badge** — build the credential issuer, badge, and timeline. Test
   `DashedVMobject(Circle)` at -ql quality (fallback to solid thin ring if needed).

4. **Scene 4 gateway** — build the tower with sub-panels, request dot path, and ACCESS
   BLOCKED. The `MoveAlongPath` with gateway intercept is the second most complex animation.
   Test the sub-panel highlight sequence timing carefully.

5. **Scene 6 aha table** — build the three-column layout. Straightforward but text-heavy;
   check Verdana availability and font_size overflow early.

6. **Scene 1** — wire in the opening once all other scenes are structurally confirmed.
   It is purely additive.

7. **Wire together**: connect `_scene1` through `_scene6` in a single `construct` method.
   Tune `self.wait()` durations to target 110-120s total.

8. **Render -ql** for layout review.
9. **Render -qm** for visual review (720p30).
10. **Render -qh** for production (1080p60).

### Implementation Risk Register

| Risk | Scene | Mitigation |
|---|---|---|
| `Transform(DashedLine, Line)` stutters due to point-count mismatch | S5 | Use `ReplacementTransform` or paired `FadeOut/FadeIn` |
| `DashedVMobject` rendering artifacts at -ql | S3 | Fall back to thin solid `Circle(stroke_opacity=0.7)` |
| `MoveAlongPath` straight-lines through gateway | S4 | Add intermediate anchor point inside gateway body |
| Verdana `Text` overflows frame width | S6 | Reduce font_size=26 → 22, re-check with `assert` |
| Pentagon/clock positions off-center | S5 | Use `np.array([cos, sin, 0])` not Manim's `PI` for numpy |
| `chaos_lines` opacity bleeds through to S3/S4 | S3/S4 | Verify `Group.set_opacity(0.08)` applies to all children |
