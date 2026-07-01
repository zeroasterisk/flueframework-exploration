"""
Flue Deployment V2 — Multi-chapter animated explainer
Building, deploying, and connecting a Flue agent on Google Cloud.
~26 seconds, 720p30, 3Blue1Brown style.

Chapters:
  1. Building the Agent  (~8 s)  — LLM · Tools · Instructions
  2. Deploying           (~6 s)  — Runtime · Sandbox
  3. Communication       (~8 s)  — Zoom-out · Channels · Ecosystem
  4. Security            (~2 s)  — placeholder
  5. Optimization        (~2 s)  — placeholder
"""

from manim import *
import numpy as np

# ── Palette (3Blue1Brown style on dark background) ────────────────
BG_COLOR   = "#1C1C1C"
BLUE_ACC   = "#58C4DD"
GREEN_ACC  = "#83C167"
ORANGE_ACC = "#FF8C00"
YELLOW_ACC = "#FFFF00"
WHITE_TXT  = "#FFFFFF"
GREY_SUB   = "#AAAAAA"
GREY_DK    = "#444444"

# ── Arrow stroke-width constants ──────────────────────────────────
THIN_SW  = 1.5   # option / secondary
MED_SW   = 2.5   # flow
THICK_SW = 3.5   # primary path


# ── Helper factories ─────────────────────────────────────────────

def make_node(label, color, w=2.2, h=0.65, fs=22, fo=0.15):
    """Rounded-rect node (DESCRIPTOR style) with centered label."""
    rect = RoundedRectangle(
        corner_radius=0.15, width=w, height=h,
        color=color, fill_color=color, fill_opacity=fo,
        stroke_width=2,
    )
    txt = Text(label, font_size=fs, color=color)
    txt.move_to(rect)
    return VGroup(rect, txt)


def make_title(text):
    """TITLE style — bold section header."""
    return Text(text, font_size=32, color=WHITE_TXT, weight=BOLD)


def make_action(text):
    """ACTION style — italic, describes what human/agent does."""
    return Text(text, font_size=18, color=GREY_SUB, slant=ITALIC)


def make_desc(text, fs=14, color=GREY_SUB):
    """DESCRIPTOR style — regular, describes what something is."""
    return Text(text, font_size=fs, color=color)


def make_bg_boxes(count, center=ORIGIN, area_w=9.0, box_w=0.45, box_h=0.3):
    """Deterministic grid of faint boxes (many-options backdrop)."""
    group = VGroup()
    gap_x, gap_y = 0.12, 0.10
    cols = max(1, int(area_w / (box_w + gap_x)))
    for i in range(count):
        row, col = divmod(i, cols)
        x = (col - (cols - 1) / 2) * (box_w + gap_x)
        y = -(row - 0.5) * (box_h + gap_y)
        box = RoundedRectangle(
            corner_radius=0.05, width=box_w, height=box_h,
            color=GREY_DK, fill_color=GREY_DK, fill_opacity=0.07,
            stroke_width=0.5, stroke_opacity=0.25,
        )
        box.move_to(center + np.array([x, y, 0]))
        group.add(box)
    return group


# ══════════════════════════════════════════════════════════════════

class FlueDeploymentV2(Scene):
    def construct(self):
        self.camera.background_color = BG_COLOR

        # ─────────────────────────────────────────────────────────
        # CHAPTER 1 — BUILDING THE AGENT  (~8 s)
        # ─────────────────────────────────────────────────────────

        self._beat_1_llm_selection()       # 3 s
        self._beat_2_tools()               # 3 s
        self._beat_3_instructions()        # 2 s

        # ─────────────────────────────────────────────────────────
        # CHAPTER 2 — DEPLOYING  (~6 s)
        # ─────────────────────────────────────────────────────────

        self._beat_4_runtime()             # 3 s
        self._beat_5_sandbox()             # 3 s

        # ─────────────────────────────────────────────────────────
        # CHAPTER 3 — COMMUNICATION  (~8 s)
        # ─────────────────────────────────────────────────────────

        self._beat_6_zoom_out()            # 3 s
        self._beat_7_channels()            # 3 s
        self._beat_8_ecosystem()           # 2 s

        # ─────────────────────────────────────────────────────────
        # CHAPTERS 4 & 5 — PLACEHOLDERS  (2 s each)
        # ─────────────────────────────────────────────────────────

        self._chapter_4_security()         # 2 s
        self._chapter_5_optimization()     # 2 s

    # ══════════════════════════════════════════════════════════════
    # Beat methods
    # ══════════════════════════════════════════════════════════════

    def _beat_1_llm_selection(self):
        """Choose Your LLM — 5 named options, ~30 bg boxes, Gemini highlighted."""
        t = make_title("Choose Your LLM").to_edge(UP, buff=0.5)

        bg = make_bg_boxes(30, center=UP * 0.2)

        llm_specs = [
            ("Gemini", GREEN_ACC,  2.0, 0.6, 22, 0.25),   # highlighted
            ("Claude", BLUE_ACC,   1.6, 0.5, 18, 0.10),
            ("GPT",    WHITE_TXT,  1.6, 0.5, 18, 0.10),
            ("GLM",    WHITE_TXT,  1.6, 0.5, 18, 0.10),
            ("Kimi",   WHITE_TXT,  1.6, 0.5, 18, 0.10),
        ]
        llms = VGroup(*[make_node(*s) for s in llm_specs])
        llms.arrange(RIGHT, buff=0.4).move_to(UP * 0.2)

        highlight = SurroundingRectangle(
            llms[0], color=GREEN_ACC, corner_radius=0.2,
            buff=0.1, stroke_width=2.5,
        )
        act = make_action("Pick one or more").move_to(DOWN * 1.3)

        # -- animate
        self.play(FadeIn(t, shift=DOWN * 0.2), run_time=0.4)
        self.play(
            FadeIn(bg),
            LaggedStart(*[FadeIn(n, shift=UP * 0.15) for n in llms],
                        lag_ratio=0.08),
            run_time=0.8,
        )
        self.play(Create(highlight), FadeIn(act, shift=UP * 0.1), run_time=0.5)
        self.wait(1.3)

        # -- stash for transition
        self._prev = VGroup(t, bg, llms, highlight, act)

    def _beat_2_tools(self):
        """Add Tools — Skills, MCP Servers, highlighted specifics."""
        self.play(FadeOut(self._prev), run_time=0.35)

        t = make_title("Add Tools").to_edge(UP, buff=0.5)
        bg = make_bg_boxes(20, center=UP * 0.3, area_w=8)

        skills = make_node("Skills", BLUE_ACC, w=1.8, h=0.55, fs=20)
        mcp    = make_node("MCP Servers", BLUE_ACC, w=2.4, h=0.55, fs=20)
        tops   = VGroup(skills, mcp).arrange(RIGHT, buff=1.8).move_to(UP * 0.8)

        bq = make_node("BigQuery MCP",     GREEN_ACC, w=2.2, h=0.45, fs=15, fo=0.20)
        cs = make_node("Cloud Storage MCP", GREEN_ACC, w=2.8, h=0.45, fs=15, fo=0.20)
        va = make_node("Vertex AI Skills",  GREEN_ACC, w=2.5, h=0.45, fs=15, fo=0.20)
        specifics = VGroup(bq, cs, va).arrange(RIGHT, buff=0.3).move_to(DOWN * 0.3)

        act = make_action("Connect capabilities").move_to(DOWN * 1.3)

        # -- animate
        self.play(FadeIn(t, shift=DOWN * 0.2), run_time=0.25)
        self.play(
            FadeIn(bg),
            LaggedStart(FadeIn(skills, shift=UP * 0.1),
                        FadeIn(mcp, shift=UP * 0.1), lag_ratio=0.25),
            run_time=0.6,
        )
        self.play(
            LaggedStart(*[FadeIn(s, shift=UP * 0.1) for s in specifics],
                        lag_ratio=0.15),
            FadeIn(act, shift=UP * 0.1),
            run_time=0.6,
        )
        self.wait(1.15)

        self._prev = VGroup(t, bg, tops, specifics, act)

    def _beat_3_instructions(self):
        """Define Instructions — text block with prompt excerpt."""
        self.play(FadeOut(self._prev), run_time=0.3)

        t = make_title("Define Instructions").to_edge(UP, buff=0.5)

        box = RoundedRectangle(
            corner_radius=0.15, width=6.5, height=1.2,
            color=GREY_SUB, fill_color=GREY_DK, fill_opacity=0.08,
            stroke_width=1.5,
        ).move_to(UP * 0.2)
        txt = Text("You are a helpful assistant that...",
                    font_size=20, color=WHITE_TXT).move_to(box)
        prompt = VGroup(box, txt)

        act = make_action("Tell the agent what to do").move_to(DOWN * 1.3)

        # -- animate
        self.play(
            FadeIn(t, shift=DOWN * 0.2),
            FadeIn(prompt, shift=UP * 0.15),
            run_time=0.5,
        )
        self.play(FadeIn(act, shift=UP * 0.1), run_time=0.3)
        self.wait(0.9)

        self._prev = VGroup(t, prompt, act)

    # ── Chapter 2 ────────────────────────────────────────────────

    def _beat_4_runtime(self):
        """Choose Runtime — three options fan out from a central point."""
        self.play(FadeOut(self._prev), run_time=0.3)

        t = make_title("Choose Runtime").to_edge(UP, buff=0.5)

        self._rt_geap = make_node("GEAP Runtime", GREEN_ACC,  w=2.8, h=0.6, fs=20)
        self._rt_cr   = make_node("Cloud Run",    BLUE_ACC,   w=2.6, h=0.6, fs=20)
        self._rt_gke  = make_node("GKE",          ORANGE_ACC, w=2.2, h=0.6, fs=20)

        self._rt_geap.move_to(LEFT * 4 + UP * 0.4)
        self._rt_cr.move_to(UP * 0.4)
        self._rt_gke.move_to(RIGHT * 4 + UP * 0.4)

        d_g = make_desc("Easy, fully managed",        color=GREEN_ACC)
        d_c = make_desc("Container flexibility",      color=BLUE_ACC)
        d_k = make_desc("Flexible, cloud-native K8s", color=ORANGE_ACC)
        d_g.next_to(self._rt_geap, DOWN, buff=0.12)
        d_c.next_to(self._rt_cr,   DOWN, buff=0.12)
        d_k.next_to(self._rt_gke,  DOWN, buff=0.12)

        dot = Dot(UP * 2, radius=0.04, color=WHITE_TXT)

        a_g = Arrow(dot.get_center(), self._rt_geap.get_top(), color=GREEN_ACC,
                    stroke_width=THICK_SW, buff=0.08,
                    max_tip_length_to_length_ratio=0.12)
        a_c = Arrow(dot.get_center(), self._rt_cr.get_top(),   color=BLUE_ACC,
                    stroke_width=THICK_SW, buff=0.08,
                    max_tip_length_to_length_ratio=0.12)
        a_k = Arrow(dot.get_center(), self._rt_gke.get_top(),  color=ORANGE_ACC,
                    stroke_width=THICK_SW, buff=0.08,
                    max_tip_length_to_length_ratio=0.12)

        # -- animate
        self.play(FadeIn(t, shift=DOWN * 0.2), FadeIn(dot), run_time=0.3)
        self.play(
            LaggedStart(
                AnimationGroup(GrowArrow(a_g), FadeIn(self._rt_geap, shift=DOWN * 0.12)),
                AnimationGroup(GrowArrow(a_c), FadeIn(self._rt_cr,   shift=DOWN * 0.12)),
                AnimationGroup(GrowArrow(a_k), FadeIn(self._rt_gke,  shift=DOWN * 0.12)),
                lag_ratio=0.3,
            ),
            run_time=1.2,
        )
        self.play(
            LaggedStart(FadeIn(d_g), FadeIn(d_c), FadeIn(d_k), lag_ratio=0.2),
            run_time=0.5,
        )
        self.wait(0.7)

        # chrome that fades; runtime nodes persist into Beat 5
        self._beat4_chrome = VGroup(t, dot, a_g, a_c, a_k, d_g, d_c, d_k)

    def _beat_5_sandbox(self):
        """Add Sandbox — two sandbox nodes, arrows from ALL three runtimes."""
        t = make_title("Add Sandbox").to_edge(UP, buff=0.5)

        sb_geap = make_node("GEAP Sandbox",     GREEN_ACC,  w=2.8, h=0.55, fs=18)
        sb_gke  = make_node("GKE Agent Sandbox", ORANGE_ACC, w=3.2, h=0.55, fs=18)
        sb_geap.move_to(LEFT * 3 + DOWN * 1.5)
        sb_gke.move_to(RIGHT * 3 + DOWN * 1.5)

        # 6 arrows: every runtime → both sandboxes
        arrows = VGroup()
        for rt in [self._rt_geap, self._rt_cr, self._rt_gke]:
            for sb in [sb_geap, sb_gke]:
                arrows.add(Arrow(
                    rt.get_bottom(), sb.get_top(),
                    color=WHITE_TXT, stroke_width=THIN_SW, buff=0.08,
                    max_tip_length_to_length_ratio=0.10,
                    stroke_opacity=0.45,
                ))

        # -- animate
        self.play(
            FadeOut(self._beat4_chrome),
            FadeIn(t, shift=DOWN * 0.2),
            run_time=0.35,
        )
        self.play(
            LaggedStart(
                FadeIn(sb_geap, shift=DOWN * 0.12),
                FadeIn(sb_gke,  shift=DOWN * 0.12),
                lag_ratio=0.3,
            ),
            run_time=0.5,
        )
        self.play(
            LaggedStart(*[GrowArrow(a) for a in arrows], lag_ratio=0.08),
            run_time=1.0,
        )
        self.wait(1.15)

        # everything visible goes into the zoom-out group
        self._ch2_all = VGroup(t, self._rt_geap, self._rt_cr, self._rt_gke,
                               sb_geap, sb_gke, arrows)

    # ── Chapter 3 ────────────────────────────────────────────────

    def _beat_6_zoom_out(self):
        """Everything from Ch1+2 shrinks into a 'Flue Agent' circle."""
        circ = Circle(
            radius=1.0, color=BLUE_ACC,
            fill_color=BLUE_ACC, fill_opacity=0.12,
            stroke_width=2.5,
        )
        lbl = Text("Flue Agent", font_size=22, color=BLUE_ACC, weight=BOLD)
        lbl.move_to(circ)
        self._agent = VGroup(circ, lbl)

        # -- animate: shrink then swap
        self.play(self._ch2_all.animate.scale(0.12).move_to(ORIGIN), run_time=1.0)
        self.play(FadeOut(self._ch2_all), FadeIn(self._agent), run_time=0.5)
        self.wait(1.5)

    def _beat_7_channels(self):
        """Lines radiate from Flue Agent to channel icons + A2A."""
        circ = self._agent[0]   # the Circle

        # Human channels
        ch_data = [
            ("Workspace\nChat", UP * 2.5 + LEFT * 3.5),
            ("Slack",           UP * 2.5 + LEFT * 1.2),
            ("Discord",        UP * 2.5 + RIGHT * 1.2),
            ("Telegram",       UP * 2.5 + RIGHT * 3.5),
        ]
        ch_nodes = VGroup()
        for name, pos in ch_data:
            n = make_node(name, WHITE_TXT, w=1.8, h=0.55, fs=13, fo=0.08)
            n.move_to(pos)
            ch_nodes.add(n)

        # A2A node — visually distinct
        a2a_node = make_node("A2A", YELLOW_ACC, w=1.4, h=0.5, fs=18, fo=0.18)
        a2a_node.move_to(DOWN * 2.5)

        # Solid lines from circle edge → human channels
        h_lines = VGroup()
        for cn in ch_nodes:
            d = cn.get_center() - circ.get_center()
            u = d / np.linalg.norm(d)
            start = circ.get_center() + u * 1.05
            end   = cn.get_center()   - u * 0.35
            h_lines.add(Line(start, end, color=WHITE_TXT,
                             stroke_width=MED_SW, stroke_opacity=0.5))

        # Dashed line → A2A
        a2a_line = DashedLine(
            circ.get_center() + DOWN * 1.05,
            a2a_node.get_center() + UP * 0.3,
            color=YELLOW_ACC, stroke_width=MED_SW,
            dash_length=0.12, dashed_ratio=0.5,
        )

        lbl_h = make_desc("Talking to humans", fs=15)
        lbl_h.move_to(UP * 1.5 + RIGHT * 5.2)
        lbl_a = make_desc("Talking to other agents", fs=15, color=YELLOW_ACC)
        lbl_a.next_to(a2a_node, RIGHT, buff=0.3)

        # -- animate
        self.play(
            LaggedStart(*[FadeIn(cn, shift=DOWN * 0.12) for cn in ch_nodes],
                        lag_ratio=0.08),
            LaggedStart(*[Create(l) for l in h_lines], lag_ratio=0.08),
            run_time=0.8,
        )
        self.play(FadeIn(lbl_h, shift=LEFT * 0.12), run_time=0.25)
        self.play(
            Create(a2a_line),
            FadeIn(a2a_node, shift=UP * 0.12),
            FadeIn(lbl_a, shift=LEFT * 0.12),
            run_time=0.7,
        )
        self.wait(1.25)

        self._prev = VGroup(self._agent, ch_nodes, h_lines,
                            a2a_line, a2a_node, lbl_h, lbl_a)

    def _beat_8_ecosystem(self):
        """Multiple Flue Agent circles connected via A2A + humans."""
        self.play(FadeOut(self._prev), run_time=0.35)

        def mini_agent(label, pos):
            c = Circle(radius=0.6, color=BLUE_ACC, fill_color=BLUE_ACC,
                       fill_opacity=0.12, stroke_width=2)
            t = Text(label, font_size=14, color=BLUE_ACC)
            t.move_to(c)
            g = VGroup(c, t).move_to(pos)
            return g

        ag1 = mini_agent("Agent 1", LEFT * 3.5)
        ag2 = mini_agent("Agent 2", RIGHT * 3.5)
        ag3 = mini_agent("Agent 3", DOWN * 2.2)

        # A2A dashed connections (buff keeps line outside circles)
        aa12 = DashedLine(ag1.get_center(), ag2.get_center(), buff=0.65,
                          color=YELLOW_ACC, stroke_width=2,
                          dash_length=0.1, dashed_ratio=0.5)
        aa13 = DashedLine(ag1.get_center(), ag3.get_center(), buff=0.65,
                          color=YELLOW_ACC, stroke_width=2,
                          dash_length=0.1, dashed_ratio=0.5)
        aa23 = DashedLine(ag2.get_center(), ag3.get_center(), buff=0.65,
                          color=YELLOW_ACC, stroke_width=2,
                          dash_length=0.1, dashed_ratio=0.5)

        # Humans
        h1_dot = Dot(LEFT * 3.5 + UP * 2, radius=0.1, color=WHITE_TXT)
        h1_lbl = Text("Human", font_size=12, color=GREY_SUB)
        h1_lbl.move_to(LEFT * 3.5 + UP * 2.4)
        h2_dot = Dot(RIGHT * 3.5 + UP * 2, radius=0.1, color=WHITE_TXT)
        h2_lbl = Text("Human", font_size=12, color=GREY_SUB)
        h2_lbl.move_to(RIGHT * 3.5 + UP * 2.4)
        humans = VGroup(h1_dot, h1_lbl, h2_dot, h2_lbl)

        # Solid lines human → agent
        hl1 = Line(h1_dot.get_center(), ag1.get_center(), buff=0.15,
                   color=WHITE_TXT, stroke_width=THIN_SW, stroke_opacity=0.4)
        hl2 = Line(h2_dot.get_center(), ag2.get_center(), buff=0.15,
                   color=WHITE_TXT, stroke_width=THIN_SW, stroke_opacity=0.4)

        eco = VGroup(ag1, ag2, ag3, aa12, aa13, aa23, humans, hl1, hl2)

        # -- animate
        self.play(
            LaggedStart(*[FadeIn(a, shift=UP * 0.1) for a in [ag1, ag2, ag3]],
                        lag_ratio=0.12),
            run_time=0.4,
        )
        self.play(
            Create(aa12), Create(aa13), Create(aa23),
            FadeIn(humans), Create(hl1), Create(hl2),
            run_time=0.6,
        )
        self.wait(1.0)

        self._prev = eco

    # ── Chapter 4 & 5 ────────────────────────────────────────────

    def _chapter_4_security(self):
        self.play(FadeOut(self._prev), run_time=0.3)

        t   = make_title("Security").to_edge(UP, buff=0.5)
        txt = Text("Agent Identity  ·  Agent Gateway  ·  Policies",
                    font_size=20, color=WHITE_TXT)
        act = make_action("Coming soon").move_to(DOWN * 1)

        self.play(
            FadeIn(t, shift=DOWN * 0.2),
            FadeIn(txt, shift=UP * 0.1),
            FadeIn(act, shift=UP * 0.1),
            run_time=0.5,
        )
        self.wait(1.5)

        self._prev = VGroup(t, txt, act)

    def _chapter_5_optimization(self):
        self.play(FadeOut(self._prev), run_time=0.3)

        t   = make_title("Optimization").to_edge(UP, buff=0.5)
        txt = Text("Instrument  ·  Evaluate  ·  Simulate  ·  Improve",
                    font_size=20, color=WHITE_TXT)
        act = make_action("Coming soon").move_to(DOWN * 1)

        self.play(
            FadeIn(t, shift=DOWN * 0.2),
            FadeIn(txt, shift=UP * 0.1),
            FadeIn(act, shift=UP * 0.1),
            run_time=0.5,
        )
        self.wait(1.2)
