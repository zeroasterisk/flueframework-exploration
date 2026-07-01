# Video 2: Security Deep Dive — Scene Plan

## Overview

- **Topic**: The five-layer GEAP security stack for Flue agents on Google Cloud
- **Hook**: "Your agent just deployed. Who's watching the door?"
- **Target Audience**: Developers who watched Video 1 (Flue Deployment Story); knows what a Flue agent is and how to deploy it; wants to know how to make it production-safe
- **Estimated Length**: ~30 seconds, 5 chapters
- **Key Insight**: On GCP, security isn't something you bolt on — identity, policy enforcement, and content protection are provisioned automatically when you deploy. Other platforms require you to build all of it yourself.
- **Series position**: Video 2. The hook deliberately calls back to Video 1's deployment story; the final beat references that security is the bridge to A2A (Video 4).

## Narrative Arc

Pattern chosen: **Pattern 3 (Two Perspectives → Unity)** adapted as **Unprotected → Protected**.

An unprotected Flue agent is a box with no door — anything can call it, and it can call anything. We walk through five layers of GCP's governance stack, each adding a concrete protection, until the same agent is surrounded by an interlocking purple security ring. The "aha" is that none of these layers required the developer to write security code — GCP provisioned them.

Emotional arc: Mild anxiety (open door) → growing confidence (layer by layer) → satisfaction (closed ring, nothing got in or out unintentionally).

---

## Scene 1: The Unprotected Agent

**Duration**: ~5s
**Purpose**: Establish the problem. An agent with no security perimeter is visible and callable by anyone; it can also call anything without restriction. Plant mild anxiety before the relief of the fix.

### Visual Elements

- **Center**: `make_node("Flue Agent", GREEN_ACC, width=2.6, height=0.8)` — same green as Video 1, visual continuity
- **Left**: two anonymous caller nodes in faint GREY_SUB (`make_node("?", GREY_SUB, width=1.4, height=0.55)` × 2, stacked vertically), representing unknown callers
- **Right**: two target nodes in faint GREY_SUB (`make_node("External API", GREY_SUB)`, `make_node("Vertex AI", GREY_SUB)`), representing unrestricted egress
- **Arrows**: thick open arrows left→center and center→right, color GREY_SUB, stroke_width=THICK, no gating visual (no checkpoint)
- **Top**: `title_text("Who's watching the door?", color=WHITE_TXT)` — the hook question, written first
- **Bottom**: `action_text("any caller · any outbound call · no audit trail")` in GREY_SUB

### Content

1. Scene opens on dark background. TITLE question writes in from the left.
2. The Flue Agent node fades in at center (FadeIn, 0.5s).
3. The two "?" caller nodes slide in from the left with thick grey arrows (LaggedStart, 0.4s lag).
4. The two target nodes slide in from the right with thick grey outbound arrows.
5. Brief hold (0.4s). The ACTION text fades in below.
6. Subtle pulse/Indicate on the open arrows to signal "this is wrong."

### Narration Notes

- Tone: calm curiosity, not alarm — "You deployed a Flue agent. But who can reach it, and what can it reach?"
- The question should feel like a natural follow-on to Video 1's deployment story, not like a warning.
- Key phrase to land: "no door, no audit trail."

### Technical Notes

- `camera.background_color = BG_COLOR` set at scene level
- Use `Indicate(arrow, color=YELLOW_ACC)` on the open arrows for the "wrong" signal, not a red flash (keep it curious, not alarming)
- `LaggedStart` with `lag_ratio=0.4` for the caller/target nodes to avoid a wall-of-stuff reveal
- All GREY_SUB elements should use `fill_opacity=0.10` (lower than normal 0.18) to visually read as "ghosts" — present but uncontrolled

---

## Scene 2: Agent Identity — SPIFFE & mTLS

**Duration**: ~6s
**Purpose**: First layer of the security ring. Replace the "?" callers with a verified identity badge. Introduce SPIFFE as the mechanism; show mTLS as the result. This is the most technically dense beat — keep the visual simple.

### Visual Elements

- **Starting state**: Scene 1 layout, but caller "?" nodes and open arrows are still present
- **Transform**: The two "?" nodes `Transform` into a single `make_node("SPIFFE ID", PURPLE_ACC, width=2.4)` node — the unknown is now a verified identity
- **New element**: A small certificate icon (a thin `RoundedRectangle` with border only, width=0.8, height=1.0, color=PURPLE_ACC, fill_opacity=0) labeled `"X.509"` in small text (font_size=14, PURPLE_ACC), positioned above the SPIFFE ID node
- **Arrow change**: The grey thick arrow from callers→agent transforms to a PURPLE_ACC arrow with a small lock glyph at midpoint (a tiny padlock: two `Arc` objects forming a U-shape + a small `Rectangle` for the body, grouped, color=PURPLE_ACC, scale ~0.15)
- **Top**: `title_text("Agent Identity", color=PURPLE_ACC)` replaces the hook question
- **Bottom line 1**: `descriptor_text("SPIFFE ID · X.509 certificate · automatically provisioned")`
- **Bottom line 2**: `action_text("no service-account key files · mTLS between agents")`

### Content

1. TITLE transforms from white hook text to PURPLE_ACC "Agent Identity" text.
2. The two "?" nodes merge (FadeOut both, FadeIn SPIFFE ID node at their midpoint) with the certificate icon appearing above it.
3. The grey inbound arrows transform to a single PURPLE_ACC arrow; the lock glyph `Create`s at the arrow midpoint.
4. Hold (0.5s). Descriptor + action text write in.
5. Circumscribe the SPIFFE ID node briefly in PURPLE_ACC to mark it as the "secured" element.

### Narration Notes

- Lead with what the developer gets, not how it works: "Every Flue agent on GCP gets a cryptographic identity — a SPIFFE ID and X.509 certificate — automatically. No key files to rotate."
- Then add the payoff: "Agent-to-agent calls use mTLS — encrypted and authenticated by default."
- Do not try to explain SPIFFE internals in 6 seconds. Name it, show the result.

### Technical Notes

- `Transform(caller_group, spiffe_node)` — group the two "?" nodes first with `VGroup`, then Transform to the single SPIFFE node; position the SPIFFE node at the average of their positions
- The padlock glyph: `VGroup(Arc(radius=0.12, angle=PI, color=PURPLE_ACC), Rectangle(width=0.22, height=0.14, color=PURPLE_ACC, fill_color=PURPLE_ACC, fill_opacity=1)).arrange(DOWN, buff=0)` — scale down with `.scale(0.45)` and move to arrow midpoint
- `Circumscribe(spiffe_node, color=PURPLE_ACC, run_time=0.8)` for the highlight
- Keep the right-side (egress) nodes grey/unchanged — they're still unprotected, the reveal is deliberate

---

## Scene 3: Agent Gateway — Policy Enforcement

**Duration**: ~6s
**Purpose**: Second and third layers together. The Agent Gateway is the egress chokepoint (outbound policy); IAP is the inbound chokepoint. Both visualized as checkpoints on the arrows, not as new nodes. Key concept: the agent still calls the same things — it just goes through a verified path.

### Visual Elements

- **Starting state**: Scene 2 layout (SPIFFE identity on left, grey egress on right)
- **New center element**: A vertical barrier line between the Flue Agent and the right-side target nodes, PURPLE_ACC, stroke_width=2.5 dashed — this is the Agent Gateway. Label it `make_node("Agent Gateway", PURPLE_ACC, width=2.0, height=0.55)` positioned just right of center, slightly above the arrow line
- **Arrow change**: The grey egress arrows transform to PURPLE_ACC arrows, now routed through the gateway node (path changes: agent → gateway → target)
- **New small badge**: Above the inbound (left) arrow, a small `make_node("IAP", PURPLE_ACC, width=1.0, height=0.45)` badge appears on the arrow, visually gating the inbound path too
- **Top**: `title_text("Agent Gateway", color=PURPLE_ACC)`
- **Bottom line 1**: `descriptor_text("policy enforcement point · inbound + outbound")`
- **Bottom line 2**: `action_text("IAP gates callers · Gateway gates egress · dry-run mode available")`

### Content

1. TITLE rewrites to "Agent Gateway."
2. The gateway node `Create`s between agent and targets — it draws in with a `Create(gateway_node)`.
3. The grey egress arrows reroute: they fade out and new PURPLE_ACC arrows appear routing through the gateway (agent → gateway line, then gateway → each target). `LaggedStart` so the viewer tracks the new path.
4. The IAP badge slides onto the inbound arrow.
5. Hold (0.5s). Descriptor/action write in.
6. Brief `Flash` on the gateway node to indicate "this is where policy is enforced."

### Narration Notes

- "The Agent Gateway is the chokepoint for everything that goes out — and IAP gates everything that comes in."
- Emphasize: "Your agent only calls what you've explicitly registered. Everything else is blocked."
- Mention dry-run: "Start in dry-run mode to see what would be blocked, without disrupting traffic."
- This is the most operationally important scene — keep the tone confident, not bureaucratic.

### Technical Notes

- Use `DashedLine` for the gateway barrier (before it becomes a proper node), then `Transform` to `make_node`
- For the rerouted arrows: use intermediate anchor points. Arrow 1: `start=agent.get_right(), end=gateway.get_left()`. Arrow 2: `start=gateway.get_right(), end=target.get_left()`. Use `Arrow` not `Line` for directional clarity.
- `Flash(gateway_node.get_center(), color=PURPLE_ACC, flash_radius=0.5)` for the emphasis beat
- The right-side target nodes should now have PURPLE_ACC borders (update stroke color) to signal they are "now protected destinations" — `target.animate.set_stroke(color=PURPLE_ACC)`

---

## Scene 4: Agent Registry + Semantic Governance

**Duration**: ~6s
**Purpose**: Fourth and fifth layers. The Registry makes the agent discoverable in a controlled catalog. Semantic Governance adds natural-language policies. These two are conceptually paired: one controls who knows the agent exists; the other controls what the agent is allowed to say and do. Visual: a catalog card + a policy statement strip.

### Visual Elements

- **Starting state**: Scene 3 layout (full gateway diagram)
- **New top element**: A small catalog card appearing above the diagram: `RoundedRectangle(width=3.0, height=0.9, color=PURPLE_ACC, fill_color=PURPLE_ACC, fill_opacity=0.12, stroke_width=1.5)` labeled `"Agent Registry"` (PURPLE_ACC, font_size=18, BOLD) with two tiny sub-labels: `"name · skills · endpoint"` (font_size=12, GREY_SUB) — mimics the Agent Card structure from Video 4
- **Dashed line** from the Flue Agent node up to the registry card — `DashedLine(agent.get_top(), registry_card.get_bottom(), color=PURPLE_ACC, stroke_width=1.5)` (association, not flow, per arrow conventions)
- **New bottom element**: A horizontal policy strip below the diagram — a `RoundedRectangle(width=5.5, height=0.6, color=PURPLE_ACC, fill_opacity=0.08)` containing `action_text('"no financial data to external APIs"')` typed in with `Write` — shows natural language policy
- **Small Model Armor badge**: A tiny `make_node("Model Armor", PURPLE_ACC, width=1.8, height=0.45)` appears overlaid on the outbound gateway arrow, labeled with a small shield icon character (use Unicode `⬡` or just `[✓]` as a text-based badge, font_size=12)
- **Top**: `title_text("Registry · Governance", color=PURPLE_ACC)`
- **Bottom**: `descriptor_text("catalog + natural-language policies + content protection")`

### Content

1. TITLE rewrites to "Registry · Governance."
2. The registry card slides down from above and the dashed association line draws.
3. The policy strip slides up from below — the quoted policy text types in with `Write`.
4. The Model Armor badge fades onto the outbound arrow.
5. Hold (0.6s). Descriptor writes in.
6. Brief `Indicate` on the policy text to signal this is user-authored, not code.

### Narration Notes

- "The Agent Registry is a controlled catalog — only registered agents are discoverable."
- On Semantic Governance: "Policies are written in plain English. 'Don't share financial data with external APIs.' No code changes, no firewall rules."
- On Model Armor: "Inputs and outputs are sanitized against prompt injection and data leakage."
- This is the highest-level concept in the video — use the slowest pace of any scene, let each element land.

### Technical Notes

- The policy strip text should feel like a live policy being typed in — `Write(policy_text, run_time=1.5)` with slower rate to make it readable
- `Indicate(policy_text, color=YELLOW_ACC, run_time=0.6)` after the Write to highlight it's a real policy statement
- The shield/Model Armor badge overlaid on the arrow: use `always_redraw` or just position at `arrow.point_from_proportion(0.65)` for placement
- Registry card deliberately mirrors the Agent Card from Video 4 — same structure, different context. Developers who saw Video 4 will recognize it.

---

## Scene 5: The Closed Ring — Payoff

**Duration**: ~7s
**Purpose**: Zooms out to reveal the complete security picture. All five layers are now visible simultaneously as an interlocking ring around the Flue Agent. The "aha": every layer was provisioned automatically by GCP. Closes with the series CTA.

### Visual Elements

- **Starting state**: All elements from Scene 4 visible
- **Major animation**: All five security elements (SPIFFE node, IAP badge, Agent Gateway node, Registry card, Model Armor badge) animate to arc positions around a central `make_node("Flue Agent", GREEN_ACC, width=2.6, height=0.8)` — they form a pentagon/ring around it
- **Ring visual**: A `Circle(radius=2.0, color=PURPLE_ACC, stroke_width=2, fill_opacity=0)` draws around the agent node using `Create` — the security perimeter is now visible and complete
- **Between each security element and the circle**, a small PURPLE_ACC connector line `(stroke_width=1.5)` — the ring is interlocking
- **Top**: `title_text("Identity · Gateway · Registry · Governance · Armor", color=PURPLE_ACC)` — all five names in one line, smaller (font_size=22 to fit)
- **Bottom**: `descriptor_text("provisioned automatically on GCP")` then a beat later `action_text("zero security code written")` — this is the aha statement
- **Final beat**: A subtle `Flash` emanates from the ring center, PURPLE_ACC, then the scene holds for 1.5s before fade to dark

### Content

1. All existing elements FadeOut except the Flue Agent node, which moves to center.
2. The five security elements FadeIn in their ring positions (LaggedStart, 0.25s lag each), creating a visual "encirclement" that feels satisfying rather than threatening.
3. The PURPLE_ACC circle draws around them with `Create(ring, run_time=1.2)`.
4. TITLE writes in (all five names).
5. DESCRIPTOR writes: "provisioned automatically on GCP."
6. Brief pause (0.4s). ACTION text writes: "zero security code written."
7. `Flash` pulse from center. Hold 1.5s.
8. FadeOut to BG_COLOR.

### Narration Notes

- "Five layers. One command to deploy. GCP provisions the identity, the gateway, the registry, the governance, and the armor — automatically."
- The line "zero security code written" is the aha moment. Pause after it.
- Optional closing line (if runtime allows): "Security that came with the agent. That's what GCP gives you that other platforms don't."
- Tone: earned satisfaction, not sales pitch.

### Technical Notes

- Pentagon positions for the five nodes (radius=2.2 from center):
  ```python
  import numpy as np
  positions = [
      2.2 * np.array([np.cos(PI/2 + i * 2*PI/5), np.sin(PI/2 + i * 2*PI/5), 0])
      for i in range(5)
  ]
  # order: SPIFFE (top), IAP (upper-right), Agent Gateway (lower-right), Registry (lower-left), Model Armor (upper-left)
  ```
- The ring circle: `Circle(radius=1.85, color=PURPLE_ACC, stroke_width=2.5, fill_opacity=0)` — sized to just clear the node borders
- `Flash(ORIGIN, color=PURPLE_ACC, flash_radius=1.0, num_lines=10, run_time=0.8)` for the final pulse
- Connector spokes: `Line(node.get_center(), ring.point_from_proportion(i/5), stroke_width=1.0, color=PURPLE_ACC, stroke_opacity=0.4)` — subtle, not dominant

---

## Transitions & Flow

### Scene-to-Scene Logic

- **S1 → S2**: TITLE text `Transform` from white question to PURPLE_ACC "Agent Identity" — signals the answer begins. Grey caller nodes merge into SPIFFE node.
- **S2 → S3**: TITLE rewrites. Right-side targets remain; gateway appears between them and the agent. Arrow rerouting is the visual transition.
- **S3 → S4**: TITLE rewrites. New elements slide in from top (registry) and bottom (policy strip) simultaneously — visual expansion of scope.
- **S4 → S5**: Everything FadeOut except the Flue Agent; elements reorganize into ring. This is the structural reset before the payoff — give it 0.8s of "empty center" before the ring elements appear, to let the reorganization breathe.

### Recurring Motifs

- **PURPLE_ACC** as the consistent security color — every new security element arrives in purple. By Scene 5, the viewer reads purple = protected without needing text.
- **The Flue Agent node** stays GREEN_ACC throughout — it is the constant, the thing being protected. Never change its color.
- **Arrow evolution**: grey (uncontrolled) → PURPLE_ACC (governed). The color shift of arrows across scenes 2–3 tells the whole story visually without text.
- **Text rhythm**: TITLE establishes the layer name, DESCRIPTOR gives technical breadth in one line, ACTION gives the developer-relevant implication. Consistent across all 5 scenes.

---

## Color Palette

| Color | Hex | Role |
|---|---|---|
| `PURPLE_ACC` | `#9B59B6` | Primary security anchor — all five governance layer elements, ring, arrows post-governance |
| `GREEN_ACC` | `#83C167` | Flue Agent node (consistent with Video 1) |
| `WHITE_TXT` | `#FFFFFF` | TITLE text (default state), DESCRIPTOR text |
| `GREY_SUB` | `#AAAAAA` | ACTION text, unprotected/unknown elements (Scene 1 callers, Scene 1 egress) |
| `YELLOW_ACC` | `#FFFF00` | Indicate highlights only — used on the `Indicate` calls for open arrows (Scene 1 problem signal) and policy text (Scene 4 highlight). Never as a primary element color. |
| `BG_COLOR` | `#1C1C1C` | Background |

**Not used in this video**: `BLUE_ACC` (Cloud Run color, belongs to Video 1), `ORANGE_ACC` (GKE color). This keeps the palette focused and makes PURPLE_ACC read as "security everywhere."

---

## Manim Technical Notes (Cross-Scene)

### Shared Setup

```python
# At module level — identical to a2a_protocol.py pattern
BG_COLOR   = "#1C1C1C"
BLUE_ACC   = "#58C4DD"
GREEN_ACC  = "#83C167"
ORANGE_ACC = "#FF8C00"
YELLOW_ACC = "#FFFF00"
WHITE_TXT  = "#FFFFFF"
GREY_SUB   = "#AAAAAA"
PURPLE_ACC = "#9B59B6"

THIN, MEDIUM, THICK = 1.5, 2.5, 3.5

def make_node(label, color, width=2.2, height=0.65):
    rect = RoundedRectangle(
        corner_radius=0.15, width=width, height=height,
        color=color, fill_color=color, fill_opacity=0.18, stroke_width=2
    )
    txt = Text(label, font_size=22, color=color, weight=BOLD)
    txt.move_to(rect.get_center())
    return VGroup(rect, txt)

def title_text(s, color=WHITE_TXT):
    return Text(s, font_size=32, weight=BOLD, color=color)

def descriptor_text(s):
    return Text(s, font_size=22, color=WHITE_TXT)

def action_text(s):
    return Text(s, font_size=18, slant=ITALIC, color=GREY_SUB)
```

### Class Structure

Single scene class `SecurityDeepDive(Scene)` with a single `construct(self)` method. Break into private methods `_scene1`, `_scene2`, etc. for readability, called sequentially from `construct`. Keep all state (nodes, arrows, text objects) as local variables passed between methods, not instance variables, to avoid accidental state bleed.

### Run Time Budget (30s target)

| Chapter | Method | Target |
|---|---|---|
| Scene 1 | `_scene1` | 5.0s |
| Scene 2 | `_scene2` | 6.0s |
| Scene 3 | `_scene3` | 6.0s |
| Scene 4 | `_scene4` | 6.0s |
| Scene 5 | `_scene5` | 7.0s |
| **Total** | | **30.0s** |

### Known Implementation Risks

- **Padlock glyph (Scene 2)**: `Arc` + `Rectangle` as VGroup is fiddly at small scale. Fallback: use the Unicode character `🔒` via `Text("🔒", font_size=16)` if the Arc approach produces rendering artifacts at -ql quality.
- **Pentagon positioning (Scene 5)**: Confirm `np.cos/sin` with `from numpy import cos, sin, pi` inside the method — do not use Manim's `PI` for numpy arrays, it may cause type errors in some Manim versions.
- **FadeOut + ring reorganization (S4→S5)**: Test at -ql first. If the simultaneous FadeOut + reposition causes flash artifacts, insert a `self.wait(0.1)` between the FadeOut and the ring FadeIn.
- **Long TITLE line (Scene 5)**: `"Identity · Gateway · Registry · Governance · Armor"` at font_size=22 may overflow at 16:9. Pre-measure with `title.width > config.frame_width - 1` and reduce to font_size=18 if needed.

---

## Implementation Order

1. **Scene 5 first** — build the final ring layout. This pins the positions of the five security element nodes and the agent center, which all earlier scenes must be consistent with.
2. **Scene 1** — establish the unprotected baseline. All positions established here carry through Scenes 2–4.
3. **Scene 2** — SPIFFE identity transform. Validates the Transform animation pattern.
4. **Scene 3** — Gateway reroute. Most complex arrow manipulation.
5. **Scene 4** — Registry + Governance additions. Additive, lowest animation risk.
6. **Wire together** — connect all five `_scene*` methods in `construct`, tune `self.wait()` durations to hit the 30s target.
7. **Render -ql** for layout review.
8. **Render -qm** for visual review (720p30).
9. **Render -qh** for production (1080p60).
