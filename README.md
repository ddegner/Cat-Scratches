# SafariToDrafts

The fastest and most elegant way to capture content from the web and send it directly to the Drafts app, perfectly formatted and ready for action.

## 🚀 Features

### Intelligent, Context-Aware Capture
- **Smart Selection**: Highlight any text on a page and capture only your selection
- **Full-Page Capture**: When nothing is selected, automatically captures the main content
- **Clean Content Detection**: Automatically finds article content, avoiding navigation and ads

### Keyboard-First Workflow
- **One-Key Operation**: Press `⌘⇧D` to instantly capture and send to Drafts
- **Speed of Thought**: No menus, no clicks, just pure efficiency
- **Flow State Friendly**: Stays out of your way while you research and browse

### Perfect Formatting
- **Automatic HTML-to-Markdown**: Clean, readable conversion that preserves structure
- **Smart Headers**: Web headings become proper Markdown headers
- **Preserved Links**: All links maintained in `[text](url)` format
- **Source Attribution**: Every draft includes the original URL for reference

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
4. **Install Drafts**: Make sure you have [Drafts](https://getdrafts.com) installed on your Mac

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

## 🔧 Technical Details

- Built with Safari Web Extensions API for maximum compatibility and performance
- Uses Turndown.js for reliable HTML-to-Markdown conversion
- Direct integration with Drafts via x-callback-url for instant workflow
- Secure sandbox execution for privacy and stability

## 📝 Perfect For

- **Researchers**: Quickly save academic articles, papers, and references
- **Writers**: Collect inspiration, quotes, and source material
- **Students**: Build research collections and study materials
- **Knowledge Workers**: Create a personal knowledge base from web content

---

*Built for speed, designed for elegance, optimized for your workflow.* 