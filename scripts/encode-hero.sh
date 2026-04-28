#!/bin/bash
set -e

# Hero Video Encoder for Diwan Berlin
# Re-encodes hero videos to H.264 Baseline for maximum iOS/Android autoplay compatibility
# Also creates a 1-second WebM loop poster

cd "$(dirname "$0")/../uploads"

echo "=== Diwan Berlin Hero Video Encoder ==="
echo ""

# Backup originals
if [ -f hero-optimized.mp4 ] && [ ! -f hero-optimized.original.mp4 ]; then
    cp hero-optimized.mp4 hero-optimized.original.mp4
    echo "Backed up hero-optimized.mp4 → hero-optimized.original.mp4"
fi

if [ -f hero-mobile.mp4 ] && [ ! -f hero-mobile.original.mp4 ]; then
    cp hero-mobile.mp4 hero-mobile.original.mp4
    echo "Backed up hero-mobile.mp4 → hero-mobile.original.mp4"
fi

echo ""
echo "=== Re-encoding hero-optimized.mp4 (Desktop) ==="
ffmpeg -y -i hero-optimized.original.mp4 \
    -movflags +faststart \
    -pix_fmt yuv420p \
    -profile:v baseline \
    -level 3.1 \
    -an \
    -c:v libx264 \
    -crf 23 \
    -preset fast \
    hero-optimized.mp4

echo ""
echo "=== Re-encoding hero-mobile.mp4 (Mobile) ==="
ffmpeg -y -i hero-mobile.original.mp4 \
    -movflags +faststart \
    -pix_fmt yuv420p \
    -profile:v baseline \
    -level 3.1 \
    -an \
    -c:v libx264 \
    -crf 23 \
    -preset fast \
    hero-mobile.mp4

echo ""
echo "=== Creating hero-loop.webm (1s VP9) ==="
ffmpeg -y -i hero-mobile.original.mp4 \
    -t 1 \
    -c:v libvpx-vp9 \
    -crf 30 \
    -b:v 0 \
    -an \
    hero-loop.webm

echo ""
echo "=== File Sizes ==="
ls -lh hero-optimized.mp4 hero-mobile.mp4 hero-loop.webm

echo ""
echo "Done!"