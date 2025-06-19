#!/bin/bash

# Create a temporary SVG with black stroke instead of currentColor
sed 's/stroke="currentColor"/stroke="black"/' "SafariToDrafts/Shared (Extension)/Resources/images/icon.svg" > temp_icon.svg

# Convert to various sizes
for size in 48 96 128 256 512; do
    inkscape -w $size -h $size temp_icon.svg -o "SafariToDrafts/Shared (Extension)/Resources/images/icon-${size}.png"
done

# Clean up
rm temp_icon.svg 