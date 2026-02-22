# Privacy Policy for Cat Scratches

**Effective Date:** August 1, 2025  
**Last Updated:** February 22, 2026

## Overview

Cat Scratches ("we," "our," or "the app") is a Safari extension that allows users to capture web content and send it directly to the Drafts app. This privacy policy explains how we handle information when you use our Safari extension.

## Information We Do Not Collect

Cat Scratches is designed with privacy as a core principle. We want to be completely transparent about what we do and do not collect:

### No Personal Data Collection
- We do not collect, store, or transmit any personal information
- We do not collect your name, email address, or any identifying information
- We do not track your browsing history or website visits
- We do not collect information about which websites you capture content from

### No Content Storage
- We do not store or retain any content you capture from websites
- Core clipping content is processed locally on your device and sent directly to Drafts or Share Sheet
- We do not store captured content, and we do not manually review Selector Finder request payloads

### No Analytics or Tracking
- We do not use analytics services
- We do not track how you use the extension
- We do not collect usage statistics or performance data
- We do not use cookies or similar tracking technologies

### Limited Network Communication (Optional Feature)
- Core clipping (capture + format + send to Drafts/Share Sheet) runs locally on your device
- If you use **Selector Finder** (an optional tool in Advanced Settings), the URL you enter and a processed copy of the target page HTML are sent to our Selector Finder service and Google's Gemini API to suggest selectors
- Selector Finder requests are processed transiently and are **not saved by Cat Scratches**

## How the Extension Works

Cat Scratches primarily operates on your local device:

1. **Content Processing**: When you use the extension, it processes the webpage content locally in Safari
2. **Local Conversion**: The content is converted to Markdown format using local JavaScript libraries
3. **Direct Transfer**: The formatted content is sent directly to the Drafts app using macOS URL schemes
4. **Optional Selector Finder**: If you run Selector Finder, the URL you provide and processed HTML are sent to the Selector Finder service and Gemini for analysis (not saved by Cat Scratches)

## Permissions We Request

The extension requests the following permissions, which are used solely for its core functionality:

- **Active Tab Access**: To read content from the currently active webpage
- **Scripting Permission**: To execute the content capture and formatting scripts
- **Storage Permission**: To save your extension settings and preferences locally on your device

These permissions are used exclusively to provide the extension's functionality and are not used to collect or transmit data.

## Data Security

Since we do not retain user content, there is no stored content database on our end. However:

- All extension processing occurs locally on your device
- Your captured content is handled according to the Drafts app's privacy policy once transferred
- We recommend keeping your macOS and Safari updated for optimal security

## Third-Party Services

Cat Scratches integrates with:

- **Drafts App**: Content captured by our extension is sent to the Drafts app. Please refer to [Drafts' privacy policy](https://getdrafts.com/privacy/) for information about how they handle your data.
- **Selector Finder Service (Optional)**: When you use Selector Finder, requests are sent to `selector-finder.catscratches.workers.dev` for analysis and relay to Gemini.
- **Google Gemini API (Optional)**: Used only for Selector Finder analysis requests.

We are not responsible for the privacy practices of third-party applications.

## Children's Privacy

Cat Scratches does not collect any personal information from anyone, including children under 13. The extension is safe for users of all ages.

## Changes to This Privacy Policy

We may update this privacy policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date. Since we don't collect contact information, we cannot notify users directly of changes.

## Open Source

Cat Scratches is open source software. You can review our code at [https://github.com/ddegner/cat-scratches](https://github.com/ddegner/cat-scratches) to verify our privacy practices.

## Contact Information

If you have any questions about this privacy policy or Cat Scratches, you can contact us:

- **Developer**: David Degner
- **Website**: [https://www.daviddegner.com](https://www.daviddegner.com)
- **GitHub**: [https://github.com/ddegner/cat-scratches](https://github.com/ddegner/cat-scratches)

## Summary

In simple terms: normal clipping runs locally. If you use Selector Finder, the URL and processed HTML are sent for AI analysis, but Cat Scratches does not save those requests.

---

*This privacy policy is designed to be transparent and comprehensive. Cat Scratches is committed to minimizing data use and not saving Selector Finder request content.*
