#!/bin/bash
# Fetch + normalize 6 new 3Blue1Brown reference excerpts.
export PATH="/opt/homebrew/bin:$HOME/.local/bin:$PATH"
DIR="/Users/alanblount/Workspaces/scratchpad/open-source/flueframework-exploration/guides/video/eval/corpus_ref2"
RAW="$DIR/raw"
mkdir -p "$RAW"

fetch_one() {
  local slug="$1"; shift
  local query="$1"; shift
  local raw="$RAW/${slug}.mp4"
  local out="$DIR/${slug}.mp4"
  if [ ! -s "$raw" ]; then
    yt-dlp -q --no-warnings \
      -f "bestvideo[height<=1080][ext=mp4]/bestvideo[height<=1080]/best" \
      --merge-output-format mp4 \
      --download-sections "*3:00-3:30" --force-keyframes-at-cuts \
      -o "$raw" "ytsearch1:${query}" 2> "$RAW/${slug}.err" || { echo "FAIL-DL $slug"; return 1; }
  fi
  [ -s "$raw" ] || { echo "FAIL-EMPTY $slug"; return 1; }
  ffmpeg -y -loglevel error -i "$raw" \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:black,fps=30,setsar=1" \
    -c:v libx264 -crf 22 -preset medium -pix_fmt yuv420p -an -t 25 "$out" \
    || { echo "FAIL-ENC $slug"; return 1; }
  echo "OK $slug"
}

fetch_one calculus_ch1   "3Blue1Brown Essence of calculus chapter 1" &
fetch_one convolution    "3Blue1Brown But what is a convolution" &
fetch_one bayes          "3Blue1Brown Bayes theorem geometry of changing beliefs" &
fetch_one lintransform   "3Blue1Brown Linear transformations and matrices" &
fetch_one gradient       "3Blue1Brown Gradient descent how neural networks learn" &
fetch_one gpt            "3Blue1Brown But what is a GPT transformers" &
wait
echo "---done---"
