#!/bin/bash

# Script to verify Cat Scratches extension bundle contains required files
# Run this after building the project in Xcode

echo "🔍 Checking Cat Scratches extension bundle..."

# Find the most recent built extension (sort by modification time)
EXTENSION_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "Cat Scratches Extension.appex" -path "*SafariToDrafts*" -not -path "*/Index.noindex/*" 2>/dev/null | while read -r path; do
    echo "$(stat -f %m "$path") $path"
done | sort -nr | head -1 | cut -d' ' -f2-)

if [ -z "$EXTENSION_PATH" ]; then
    echo "❌ Extension bundle not found. Make sure you've built the project in Xcode first."
    echo "💡 Build the project: Xcode → Product → Build (⌘B)"
    exit 1
fi

echo "📦 Found extension at: $EXTENSION_PATH"
echo ""

RESOURCES_PATH="$EXTENSION_PATH/Contents/Resources"

if [ ! -d "$RESOURCES_PATH" ]; then
    echo "❌ Resources directory not found in extension bundle"
    exit 1
fi

echo "📋 Checking required files:"

# Check for required files
FILES_TO_CHECK=(
    "manifest.json"
    "popup.html"
    "popup.js"
    "settings.html"
    "settings.js"
    "background.js"
    "content.js"
    "turndown.js"
)

ALL_PRESENT=true

for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$RESOURCES_PATH/$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (MISSING)"
        ALL_PRESENT=false
    fi
done

echo ""

if [ "$ALL_PRESENT" = true ]; then
    echo "🎉 All required files are present in the extension bundle!"
    echo "💡 The settings page should now work correctly."
    echo ""
    echo "🧪 To test:"
    echo "1. Install/update the extension in Safari"
    echo "2. Click the extension icon in Safari toolbar"
    echo "3. Click the 'Settings' button"
    echo "4. Settings page should open without errors"
else
    echo "⚠️  Some files are missing from the extension bundle."
    echo "💡 Make sure you've updated the Xcode project file and rebuilt."
fi

echo ""
echo "📁 Full contents of Resources directory:"
ls -la "$RESOURCES_PATH"