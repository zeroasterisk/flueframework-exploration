"""Video 2: Security Deep Dive — ManimCE scene.

Five-layer GEAP security stack for Flue agents on Google Cloud.
Narrative: unprotected → protected (Pattern 3: Two Perspectives → Unity).

Planned via manim-composer skill; implemented per manimce-best-practices skill.
Scene plan: SCENES.md
Style guide: guides/video/plans.md

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
    Arc,
    Arrow,
    Circle,
    Circumscribe,
    Create,
    DashedLine,
    DashedVMobject,
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
# Style guide (guides/video/plans.md) — identical to a2a_protocol.py
# ---------------------------------------------------------------------------
BG_COLOR = "#1C1C1C"
GREEN_ACC = "#83C167"
YELLOW_ACC = "#FFFF00"
WHITE_TXT = "#FFFFFF"
GREY_SUB = "#AAAAAA"
PURPLE_ACC = "#9B59B6"

THIN, MEDIUM, THICK = 1.5, 2.5, 3.5


def make_node(label: str, color: str, width: float = 2.2, height: float = 0.65) -> VGroup:
    rect = RoundedRectangle(
        corner_radius=0.15, width=width, height=height,
        color=color, fill_color=color, fill_opacity=0.18, stroke_width=2,
    )
    txt = Text(label, font_size=22, color=color, weight=BOLD)
    txt.move_to(rect.get_center())
    return VGroup(rect, txt)


def title_text(s: str, color: str = WHITE_TXT) -> Text:
    return Text(s, font_size=32, weight=BOLD, color=color)


def descriptor_text(s: str) -> Text:
    return Text(s, font_size=20, color=WHITE_TXT)


def action_text(s: str) -> Text:
    return Text(s, font_size=17, slant=ITALIC, color=GREY_SUB)


def make_ghost_node(label: str, width: float = 1.6, height: float = 0.55) -> VGroup:
    """Uncontrolled/unknown node — lower opacity for 'ghost' feel."""
    rect = RoundedRectangle(
        corner_radius=0.15, width=width, height=height,
        color=GREY_SUB, fill_color=GREY_SUB, fill_opacity=0.10, stroke_width=1.5,
    )
    txt = Text(label, font_size=20, color=GREY_SUB, weight=BOLD)
    txt.move_to(rect.get_center())
    return VGroup(rect, txt)


def make_lock_glyph(color: str = PURPLE_ACC) -> VGroup:
    """Simple padlock: arc (shackle) + rectangle (body)."""
    shackle = Arc(radius=0.10, angle=PI, color=color, stroke_width=2)
    body = RoundedRectangle(
        corner_radius=0.04, width=0.20, height=0.14,
        color=color, fill_color=color, fill_opacity=1, stroke_width=0,
    )
    lock = VGroup(shackle, body).arrange(DOWN, buff=0.0)
    return lock.scale(0.9)


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
    # ------------------------------------------------------------------
    def _scene1(self):
        # --- core nodes ---
        agent = make_node("Flue Agent", GREEN_ACC, width=2.6, height=0.8)
        agent.move_to(ORIGIN + UP * 0.3)

        caller_a = make_ghost_node("?").move_to(LEFT * 4.5 + UP * 0.8)
        caller_b = make_ghost_node("?").move_to(LEFT * 4.5 + DOWN * 0.2)
        target_a = make_ghost_node("External API", width=1.9).move_to(RIGHT * 4.5 + UP * 0.8)
        target_b = make_ghost_node("Vertex AI", width=1.9).move_to(RIGHT * 4.5 + DOWN * 0.2)

        # inbound arrows
        arr_in_a = Arrow(caller_a.get_right(), agent.get_left() + UP * 0.2,
                         color=GREY_SUB, stroke_width=MEDIUM, buff=0.08)
        arr_in_b = Arrow(caller_b.get_right(), agent.get_left() + DOWN * 0.2,
                         color=GREY_SUB, stroke_width=MEDIUM, buff=0.08)
        # outbound arrows
        arr_out_a = Arrow(agent.get_right() + UP * 0.2, target_a.get_left(),
                          color=GREY_SUB, stroke_width=MEDIUM, buff=0.08)
        arr_out_b = Arrow(agent.get_right() + DOWN * 0.2, target_b.get_left(),
                          color=GREY_SUB, stroke_width=MEDIUM, buff=0.08)

        t1 = title_text("Who's watching the door?").to_edge(UP, buff=0.35)
        a1 = action_text("any caller · any outbound call · no audit trail").to_edge(DOWN, buff=0.5)

        # --- animation ---
        self.play(Write(t1), run_time=0.9, rate_func=smooth)
        self.play(FadeIn(agent), run_time=0.5)
        self.play(
            LaggedStart(
                FadeIn(caller_a, shift=RIGHT * 0.3),
                FadeIn(caller_b, shift=RIGHT * 0.3),
                lag_ratio=0.3,
            ),
            run_time=0.7,
        )
        self.play(
            LaggedStart(Create(arr_in_a), Create(arr_in_b), lag_ratio=0.3),
            run_time=0.7,
        )
        self.play(
            LaggedStart(
                FadeIn(target_a, shift=LEFT * 0.3),
                FadeIn(target_b, shift=LEFT * 0.3),
                lag_ratio=0.3,
            ),
            LaggedStart(Create(arr_out_a), Create(arr_out_b), lag_ratio=0.3),
            run_time=0.9,
        )
        self.play(FadeIn(a1), run_time=0.4)
        # subtle concern signal on open arrows
        self.play(
            Indicate(arr_in_a, color=YELLOW_ACC, scale_factor=1.1),
            Indicate(arr_out_b, color=YELLOW_ACC, scale_factor=1.1),
            run_time=0.7,
        )
        self.wait(0.4)

        # Store references for next scene
        self._s1_agent = agent
        self._s1_callers = VGroup(caller_a, caller_b)
        self._s1_arr_in = VGroup(arr_in_a, arr_in_b)
        self._s1_targets = VGroup(target_a, target_b)
        self._s1_arr_out = VGroup(arr_out_a, arr_out_b)
        self._s1_title = t1
        self._s1_action = a1

    # ------------------------------------------------------------------
    # Scene 2: Agent Identity — SPIFFE & mTLS (~6s)
    # ------------------------------------------------------------------
    def _scene2(self):
        agent = self._s1_agent
        callers = self._s1_callers
        arr_in = self._s1_arr_in
        targets = self._s1_targets
        arr_out = self._s1_arr_out
        old_title = self._s1_title

        t2 = title_text("Agent Identity", color=PURPLE_ACC).to_edge(UP, buff=0.35)

        # SPIFFE identity node replaces the two callers
        spiffe = make_node("SPIFFE ID", PURPLE_ACC, width=2.4, height=0.65)
        spiffe.move_to(LEFT * 4.2 + UP * 0.3)

        # Certificate label
        cert_label = Text("X.509", font_size=13, color=PURPLE_ACC, weight=BOLD)
        cert_box = RoundedRectangle(
            corner_radius=0.06, width=0.75, height=0.55,
            color=PURPLE_ACC, fill_opacity=0, stroke_width=1.5,
        )
        cert = VGroup(cert_box, cert_label)
        cert_label.move_to(cert_box.get_center())
        cert.next_to(spiffe, UP, buff=0.12)

        # Purple inbound arrow with lock
        arr_in_purple = Arrow(
            spiffe.get_right(), agent.get_left(),
            color=PURPLE_ACC, stroke_width=MEDIUM, buff=0.1,
        )
        lock = make_lock_glyph()
        lock.move_to(arr_in_purple.point_from_proportion(0.5))

        d2 = descriptor_text("SPIFFE ID · X.509 · auto-provisioned").to_edge(DOWN, buff=0.75)
        a2 = action_text("no key files to rotate · mTLS between agents").next_to(d2, DOWN, buff=0.12)

        # --- animation ---
        self.play(Transform(old_title, t2), run_time=0.6)
        self.play(FadeOut(self._s1_action), run_time=0.3)
        self.play(
            Transform(callers, spiffe),
            FadeOut(arr_in),
            run_time=0.9, rate_func=smooth,
        )
        self.play(
            Create(arr_in_purple),
            FadeIn(cert),
            run_time=0.7,
        )
        self.play(FadeIn(lock), run_time=0.4)
        self.play(FadeIn(d2), FadeIn(a2), run_time=0.5)
        self.play(Circumscribe(spiffe, color=PURPLE_ACC, run_time=0.8))
        self.wait(0.5)

        self._s2_spiffe = spiffe
        self._s2_cert = cert
        self._s2_arr_in = arr_in_purple
        self._s2_lock_in = lock
        self._s2_d = d2
        self._s2_a = a2
        self._s2_title = old_title  # transformed

    # ------------------------------------------------------------------
    # Scene 3: Agent Gateway — Policy Enforcement (~6s)
    # ------------------------------------------------------------------
    def _scene3(self):
        agent = self._s1_agent
        spiffe = self._s2_spiffe
        arr_in = self._s2_arr_in
        lock_in = self._s2_lock_in
        targets = self._s1_targets
        arr_out = self._s1_arr_out
        cert = self._s2_cert
        old_title = self._s2_title

        t3 = title_text("Agent Gateway", color=PURPLE_ACC).to_edge(UP, buff=0.35)

        # Gateway node between agent and right targets
        gateway = make_node("Agent Gateway", PURPLE_ACC, width=2.1, height=0.6)
        gateway.move_to(RIGHT * 1.6 + UP * 0.3)

        # IAP badge on the inbound arrow
        iap = make_node("IAP", PURPLE_ACC, width=1.0, height=0.42)
        iap.move_to(arr_in.point_from_proportion(0.6) + UP * 0.38)

        # Rerouted purple egress: agent → gateway, gateway → targets
        arr_to_gw = Arrow(
            agent.get_right(), gateway.get_left(),
            color=PURPLE_ACC, stroke_width=MEDIUM, buff=0.1,
        )
        target_a, target_b = self._s1_targets[0], self._s1_targets[1]
        arr_gw_a = Arrow(
            gateway.get_right(), target_a.get_left(),
            color=PURPLE_ACC, stroke_width=MEDIUM, buff=0.08,
        )
        arr_gw_b = Arrow(
            gateway.get_right() + DOWN * 0.15, target_b.get_left(),
            color=PURPLE_ACC, stroke_width=MEDIUM, buff=0.08,
        )

        d3 = descriptor_text("policy enforcement · inbound + outbound").to_edge(DOWN, buff=0.75)
        a3 = action_text("IAP gates callers · Gateway gates egress · dry-run available").next_to(d3, DOWN, buff=0.12)

        # --- animation ---
        self.play(Transform(old_title, t3), run_time=0.5)
        self.play(FadeOut(self._s2_d), FadeOut(self._s2_a), run_time=0.3)
        self.play(Create(gateway), run_time=0.7, rate_func=smooth)
        self.play(
            FadeOut(arr_out),
            LaggedStart(Create(arr_to_gw), Create(arr_gw_a), Create(arr_gw_b), lag_ratio=0.3),
            run_time=1.0,
        )
        self.play(FadeIn(iap, shift=DOWN * 0.2), run_time=0.5)
        # targets now get purple borders
        self.play(
            target_a[0].animate.set_stroke(color=PURPLE_ACC),
            target_b[0].animate.set_stroke(color=PURPLE_ACC),
            run_time=0.5,
        )
        self.play(FadeIn(d3), FadeIn(a3), run_time=0.5)
        self.play(Flash(gateway.get_center(), color=PURPLE_ACC, flash_radius=0.55, num_lines=8), run_time=0.6)
        self.wait(0.5)

        self._s3_gateway = gateway
        self._s3_iap = iap
        self._s3_arr_to_gw = arr_to_gw
        self._s3_arr_gw = VGroup(arr_gw_a, arr_gw_b)
        self._s3_d = d3
        self._s3_a = a3
        self._s3_title = old_title

    # ------------------------------------------------------------------
    # Scene 4: Agent Registry + Semantic Governance (~6s)
    # ------------------------------------------------------------------
    def _scene4(self):
        agent = self._s1_agent
        old_title = self._s3_title

        t4 = title_text("Registry · Governance", color=PURPLE_ACC).to_edge(UP, buff=0.35)

        # Registry card above
        reg_rect = RoundedRectangle(
            corner_radius=0.1, width=2.8, height=0.85,
            color=PURPLE_ACC, fill_color=PURPLE_ACC, fill_opacity=0.12, stroke_width=1.5,
        )
        reg_title = Text("Agent Registry", font_size=17, color=PURPLE_ACC, weight=BOLD)
        reg_sub = Text("name · skills · endpoint", font_size=11, color=GREY_SUB)
        reg_title.move_to(reg_rect.get_center() + UP * 0.2)
        reg_sub.move_to(reg_rect.get_center() + DOWN * 0.22)
        registry = VGroup(reg_rect, reg_title, reg_sub)
        registry.to_edge(UP, buff=1.0).shift(RIGHT * 0.5)

        reg_line = DashedLine(
            agent.get_top(), registry.get_bottom(),
            color=PURPLE_ACC, stroke_width=THIN,
        )

        # Policy strip below
        policy_rect = RoundedRectangle(
            corner_radius=0.1, width=5.2, height=0.55,
            color=PURPLE_ACC, fill_opacity=0.08, stroke_width=1.5,
        )
        policy_txt = Text(
            '"no financial data to external APIs"',
            font_size=16, slant=ITALIC, color=GREY_SUB,
        )
        policy_txt.move_to(policy_rect.get_center())
        policy_strip = VGroup(policy_rect, policy_txt)
        policy_strip.to_edge(DOWN, buff=1.3)

        # Model Armor badge on gateway outbound arrow
        armor = make_node("Model Armor", PURPLE_ACC, width=1.9, height=0.42)
        armor.move_to(self._s3_arr_to_gw.point_from_proportion(0.5) + DOWN * 0.42)

        d4 = descriptor_text("catalog · natural-language policies · content protection").to_edge(DOWN, buff=0.35)

        # --- animation ---
        self.play(Transform(old_title, t4), run_time=0.5)
        self.play(FadeOut(self._s3_d), FadeOut(self._s3_a), run_time=0.3)
        self.play(
            FadeIn(registry, shift=DOWN * 0.25),
            run_time=0.7, rate_func=smooth,
        )
        self.play(Create(reg_line), run_time=0.5)
        # Policy strip: rect first, then typed text
        self.play(FadeIn(policy_rect, shift=UP * 0.2), run_time=0.5)
        self.play(Write(policy_txt, run_time=1.2))
        self.play(FadeIn(armor, shift=UP * 0.15), run_time=0.5)
        self.play(FadeIn(d4), run_time=0.4)
        self.play(Indicate(policy_txt, color=YELLOW_ACC, run_time=0.6))
        self.wait(0.4)

        self._s4_registry = registry
        self._s4_reg_line = reg_line
        self._s4_policy = VGroup(policy_rect, policy_txt)
        self._s4_armor = armor
        self._s4_d = d4
        self._s4_title = old_title

    # ------------------------------------------------------------------
    # Scene 5: The Closed Ring — Payoff (~7s)
    # ------------------------------------------------------------------
    def _scene5(self):
        agent = self._s1_agent
        old_title = self._s4_title

        # Collect everything to fade out
        # Note: self._s1_callers was Transform()ed into self._s2_spiffe so
        # Manim keeps the original callers mobject on-screen; include it explicitly.
        to_fade = VGroup(
            self._s1_callers,          # Transform residue (callers become spiffe)
            self._s2_spiffe, self._s2_cert, self._s2_arr_in, self._s2_lock_in,
            self._s3_gateway, self._s3_iap, self._s3_arr_to_gw, self._s3_arr_gw,
            self._s1_targets, self._s4_registry, self._s4_reg_line,
            self._s4_policy, self._s4_armor, self._s4_d,
        )

        # Pentagon positions (clockwise from top, radius=2.3)
        ring_r = 2.3
        labels = ["SPIFFE ID", "IAP", "Agent Gateway", "Model Armor", "Registry"]
        ang_start = PI / 2  # top
        positions = [
            ring_r * np.array([np.cos(ang_start + i * 2 * PI / 5),
                                np.sin(ang_start + i * 2 * PI / 5), 0])
            for i in range(5)
        ]
        ring_nodes = [
            make_node(lbl, PURPLE_ACC, width=1.85, height=0.52).move_to(pos)
            for lbl, pos in zip(labels, positions)
        ]

        # Security ring circle
        ring = Circle(radius=1.78, color=PURPLE_ACC, stroke_width=2.5, fill_opacity=0)
        ring.move_to(ORIGIN)

        # Title — all five names; smaller font to fit
        t5 = Text(
            "Identity · Gateway · Registry · Governance · Armor",
            font_size=19, weight=BOLD, color=PURPLE_ACC,
        ).to_edge(UP, buff=0.4)

        d5 = descriptor_text("provisioned automatically on GCP").to_edge(DOWN, buff=0.75)
        a5 = action_text("zero security code written").next_to(d5, DOWN, buff=0.12)

        # Spoke lines (subtle)
        spokes = VGroup(*[
            DashedLine(
                ring.point_from_proportion(i / 5), node.get_center(),
                color=PURPLE_ACC, stroke_width=0.8, stroke_opacity=0.35,
            )
            for i, node in enumerate(ring_nodes)
        ])

        # --- animation ---
        self.play(FadeOut(to_fade), run_time=0.8)
        self.wait(0.2)  # brief empty center to let the reset breathe

        # Move agent to center
        self.play(agent.animate.move_to(ORIGIN), run_time=0.5)

        # Ring nodes appear clockwise
        self.play(
            Transform(old_title, t5),
            LaggedStart(*[FadeIn(n, scale=0.85) for n in ring_nodes], lag_ratio=0.18),
            run_time=1.2, rate_func=smooth,
        )
        # Draw the ring
        self.play(Create(ring, run_time=1.2, rate_func=smooth))
        self.play(Create(spokes), run_time=0.5)

        self.play(FadeIn(d5), run_time=0.5)
        self.wait(0.4)
        self.play(FadeIn(a5), run_time=0.5)
        self.wait(0.4)

        # Payoff flash
        self.play(
            Flash(ORIGIN, color=PURPLE_ACC, flash_radius=0.9, num_lines=12, run_time=0.8),
        )
        self.wait(1.4)

        # Fade to black
        all_objects = VGroup(agent, ring, spokes, d5, a5, old_title, *ring_nodes)
        self.play(FadeOut(all_objects), run_time=0.8)
