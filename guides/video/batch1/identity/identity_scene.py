"""Identity ceremony scene — batch1 variation renderer.

All 4 tone variations use this same scene. Beat duration comes from
the measured narration manifest (audio-first), so pacing tracks the
real TTS output, not a predicted WPM.

Usage:
    export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
    MANIM=~/Workspaces/open-source/OpenMontage/.venv/bin/manim
    NARR=narration/direct/narration.json

    NARRATION=$NARR TEXT=anchor $MANIM -qh --fps 60 identity_scene.py IdentityScene

Then mux:
    ffmpeg -i media/videos/identity_scene/1080p60/IdentityScene.mp4 \
           -i narration/direct/narration.wav \
           -c:v copy -c:a aac -b:a 128k -shortest renders/direct.mp4
"""

from __future__ import annotations

import json
import os

from manim import (
    DOWN,
    LEFT,
    RIGHT,
    UP,
    Circle,
    Create,
    DashedVMobject,
    FadeIn,
    FadeOut,
    Flash,
    Group,
    MovingCameraScene,
    RegularPolygon,
    Text,
    Transform,
    VGroup,
    config,
    smooth,
)

NARRATION_PATH = os.environ.get("NARRATION", "")
TEXT_MODE = os.environ.get("TEXT", "anchor")  # none | anchor | caption

# Style — visual-style.md
BG = "#0E0E10"
FG = "#FFFFFF"
DIM = "#BBBBBB"
BLUE = "#58C4DD"
GOLD = "#F0AC5F"
GREEN = "#34A853"   # RESERVED: confirmed/issued only
FONT = "Roboto"

config.background_color = BG

# Load measured beat durations. Falls back to a 3.5s default per beat
# (reference median) if no manifest is supplied, but this should always
# be run audio-first.
MEASURED: dict[str, float] = {}
BREATH = 0.35
_script: dict = {}

if NARRATION_PATH:
    with open(NARRATION_PATH) as f:
        _script = json.load(f)
    MEASURED = {b["id"]: b["audio_s"] for b in _script.get("beats", [])}
    BREATH = _script.get("breath_s", BREATH)

# The narration lines drive text anchors (beat id -> anchor word/phrase)
ANCHORS = {
    "start":  "Agent starts",
    "issuer": "Workload CA",
    "issue":  "Identity issued",
    "carry":  "Every call attested",
    "closer": "Process identity",
}
CAPTIONS = {b["id"]: b["line"] for b in _script.get("beats", [])} if _script else {}


def say(beat_id: str) -> float:
    return MEASURED.get(beat_id, 3.5) + BREATH


def node(label: str, color: str) -> VGroup:
    c = Circle(radius=0.36, stroke_color=color, stroke_width=2.5,
               fill_color=color, fill_opacity=0.12)
    t = Text(label, font=FONT, font_size=16, color=color)
    t.next_to(c, DOWN, buff=0.18)
    return VGroup(c, t)


class IdentityScene(MovingCameraScene):
    def construct(self):
        self.camera.background_color = BG

        # Beat 1: agent appears
        budget = say("start")
        agent = node("ADK Agent", BLUE).move_to(LEFT * 4.0 + UP * 0.3)
        anim = min(1.8, budget * 0.45)
        self.play(FadeIn(agent, run_time=anim))
        self.show_text("start", budget - anim)

        # Camera draws viewer into the space between agent and issuer
        self.play(self.camera.frame.animate.scale(0.9)
                  .move_to([-1.0, 0.3, 0]), run_time=min(1.5, say("issuer") * 0.35),
                  rate_func=smooth)

        # Beat 2: the certificate authority appears
        budget = say("issuer")
        issuer = RegularPolygon(
            n=6, radius=1.1, stroke_color=GOLD, stroke_width=2.5,
            fill_color=GOLD, fill_opacity=0.05,
        ).move_to(RIGHT * 3.6 + UP * 0.3)
        anim = min(2.0, budget * 0.45)
        self.play(Create(issuer, run_time=anim))
        self.show_text("issuer", budget - anim)

        # Beat 3: issuance ceremony
        budget = say("issue")
        move_t = min(2.0, budget * 0.28)
        self.play(agent.animate.move_to(RIGHT * 1.4 + UP * 0.3),
                  run_time=move_t, rate_func=smooth)
        flash_t = min(1.0, budget * 0.15)
        self.play(Flash(issuer.get_center(), color=GREEN, flash_radius=0.9,
                        num_lines=10, run_time=flash_t))
        badge = Circle(radius=0.32, stroke_color=GREEN, stroke_width=2.5,
                       fill_color=GREEN, fill_opacity=0.18)
        badge.move_to(issuer.get_center())
        morph_t = min(1.6, budget * 0.22)
        self.play(Transform(issuer, badge, run_time=morph_t, rate_func=smooth))
        used = move_t + flash_t + morph_t
        self.show_text("issue", budget - used)

        # Beat 4: agent carries identity home; camera eases back
        budget = say("carry")
        home = LEFT * 4.0 + UP * 0.3
        anim = min(2.2, budget * 0.45)
        self.play(
            agent.animate.move_to(home),
            issuer.animate.scale(0.52).move_to(home + RIGHT * 0.62 + UP * 0.5),
            self.camera.frame.animate.scale(1 / 0.9).move_to([0, 0, 0]),
            run_time=anim, rate_func=smooth,
        )
        self.show_text("carry", budget - anim)

        # Beat 5: closing statement
        budget = say("closer")
        fade_t = min(1.2, budget * 0.35)
        self.show_text("closer", budget, fade_in=fade_t)

        self.play(FadeOut(Group(*self.mobjects), run_time=1.0))

    def show_text(self, beat_id: str, hold: float, fade_in: float = 0.6) -> None:
        hold = max(0.25, hold)
        if TEXT_MODE == "none":
            self.wait(hold)
            return
        s = ANCHORS.get(beat_id, "") if TEXT_MODE == "anchor" \
            else CAPTIONS.get(beat_id, "")
        if not s:
            self.wait(hold)
            return
        size = 22 if TEXT_MODE == "anchor" else 17
        t = Text(s, font=FONT, font_size=size, color=DIM)
        if t.width > config.frame_width - 1.8:
            t.scale_to_fit_width(config.frame_width - 1.8)
        t.move_to(DOWN * 2.0)
        fade_t = min(fade_in, hold * 0.35)
        self.play(FadeIn(t, run_time=fade_t))
        self.wait(max(0.1, hold - 2 * fade_t))
        self.play(FadeOut(t, run_time=fade_t))
