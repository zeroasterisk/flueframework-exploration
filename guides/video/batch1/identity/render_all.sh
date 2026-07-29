#!/usr/bin/env zsh
# Render all 4 identity tone variations, check each, mux with audio.
# Run from this directory (batch1/identity/).
set -e
export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"

MANIM=~/Workspaces/open-source/OpenMontage/.venv/bin/manim
PYTHON=~/Workspaces/open-source/OpenMontage/.venv/bin/python
CHECKER=~/Workspaces/skills/manim-video-quality/scripts/check_quality.py
SCENE=identity_scene.py
SCENE_CLASS=IdentityScene

mkdir -p renders

echo "\n=== Batch 1: Identity — 4 tone variations ==="
PASS=0; FAIL=0

for tone in direct explanatory rhetorical contrast; do
  echo "\n--- $tone ---"
  NARR=narration/$tone/narration.json
  AUDIO=narration/$tone/narration.wav

  if [[ ! -f $NARR ]]; then
    echo "  SKIP: narration not ready yet ($NARR missing)"
    continue
  fi

  # 1. SRC check (fast, no render needed)
  echo "  [SRC check]"
  $PYTHON $CHECKER --scene $SCENE --json > /tmp/src_check.json 2>/dev/null
  blocks=$(python3 -c "import json,sys;d=json.load(open('/tmp/src_check.json'));print(int(d['metrics'].get('blocks',0)))")
  echo "  blocks=$blocks warns=$(python3 -c "import json;d=json.load(open('/tmp/src_check.json'));print(int(d['metrics'].get('warns',0)))")"
  if (( blocks > 0 )); then
    echo "  BLOCK: SRC check failed — fix before rendering"
    $PYTHON $CHECKER --scene $SCENE 2>/dev/null | grep "BLOCK"
    FAIL=$((FAIL+1))
    continue
  fi

  # 2. Render
  echo "  [Render -qh 60fps]"
  NARRATION=$NARR TEXT=anchor $MANIM -qh --fps 60 $SCENE $SCENE_CLASS > /tmp/manim_$tone.log 2>&1
  MP4=$(find media/videos/identity_scene/1080p60 -name "*.mp4" | head -1)
  if [[ -z $MP4 ]]; then
    echo "  FAIL: no mp4 produced — see /tmp/manim_$tone.log"
    FAIL=$((FAIL+1))
    continue
  fi

  # 3. FRAME check
  echo "  [FRAME check]"
  $PYTHON $CHECKER --video $MP4 --json > /tmp/frame_check.json 2>/dev/null
  f_blocks=$(python3 -c "import json;d=json.load(open('/tmp/frame_check.json'));print(int(d['metrics'].get('blocks',0)))")
  ink=$(python3 -c "import json;d=json.load(open('/tmp/frame_check.json'));print(d['metrics'].get('ink_coverage_median','?'))")
  hues=$(python3 -c "import json;d=json.load(open('/tmp/frame_check.json'));print(d['metrics'].get('hues_per_frame_median','?'))")
  echo "  frame blocks=$f_blocks ink=$ink hues=$hues"

  # 4. Mux with narration
  echo "  [Mux]"
  OUTFILE=renders/${tone}.mp4
  ffmpeg -y -i $MP4 -i $AUDIO -c:v copy -c:a aac -b:a 128k -shortest $OUTFILE 2>/dev/null
  dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 $OUTFILE)
  echo "  -> $OUTFILE  ${dur}s"

  # 5. Save reward for ranking
  python3 -c "
import json
src=json.load(open('/tmp/src_check.json'))
frm=json.load(open('/tmp/frame_check.json'))
out={'tone':'$tone','src':src['metrics'],'frame':frm['metrics'],'reward':min(src['reward'],frm['reward'])}
json.dump(out,open('renders/${tone}_check.json','w'),indent=2)
print('  reward='+str(out['reward']))
"
  PASS=$((PASS+1))
done

echo "\n=== Done: $PASS rendered, $FAIL failed ==="
echo "\nReady for judge UI:"
echo "  python3 ~/Workspaces/skills/manim-video-quality/scripts/judge_ui.py \\"
echo "    --corpus renders --max 6 --port 8765"
