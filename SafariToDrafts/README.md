# SafariToDrafts Extension

The fastest and most elegant way to capture web content and send it directly to the Drafts app. Perfect for researchers, writers, students, and anyone who wants to quickly save web content for later processing.

## Features

### ⚡ Lightning-Fast Capture
- **Keyboard Shortcut**: Press `⌘⇧D` to instantly capture content
- **Toolbar Button**: Click the extension icon for quick access
- **Smart Selection**: Automatically detects selected text or captures full page content
- **Intelligent Filtering**: Removes ads, navigation, comments, and promotional content
- **Clean Output**: Simple format with just the URL and content - no distractions

### 📝 Simple Draft Format
Every captured draft follows this clean format:

```
# Page Title

[https://example.com/article-url](https://example.com/article-url)

Your captured content here, perfectly formatted in Markdown...
```

- **Title Header**: Page title as an H1 markdown header
- **Clickable URL**: Source URL as a markdown link for easy access
- **Clean Content**: Just the content you need, perfectly formatted

## Installation

1. **Build the Extension**:
   - Open `SafariToDrafts.xcodeproj` in Xcode
   - Build and run the project
   - The extension will be installed automatically

2. **Enable in Safari**:
   - Open Safari Preferences → Extensions
   - Find "SafariToDrafts" and enable it
   - Grant necessary permissions when prompted

3. **Install Drafts App**:
   - Download [Drafts](https://getdrafts.com) from the App Store
   - The extension uses Drafts' URL scheme to create new drafts

## Usage

### Quick Capture
1. **Keyboard Shortcut** (fastest): Press `⌘⇧D` on any webpage
2. **Toolbar Button**: Click the SafariToDrafts icon in Safari's toolbar
3. **Selected Text**: Highlight text first, then use either method above

The extension will automatically:
- Detect if you have text selected (captures only that)
- If no selection, intelligently extracts the main article content
- Creates a clean Markdown draft in the Drafts app

## Content Intelligence

The extension uses advanced content detection to provide clean, readable drafts:

### Smart Content Detection
- Prioritizes semantic HTML elements (`<article>`, `<main>`, `[role="main"]`)
- Uses 40+ content selector patterns for news sites, blogs, and documentation
- Intelligent scoring based on text length, paragraph count, and link density
- Smart fallback analysis when no clear content structure exists

### Aggressive Filtering
Removes unwanted elements using 60+ patterns:
- **Navigation**: nav, header, footer, sidebar elements
- **Advertisements**: ad networks, banner content, promotional elements
- **Social Widgets**: share buttons, follow prompts, newsletter signups
- **Related Content**: "you might also like," trending articles, recommendations
- **User-Generated Content**: comments, reviews, ratings sections
- **Metadata**: JSON-LD, schema.org markup, article metadata

## Pro Tips

### 🎯 Maximizing Content Quality
- **Select Important Text**: Highlight the specific content you want before capturing
- **Use on Article Pages**: Works best on blog posts, news articles, and documentation
- **Perfect for Research**: Quick capture, then organize and process in Drafts later

### ⚙️ Workflow Integration
- **Drafts Tags**: Add tags in Drafts after capture for better organization
- **Action Sequences**: Use Drafts actions to further process captured content
- **Batch Processing**: Capture multiple articles quickly, then process later in Drafts

### 🔧 Troubleshooting
- **Drafts Not Opening**: Ensure Drafts app is installed and updated
- **Missing Content**: Try selecting specific text before capturing
- **Keyboard Shortcut Conflicts**: Shortcut is `⌘⇧D` - if it conflicts, use the toolbar button

## Technical Details

### Architecture
- **Safari Web Extension**: Uses modern manifest v3 API
- **Content Scripts**: Intelligent content extraction with Turndown.js
- **Background Script**: Handles keyboard shortcuts and Draft creation
- **Simple & Fast**: No settings to configure, just pure capture functionality

### Permissions
- **Active Tab**: Read content from the current webpage
- **Scripting**: Execute content extraction scripts
- **Context Menus**: Basic extension functionality

### Privacy
- **Local Processing**: All content analysis happens locally
- **No Data Collection**: Extension doesn't send data to external servers
- **Minimal Permissions**: Only requests necessary capabilities

## Development

### Project Structure
```
SafariToDrafts/
├── Shared (Extension)/
│   └── Resources/
│       ├── manifest.json          # Extension configuration
│       ├── background.js          # Main extension logic
│       ├── content.js             # Content extraction
│       ├── popup.html/.js         # Extension popup
│       └── turndown.js           # HTML to Markdown conversion
├── macOS (App)/                   # macOS app wrapper
├── iOS (App)/                     # iOS app wrapper
└── Shared (App)/                  # Shared app resources
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Test thoroughly in Safari
4. Submit a pull request

## Support

### Common Issues
- **Extension not visible**: Check Safari Extensions preferences
- **Keyboard shortcut not working**: Verify no conflicts with other apps
- **Content quality issues**: Try selecting specific text or report problematic sites

### Feedback
- Report bugs or request features through GitHub issues
- Share workflow tips and use cases in discussions

## License

This project is open source. See LICENSE file for details.

---

**Made with ❤️ for the Safari and Drafts community** 