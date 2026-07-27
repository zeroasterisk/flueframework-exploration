"""Security Deep Dive v4 — Agent Platform: Governing AI Like Everything Else.

v4 changes (Alan's round-1 feedback on v3, 2026-07-05):
  - New "Agent Landscape" opening vignette: Agent Frameworks (ADK, LangChain,
    CrewAI, AG2, Pydantic) vs Agent Harnesses (Antigravity, Claude Code,
    Codex, Pi, Hermes, OpenClaw) — two starting points, similarly capable
    agents. A representative 6-node subset (ADK/LangChain/CrewAI +
    Claude Code/Codex/Pi) carries forward into the rest of the video to keep
    the sprawl/gateway diagrams legible.
  - "Vertex AI" -> "LLM Inference" (Gemini Enterprise Agent Platform);
    caption shown once, not on every node.
  - Font: Verdana -> Helvetica Neue (Verdana kerning was inconsistent).
  - Scene 3 (Identity): fixed hexagon subtext overflow, updated key text and
    closing text for the framework/harness split.
  - NEW vignette: four types of agent identity (User / On-Behalf-Of /
    Workload / Workforce) — ties back to the workload identity just shown.
  - Scene 4 (Gateway): panels now Authentication / Authorization+Policy /
    Ingress+Egress. Fixed dot-vs-arrow trajectory mismatch (dot now travels
    the exact same straight-line path as the drawn connector). Two
    sequential DENY reasons (IAM policy + semantic governance policy).
    Updated subtext.
  - Scene 5 (Observability): rebuilt around an OpenTelemetry span/trace
    waterfall (Cloud Trace style) for the full request path — User -> Agent
    Framework -> LLM -> Agent Framework -> BigQuery -> Agent Framework ->
    LLM -> User — layered after the existing chaos-network reveal/transform.
  - Scene 6 (aha table): updated closing sub-line.

Persistence contract: chaos_lines / service_nodes / agent_nodes built in the
sprawl scene are DIMMED (opacity 0.08) during identity/gateway scenes and
RESTORED + TRANSFORMED in the observability scene. Never FadeOut'd in between.

Render:
    export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
    manim -ql security_deep_dive.py SecurityDeepDive   # iterate (480p15)
    manim -qh --fps 60 security_deep_dive.py SecurityDeepDive  # production
"""

from __future__ import annotations

import numpy as np

from manim import (
    BOLD,
    DOWN,
    LEFT,
    ORIGIN,
    RIGHT,
    UP,
    WHITE,
    AnimationGroup,
    Arrow,
    Circle,
    Create,
    DashedLine,
    DashedVMobject,
    Dot,
    FadeIn,
    FadeOut,
    Flash,
    Group,
    Indicate,
    LaggedStart,
    Line,
    MoveAlongPath,
    Rectangle,
    RegularPolygon,
    Restore,
    RoundedRectangle,
    Scene,
    Text,
    Transform,
    VGroup,
    VMobject,
    Write,
    config,
    smooth,
)

# ---------------------------------------------------------------------------
# Palette (Google brand; light background) + font
# ---------------------------------------------------------------------------
FONT = "Helvetica Neue"

BG = "#F8F9FA"
BLUE = "#4285F4"
RED = "#EA4335"
YELLOW = "#FBBC04"
GREEN = "#34A853"
INDIGO = "#5C6BC0"
DARK = "#3C4043"
MED_GRAY = "#5F6368"
SUB_GRAY = "#9AA0A6"
SEP_GRAY = "#E8EAED"

# Agent Frameworks — building blocks / coding abstractions for a custom harness.
FRAMEWORKS_ALL = [
    ("ADK", BLUE),
    ("LangChain", "#9B59B6"),
    ("CrewAI", "#FF8C00"),
    ("AG2", "#00ACC1"),
    ("Pydantic", "#E91E8C"),
]

# Agent Harnesses — more fully built agents, ready for users.
HARNESSES_CODE = [
    ("Antigravity", "#5C6BC0"),
    ("Claude Code", "#D97757"),
    ("Codex", "#757575"),
]
HARNESSES_ASSISTANT = [
    ("Pi", "#AB47BC"),
    ("Hermes", "#8D6E63"),
    ("OpenClaw", "#607D8B"),
]

# Representative 6-node subset carried through sprawl/identity/gateway scenes
# — the full 11-node landscape is established once, then we "follow six of
# them" to keep the later diagrams legible.
REPRESENTATIVE = [
    ("ADK", BLUE),
    ("LangChain", "#9B59B6"),
    ("CrewAI", "#FF8C00"),
    ("Claude Code", "#D97757"),
    ("Codex", "#757575"),
    ("Pi", "#AB47BC"),
]

LLM_LABEL = "LLM Inference"
LLM_PROVIDER_CAPTION = "Gemini Enterprise Agent Platform"

SERVICES = [
    (LLM_LABEL, BLUE),
    ("BigQuery", BLUE),
    ("Secret Manager", RED),
    ("Pub/Sub", SUB_GRAY),
    ("External API", SUB_GRAY),
]

config.background_color = BG


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------
def make_agent(label: str, color: str, height: float = 0.55) -> VGroup:
    txt = Text(label, font=FONT, font_size=15, color=color, weight=BOLD)
    width = max(1.35, txt.width + 0.45)
    rect = RoundedRectangle(
        corner_radius=0.22, width=width, height=height,
        fill_color=color, fill_opacity=0.14,
        stroke_color=color, stroke_width=2.0,
    )
    txt.move_to(rect.get_center())
    return VGroup(rect, txt)


def make_service(label: str, color: str) -> VGroup:
    rect = RoundedRectangle(
        corner_radius=0.2, width=1.7, height=0.55,
        fill_color=color, fill_opacity=0.06,
        stroke_color=color, stroke_width=1.5,
    )
    txt = Text(label, font=FONT, font_size=15, color=color)
    fit_width(txt, rect.width - 0.2)
    txt.move_to(rect.get_center())
    return VGroup(rect, txt)


def make_badge(color: str = GREEN) -> VGroup:
    hex_shape = RegularPolygon(
        n=6, radius=0.32,
        fill_color=color, fill_opacity=0.18,
        stroke_color=color, stroke_width=2.2,
    )
    cert_ring = DashedVMobject(
        Circle(radius=0.48, stroke_color=color, stroke_width=1.5),
        num_dashes=20,
    )
    badge_text = Text("SPIFFE", font=FONT, font_size=11, color=color, weight=BOLD)
    badge_text.move_to(hex_shape.get_center())
    return VGroup(cert_ring, hex_shape, badge_text)


def make_sub_panel(label: str, color: str) -> VGroup:
    panel = RoundedRectangle(
        corner_radius=0.1, width=1.7, height=0.65,
        fill_color=color, fill_opacity=0.12,
        stroke_color=color, stroke_width=1.5,
    )
    txt = Text(label, font=FONT, font_size=12, color=color)
    fit_width(txt, panel.width - 0.15)
    txt.move_to(panel.get_center())
    return VGroup(panel, txt)


def make_telemetry_card(node: VGroup, latency_ms: int) -> VGroup:
    card = RoundedRectangle(
        corner_radius=0.1, width=1.5, height=0.7,
        fill_color=WHITE, fill_opacity=0.95,
        stroke_color=SEP_GRAY, stroke_width=1,
    )
    bars = VGroup(
        Rectangle(width=0.12, height=0.18, fill_color=BLUE, fill_opacity=0.8,
                  stroke_width=0).shift(LEFT * 0.3 + DOWN * 0.05),
        Rectangle(width=0.12, height=0.28, fill_color=BLUE, fill_opacity=0.8,
                  stroke_width=0).shift(LEFT * 0.1),
        Rectangle(width=0.12, height=0.12, fill_color=BLUE, fill_opacity=0.8,
                  stroke_width=0).shift(RIGHT * 0.1 + DOWN * 0.08),
    )
    val = Text(f"{latency_ms}ms", font=FONT, font_size=12, color=DARK)
    val.move_to(card.get_right() + LEFT * 0.4 + DOWN * 0.02)
    telemetry = VGroup(card, bars, val)
    telemetry.next_to(node, UP, buff=0.12)
    return telemetry


def fit_width(mob: VMobject, max_w: float) -> VMobject:
    if mob.width > max_w:
        mob.scale_to_fit_width(max_w)
    return mob


class SecurityDeepDive(Scene):
    """Eight-scene continuous video."""

    def construct(self):
        self.title = None
        self.scene1_landscape()
        self.scene2_explosion()
        self.scene3_sprawl()
        self.scene4_identity()
        self.scene4b_identity_types()
        self.scene5_gateway()
        self.scene6_observability()
        self.scene7_aha()

    # -- helpers ------------------------------------------------------------
    def set_title(self, text: str, color: str = DARK, font_size: int = 34):
        new_title = Text(text, font=FONT, font_size=font_size,
                         color=color, weight=BOLD)
        fit_width(new_title, config.frame_width - 1.0)
        new_title.to_edge(UP, buff=0.45)
        if self.title is None:
            self.play(Write(new_title, run_time=0.9))
        else:
            self.play(FadeOut(self.title, run_time=0.3),
                      Write(new_title, run_time=0.9))
        self.title = new_title

    # ------------------------------------------------------------------ S1
    def scene1_landscape(self):
        """The Agent Landscape: frameworks vs harnesses, full taxonomy."""
        self.set_title("The Agent Landscape")

        BOX_WIDTH = 8.6

        # --- Agent Frameworks box (top) ---
        fw_nodes = VGroup(*[make_agent(l, c) for l, c in FRAMEWORKS_ALL])
        fw_nodes.arrange(RIGHT, buff=0.35)
        fw_nodes.move_to(UP * 1.4)

        fw_label = Text("Agent Frameworks", font=FONT, font_size=20,
                        color=DARK, weight=BOLD)
        fw_desc = Text(
            "Building blocks + coding abstractions to write your own agent with a custom harness",
            font=FONT, font_size=14, color=MED_GRAY,
        )
        fw_box = RoundedRectangle(
            corner_radius=0.2, width=BOX_WIDTH, height=fw_nodes.height + 0.6,
            stroke_color=BLUE, stroke_width=1.5,
            fill_color=BLUE, fill_opacity=0.03,
        ).move_to(fw_nodes.get_center())
        fw_label.next_to(fw_box, UP, buff=0.15)
        fw_desc.next_to(fw_label, UP, buff=0.1)

        self.play(FadeIn(fw_box), Write(fw_label), run_time=0.6)
        self.play(LaggedStart(*[FadeIn(n, scale=0.85) for n in fw_nodes],
                              lag_ratio=0.15, run_time=1.2))
        self.play(FadeIn(fw_desc, run_time=0.6))
        self.wait(0.4)

        # --- Agent Harnesses box (bottom), sub-divided, left-aligned rows ---
        code_nodes = VGroup(*[make_agent(l, c) for l, c in HARNESSES_CODE])
        code_nodes.arrange(RIGHT, buff=0.35)
        assistant_nodes = VGroup(*[make_agent(l, c) for l, c in HARNESSES_ASSISTANT])
        assistant_nodes.arrange(RIGHT, buff=0.35)

        harness_group = VGroup(code_nodes, assistant_nodes).arrange(
            DOWN, buff=0.3, aligned_edge=LEFT)
        harness_group.move_to(DOWN * 1.9)

        row_label_x = harness_group.get_left()[0] - 0.35
        code_sub_label = Text("Code", font=FONT, font_size=13, color=MED_GRAY,
                              weight=BOLD)
        code_sub_label.move_to([row_label_x, code_nodes.get_y(), 0], aligned_edge=RIGHT)
        assistant_sub_label = Text("Personal Assistant", font=FONT, font_size=13,
                                   color=MED_GRAY, weight=BOLD)
        assistant_sub_label.move_to([row_label_x, assistant_nodes.get_y(), 0], aligned_edge=RIGHT)

        harness_box = RoundedRectangle(
            corner_radius=0.2, width=BOX_WIDTH, height=harness_group.height + 0.6,
            stroke_color=INDIGO, stroke_width=1.5,
            fill_color=INDIGO, fill_opacity=0.03,
        ).move_to(harness_group.get_center())

        harness_label = Text("Agent Harnesses", font=FONT, font_size=20,
                             color=DARK, weight=BOLD)
        harness_desc = Text("More fully built agents, ready for users",
                            font=FONT, font_size=14, color=MED_GRAY)
        harness_label.next_to(harness_box, UP, buff=0.15)
        harness_desc.next_to(harness_label, UP, buff=0.1)

        self.play(FadeIn(harness_box), Write(harness_label), run_time=0.6)
        self.play(
            LaggedStart(*[FadeIn(n, scale=0.85) for n in code_nodes],
                        lag_ratio=0.15, run_time=1.0),
            FadeIn(code_sub_label, run_time=0.5),
        )
        self.play(
            LaggedStart(*[FadeIn(n, scale=0.85) for n in assistant_nodes],
                        lag_ratio=0.15, run_time=1.0),
            FadeIn(assistant_sub_label, run_time=0.5),
        )
        self.play(FadeIn(harness_desc, run_time=0.6))
        self.wait(0.6)

        vignette = Text(
            "Different starting points. Similarly capable agents.",
            font=FONT, font_size=20, color=DARK, weight=BOLD,
        ).to_edge(DOWN, buff=0.25)
        self.play(Write(vignette, run_time=1.2))
        self.wait(1.2)

        # Clear the full landscape — we'll "follow six of them" next.
        self.play(FadeOut(VGroup(
            fw_box, fw_label, fw_desc, fw_nodes,
            harness_box, harness_label, harness_desc, harness_group,
            code_sub_label, assistant_sub_label, vignette,
        ), run_time=0.7))

    # ------------------------------------------------------------------ S2
    def scene2_explosion(self):
        self.set_title("Let's follow six of them.")

        agent_start_positions = [
            UP * 1.5 + LEFT * 4.0,
            UP * 1.5 + LEFT * 1.0,
            UP * 1.5 + RIGHT * 2.0,
            DOWN * 0.8 + LEFT * 3.0,
            DOWN * 0.8 + RIGHT * 1.0,
            DOWN * 2.2 + LEFT * 0.5,
        ]
        self.agent_nodes = [
            make_agent(label, color).move_to(pos)
            for (label, color), pos in zip(REPRESENTATIVE, agent_start_positions)
        ]

        self.play(FadeIn(self.agent_nodes[0], scale=0.85, run_time=0.6))
        self.play(LaggedStart(
            *[FadeIn(a, scale=0.85) for a in self.agent_nodes[1:]],
            lag_ratio=0.3, run_time=1.8,
        ))
        self.play(Indicate(VGroup(*self.agent_nodes), color=BLUE,
                           scale_factor=1.04, run_time=0.7))
        self.set_title("Different frameworks. Different harnesses. Same story.")
        self.wait(0.8)

    # ------------------------------------------------------------------ S3
    def scene3_sprawl(self):
        # Wider spread positions — the world grows.
        spread_positions = [
            UP * 2.1 + LEFT * 5.2,
            UP * 2.1 + LEFT * 1.6,
            UP * 0.9 + RIGHT * 1.2,
            DOWN * 0.4 + LEFT * 4.6,
            DOWN * 1.6 + LEFT * 1.8,
            DOWN * 2.8 + LEFT * 4.2,
        ]
        self.play(AnimationGroup(
            *[a.animate.move_to(p) for a, p in zip(self.agent_nodes, spread_positions)],
            run_time=1.0,
        ))

        service_positions = [
            UP * 2.1 + RIGHT * 5.2,    # LLM Inference
            UP * 0.6 + RIGHT * 5.4,    # BigQuery
            DOWN * 1.0 + RIGHT * 5.2,  # Secret Manager
            DOWN * 2.6 + RIGHT * 3.6,  # Pub/Sub
            DOWN * 2.9 + RIGHT * 0.6,  # External API
        ]
        self.service_nodes = [
            make_service(label, color).move_to(pos)
            for (label, color), pos in zip(SERVICES, service_positions)
        ]
        self.play(LaggedStart(
            *[FadeIn(s) for s in self.service_nodes],
            lag_ratio=0.2, run_time=1.2,
        ))

        # Name the LLM provider once, briefly, then let it fade — avoids
        # repeating the long name on every subsequent appearance of the node.
        llm_caption = Text(f"({LLM_PROVIDER_CAPTION})", font=FONT,
                           font_size=13, color=MED_GRAY)
        llm_caption.next_to(self.service_nodes[0], UP, buff=0.15)
        self.play(FadeIn(llm_caption, run_time=0.5))
        self.wait(0.8)
        self.play(FadeOut(llm_caption, run_time=0.5))

        # Connection pairs (agent_idx, service_idx). Diagonals ensure crossings.
        phase1_pairs = [(0, 0), (1, 1), (3, 4), (5, 3)]
        phase2_pairs = [(0, 3), (4, 0), (1, 4), (2, 2),
                        (3, 1), (5, 0), (2, 4), (4, 2)]
        phase3_pairs = [(0, 2), (5, 1), (1, 2), (3, 0)]
        self.chaos_pairs = phase1_pairs + phase2_pairs + phase3_pairs
        self.chaos_lines = []

        def conn(ai, si):
            return DashedLine(
                self.agent_nodes[ai].get_center(),
                self.service_nodes[si].get_center(),
                dash_length=0.12, dashed_ratio=0.5,
                stroke_width=1.8, stroke_color=SUB_GRAY,
                buff=0.72,
            )

        # Phase 1: slow, almost manageable.
        for ai, si in phase1_pairs:
            line = conn(ai, si)
            self.chaos_lines.append(line)
            self.play(Create(line, run_time=0.37))

        # Phase 2: rapid overlapping burst.
        phase2_lines = [conn(ai, si) for ai, si in phase2_pairs]
        self.chaos_lines.extend(phase2_lines)
        self.play(LaggedStart(
            *[Create(l) for l in phase2_lines], lag_ratio=0.15, run_time=1.4,
        ))

        # Phase 3: first 8 lines tint red; 4 more crossers appear.
        phase3_lines = [conn(ai, si) for ai, si in phase3_pairs]
        self.chaos_lines.extend(phase3_lines)
        self.play(
            AnimationGroup(*[
                line.animate.set_color(RED).set_stroke(opacity=0.52)
                for line in self.chaos_lines[:8]
            ], run_time=0.7),
            LaggedStart(*[Create(l) for l in phase3_lines],
                        lag_ratio=0.12, run_time=1.0),
        )

        self.set_title("Who's calling what?", color=RED)
        sub = Text("What can each agent reach?", font=FONT,
                   font_size=20, color=MED_GRAY)
        sub.next_to(self.title, DOWN, buff=0.25)
        self.play(FadeIn(sub, run_time=0.5))
        self.wait(2.6)

        # Persistence contract: dim, never FadeOut. save_state for later Restore.
        network = self.chaos_lines + self.service_nodes + self.agent_nodes
        for mob in network:
            mob.save_state()
        self.play(
            AnimationGroup(*[mob.animate.set_opacity(0.08) for mob in network],
                           run_time=0.8),
            FadeOut(sub, run_time=0.5),
        )

    # ------------------------------------------------------------------ S4
    def scene4_identity(self):
        self.set_title("Pillar 1: Workload Identity.")

        demo_agent = make_agent("ADK", BLUE).move_to(LEFT * 3.2 + UP * 0.6)
        self.play(FadeIn(demo_agent, scale=0.9, run_time=0.6))

        # Timeline along the bottom.
        tl_line = Line(LEFT * 4.5, RIGHT * 4.5, stroke_color=SUB_GRAY,
                       stroke_width=1.5).move_to(DOWN * 2.8)
        t1 = Dot(tl_line.point_from_proportion(0.1), radius=0.07, color=BLUE)
        t2 = Dot(tl_line.point_from_proportion(0.5), radius=0.07, color=GREEN)
        t3 = Dot(tl_line.point_from_proportion(0.9), radius=0.07, color=SUB_GRAY)
        t1_label = Text("Agent starts", font=FONT, font_size=15,
                        color=BLUE).next_to(t1, DOWN, buff=0.15)
        t2_label = Text("Identity issued", font=FONT, font_size=15,
                        color=GREEN).next_to(t2, DOWN, buff=0.15)
        t3_label = Text("Request arrives", font=FONT, font_size=15,
                        color=SUB_GRAY).next_to(t3, DOWN, buff=0.15)
        self.play(Create(tl_line, run_time=0.6))

        # t1: agent starts.
        self.play(FadeIn(t1, scale=2.0), FadeIn(t1_label), run_time=0.5)
        self.play(Flash(t1.get_center(), color=BLUE, flash_radius=0.35,
                        num_lines=8, run_time=0.5))

        # Credential issuer (vault) on the right. Radius bumped + subtext
        # fit_width'd so "SPIFFE / Workload CA" no longer bleeds past the
        # hexagon border.
        issuer_border = RegularPolygon(
            n=6, radius=1.35,
            stroke_color=BLUE, stroke_width=2.5,
            fill_color=BLUE, fill_opacity=0.06,
        )
        issuer_label = Text("Identity\nIssuer", font=FONT, font_size=18,
                            color=BLUE, weight=BOLD)
        issuer_sub = Text("SPIFFE / Workload CA", font=FONT, font_size=13,
                          color=BLUE)
        fit_width(issuer_sub, 1.75)
        issuer_label.move_to(issuer_border.get_center() + UP * 0.14)
        issuer_sub.next_to(issuer_label, DOWN, buff=0.15)
        issuer = VGroup(issuer_border, issuer_label, issuer_sub)
        issuer.move_to(RIGHT * 3.2 + UP * 0.6)
        self.play(Create(issuer_border, run_time=0.7),
                  FadeIn(issuer_label), FadeIn(issuer_sub))

        # Agent approaches the issuer, gets stamped, returns.
        agent_home = demo_agent.get_center()
        midpoint = (agent_home + issuer.get_center()) / 2 + LEFT * 0.6
        self.play(demo_agent.animate.move_to(midpoint), run_time=0.7)

        badge = make_badge(GREEN)
        badge.move_to(issuer.get_center())
        self.play(Flash(issuer.get_center(), color=GREEN, flash_radius=0.6,
                        num_lines=8, run_time=0.5))
        self.play(FadeIn(badge, scale=0.5, run_time=0.5))
        self.play(
            demo_agent.animate.move_to(agent_home),
            badge.animate.scale(0.65).move_to(
                agent_home + RIGHT * 0.95 + UP * 0.42),
            run_time=0.8,
        )

        # t2: identity issued.
        self.play(FadeIn(t2, scale=2.0), FadeIn(t2_label), run_time=0.5)
        self.play(Flash(t2.get_center(), color=GREEN, flash_radius=0.35,
                        num_lines=8, run_time=0.5))

        # KEY text: agent identity coexists with end-user identity (doesn't
        # replace it) — softened from v3's "not who called it" framing.
        key_text = Text(
            "Agent identity = the agent process. Used with end user identity.",
            font=FONT, font_size=19, color=DARK, weight=BOLD,
        )
        fit_width(key_text, config.frame_width - 1.5)
        key_text.move_to(DOWN * 1.6)
        self.play(Write(key_text, run_time=1.2))
        self.wait(1.2)

        # t3: request arrives — AFTER identity already exists.
        req_arrow = Arrow(
            demo_agent.get_left() + LEFT * 1.6, demo_agent.get_left(),
            buff=0.1, stroke_color=SUB_GRAY, stroke_width=3,
            max_tip_length_to_length_ratio=0.2, color=SUB_GRAY,
        )
        self.play(FadeIn(t3, scale=2.0), FadeIn(t3_label), run_time=0.5)
        self.play(Create(req_arrow, run_time=0.6))
        self.play(Indicate(badge, color=GREEN, scale_factor=1.15, run_time=0.7))
        self.wait(0.8)

        # Every framework or harness gets its own identity.
        self.play(FadeOut(key_text), FadeOut(req_arrow), run_time=0.4)

        def agent_with_badge(label, color, pos):
            a = make_agent(label, color)
            b = make_badge(color).scale(0.42)
            b.move_to(a.get_right() + RIGHT * 0.05 + UP * 0.35)
            return VGroup(a, b).move_to(pos)

        more_specs = REPRESENTATIVE[1:]  # LangChain, CrewAI, Claude Code, Codex, Pi
        more_positions = [
            LEFT * 4.6 + DOWN * 1.7,
            LEFT * 2.3 + DOWN * 1.7,
            LEFT * 0.0 + DOWN * 1.7,
            RIGHT * 2.3 + DOWN * 1.7,
            RIGHT * 4.6 + DOWN * 1.7,
        ]
        more_agents = VGroup(*[
            agent_with_badge(label, color, pos)
            for (label, color), pos in zip(more_specs, more_positions)
        ])
        self.play(LaggedStart(
            *[FadeIn(a, shift=RIGHT * 0.4) for a in more_agents],
            lag_ratio=0.2, run_time=1.4,
        ))

        final4 = Text("Every Agent from any framework or harness, it's own identity.",
                      font=FONT, font_size=19, color=DARK)
        fit_width(final4, config.frame_width - 1.5)
        final4.move_to(DOWN * 0.55)
        self.play(Write(final4, run_time=1.0))
        self.wait(1.4)

        # Clear scene-4 demo elements (NOT the persistent network).
        self.play(FadeOut(VGroup(
            demo_agent, badge, issuer, more_agents, final4,
            tl_line, t1, t2, t3, t1_label, t2_label, t3_label,
        ), run_time=0.6))

    # ------------------------------------------------------------------ S4b
    def scene4b_identity_types(self):
        """Vignette: the 4 types of agent identity.

        Source: agent-platform/source-material/slides/identity/identity_02.png
        (generic "Personal Agent Identity Taxonomy" — no internal codenames).
        Workload Identity (ID-3) is what Scene 4 just showed in depth; this
        vignette places it in context with the other three.
        """
        self.set_title("Agent Identity: Four Types.")

        card_specs = [
            ("ID-1", "User Identity",
             "The foundational identity of the\nhuman principal delegating the task.",
             SUB_GRAY, False),
            ("ID-2", "Agent On-Behalf-Of Identity",
             "Delegated OAuth authority —\nthe agent acting for the user.",
             "#9B59B6", False),
            ("ID-3", "Agent Workload Identity",
             "SPIFFE / mTLS — the agent process\nitself. You just saw this.",
             GREEN, True),
            ("ID-4", "Agent Workforce Identity",
             "The agent's own identity for its own\ndata (Workspace, Drive, Box).",
             BLUE, False),
        ]

        CARD_W, CARD_H = 5.6, 2.5
        positions = [
            LEFT * 3.1 + UP * 1.35,
            RIGHT * 3.1 + UP * 1.35,
            LEFT * 3.1 + DOWN * 1.35,
            RIGHT * 3.1 + DOWN * 1.35,
        ]

        cards = []
        for (tag, name, desc, color, highlight) in card_specs:
            card_bg = RoundedRectangle(
                corner_radius=0.15, width=CARD_W, height=CARD_H,
                fill_color=color, fill_opacity=0.10 if highlight else 0.04,
                stroke_color=color, stroke_width=2.2 if highlight else 1.3,
            )
            tag_pill = RoundedRectangle(
                corner_radius=0.08, width=0.9, height=0.4,
                fill_color=color, fill_opacity=0.85,
                stroke_width=0,
            )
            tag_text = Text(tag, font=FONT, font_size=15, color=WHITE, weight=BOLD)
            tag_text.move_to(tag_pill.get_center())
            tag_group = VGroup(tag_pill, tag_text)

            name_text = Text(name, font=FONT, font_size=18, color=DARK, weight=BOLD)
            fit_width(name_text, CARD_W - 0.6)
            desc_text = Text(desc, font=FONT, font_size=14, color=MED_GRAY,
                             line_spacing=1.2)
            fit_width(desc_text, CARD_W - 0.6)

            card_group = VGroup(card_bg, tag_group, name_text, desc_text)
            tag_group.move_to(card_bg.get_top() + DOWN * 0.5 + LEFT * (CARD_W / 2 - 0.75))
            name_text.next_to(tag_group, DOWN, buff=0.25, aligned_edge=LEFT)
            name_text.align_to(card_bg, LEFT).shift(RIGHT * 0.3)
            desc_text.next_to(name_text, DOWN, buff=0.2, aligned_edge=LEFT)

            if highlight:
                check = Text("Already covered", font=FONT, font_size=12,
                             color=GREEN, weight=BOLD)
                check.next_to(card_bg, DOWN, buff=-0.35).align_to(card_bg, RIGHT).shift(LEFT*0.3)
                card_group.add(check)

            cards.append(card_group.move_to(positions[len(cards)]))

        self.play(LaggedStart(
            *[FadeIn(c, scale=0.92) for c in cards],
            lag_ratio=0.2, run_time=1.6,
        ))
        self.wait(0.4)
        self.play(Indicate(cards[2], color=GREEN, scale_factor=1.03, run_time=0.8))
        self.wait(0.6)

        closer = Text("Four identity types. One coherent model.",
                      font=FONT, font_size=22, color=DARK, weight=BOLD)
        closer.to_edge(DOWN, buff=0.3)
        self.play(Write(closer, run_time=1.0))
        self.wait(1.3)

        self.play(FadeOut(VGroup(*cards, closer), run_time=0.6))

    # ------------------------------------------------------------------ S5
    def scene5_gateway(self):
        self.set_title("Pillar 2: Agent Gateway.")

        # Gateway tower.
        gateway_base = RoundedRectangle(
            corner_radius=0.2, width=1.8, height=3.5,
            fill_color=BLUE, fill_opacity=0.07,
            stroke_color=BLUE, stroke_width=2.5,
        ).move_to(DOWN * 0.4)
        gateway_label = Text("Agent Gateway", font=FONT, font_size=17,
                             color=BLUE, weight=BOLD)
        gateway_label.next_to(gateway_base, UP, buff=0.15)

        # Panels per feedback: Authentication / Authorization+Policy / Ingress+Egress.
        sub_authn = make_sub_panel("Authentication", BLUE)
        sub_authn.move_to(gateway_base.get_top() + DOWN * 0.65)
        sub_authz = make_sub_panel("Authorization / Policy", GREEN)
        sub_authz.move_to(gateway_base.get_center())
        sub_io = make_sub_panel("Ingress / Egress", INDIGO)
        sub_io.move_to(gateway_base.get_bottom() + UP * 0.65)
        panels = [sub_authn, sub_authz, sub_io]

        self.play(Create(gateway_base, run_time=0.8))
        self.play(FadeIn(gateway_label),
                  LaggedStart(*[FadeIn(p, shift=UP * 0.2) for p in panels],
                              lag_ratio=0.2, run_time=0.8))

        # 5 agents in a left arc; 3 services on the right.
        arc_specs = [
            ("ADK", BLUE,             LEFT * 5.4 + UP * 1.8),
            ("LangChain", "#9B59B6",  LEFT * 5.8 + UP * 0.7),
            ("CrewAI", "#FF8C00",     LEFT * 5.9 + DOWN * 0.4),
            ("Claude Code", "#D97757", LEFT * 5.8 + DOWN * 1.5),
            ("Codex", "#757575",      LEFT * 5.4 + DOWN * 2.6),
        ]
        gw_agents = {label: make_agent(label, color).move_to(pos)
                     for label, color, pos in arc_specs}
        svc_specs = [
            (LLM_LABEL, GREEN,       RIGHT * 5.2 + UP * 1.2),
            ("BigQuery", GREEN,      RIGHT * 5.3 + DOWN * 0.3),
            ("Secret Manager", RED,  RIGHT * 5.2 + DOWN * 1.8),
        ]
        gw_services = {label: make_service(label, color).move_to(pos)
                       for label, color, pos in svc_specs}

        self.play(
            LaggedStart(*[FadeIn(a, shift=RIGHT * 0.3)
                          for a in gw_agents.values()],
                        lag_ratio=0.15, run_time=1.0),
            LaggedStart(*[FadeIn(s, shift=LEFT * 0.3)
                          for s in gw_services.values()],
                        lag_ratio=0.2, run_time=1.0),
        )

        # Connection lines: agents -> gateway, gateway -> services. These are
        # the SAME straight-line objects the request dots travel along below
        # — fixes the v3 bug where the dot's curved path visibly diverged
        # from the drawn connector.
        in_lines = {
            label: Line(a.get_right() + RIGHT * 0.05,
                       gateway_base.get_left() + LEFT * 0.05,
                       stroke_color=SUB_GRAY, stroke_width=1.5, stroke_opacity=0.6)
            for label, a in gw_agents.items()
        }
        out_lines = {
            label: Line(gateway_base.get_right() + RIGHT * 0.05,
                       s.get_left() + LEFT * 0.05,
                       stroke_color=SUB_GRAY, stroke_width=1.5, stroke_opacity=0.6)
            for label, s in gw_services.items()
        }
        self.play(LaggedStart(
            *[Create(l) for l in list(in_lines.values()) + list(out_lines.values())],
            lag_ratio=0.08, run_time=1.2,
        ))

        def panel_pulse():
            for panel, color in zip(panels, (BLUE, GREEN, INDIGO)):
                self.play(panel[0].animate.set_fill(color, opacity=0.5),
                          run_time=0.2)
            self.play(AnimationGroup(
                *[p[0].animate.set_fill(opacity=0.12) for p in panels],
                run_time=0.3,
            ))

        def dot_along(dot, line, run_time=0.8):
            """Move dot along exactly the connector line's endpoints."""
            self.play(MoveAlongPath(
                dot, Line(line.get_start(), line.get_end()),
                rate_func=smooth, run_time=run_time,
            ))

        # Happy path: ADK -> gateway -> LLM Inference. The dot travels the
        # agent->gateway line, a short hop across the gateway body, then the
        # gateway->service line — exactly matching the drawn connectors.
        dot = Dot(radius=0.09, color=BLUE)
        dot.move_to(in_lines["ADK"].get_start())
        self.add(dot)
        dot_along(dot, in_lines["ADK"], run_time=0.9)
        panel_pulse()
        self.play(gateway_base.animate.set_stroke(GREEN), run_time=0.2)
        self.play(dot.animate.move_to(out_lines[LLM_LABEL].get_start()), run_time=0.3)
        dot_along(dot, out_lines[LLM_LABEL], run_time=0.9)
        self.play(
            Flash(gw_services[LLM_LABEL].get_center(), color=GREEN,
                  flash_radius=0.5, num_lines=8, run_time=0.5),
            FadeOut(dot, run_time=0.4),
            gateway_base.animate.set_stroke(BLUE),
        )

        # Blocked path: Codex -> gateway -> INTERCEPTED.
        red_dot = Dot(radius=0.09, color=RED)
        red_dot.move_to(in_lines["Codex"].get_start())
        self.add(red_dot)
        dot_along(red_dot, in_lines["Codex"], run_time=0.9)
        self.play(sub_authz[0].animate.set_fill(RED, opacity=0.5)
                  .set_stroke(RED), run_time=0.25)

        # Two sequential DENY reasons: an IAM policy, then a semantic
        # governance (natural-language) policy — two different enforcement
        # mechanisms, shown one after the other.
        policy_flash_1 = Text("Policy: Secret Manager [READ] --> DENY",
                              font=FONT, font_size=14, color=RED)
        policy_flash_1.next_to(gateway_label, UP, buff=0.2)
        iam_caption = Text("(IAM policy)", font=FONT, font_size=11, color=MED_GRAY)
        iam_caption.next_to(policy_flash_1, UP, buff=0.08)
        self.play(FadeIn(policy_flash_1, run_time=0.2), FadeIn(iam_caption, run_time=0.2))
        self.wait(0.6)
        self.play(FadeOut(policy_flash_1, run_time=0.3), FadeOut(iam_caption, run_time=0.3))

        policy_flash_2 = Text("Semantic Governance Policy --> DENY",
                              font=FONT, font_size=14, color=RED)
        policy_flash_2.next_to(gateway_label, UP, buff=0.2)
        sgp_caption = Text("(natural-language policy)", font=FONT, font_size=11,
                          color=MED_GRAY)
        sgp_caption.next_to(policy_flash_2, UP, buff=0.08)
        self.play(FadeIn(policy_flash_2, run_time=0.2), FadeIn(sgp_caption, run_time=0.2))
        self.wait(0.6)
        self.play(FadeOut(policy_flash_2, run_time=0.3), FadeOut(sgp_caption, run_time=0.3))

        blocked_rect = RoundedRectangle(
            corner_radius=0.15, width=3.2, height=0.75,
            fill_color=RED, fill_opacity=0.94,
            stroke_color=RED, stroke_width=2,
        ).move_to(gateway_base.get_center() + RIGHT * 2.6 + UP * 0.9)
        blocked_text = Text("ACCESS BLOCKED", font=FONT, font_size=22,
                            color=WHITE, weight=BOLD)
        blocked_text.move_to(blocked_rect.get_center())
        blocked = VGroup(blocked_rect, blocked_text)
        self.play(
            FadeIn(blocked, scale=1.3, run_time=0.4),
            Flash(gateway_base.get_center(), color=RED, flash_radius=1.0,
                  num_lines=10, run_time=0.4),
        )
        self.wait(0.8)
        self.play(
            FadeOut(blocked, run_time=0.4),
            FadeOut(red_dot, run_time=0.3),
            gw_agents["Codex"].animate.set_opacity(0.45),
            sub_authz[0].animate.set_fill(GREEN, opacity=0.12).set_stroke(GREEN),
        )

        # Life goes on: LangChain -> BigQuery, normal transit.
        lc_dot = Dot(radius=0.09, color=BLUE)
        lc_dot.move_to(in_lines["LangChain"].get_start())
        self.add(lc_dot)
        dot_along(lc_dot, in_lines["LangChain"], run_time=0.8)
        self.play(lc_dot.animate.move_to(out_lines["BigQuery"].get_start()), run_time=0.25)
        dot_along(lc_dot, out_lines["BigQuery"], run_time=0.9)
        self.play(
            Flash(gw_services["BigQuery"].get_center(), color=GREEN,
                  flash_radius=0.5, num_lines=8, run_time=0.4),
            FadeOut(lc_dot, run_time=0.3),
        )

        control_text = Text(
            "Granular control, Every Agent, Every Task, Every Tool or Agent",
            font=FONT, font_size=19, color=DARK,
        )
        fit_width(control_text, config.frame_width - 1.5)
        control_text.to_edge(DOWN, buff=0.4)
        self.play(Write(control_text, run_time=1.0))
        self.wait(1.2)

        # Collapse the tower into a compact node that survives into the next scene.
        self.gateway_node = make_agent("Gateway", BLUE, height=0.65)
        self.gateway_node.move_to(gateway_base.get_center())
        tower = VGroup(gateway_base, gateway_label, *panels)
        rest = VGroup(*gw_agents.values(), *gw_services.values(),
                      *in_lines.values(), *out_lines.values(), control_text)
        self.play(
            Transform(tower, self.gateway_node, run_time=0.8),
            FadeOut(rest, run_time=0.6),
        )
        self.gateway_node = tower

    # ------------------------------------------------------------------ S6
    def scene6_observability(self):
        self.set_title("Pillar 3: Observability.")

        network = self.chaos_lines + self.service_nodes + self.agent_nodes
        # Restore the dimmed sprawl network to full styling (the reveal).
        self.play(
            AnimationGroup(*[Restore(mob) for mob in network], run_time=0.8),
            self.gateway_node.animate.move_to(ORIGIN),
        )
        self.wait(0.5)

        # Clean hub-spoke layout.
        agent_ys = [2.0, 1.2, 0.4, -0.4, -1.2, -2.0]
        clean_agent_pos = [LEFT * 4.9 + UP * y for y in agent_ys]
        service_ys = [1.6, 0.8, 0.0, -0.8, -1.6]
        clean_service_pos = [RIGHT * 4.9 + UP * y for y in service_ys]
        gw = ORIGIN

        agent_edge_line = {}
        service_edge_line = {}
        line_targets = []
        for line, (ai, si) in zip(self.chaos_lines, self.chaos_pairs):
            if ai not in agent_edge_line:
                agent_edge_line[ai] = line
                start = clean_agent_pos[ai] + RIGHT * 0.75
                end = gw + LEFT * 0.95
            elif si not in service_edge_line:
                service_edge_line[si] = line
                start = gw + RIGHT * 0.95
                end = clean_service_pos[si] + LEFT * 0.7
            else:
                start = clean_agent_pos[ai] + RIGHT * 0.75
                end = gw + LEFT * 0.95
            line_targets.append(Line(
                start, end,
                stroke_color=BLUE, stroke_width=2.0, stroke_opacity=0.4,
            ))

        self.play(AnimationGroup(
            *[Transform(dl, tgt) for dl, tgt in zip(self.chaos_lines, line_targets)],
            *[node.animate.move_to(pos)
              for node, pos in zip(self.agent_nodes, clean_agent_pos)],
            *[node.animate.move_to(pos)
              for node, pos in zip(self.service_nodes, clean_service_pos)],
            run_time=1.5,
        ))
        self.wait(0.5)

        same_text = Text("Same network.", font=FONT, font_size=22,
                         color=DARK, weight=BOLD)
        same_text.to_edge(DOWN, buff=0.45)
        self.play(Write(same_text, run_time=0.7))
        self.wait(0.6)
        see_text = Text("Now you can see it.", font=FONT, font_size=22,
                        color=BLUE, weight=BOLD)
        see_text.to_edge(DOWN, buff=0.45)
        self.play(Transform(same_text, see_text, run_time=0.6))
        self.wait(0.8)

        # Clear the network topology — the trace waterfall is next.
        self.play(FadeOut(VGroup(
            *self.chaos_lines, *self.service_nodes, *self.agent_nodes,
            self.gateway_node, same_text,
        ), run_time=0.7))

        self._otel_trace_waterfall()

        visible_text = Text("Every request. Every hop. Visible.",
                            font=FONT, font_size=22, color=DARK, weight=BOLD)
        visible_text.to_edge(DOWN, buff=0.35)
        self.play(Write(visible_text, run_time=1.0))
        self.wait(1.5)

        everything = Group(*[m for m in self.mobjects if m is not self.title])
        self.play(FadeOut(everything, run_time=0.9))

    def _otel_trace_waterfall(self):
        """OpenTelemetry span waterfall: User -> Agent Framework -> LLM ->
        Agent Framework -> BigQuery -> Agent Framework -> LLM -> User.

        Root span = full round trip. Agent Framework span nests three
        sequential child spans (LLM plan call, BigQuery tool call, LLM
        summarize call) — this naturally represents the described path,
        since execution returns to the framework between each external call.
        """
        spans = [
            ("User Request", 0, 0, 100, SUB_GRAY),
            ("Agent Framework", 1, 4, 92, BLUE),
            ("LLM: plan", 2, 8, 18, GREEN),
            ("BigQuery query", 2, 30, 34, YELLOW),
            ("LLM: summarize", 2, 68, 20, GREEN),
        ]
        total_ms = 100
        timeline_left = -4.0
        timeline_width = 8.3
        row_height = 0.65
        depth_indent = 0.35

        def ms_to_x(ms):
            return timeline_left + (ms / total_ms) * timeline_width

        subtitle = Text("Every hop emits an OpenTelemetry span, exported to Cloud Trace.",
                        font=FONT, font_size=18, color=DARK, weight=BOLD)
        subtitle.next_to(self.title, DOWN, buff=0.3)
        self.play(Write(subtitle, run_time=1.0))

        axis_y = 2.4
        axis = Line([timeline_left, axis_y, 0],
                    [timeline_left + timeline_width, axis_y, 0],
                    stroke_color=SEP_GRAY, stroke_width=1.5)
        ticks = VGroup()
        tick_labels = VGroup()
        for t in range(0, total_ms + 1, 20):
            x = ms_to_x(t)
            tick = DashedLine([x, axis_y, 0], [x, -1.9, 0],
                              stroke_color=SEP_GRAY, stroke_width=1,
                              dash_length=0.08)
            ticks.add(tick)
            lbl = Text(f"{t}ms", font=FONT, font_size=11, color=SUB_GRAY)
            lbl.next_to([x, axis_y, 0], UP, buff=0.1)
            tick_labels.add(lbl)
        self.play(Create(axis), FadeIn(tick_labels), run_time=0.6)
        self.play(Create(ticks, run_time=0.7))

        top_y = axis_y - 0.55
        rows = VGroup()
        bars = []
        for i, (label, depth, start, dur, color) in enumerate(spans):
            y = top_y - i * row_height
            x0, x1 = ms_to_x(start), ms_to_x(start + dur)
            bar = RoundedRectangle(
                corner_radius=0.06, width=max(0.001, x1 - x0), height=0.4,
                fill_color=color, fill_opacity=0.75,
                stroke_color=color, stroke_width=1.5,
            )
            bar.stretch_to_fit_width(0.001)
            bar.move_to([x0, y, 0])

            row_label = Text(label, font=FONT, font_size=13, color=DARK)
            row_label.move_to([timeline_left - 0.25, y, 0], aligned_edge=RIGHT)
            row_label.shift(LEFT * depth * depth_indent)

            dur_label = Text(f"{dur}ms", font=FONT, font_size=11, color=MED_GRAY)
            dur_label.next_to([x1, y, 0], RIGHT, buff=0.1)

            bars.append((bar, x0, x1, y, dur_label))
            rows.add(row_label)

        self.play(LaggedStart(*[FadeIn(r, shift=RIGHT * 0.2) for r in rows],
                              lag_ratio=0.15, run_time=1.0))

        # Grow each span bar in chronological start order.
        for bar, x0, x1, y, dur_label in bars:
            self.add(bar)
            self.play(
                bar.animate.stretch_to_fit_width(x1 - x0).move_to(
                    [(x0 + x1) / 2, y, 0]),
                FadeIn(dur_label, run_time=0.3),
                run_time=0.5,
            )
        self.wait(0.8)

        self.play(FadeOut(VGroup(
            subtitle, axis, ticks, tick_labels, rows,
            *[b[0] for b in bars], *[b[4] for b in bars],
        ), run_time=0.7))

    # ------------------------------------------------------------------ S7
    def scene7_aha(self):
        self.set_title("Same governance model.")

        COL_X = [-4.2, 0.0, 4.2]
        ROW_Y = [0.55, -0.35, -1.25]
        HEADER_Y = 2.35
        ICON_Y = 1.55

        headers = [
            Text("People", font=FONT, font_size=22, color=MED_GRAY,
                 weight=BOLD).move_to([COL_X[0], HEADER_Y, 0]),
            Text("Cloud Services", font=FONT, font_size=22,
                 color=MED_GRAY, weight=BOLD).move_to([COL_X[1], HEADER_Y, 0]),
            Text("AI Agents", font=FONT, font_size=22, color=BLUE,
                 weight=BOLD).move_to([COL_X[2], HEADER_Y, 0]),
        ]
        self.play(LaggedStart(*[FadeIn(h, shift=UP * 0.2) for h in headers],
                              lag_ratio=0.25, run_time=1.0))

        head = Circle(radius=0.16, fill_color=SUB_GRAY, fill_opacity=0.3,
                      stroke_color=SUB_GRAY, stroke_width=1.5).move_to(UP * 0.22)
        body = Line(UP * 0.06, DOWN * 0.3, stroke_color=SUB_GRAY,
                    stroke_width=2.5)
        arms = Line(LEFT * 0.2 + DOWN * 0.06, RIGHT * 0.2 + DOWN * 0.06,
                    stroke_color=SUB_GRAY, stroke_width=2.0)
        person = VGroup(head, body, arms).move_to([COL_X[0], ICON_Y, 0])

        gear_body = Circle(radius=0.2, fill_color=SUB_GRAY, fill_opacity=0.3,
                           stroke_color=SUB_GRAY, stroke_width=1.5)
        teeth = VGroup(*[
            Rectangle(width=0.09, height=0.13, fill_color=SUB_GRAY,
                      fill_opacity=0.5, stroke_width=0)
            .rotate(i * np.pi / 3)
            .move_to(0.29 * np.array([np.cos(i * np.pi / 3),
                                      np.sin(i * np.pi / 3), 0]))
            for i in range(6)
        ])
        gear = VGroup(gear_body, teeth).move_to([COL_X[1], ICON_Y, 0])

        agent_icon = RoundedRectangle(
            corner_radius=0.12, width=0.62, height=0.4,
            fill_color=BLUE, fill_opacity=0.2,
            stroke_color=BLUE, stroke_width=2.0,
        ).move_to([COL_X[2], ICON_Y, 0])

        self.play(LaggedStart(FadeIn(person), FadeIn(gear), FadeIn(agent_icon),
                              lag_ratio=0.25, run_time=0.9))

        rows = [
            ("Identity", ["Login / SSO", "Service Account", "Workload Identity"]),
            ("Policy",   ["IAM Roles", "IAM Roles", "Agent Gateway"]),
            ("Audit",    ["Audit Logs", "Cloud Trace", "Agent Observability"]),
        ]
        row_label_x = -6.3

        def make_cell(text, col):
            if col == 2:
                return Text(text, font=FONT, font_size=17, color=GREEN,
                            weight=BOLD)
            return Text(text, font=FONT, font_size=17, color=MED_GRAY)

        table_mobs = []
        for r, (label, cells) in enumerate(rows):
            row_label = Text(label, font=FONT, font_size=15, color=DARK,
                             weight=BOLD)
            row_label.move_to([row_label_x, ROW_Y[r], 0], aligned_edge=LEFT)
            cell_mobs = [make_cell(c, i).move_to([COL_X[i], ROW_Y[r], 0])
                         for i, c in enumerate(cells)]
            self.play(
                FadeIn(row_label, run_time=0.3),
                LaggedStart(*[Write(c) for c in cell_mobs],
                            lag_ratio=0.25, run_time=1.0),
            )
            table_mobs.extend([row_label] + cell_mobs)
            if r < 2:
                sep = Line([-6.3, (ROW_Y[r] + ROW_Y[r + 1]) / 2, 0],
                           [6.3, (ROW_Y[r] + ROW_Y[r + 1]) / 2, 0],
                           stroke_color=SEP_GRAY, stroke_width=1.0)
                self.play(Create(sep, run_time=0.4))
                table_mobs.append(sep)

        col3_bg = RoundedRectangle(
            corner_radius=0.2, width=3.3, height=4.4,
            fill_color=BLUE, fill_opacity=0.05,
            stroke_color=BLUE, stroke_width=1.5,
        ).move_to([COL_X[2], (HEADER_Y + ROW_Y[2]) / 2, 0])
        self.play(FadeIn(col3_bg, run_time=0.8))
        self.wait(0.5)

        final = Text("Govern agents the same way you govern everything else.",
                     font=FONT, font_size=26, color=DARK, weight=BOLD)
        fit_width(final, config.frame_width - 1.0)
        final.move_to(DOWN * 2.45)
        self.play(Write(final, run_time=1.8))
        self.wait(0.6)

        # Updated closing sub-line per feedback.
        sub_final = Text(
            "Extended capabilities for any Agents, on top of our mature and secure platform.",
            font=FONT, font_size=15, color=MED_GRAY,
        )
        fit_width(sub_final, config.frame_width - 1.0)
        sub_final.next_to(final, DOWN, buff=0.3)
        self.play(FadeIn(sub_final, run_time=0.6))
        self.wait(1.5)

        self.play(FadeOut(Group(*self.mobjects), run_time=1.0))
        self.wait(0.5)
