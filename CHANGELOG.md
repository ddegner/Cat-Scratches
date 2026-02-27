# Changelog

All notable changes to Cat Scratches will be documented in this file.

## [2.1.4] - 2026-02-27

### Fixed
- Fixed HTML entity cleanup replacing all entities with spaces instead of decoding them (e.g. `&amp;` becoming a space instead of `&`)
- Fixed `element.className` producing garbage values on SVG elements during content scoring by using `getAttribute('class')`
- Fixed status message timer overlap where rapid messages could be hidden prematurely
- Added defensive optional chaining to `getDraftsURLMode()` to prevent crash when settings are not yet loaded
- Removed dead `border: none` CSS declaration overwritten by later rule
- Merged duplicate `DOMContentLoaded` listeners into single initialization path
- Removed redundant case-insensitive regex flag on already-lowercased input

## [2.1.3] - 2026-02-22

### Changed
- Added explicit Selector Finder privacy disclosure in extension settings and documentation
- Clarified privacy policy language for optional cloud-based Selector Finder analysis while keeping clipping local-first

### Fixed
- Hardened Selector Finder worker API with restricted CORS, trusted-origin checks, and simple client validation
- Added per-IP rate limiting on Selector Finder analysis endpoint
- Added SSRF protections in Selector Finder worker (blocked local/private/internal targets, non-standard ports, and unsafe redirects)

## [2.1.2] - 2026-02-21

### Changed
- Replaced the app settings header tagline with a dynamic app version label sourced from `CFBundleShortVersionString`
- Simplified Help section formatting to plain numbered lines while keeping app-specific instructions
- Updated extension settings header title from "Cat Scratches Settings" to "Settings" with a small version subtitle below it

### Fixed
- Wired extension settings version display to bundle version via native messaging (`getExtensionVersion`) with manifest fallback

## [2.1.1] - 2026-02-20

### Added
- Expanded template time/date token support beyond `{timestamp}` with additional Photo Mechanic-style placeholders
- Hover examples for expanded template tags so users can see token output without extra explanatory rows
- App Store Connect API submission runbook for dual-platform (iOS + macOS) release submissions

### Changed
- Reworked template placeholder UI to a compact caret-based accordion that shows default tags when collapsed and all tags when expanded
- Auto-resize behavior for the template textarea so full template content remains visible while editing
- Unified accordion markup/CSS for template placeholders and Advanced Settings, including matching text sizing and caret styling
- Hardened extension settings/runtime assumptions by removing compatibility fallback layers and relying on required core modules

### Fixed
- Tightened spacing/layout consistency between accordion sections and Save Settings actions
- Clarified GitHub release artifact policy in release documentation (macOS notarized binary only)

## [2.1.0] - 2026-02-20

### Added
- Advanced Drafts URL Scheme controls in extension settings with `Create URL` and `Action URL` modes
- Configurable Drafts action name for post-processing captured content in Drafts

### Changed
- Drafts capture pipeline now supports both `drafts://x-callback-url/create` and `drafts://x-callback-url/runAction`
- `Create URL` mode can optionally run a Drafts action while preserving tag support
- Updated Advanced settings UI so the Drafts action field is always visible and the URL mode toggle matches the main segmented control style

### Fixed
- Removed an extra divider before Advanced Settings in the extension settings layout

## [2.0.2] - 2026-02-15

### Added
- Shared settings storage module (`settings-store.js`) used by both background and settings pages
- Basic/Advanced view toggle for extension settings to reduce default UI complexity
- Worker response now includes raw page HTML for selector preview generation
- Direct iOS link path to Safari extension settings for iOS 26.2 behavior

### Changed
- Refactored extension settings loading/saving to use shared storage helpers (iCloud first, local cache fallback)
- Updated extension settings UX to a single explicit save model with unsaved-change state
- Simplified settings terminology to outcome-focused labels (for example: "Where to send clips", "What to capture", "What to ignore")
- Simplified native app settings page by consolidating setup actions and merging guidance into a single expandable Help section
- Updated extension bundle verification script to check current required resource files
- Added `settings-store.js` to Xcode project resources for iOS/macOS extension targets
- Tightened extension page CSP `connect-src` to the selector worker endpoint instead of broad `https/http`
- Removed `host_permissions` from extension manifest while preserving capture behavior through the selector worker/native extraction pipeline

### Fixed
- Preserved user-selected destination on extension updates (instead of always resetting during install/update flow)
- Improved legacy template migration and token replacement logic for safer formatting behavior
- Hardened content extraction filter handling by validating selectors before matching/removal
- Eliminated selector preview CORS fetch dependency by using HTML returned from the selector worker

## [2.0] - 2026-01-02

### Changed
- **Version bump to 2.0** for App Store distribution
- Consolidated iOS and macOS settings UI into single shared `MainSettingsView.swift`
- Reduced code duplication by ~277 lines through cross-platform view consolidation
- Improved code quality with SwiftLint compliance (0 violations)

### Fixed
- Removed empty/unused iOS Assets.xcassets folder
- Cleaned up trailing whitespace and line length issues across all Swift files

## [0.6] - 2026-01-02

### Added
- iOS app and Safari extension support
- iCloud sync for settings across devices via NSUbiquitousKeyValueStore

### Changed
- Simplified template system - removed Title Format dropdown, users now control formatting directly in the template using `{title}` placeholder
- Consolidated shared constants to `defaults.js` for better maintainability
- Enhanced settings migration to properly merge all settings with defaults

### Fixed
- Fixed Reset to Defaults not syncing properly to iCloud
- Removed unused code and parameters throughout codebase

## [0.5] - 2025-12-31

### Added
- Initial release
- Safari extension for macOS
- Smart content extraction with customizable CSS selectors
- HTML-to-Markdown conversion using Turndown.js
- Customizable output templates
- Keyboard shortcut support (⌘⇧D)
- Content filtering options
