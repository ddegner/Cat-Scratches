# Cat Scratches App Store Release Kit (February 9, 2026)

## 1) Review Findings (Past 3 Days)

### Open finding
- **[P2] Potential migration regression for very old settings payloads**
  - File: `/Users/degner/Documents/GitHub/SafariToDrafts/SafariToDrafts/Shared (Extension)/Resources/defaults.js:369`
  - The current migration path now requires `outputFormat.template` and no longer reconstructs templates from older legacy fields (`customTemplate`, include flags). Users carrying only legacy keys could fall back to the default template.
  - Risk level: medium for long-time users upgrading across multiple old versions.

### Fixed during release prep
- **[P1] macOS app/extension build number mismatch in Release**
  - File: `/Users/degner/Documents/GitHub/SafariToDrafts/SafariToDrafts/Cat Scratches.xcodeproj/project.pbxproj:939`
  - `CURRENT_PROJECT_VERSION` for macOS App Release is now aligned to `5`, matching extension build version.
  - Validation: release build warning about `CFBundleVersion` mismatch is gone.

- **[P2] Extension bundle verification script failed for iOS extension bundles**
  - File: `/Users/degner/Documents/GitHub/SafariToDrafts/check_extension_bundle.sh:9`
  - Script now:
    - finds latest extension bundle without project-path filter,
    - supports macOS (`Contents/Resources`) and iOS (bundle root) resource layouts.
  - Validation: script now passes and confirms required files.

---

## 2) App Store Copy (Ready to Paste)

## iOS (first release)

### App Name
`Cat Scratches`

### Subtitle (<= 30)
`Clip Safari pages to Drafts`

### Promotional Text (<= 170)
`Capture article text from Safari and send it to Drafts or the Share Sheet in one tap. Configure templates, tags, and extraction rules in extension settings.`

### Description
`Cat Scratches helps you move web content from Safari into your writing workflow.

Use it to:
• Capture selected text or full pages
• Send content directly to Drafts
• Fall back to Share Sheet when Drafts isn’t available
• Customize templates, tags, selectors, and filters
• Keep extension settings synced across devices with iCloud

How it works:
1. Enable the Cat Scratches Safari extension
2. Open any page in Safari
3. Run Cat Scratches from the extensions menu
4. Continue writing in Drafts or another app via Share Sheet

Cat Scratches is built for writers, researchers, and anyone who wants a fast, clean web clipping workflow.`

### Keywords (<= 100 chars)
`drafts,safari extension,web clipper,markdown,notes,writer,research,productivity,share sheet`

### What’s New (iOS 1.0)
`First iOS release.

- Added iPhone and iPad companion app for setup and status checks
- Added direct path to Safari extension settings
- Added customizable capture templates, tags, selectors, and filters
- Added Share Sheet fallback when Drafts is unavailable`

### App Review Notes (iOS)
`No account or sign-in required.

How to test:
1. Install the app on iPhone or iPad.
2. Open Settings > Apps > Safari > Extensions.
3. Enable “Cat Scratches”.
4. Open Safari and visit an article page.
5. Tap the Extensions button and choose Cat Scratches.

Expected behavior:
- If Drafts is installed, content is sent to Drafts.
- If Drafts is not installed, content is sent via Share Sheet fallback.`

### Support / Marketing / Privacy URLs
- Support URL: `https://github.com/ddegner/Cat-Scratches`
- Marketing URL: `https://www.daviddegner.com`
- Privacy Policy URL: `https://github.com/ddegner/Cat-Scratches/blob/main/PRIVACY_POLICY.md`

---

## macOS (update)

### Promotional Text
`Cat Scratches for Safari now has a cleaner settings flow, stronger settings persistence, and improved handling for large captures sent to Drafts.`

### What’s New (macOS)
`This update improves reliability and simplifies setup.

- Streamlined settings and help flow in the app
- Unified extension settings storage with iCloud + local fallback
- Improved long-content handling before sending to Drafts
- Updated extension settings UI with cleaner advanced controls
- Removed legacy resources and old destination paths`

### Description (if you want to refresh macOS listing)
`Cat Scratches is a Safari companion that clips web content into Drafts in seconds.

- Capture selected text or full pages
- Keep formatting predictable with templates and tags
- Fine-tune extraction with selectors and filters
- Sync extension settings through iCloud
- Fall back to Share Sheet when Drafts is unavailable`

### App Review Notes (macOS)
`No account required.

How to test:
1. Install app and open it.
2. Confirm “Drafts Application” status in the main window.
3. Open Safari > Settings > Extensions > Cat Scratches > Settings.
4. Enable extension and run it on an article page from Safari toolbar.

Expected behavior:
- Captured content goes to Drafts when available, otherwise Share Sheet fallback is available.`

---

## 3) Final Screenshot Set (v5, recommended)

> Simulator note: iPhone simulator install of Drafts failed code-sign validation. iPad simulator has Drafts installed, but Cat Scratches still reports “Not Detected” in simulator. Screenshots reflect real simulator behavior.

## iPhone 6.9" (1320 x 2868)
1. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/ios/iphone-flow-v5-01.png`
2. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/ios/iphone-flow-v5-02.png`
3. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/ios/iphone-flow-v5-03.png`
4. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/ios/iphone-flow-v5-04.png`
5. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/ios/iphone-flow-v5-05.png`

## iPad 13" (2064 x 2752)
1. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/ios/ipad-flow-v5-01.png`
2. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/ios/ipad-flow-v5-02.png`
3. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/ios/ipad-flow-v5-03.png`
4. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/ios/ipad-flow-v5-04.png`
5. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/ios/ipad-flow-v5-05.png`

## macOS (2880 x 1800)
1. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/macos/macos-flow-v5-01.png`
2. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/macos/macos-flow-v5-02.png`
3. `/Users/degner/Documents/GitHub/SafariToDrafts/app-store-assets/screenshots/final-flow-v5/macos/macos-flow-v5-03.png`

---

## 4) Submission Walkthrough (macOS update + first iOS release)

1. **Preflight versions/builds in Xcode**
   - Confirm `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` for iOS app, iOS extension, macOS app, and macOS extension.
   - Keep each app + its extension build numbers aligned.

2. **Run release builds locally**
   - Build `Cat Scratches (iOS)` in Release for simulator/device.
   - Build `Cat Scratches (macOS)` in Release.
   - Run `/Users/degner/Documents/GitHub/SafariToDrafts/check_extension_bundle.sh` after build.

3. **Archive and upload iOS build**
   - Select `Cat Scratches (iOS)` scheme.
   - Product > Archive.
   - Distribute App > App Store Connect > Upload.

4. **Archive and upload macOS build**
   - Select `Cat Scratches (macOS)` scheme.
   - Product > Archive.
   - Distribute App > App Store Connect > Upload.

5. **App Store Connect setup**
   - Open app record.
   - Add/select iOS platform version (first iOS release) and macOS version (update).
   - Fill metadata from section 2.
   - Upload screenshot sets from section 3.

6. **App Privacy + Review Info**
   - Verify App Privacy answers match current behavior.
   - Add App Review Notes (section 2), contact info, and demo steps.

7. **Select builds for each platform version**
   - Attach the uploaded iOS build to iOS version.
   - Attach the uploaded macOS build to macOS version.

8. **Submit for review**
   - Use manual release if you want to coordinate announcement timing.
   - Submit iOS and macOS versions.

9. **Post-submit checks**
   - Watch for “Missing Compliance” or metadata warnings.
   - Respond quickly to reviewer questions.

---

## 5) Launch & Growth Plan (Practical)

## 7 days before release
1. Ship a TestFlight build and collect at least 5-10 external tester notes for iOS edge cases.
2. Prepare announcement assets: short demo video, changelog bullets, feature image, website update.
3. Create one focused landing page with App Store badges + direct links.

## Release day
1. Publish iOS first-release announcement + macOS update note together.
2. Post short product demo clips:
   - X / Mastodon
   - Reddit communities related to Drafts, note-taking, and Safari workflows
   - Drafts community/forum channels
3. Use one clear CTA: “Install Cat Scratches for iPhone, iPad, and Mac.”

## First 14 days
1. Track App Store Connect metrics: impressions, product-page views, conversion, retention.
2. Run Product Page Optimization tests on icon/screenshot ordering/copy.
3. Build at least one Custom Product Page tailored to “writers/research” use case and link it from targeted campaigns.

## Messaging angles that should perform
1. “Fastest way to move Safari content into Drafts.”
2. “Works even when Drafts is unavailable (Share Sheet fallback).”
3. “Template + selector control for serious clipping workflows.”

---

## 6) Research References

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Submitting to App Review: https://developer.apple.com/documentation/appstoreconnectapi/submitting-for-review/
- Distribute your app overview: https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/distribute-your-app/
- Required app information and localizable metadata: https://developer.apple.com/help/app-store-connect/reference/required-localizable-and-editable-properties/
- App review information fields: https://developer.apple.com/help/app-store-connect/manage-app-information/provide-app-review-information/
- Screenshot specifications (iPhone/iPad/macOS sizes): https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications
- Product page best practices: https://developer.apple.com/help/app-store-connect/manage-your-apps-information/create-your-product-page/
- Product Page Optimization: https://developer.apple.com/app-store/product-page-optimization/
- Custom Product Pages: https://developer.apple.com/app-store/custom-product-pages/
- Promote with App Store Marketing Tools: https://tools.applemediaservices.com/
