# Changelog

All notable changes to Cat Scratches will be documented in this file.

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
