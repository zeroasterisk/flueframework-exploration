"""Pilot 1: Workload Identity Ceremony — calibrating visual-style.md.

First pilot scene rebuilt against ../visual-style.md (3Blue1Brown x Google
hybrid). Deliberately small and self-contained. Compare directly against the
equivalent beat in scenes/security/security_deep_dive.py's scene4_identity
(the light-background, card-style, fast-cut version) to judge the pivot.

What this pilot is testing:
  - Dark near-black canvas instead of light "software dashboard" background
  - Thin, low-fill-opacity shapes instead of opaque rounded-rectangle cards
  - Roboto font (Helvetica Neue confirmed buggy — see storytelling-cheatsheet.md)
  - Slow, patient pacing (run_time 1.5-3s, wait 2-4s) instead of 0.3-0.8s cuts
  - Camera push-in (MovingCameraScene) instead of a hard cut
  - Minimal text: exactly ONE line, appearing only after the visual resolves
  - Reserved color: Google Green used ONLY for the issuance moment itself

Render:
    export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
    manim -ql pilot_01_identity_ceremony.py IdentityCeremony
    manim -qh --fps 60 pilot_01_identity_ceremony.py IdentityCeremony
"""

from __future__ import annotations

from manim import (
    DOWN,
    Circle,
    Create,
    DashedVMobject,
    FadeIn,
    FadeOut,
    Flash,
    MovingCameraScene,
    RegularPolygon,
    Text,
    VGroup,
    smooth,
)

# ---------------------------------------------------------------------------
# Palette — from ../visual-style.md
# ---------------------------------------------------------------------------
BG = "#0E0E10"
WHITE = "#FFFFFF"
LIGHT_GREY = "#BBBBBB"
BLUE_3B1B = "#58C4DD"     # default explanatory accent
GOLD_3B1B = "#F0AC5F"     # secondary emphasis — the issuer is a special detail
GOOGLE_GREEN = "#34A853"  # RESERVED — confirmed / issued state, this moment only

FONT = "Roboto"


def make_node(label: str, color: str, radius: float = 0.32) -> VGroup:
    """A minimal entity: a thin circle + a small label below it.

    Deliberately NOT a filled rounded-rectangle "card" — per visual-style.md,
    avoid anything that reads as a software UI component.
    """
    circle = Circle(radius=radius, stroke_color=color, stroke_width=2.5,
                    fill_color=color, fill_opacity=0.12)
    label_text = Text(label, font=FONT, font_size=16, color=color)
    label_text.next_to(circle, DOWN, buff=0.18)
    return VGroup(circle, label_text)


class IdentityCeremony(MovingCameraScene):
    def construct(self):
        self.camera.background_color = BG

        # --- Beat 1: the agent exists, alone, in a mostly empty frame. ------
        agent = make_node("ADK", BLUE_3B1B).move_to([-4.2, 0.4, 0])
        self.play(FadeIn(agent, run_time=2.0))
        self.wait(2.5)

        # --- Beat 2: the issuer appears, far away — a hexagon, thin and ----
        # unfilled, gold (a special detail, distinct from generic agents).
        issuer = RegularPolygon(
            n=6, radius=1.05,
            stroke_color=GOLD_3B1B, stroke_width=2.5,
            fill_color=GOLD_3B1B, fill_opacity=0.05,
        ).move_to([4.0, 0.2, 0])
        self.play(Create(issuer, run_time=2.2))
        self.wait(2.0)

        # --- Beat 3: a slow camera push-in toward the space between them, --
        # instead of a hard cut — invites the viewer closer as the ceremony
        # is about to happen.
        midpoint = [(agent.get_center()[0] + issuer.get_center()[0]) / 2,
                    0.3, 0]
        self.play(
            self.camera.frame.animate.scale(0.88).move_to(midpoint),
            run_time=2.5, rate_func=smooth,
        )
        self.wait(1.0)

        # --- Beat 4: the agent travels to the issuer. Slow, deliberate. ----
        approach_point = [issuer.get_center()[0] - 1.7, issuer.get_center()[1], 0]
        self.play(agent.animate.move_to(approach_point), run_time=3.0,
                  rate_func=smooth)
        self.wait(1.2)

        # --- Beat 5: THE moment — identity is issued. This is the one -----
        # place Google's reserved green appears: a confirmed/issued state.
        self.play(Flash(issuer.get_center(), color=GOOGLE_GREEN,
                        flash_radius=0.9, num_lines=10, run_time=1.4))

        badge = VGroup(
            DashedVMobject(Circle(radius=0.5, stroke_color=GOOGLE_GREEN,
                                  stroke_width=1.3), num_dashes=18),
            RegularPolygon(n=6, radius=0.32, stroke_color=GOOGLE_GREEN,
                          stroke_width=2.2, fill_color=GOOGLE_GREEN,
                          fill_opacity=0.16),
        )
        badge.move_to(issuer.get_center())
        self.play(FadeIn(badge, scale=0.4, run_time=1.5))
        self.wait(1.8)

        # --- Beat 6: the agent carries its identity home. Slow return; ----
        # camera eases back out to the full composition.
        home = [-4.2, 0.4, 0]
        self.play(
            agent.animate.move_to(home),
            badge.animate.scale(0.55).move_to(
                [home[0] + 0.55, home[1] + 0.45, 0]),
            self.camera.frame.animate.scale(1 / 0.88).move_to([0, 0, 0]),
            run_time=3.0, rate_func=smooth,
        )
        self.wait(2.5)

        # --- Beat 7: exactly one line of text, only after the visual has ---
        # fully resolved. No earlier captions, no simultaneous text.
        caption = Text("Identity, issued once, at the agent's first breath.",
                      font=FONT, font_size=24, color=WHITE)
        caption.move_to([0, -2.6, 0])
        self.play(FadeIn(caption, run_time=2.0))
        self.wait(3.5)

        self.play(FadeOut(VGroup(agent, issuer, badge, caption), run_time=2.0))
        self.wait(1.0)
