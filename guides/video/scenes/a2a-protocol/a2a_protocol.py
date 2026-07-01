"""Video 4: A2A Protocol Explainer.

3Blue1Brown-style explainer of the A2A protocol: isolated agents ->
Agent Cards (discovery) -> message:send (communication) -> task
lifecycle -> multi-framework ecosystem -> call to action.

Style guide: guides/video/plans.md (palette, text hierarchy, arrows, nodes).
Storyboard:  guides/video/scenes/a2a-protocol/STORYBOARD.md

Render:
    manim -ql --format=mp4 a2a_protocol.py A2AProtocolExplainer   # iterate
    manim -qm --format=mp4 a2a_protocol.py A2AProtocolExplainer   # review
    manim -qh --format=mp4 a2a_protocol.py A2AProtocolExplainer   # production
"""

from manim import (
    BOLD,
    DOWN,
    ITALIC,
    LEFT,
    RIGHT,
    UP,
    Arrow,
    Circle,
    Create,
    DashedLine,
    DashedVMobject,
    FadeIn,
    FadeOut,
    Flash,
    LaggedStart,
    Line,
    MoveAlongPath,
    RoundedRectangle,
    Scene,
    Text,
    Transform,
    VGroup,
    Write,
)

# ---------------------------------------------------------------------------
# Style guide constants (guides/video/plans.md)
# ---------------------------------------------------------------------------
BG_COLOR = "#1C1C1C"
BLUE_ACC = "#58C4DD"
GREEN_ACC = "#83C167"
ORANGE_ACC = "#FF8C00"
YELLOW_ACC = "#FFFF00"
WHITE_TXT = "#FFFFFF"
GREY_SUB = "#AAAAAA"
PURPLE_ACC = "#9B59B6"
TEAL_ACC = "#4DB6AC"  # extra framework color (Mastra)

THIN, MEDIUM, THICK = 1.5, 2.5, 3.5


def make_node(label: str, color: str, width: float = 2.2, height: float = 0.65) -> VGroup:
    """Style-guide node: rounded rect + bold label in node color."""
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
    return Text(s, font_size=22, color=WHITE_TXT)


def action_text(s: str) -> Text:
    return Text(s, font_size=18, slant=ITALIC, color=GREY_SUB)


class A2AProtocolExplainer(Scene):
    def construct(self):
        self.camera.background_color = BG_COLOR

        # ------------------------------------------------------------------
        # Chapter 1: The Problem — Isolated Agents (~6s)
        # ------------------------------------------------------------------
        adk = make_node("ADK Agent", BLUE_ACC).move_to(LEFT * 4.2 + UP * 0.6)
        crew = make_node("CrewAI Agent", ORANGE_ACC).move_to(UP * 1.4)
        flue = make_node("Flue Agent", GREEN_ACC).move_to(RIGHT * 4.2 + UP * 0.6)

        silos = VGroup(*[
            DashedVMobject(
                Circle(radius=1.5, color=GREY_SUB, stroke_width=THIN),
                num_dashes=24,
            ).move_to(n.get_center())
            for n in (adk, crew, flue)
        ])

        t1 = title_text("Agents are islands").to_edge(UP, buff=0.4)
        a1 = action_text("each framework speaks its own dialect").next_to(t1, DOWN, buff=0.2)

        self.play(Write(t1), run_time=0.8)
        self.play(
            LaggedStart(FadeIn(adk), FadeIn(crew), FadeIn(flue), lag_ratio=0.25),
            run_time=1.2,
        )
        self.play(Create(silos), FadeIn(a1), run_time=1.2)
        self.play(
            silos.animate.set_stroke(opacity=0.35).scale(1.05),
            run_time=0.8,
        )
        self.wait(0.6)

        # ------------------------------------------------------------------
        # Chapter 2: Agent Cards — Discovery (~7s)
        # ------------------------------------------------------------------
        t2 = title_text("Agent Cards", YELLOW_ACC).to_edge(UP, buff=0.4)
        d2 = descriptor_text("a public JSON card: who I am, what I can do").next_to(
            t2, DOWN, buff=0.2
        )

        card_rect = RoundedRectangle(
            corner_radius=0.12, width=3.4, height=1.7,
            color=WHITE_TXT, stroke_width=2, fill_color=BG_COLOR, fill_opacity=0.9,
        )
        card_path = Text(
            "/.well-known/agent-card.json", font_size=16, color=YELLOW_ACC, weight=BOLD
        )
        card_rows = VGroup(
            Text('"name":  "flue-agent"', font_size=15, color=WHITE_TXT),
            Text('"skills": [...]', font_size=15, color=WHITE_TXT),
            Text('"url":   "https://..."', font_size=15, color=WHITE_TXT),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.12)
        card_path.move_to(card_rect.get_top() + DOWN * 0.3)
        card_rows.move_to(card_rect.get_center() + DOWN * 0.18)
        card = VGroup(card_rect, card_path, card_rows)
        card.next_to(flue, DOWN, buff=0.5).shift(LEFT * 1.2)

        self.play(
            FadeOut(silos), FadeOut(a1),
            Transform(t1, t2),
            run_time=0.8,
        )
        self.play(FadeIn(d2), FadeIn(card, shift=UP * 0.3), run_time=1.2)

        # Discovery: dashed association line from ADK toward the card
        discover = DashedLine(
            adk.get_bottom() + DOWN * 0.05,
            card.get_left() + LEFT * 0.05,
            color=YELLOW_ACC, stroke_width=THIN,
        )
        a2 = action_text("any agent can look it up").next_to(card, DOWN, buff=0.25)
        self.play(Create(discover), FadeIn(a2), run_time=1.0)
        self.play(
            Flash(card_rect, color=YELLOW_ACC, flash_radius=2.0, line_length=0.3),
            run_time=0.8,
        )
        self.wait(0.8)

        # ------------------------------------------------------------------
        # Chapter 3: message:send — Communication (~8s)
        # ------------------------------------------------------------------
        t3 = title_text("message:send", YELLOW_ACC).to_edge(UP, buff=0.4)
        d3 = descriptor_text("one HTTP call — JSON in, task out").next_to(t3, DOWN, buff=0.2)

        self.play(
            FadeOut(card), FadeOut(discover), FadeOut(a2), FadeOut(d2),
            Transform(t1, t3),
            FadeOut(crew),
            adk.animate.move_to(LEFT * 4.2 + UP * 0.8),
            flue.animate.move_to(RIGHT * 4.2 + UP * 0.8),
            run_time=1.0,
        )
        self.play(FadeIn(d3), run_time=0.5)

        send_arrow = Arrow(
            adk.get_right(), flue.get_left(),
            color=YELLOW_ACC, stroke_width=THICK, buff=0.15,
        )
        send_label = Text("message:send", font_size=20, color=YELLOW_ACC, weight=BOLD)
        send_label.next_to(send_arrow, UP, buff=0.15)

        chip = RoundedRectangle(
            corner_radius=0.08, width=0.55, height=0.3,
            color=YELLOW_ACC, fill_color=YELLOW_ACC, fill_opacity=0.5, stroke_width=1.5,
        ).move_to(send_arrow.get_start())

        self.play(Create(send_arrow), Write(send_label), run_time=0.9)
        self.play(
            MoveAlongPath(chip, Line(send_arrow.get_start(), send_arrow.get_end())),
            run_time=1.0,
        )
        self.play(FadeOut(chip), run_time=0.3)

        # Task lifecycle strip (below the arrow)
        st_submitted = make_node("submitted", GREY_SUB, width=1.8, height=0.55)
        st_working = make_node("working", BLUE_ACC, width=1.8, height=0.55)
        st_completed = make_node("completed", GREEN_ACC, width=1.8, height=0.55)
        lifecycle = VGroup(st_submitted, st_working, st_completed).arrange(
            RIGHT, buff=1.0
        ).move_to(DOWN * 1.1)

        lc_arrows = VGroup(
            Arrow(st_submitted.get_right(), st_working.get_left(),
                  color=WHITE_TXT, stroke_width=MEDIUM, buff=0.08),
            Arrow(st_working.get_right(), st_completed.get_left(),
                  color=WHITE_TXT, stroke_width=MEDIUM, buff=0.08),
        )

        branch = VGroup(
            Text("failed / canceled", font_size=16, color=GREY_SUB),
        ).move_to(DOWN * 2.15)
        branch_arrow = Arrow(
            st_working.get_bottom(), branch.get_top(),
            color=GREY_SUB, stroke_width=THIN, buff=0.1,
        )

        self.play(
            LaggedStart(
                FadeIn(st_submitted), Create(lc_arrows[0]),
                FadeIn(st_working), Create(lc_arrows[1]),
                FadeIn(st_completed),
                lag_ratio=0.3,
            ),
            run_time=1.6,
        )
        self.play(FadeIn(branch), Create(branch_arrow), run_time=0.6)

        # Light the states in order
        for node, color in ((st_submitted, GREY_SUB), (st_working, BLUE_ACC),
                            (st_completed, GREEN_ACC)):
            self.play(node[0].animate.set_fill(color, opacity=0.45), run_time=0.35)
        self.wait(0.7)

        # ------------------------------------------------------------------
        # Chapter 4: The Ecosystem — Interop (~7s)
        # ------------------------------------------------------------------
        t4 = title_text("Any agent  <->  any agent").to_edge(UP, buff=0.4)
        a4 = action_text("frameworks stop mattering at the boundary").next_to(
            t4, DOWN, buff=0.2
        )

        self.play(
            FadeOut(lifecycle), FadeOut(lc_arrows), FadeOut(branch),
            FadeOut(branch_arrow), FadeOut(send_arrow), FadeOut(send_label),
            FadeOut(d3),
            Transform(t1, t4),
            run_time=0.9,
        )

        # Pentagon mesh of five framework agents
        crew2 = make_node("CrewAI", ORANGE_ACC, width=1.7)
        agno = make_node("Agno", PURPLE_ACC, width=1.7)
        mastra = make_node("Mastra", TEAL_ACC, width=1.7)
        positions = [
            UP * 1.9,                       # CrewAI top
            LEFT * 4.2 + UP * 0.3,          # ADK left
            RIGHT * 4.2 + UP * 0.3,         # Flue right
            LEFT * 2.5 + DOWN * 1.9,        # Agno bottom-left
            RIGHT * 2.5 + DOWN * 1.9,       # Mastra bottom-right
        ]
        self.play(
            crew2.animate.move_to(positions[0]),
            adk.animate.move_to(positions[1]),
            flue.animate.move_to(positions[2]),
            FadeIn(agno.move_to(positions[3])),
            FadeIn(mastra.move_to(positions[4])),
            FadeIn(a4),
            run_time=1.2,
        )

        nodes = [crew2, adk, flue, agno, mastra]

        def edge_line(a: VGroup, b: VGroup) -> Line:
            """Line clipped to node rectangle boundaries so it never crosses labels."""
            start, end = a.get_center(), b.get_center()
            direction = end - start
            line = Line(start, end, color=YELLOW_ACC,
                        stroke_width=MEDIUM, stroke_opacity=0.55)
            # Trim each end where it meets the node's bounding box edge.
            line.put_start_and_end_on(
                a[0].get_boundary_point(direction) + 0.06 * direction / max(abs(direction).max(), 1e-6),
                b[0].get_boundary_point(-direction) - 0.06 * direction / max(abs(direction).max(), 1e-6),
            )
            return line

        mesh = VGroup(*[
            edge_line(nodes[i], nodes[j])
            for i in range(len(nodes)) for j in range(i + 1, len(nodes))
        ])
        mesh.set_z_index(-1)
        self.play(Create(mesh), run_time=1.6)
        self.play(mesh.animate.set_stroke(opacity=0.9), run_time=0.5)
        self.play(mesh.animate.set_stroke(opacity=0.55), run_time=0.5)
        self.wait(0.5)

        # ------------------------------------------------------------------
        # Chapter 5: Call to Action (~4s)
        # ------------------------------------------------------------------
        badge_ring = Circle(radius=1.05, color=YELLOW_ACC, stroke_width=THICK)
        badge_txt = Text("A2A", font_size=48, color=YELLOW_ACC, weight=BOLD)
        badge = VGroup(badge_ring, badge_txt).move_to(UP * 0.4)

        cta1 = descriptor_text("a2a-protocol.org").next_to(badge, DOWN, buff=0.4)
        cta2 = action_text("add A2A to your framework — A2A Integration Factory").next_to(
            cta1, DOWN, buff=0.2
        )

        everything = VGroup(*nodes, mesh, a4)
        self.play(FadeOut(everything), FadeOut(t1), run_time=0.7)
        self.play(Create(badge_ring), Write(badge_txt), run_time=1.0)
        self.play(FadeIn(cta1), FadeIn(cta2), run_time=0.8)
        self.wait(1.2)
        self.play(FadeOut(badge), FadeOut(cta1), FadeOut(cta2), run_time=0.8)
