# SafariToDrafts

The fastest and most elegant way to capture content from the web and send it directly to the Drafts app, perfectly formatted and ready for action.

**Author:** David Degner
**Website:** https://www.daviddegner.com
**Source Code, bugs, and feature requests:** https://github.com/ddegner/SafariToDrafts

## 🚀 Features

### Intelligent, Context-Aware Capture
- **Smart Selection**: Highlight any text on a page and capture only your selection
- **Full-Page Capture**: When nothing is selected, automatically captures the main content
- **Clean Content Detection**: Automatically finds article content, avoiding navigation and ads
- **Customizable Content Selection**: Configure the CSS selectors used to find content on pages

### Keyboard-First Workflow
- **One-Key Operation**: Press `⌘⇧D` (or your custom shortcut) to instantly capture and send to Drafts
- **Speed of Thought**: No menus, no clicks, just pure efficiency
- **Flow State Friendly**: Stays out of your way while you research and browse
- **Customizable Shortcuts**: Set your preferred keyboard shortcut combination

### Perfect Formatting
- **Automatic HTML-to-Markdown**: Clean, readable conversion that preserves structure
- **Smart Headers**: Web headings become proper Markdown headers
- **Preserved Links**: All links maintained in `[text](url)` format
- **Source Attribution**: Every draft includes the original URL for reference
- **Customizable Output**: Configure how drafts are formatted with custom templates

### Clean Output Structure
Every captured draft follows this elegant format:

```markdown
# Page Title

**Source:** [Original URL](https://example.com)

---

Your captured content here, perfectly formatted in Markdown...
```

## 🛠 Setup

1. **Install the Extension**: Build and install the Safari extension from Xcode
2. **Enable in Safari**: Go to Safari → Settings → Extensions → Enable SafariToDrafts
3. **Customize Shortcut** (Optional): Change the keyboard shortcut in Safari → Settings → Extensions → SafariToDrafts
4. **Configure Settings** (Optional): Click the SafariToDrafts toolbar icon and select "⚙️ Settings" to customize content selection, filtering, and output format
5. **Install Drafts**: Make sure you have [Drafts](https://getdrafts.com) installed on your Mac

## ⚡ Usage

### The 2-Second Workflow

1. **Find & Highlight**: Browse the web, highlight interesting text (or don't, to save the whole page)
2. **Press Shortcut**: Hit `⌘⇧D` (or your custom shortcut)
3. **Done**: Drafts opens with your content, perfectly formatted and ready to use

### Pro Tips

- **Select Before Capturing**: Highlight specific quotes, paragraphs, or sections for precision capture
- **Full Articles**: Don't select anything to capture the entire article with smart content detection
- **Research Workflow**: Use this for collecting research, saving quotes, or building reading lists
- **Writer's Tool**: Perfect for gathering inspiration, quotes, and reference material

### Customization Options

- **Content Selection**: Choose from preset content selection strategies or define custom CSS selectors
- **Content Filtering**: Control what elements are removed (images, ads, navigation, comments)
- **Output Format**: Customize how drafts are formatted with templates and formatting options
- **Keyboard Shortcuts**: Set your preferred key combination for capturing content

## 🔧 Technical Details

- Built with Safari Web Extensions API for maximum compatibility and performance
- Uses Turndown.js for reliable HTML-to-Markdown conversion
- Direct integration with Drafts via x-callback-url for instant workflow
- Secure sandbox execution for privacy and stability
- Comprehensive settings interface for complete customization

## 📝 Perfect For

- **Researchers**: Quickly save academic articles, papers, and references
- **Writers**: Collect inspiration, quotes, and source material
- **Students**: Build research collections and study materials
- **Knowledge Workers**: Create a personal knowledge base from web content

---

*Built for speed, designed for elegance, optimized for your workflow.*

## 📞 Support

For bug reports, feature requests, or contributions, please visit our [GitHub repository](https://github.com/ddegner/SafariToDrafts).

**Author:** David Degner
**Website:** https://www.daviddegner.com
