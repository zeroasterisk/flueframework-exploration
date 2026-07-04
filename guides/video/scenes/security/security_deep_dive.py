"""Video 2: Security Deep Dive — ManimCE scene (v2).

v2 changes (from Alan's feedback):
  - Font: Verdana throughout
  - Scene 2: replaced broken Arc+Rectangle padlock with a clear 'mTLS' pill badge
  - Scene 3: fixed gateway overlap — recalculated all positions so nothing overlaps;
             gateway now visually 'inserts itself' between agent and targets
  - Scene 2: expanded SPIFFE/mTLS explanation text to be meaningful for non-security devs
  - Scene 3: expanded gateway policy explanation — what it actually blocks
  - Scene 5: ring nodes now two-line (service name + capability) so the ring is readable

Five-layer GEAP security stack for Flue agents on Google Cloud.
Narrative: unprotected → protected (Pattern 3: Two Perspectives → Unity).

Render:
    export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
    manim -ql --format=mp4 security_deep_dive.py SecurityDeepDive   # iterate (480p15)
    manim -qm --format=mp4 security_deep_dive.py SecurityDeepDive   # review (720p30)
    manim -qh --format=mp4 security_deep_dive.py SecurityDeepDive   # production (1080p60)
"""

from __future__ import annotations

import numpy as np

from manim import (
    BOLD,
    DOWN,
    ITALIC,
    LEFT,
    ORIGIN,
    RIGHT,
    UP,
    Arrow,
    Circle,
    Circumscribe,
    Create,
    DashedLine,
    FadeIn,
    FadeOut,
    Flash,
    Indicate,
    LaggedStart,
    PI,
    RoundedRectangle,
    Scene,
    Text,
    Transform,
    VGroup,
    Write,
    smooth,
)

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
BG_COLOR   = "#1C1C1C"
GREEN_ACC  = "#83C167"
YELLOW_ACC = "#FFFF00"
WHITE_TXT  = "#FFFFFF"
GREY_SUB   = "#BBBBBB"   # slightly brighter than before for legibility
PURPLE_ACC = "#9B59B6"

FONT       = "Verdana"   # consistent readable font throughout
THIN, MEDIUM, THICK = 1.5, 2.5, 3.5

# Layout constants — calculated once to avoid overlap
AGENT_POS    = ORIGIN + UP * 0.2
CALLER_X     = -4.2
TARGET_X     =  5.5    # pushed right to make room for gateway in scene 3
GATEWAY_X    =  3.0    # gateway center — clear of agent right edge (~1.3) and target left (~4.65)
GATEWAY_W    =  1.75   # width kept narrow to avoid overlap with targets at 5.5
SPIFFE_X     = -4.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_node(label: str, color: str, width: float = 2.2, height: float = 0.65) -> VGroup:
    rect = RoundedRectangle(
        corner_radius=0.15, width=width, height=height,
        color=color, fill_color=color, fill_opacity=0.18, stroke_width=2,
    )
    txt = Text(label, font=FONT, font_size=21, color=color, weight=BOLD)
    txt.move_to(rect.get_center())
    return VGroup(rect, txt)


def make_service_node(service: str, capability: str, color: str,
                      width: float = 2.1, height: float = 0.90) -> VGroup:
    """Two-line ring node: service name + capability subtitle."""
    rect = RoundedRectangle(
        corner_radius=0.15, width=width, height=height,
        color=color, fill_color=color, fill_opacity=0.18, stroke_width=2,
    )
    name = Text(service, font=FONT, font_size=18, color=color, weight=BOLD)
    cap  = Text(capability, font=FONT, font_size=13, color=GREY_SUB)
    name.move_to(rect.get_center() + UP * 0.18)
    cap.move_to(rect.get_center() + DOWN * 0.25)
    return VGroup(rect, name, cap)


def make_ghost_node(label: str, width: float = 1.8, height: float = 0.55) -> VGroup:
    rect = RoundedRectangle(
        corner_radius=0.15, width=width, height=height,
        color=GREY_SUB, fill_color=GREY_SUB, fill_opacity=0.10, stroke_width=1.5,
    )
    txt = Text(label, font=FONT, font_size=19, color=GREY_SUB, weight=BOLD)
    txt.move_to(rect.get_center())
    return VGroup(rect, txt)


def make_mtls_badge(color: str = PURPLE_ACC) -> VGroup:
    """Pill badge reading 'mTLS' — replaces the broken Arc+Rectangle padlock."""
    pill = RoundedRectangle(
        corner_radius=0.10, width=0.80, height=0.30,
        color=color, fill_color=color, fill_opacity=0.45, stroke_width=1.5,
    )
    txt = Text("mTLS", font=FONT, font_size=13, color=WHITE_TXT, weight=BOLD)
    txt.move_to(pill.get_center())
    return VGroup(pill, txt)


def title_text(s: str, color: str = WHITE_TXT) -> Text:
    return Text(s, font=FONT, font_size=30, weight=BOLD, color=color)


def descriptor_text(s: str) -> Text:
    return Text(s, font=FONT, font_size=19, color=WHITE_TXT)


def action_text(s: str) -> Text:
    return Text(s, font=FONT, font_size=16, color=GREY_SUB)


# ---------------------------------------------------------------------------
# Scene
# ---------------------------------------------------------------------------

class SecurityDeepDive(Scene):
    def construct(self):
        self.camera.background_color = BG_COLOR
        self._scene1()
        self._scene2()
        self._scene3()
        self._scene4()
        self._scene5()

    # ------------------------------------------------------------------
    # Scene 1: The Unprotected Agent (~5s)
    # "Who's watching the door?"
    # ------------------------------------------------------------------
    def _scene1(self):
        agent = make_node("Flue Agent", GREEN_ACC, width=2.6, height=0.8)
        agent.move_to(AGENT_POS)

        caller_a = make_ghost_node("?").move_to(LEFT * abs(CALLER_X) + UP  * 0.8)
        caller_b = make_ghost_node("?").move_to(LEFT * abs(CALLER_X) + DOWN * 0.2)
        target_a = make_ghost_node("External API", width=1.9).move_to(RIGHT * TARGET_X + UP  * 0.8)
        target_b = make_ghost_node("Vertex AI",    width=1.9).move_to(RIGHT * TARGET_X + DOWN * 0.2)

        arr_in_a  = Arrow(caller_a.get_right(), agent.get_left() + UP   * 0.2, color=GREY_SUB, stroke_width=MEDIUM, buff=0.08)
        arr_in_b  = Arrow(caller_b.get_right(), agent.get_left() + DOWN * 0.2, color=GREY_SUB, stroke_width=MEDIUM, buff=0.08)
        arr_out_a = Arrow(agent.get_right() + UP   * 0.2, target_a.get_left(), color=GREY_SUB, stroke_width=MEDIUM, buff=0.08)
        arr_out_b = Arrow(agent.get_right() + DOWN * 0.2, target_b.get_left(), color=GREY_SUB, stroke_width=MEDIUM, buff=0.08)

        t1 = title_text("Who's watching the door?").to_edge(UP, buff=0.4)
        a1 = action_text("any caller · any outbound call · no audit trail").to_edge(DOWN, buff=0.55)

        self.play(Write(t1), run_time=0.8, rate_func=smooth)
        self.play(FadeIn(agent), run_time=0.5)
        self.play(LaggedStart(FadeIn(caller_a, shift=RIGHT * 0.3),
                              FadeIn(caller_b, shift=RIGHT * 0.3), lag_ratio=0.3), run_time=0.7)
        self.play(LaggedStart(Create(arr_in_a), Create(arr_in_b), lag_ratio=0.3), run_time=0.7)
        self.play(LaggedStart(FadeIn(target_a, shift=LEFT * 0.3),
                              FadeIn(target_b, shift=LEFT * 0.3), lag_ratio=0.3),
                  LaggedStart(Create(arr_out_a), Create(arr_out_b), lag_ratio=0.3), run_time=0.9)
        self.play(FadeIn(a1), run_time=0.4)
        self.play(Indicate(arr_in_a,  color=YELLOW_ACC, scale_factor=1.1),
                  Indicate(arr_out_b, color=YELLOW_ACC, scale_factor=1.1), run_time=0.7)
        self.wait(0.4)

        self._s1_agent   = agent
        self._s1_callers = VGroup(caller_a, caller_b)
        self._s1_arr_in  = VGroup(arr_in_a, arr_in_b)
        self._s1_targets = VGroup(target_a, target_b)
        self._s1_arr_out = VGroup(arr_out_a, arr_out_b)
        self._s1_title   = t1
        self._s1_action  = a1

    # ------------------------------------------------------------------
    # Scene 2: Agent Identity — SPIFFE & mTLS (~6s)
    # "Every agent gets a cryptographic identity — automatically."
    # ------------------------------------------------------------------
    def _scene2(self):
        agent    = self._s1_agent
        callers  = self._s1_callers
        old_title = self._s1_title

        t2 = title_text("Agent Identity", color=PURPLE_ACC).to_edge(UP, buff=0.4)

        spiffe = make_node("SPIFFE Identity", PURPLE_ACC, width=2.6, height=0.65)
        spiffe.move_to(LEFT * abs(SPIFFE_X) + UP * 0.3)

        # mTLS pill badge on the inbound arrow (replaces broken padlock)
        arr_in_purple = Arrow(
            spiffe.get_right(), agent.get_left(),
            color=PURPLE_ACC, stroke_width=MEDIUM, buff=0.12,
        )
        mtls = make_mtls_badge()
        # Position mTLS badge at 35% along the arrow (near SPIFFE end)
        # so that Scene 3's IAP badge at 70% (near agent end) stays separate
        mtls.move_to(arr_in_purple.point_from_proportion(0.35) + UP * 0.30)

        # Clear two-line explanation
        d2 = descriptor_text("GCP assigns a cryptographic certificate to every agent on deploy").to_edge(DOWN, buff=0.80)
        a2 = action_text("All agent-to-agent calls are mutually authenticated — no passwords, no key files").next_to(d2, DOWN, buff=0.14)

        self.play(Transform(old_title, t2), run_time=0.6)
        self.play(FadeOut(self._s1_action), FadeOut(self._s1_arr_in), run_time=0.3)
        self.play(Transform(callers, spiffe), run_time=0.9, rate_func=smooth)
        self.play(Create(arr_in_purple), run_time=0.6)
        self.play(FadeIn(mtls), run_time=0.4)
        self.play(FadeIn(d2), run_time=0.4)
        self.play(FadeIn(a2), run_time=0.4)
        self.play(Circumscribe(spiffe, color=PURPLE_ACC, run_time=0.7))
        self.wait(0.6)

        self._s2_spiffe   = spiffe
        self._s2_arr_in   = arr_in_purple
        self._s2_mtls     = mtls
        self._s2_d = d2
        self._s2_a = a2
        self._s2_title = old_title

    # ------------------------------------------------------------------
    # Scene 3: Agent Gateway — Policy Enforcement (~6s)
    # "GCP blocks every call that isn't explicitly allowed."
    # ------------------------------------------------------------------
    def _scene3(self):
        agent    = self._s1_agent
        old_title = self._s2_title
        target_a, target_b = self._s1_targets[0], self._s1_targets[1]

        t3 = title_text("Policy Enforcement", color=PURPLE_ACC).to_edge(UP, buff=0.4)

        # Gateway — positioned to the right of agent with clear space on both sides.
        # agent right edge ≈ 1.3   gateway left edge = 3.2 - 0.875 = 2.325
        # gap agent→gateway ≈ 1.0 (visible arrow)
        # gateway right edge ≈ 4.075   target left edge ≈ 4.60   (gap: 0.52 — fine)
        gateway = make_node("Agent Gateway", PURPLE_ACC, width=GATEWAY_W, height=0.60)
        gateway.move_to(RIGHT * 3.2 + UP * 0.2)  # slightly more right than GATEWAY_X for breathing room

        iap = make_node("IAP", PURPLE_ACC, width=0.95, height=0.42)
        # Position IAP at 70% along inbound arrow (near agent end) — clear of mTLS at 35%
        iap.move_to(self._s2_arr_in.point_from_proportion(0.70) + UP * 0.38)

        arr_to_gw = Arrow(
            agent.get_right(), gateway.get_left(),
            color=PURPLE_ACC, stroke_width=MEDIUM, buff=0.10,
        )
        arr_gw_a = Arrow(
            gateway.get_right() + UP   * 0.12, target_a.get_left(),
            color=PURPLE_ACC, stroke_width=MEDIUM, buff=0.08,
        )
        arr_gw_b = Arrow(
            gateway.get_right() + DOWN * 0.12, target_b.get_left(),
            color=PURPLE_ACC, stroke_width=MEDIUM, buff=0.08,
        )

        # What the gateway actually does — concrete and specific
        d3 = descriptor_text("Only registered services are reachable — everything else is blocked").to_edge(DOWN, buff=0.80)
        a3 = action_text("IAP verifies every inbound caller · Gateway controls all outbound traffic").next_to(d3, DOWN, buff=0.14)

        self.play(Transform(old_title, t3), run_time=0.5)
        # Fade out mTLS badge — Scene 3 is about IAP/Gateway, not mTLS
        self.play(FadeOut(self._s2_d), FadeOut(self._s2_a),
                  FadeOut(self._s2_mtls), run_time=0.3)

        # Gateway appears, targets slide right to make visible room
        self.play(
            Create(gateway),
            target_a.animate.move_to(RIGHT * TARGET_X + UP   * 0.8),
            target_b.animate.move_to(RIGHT * TARGET_X + DOWN * 0.2),
            run_time=0.7, rate_func=smooth,
        )
        self.play(
            FadeOut(self._s1_arr_out),
            LaggedStart(Create(arr_to_gw), Create(arr_gw_a), Create(arr_gw_b), lag_ratio=0.3),
            run_time=0.9,
        )
        self.play(FadeIn(iap, shift=DOWN * 0.2), run_time=0.5)
        self.play(
            target_a[0].animate.set_stroke(color=PURPLE_ACC),
            target_b[0].animate.set_stroke(color=PURPLE_ACC),
            run_time=0.4,
        )
        self.play(FadeIn(d3), run_time=0.4)
        self.play(FadeIn(a3), run_time=0.4)
        self.play(Flash(gateway.get_center(), color=PURPLE_ACC, flash_radius=0.5, num_lines=8), run_time=0.6)
        self.wait(0.5)

        self._s3_gateway    = gateway
        self._s3_iap        = iap
        self._s3_arr_to_gw  = arr_to_gw
        self._s3_arr_gw     = VGroup(arr_gw_a, arr_gw_b)
        self._s3_d = d3
        self._s3_a = a3
        self._s3_title = old_title

    # ------------------------------------------------------------------
    # Scene 4: Agent Registry + Semantic Governance (~6s)
    # ------------------------------------------------------------------
    def _scene4(self):
        agent     = self._s1_agent
        old_title = self._s3_title

        t4 = title_text("Registry & Governance", color=PURPLE_ACC).to_edge(UP, buff=0.4)

        # Registry card — floats above, links to agent
        reg_rect  = RoundedRectangle(corner_radius=0.1, width=3.0, height=0.90,
                                     color=PURPLE_ACC, fill_color=PURPLE_ACC,
                                     fill_opacity=0.12, stroke_width=1.5)
        reg_name  = Text("Agent Registry", font=FONT, font_size=17, color=PURPLE_ACC, weight=BOLD)
        reg_sub   = Text("controls who can discover this agent", font=FONT, font_size=12, color=GREY_SUB)
        reg_name.move_to(reg_rect.get_center() + UP   * 0.20)
        reg_sub.move_to(reg_rect.get_center()  + DOWN * 0.22)
        registry  = VGroup(reg_rect, reg_name, reg_sub)
        registry.to_edge(UP, buff=1.05).shift(RIGHT * 0.3)

        reg_line  = DashedLine(agent.get_top(), registry.get_bottom(),
                               color=PURPLE_ACC, stroke_width=THIN)

        # Policy strip — concrete natural-language example
        p_rect = RoundedRectangle(corner_radius=0.1, width=5.6, height=0.55,
                                  color=PURPLE_ACC, fill_opacity=0.08, stroke_width=1.5)
        p_txt  = Text('"No financial data to external APIs"',
                      font=FONT, font_size=16, color=GREY_SUB)
        p_txt.move_to(p_rect.get_center())
        policy = VGroup(p_rect, p_txt)
        policy.to_edge(DOWN, buff=1.35)

        # Model Armor badge
        armor = make_node("Model Armor", PURPLE_ACC, width=1.9, height=0.42)
        armor.move_to(self._s3_arr_to_gw.point_from_proportion(0.5) + DOWN * 0.45)

        d4 = descriptor_text("Policies in plain English — no code changes, no firewall rules").to_edge(DOWN, buff=0.42)

        self.play(Transform(old_title, t4), run_time=0.5)
        self.play(FadeOut(self._s3_d), FadeOut(self._s3_a), run_time=0.3)
        self.play(FadeIn(registry, shift=DOWN * 0.2), run_time=0.7, rate_func=smooth)
        self.play(Create(reg_line), run_time=0.5)
        self.play(FadeIn(p_rect, shift=UP * 0.2), run_time=0.4)
        self.play(Write(p_txt, run_time=1.1))
        self.play(FadeIn(armor, shift=UP * 0.15), run_time=0.4)
        self.play(FadeIn(d4), run_time=0.4)
        self.play(Indicate(p_txt, color=YELLOW_ACC, run_time=0.5))
        self.wait(0.4)

        self._s4_registry = registry
        self._s4_reg_line = reg_line
        self._s4_policy   = policy
        self._s4_armor    = armor
        self._s4_d        = d4
        self._s4_title    = old_title

    # ------------------------------------------------------------------
    # Scene 5: The Closed Ring — Payoff (~7s)
    # Each ring node shows GCP service + what it gives you.
    # ------------------------------------------------------------------
    def _scene5(self):
        agent     = self._s1_agent
        old_title = self._s4_title

        to_fade = VGroup(
            self._s1_callers,
            self._s2_spiffe, self._s2_arr_in,  # mtls already faded in scene 3
            self._s3_gateway, self._s3_iap, self._s3_arr_to_gw, self._s3_arr_gw,
            self._s1_targets, self._s4_registry, self._s4_reg_line,
            self._s4_policy, self._s4_armor, self._s4_d,
        )

        # Five GCP services with their capability — what they give you
        SERVICES = [
            ("SPIFFE Identity",  "auto-assigned certificate\nproves who you are"),
            ("Agent Gateway",    "blocks unauthorized\noutbound traffic"),
            ("IAP",              "verifies every\ninbound caller"),
            ("Agent Registry",   "controls who can\ndiscover this agent"),
            ("Model Armor",      "filters harmful\ncontent in/out"),
        ]

        ring_r = 2.45
        ang_start = PI / 2   # start at top
        positions = [
            ring_r * np.array([np.cos(ang_start + i * 2 * PI / 5),
                                np.sin(ang_start + i * 2 * PI / 5), 0])
            for i in range(5)
        ]

        ring_nodes = []
        for (service, capability), pos in zip(SERVICES, positions):
            node = make_service_node(service, capability, PURPLE_ACC, width=2.05, height=0.85)
            node.move_to(pos)
            ring_nodes.append(node)

        ring = Circle(radius=1.55, color=PURPLE_ACC, stroke_width=2.5, fill_opacity=0)
        ring.move_to(ORIGIN)

        # Spokes: ring edge → node center (subtle connectors)
        spokes = VGroup(*[
            DashedLine(
                ring.point_from_proportion(i / 5),
                node.get_center(),
                color=PURPLE_ACC, stroke_width=0.8, stroke_opacity=0.3,
            )
            for i, node in enumerate(ring_nodes)
        ])

        t5 = title_text("Five GCP Services. Zero Security Code.", color=PURPLE_ACC).to_edge(UP, buff=0.4)
        d5 = descriptor_text("Provisioned automatically when you deploy — not written by you").to_edge(DOWN, buff=0.75)
        a5 = action_text("zero security code written").next_to(d5, DOWN, buff=0.14)

        # --- animation ---
        self.play(FadeOut(to_fade), run_time=0.8)
        self.wait(0.25)

        self.play(agent.animate.move_to(ORIGIN), run_time=0.5)

        self.play(
            Transform(old_title, t5),
            LaggedStart(*[FadeIn(n, scale=0.85) for n in ring_nodes], lag_ratio=0.2),
            run_time=1.3, rate_func=smooth,
        )
        self.play(Create(ring, run_time=1.0, rate_func=smooth))
        self.play(Create(spokes), run_time=0.5)

        self.play(FadeIn(d5), run_time=0.5)
        self.wait(0.4)
        self.play(FadeIn(a5), run_time=0.5)
        self.wait(0.4)

        self.play(Flash(ORIGIN, color=PURPLE_ACC, flash_radius=0.85, num_lines=12, run_time=0.8))
        self.wait(1.5)

        self.play(FadeOut(VGroup(agent, ring, spokes, d5, a5, old_title, *ring_nodes)), run_time=0.8)
