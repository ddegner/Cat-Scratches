//
//  MainSettingsView.swift
//  Shared (App)
//
//  Cross-platform settings view for Cat Scratches
//

import SwiftUI
import Combine

#if os(iOS)
import UIKit
import SafariServices
#else
import AppKit
import SafariServices
#endif

// MARK: - Main Settings View (Cross-Platform)

struct MainSettingsView: View {
    @StateObject private var extensionManager = ExtensionManager()
    @State private var isHelpExpanded = false
    #if os(iOS)
    @State private var showingExtensionInstructions = false
    #endif

    var body: some View {
        VStack(spacing: 0) {
            if !extensionManager.isDraftsInstalled {
                draftsNotInstalledBanner
            }
            settingsList
        }
        #if os(macOS)
        .frame(minWidth: 480, minHeight: 520)
        #endif
        #if os(iOS)
        .alert("Enable Safari Extension", isPresented: $showingExtensionInstructions) {
            Button("OK", role: .cancel) { }
        } message: {
            Text("To enable or configure the extension:\n\n1. Open Settings → Apps → Safari\n2. Tap Extensions\n3. Tap Cat Scratches to enable and configure")
        }
        #endif
        .onAppear {
            extensionManager.checkDraftsInstalled()
        }
    }

    // MARK: - Settings List (Shared)

    private var settingsList: some View {
        List {
            // App Icon and Title Header
            Section {
                HStack {
                    Spacer()
                    VStack(spacing: 12) {
                        Image("LargeIcon")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 64, height: 64)

                        Text("Clip web content to Drafts")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding(.vertical, 20)
                .listRowBackground(Color.clear)

            }

            // System Status
            Section {
                HStack(spacing: 12) {
                    Image(systemName: "doc.text")
                        .foregroundColor(extensionManager.isDraftsInstalled ? .green : .secondary)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("Drafts Application")
                            .foregroundColor(.primary)
                        Text(extensionManager.isDraftsInstalled ? "Installed" : "Not Detected")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Spacer()

                    if extensionManager.isDraftsInstalled {
                        Image(systemName: "checkmark")
                            .foregroundColor(.green)
                    } else {
                        Button("Get") {
                            extensionManager.openDraftsAppStore()
                        }
                        #if os(macOS)
                        .buttonStyle(.link)
                        #else
                        .buttonStyle(.bordered)
                        .controlSize(.small)
                        #endif
                    }
                }
            } header: {
                Text("System Check")
            }

            // Setup Section
            Section {
                Button(action: openExtensionSettings) {
                    SettingsRow(
                        icon: "safari",
                        iconColor: .blue,
                        title: "Open Extension Settings",
                        subtitle: platformSubtitle(
                            ios: "Safari → Extensions → Cat Scratches",
                            mac: "Extensions → Cat Scratches → Settings"
                        )
                    )
                }
                .buttonStyle(.plain)
            } header: {
                Text("Setup")
            }

            // Help Section
            Section {
                DisclosureGroup(isExpanded: $isHelpExpanded) {
                    VStack(alignment: .leading, spacing: 12) {
                        InstructionRow(number: 1, text: "Open Extension Settings and enable Cat Scratches")
                        InstructionRow(number: 2, text: "Visit any webpage in Safari")
                        #if os(iOS)
                        InstructionRow(number: 3, text: "Tap the Extensions button (puzzle icon)")
                        InstructionRow(number: 4, text: "Select Cat Scratches to clip the page")
                        #else
                        InstructionRow(number: 3, text: "Click the Cat Scratches icon in the toolbar")
                        InstructionRow(number: 4, text: "Content is clipped to Drafts")
                        #endif

                        Divider()
                            .padding(.vertical, 4)

                        Text("Settings Sync")
                            .font(.subheadline.bold())
                        Text("Extension settings sync automatically via iCloud between Safari on all your devices.")
                            .font(.footnote)
                            .foregroundColor(.secondary)

                        Text("Edit Rules")
                            .font(.subheadline.bold())
                        #if os(iOS)
                        // swiftlint:disable:next line_length
                        Text("To change templates, capture rules, or filtering rules, go to Settings → Safari → Extensions → Cat Scratches → Settings.")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                        #else
                        // swiftlint:disable:next line_length
                        Text("To change templates, capture rules, or filtering rules, go to Safari → Settings → Extensions → Cat Scratches → Settings.")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                        #endif
                    }
                    .padding(.vertical, 8)
                } label: {
                    Text("Setup steps, sync, and troubleshooting")
                }
                .padding(.vertical, 4)
            } header: {
                Text("Help")
            }

            // Connect Section
            Section {
                Link(destination: URL(string: "https://github.com/ddegner/Cat-Scratches")!) {
                    SettingsLinkRow(
                        icon: "chevron.left.forwardslash.chevron.right",
                        title: "View on GitHub"
                    )
                }

                Link(destination: URL(string: "https://www.daviddegner.com")!) {
                    SettingsLinkRow(
                        icon: "person.circle",
                        title: "Created by David Degner"
                    )
                }
            } header: {
                Text("Connect")
            }
        }
        #if os(iOS)
        .listStyle(.insetGrouped)
        .navigationBarHidden(true)
        #else
        .listStyle(.inset)
        #endif
    }

    // MARK: - Drafts Not Installed Banner (Cross-Platform)

    private var draftsNotInstalledBanner: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
                .font(.title3)

            VStack(alignment: .leading, spacing: 4) {
                Text("Drafts is not installed")
                    .font(.headline)
                Text("The extension will use the Share Sheet because Drafts is not detected.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Button("Get Drafts") {
                extensionManager.openDraftsAppStore()
            }
            #if os(macOS)
            .buttonStyle(.borderedProminent)
            #else
            .buttonStyle(.bordered)
            #endif
        }
        .padding(16)
        .background(Color.orange.opacity(0.1))
        #if os(macOS)
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundColor(Color(NSColor.separatorColor)),
            alignment: .bottom
        )
        #endif
    }

    // MARK: - Platform Actions

    private func openExtensionSettings() {
        #if os(iOS)
        extensionManager.openSafariExtensionSettings {
            showingExtensionInstructions = true
        }
        #else
        extensionManager.openSafariPreferences()
        #endif
    }

    // MARK: - Helpers

    private func platformSubtitle(ios: String, mac: String) -> String {
        #if os(iOS)
        return ios
        #else
        return mac
        #endif
    }
}

// MARK: - Shared Helper Views

struct SettingsRow: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(iconColor)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .foregroundColor(.primary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Image(systemName: "arrow.up.forward")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct SettingsLinkRow: View {
    let icon: String
    let title: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(.primary)
                .frame(width: 24)

            Text(title)
                .foregroundColor(.primary)

            Spacer()

            Image(systemName: "arrow.up.forward")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct InstructionRow: View {
    let number: Int
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.caption.bold())
                .foregroundColor(.white)
                .frame(width: 20, height: 20)
                .background(Color.primary)
                .clipShape(Circle())
            Text(text)
                .font(.subheadline)
        }
    }
}

// MARK: - Constants

private enum AppIdentifiers {
    static let extensionBundle = "com.daviddegner.Cat-Scratches.Extension"
    static let draftsURLScheme = "drafts://"
    static let draftsMacBundleID = "com.agiletortoise.Drafts-OSX"
    static let safariBundleID = "com.apple.Safari"
}

private enum AppStoreIDs {
    static let draftsIOS = "1236254471"
    static let draftsMac = "1435957248"
    
    static var draftsURL_iOS: URL? {
        URL(string: "itms-apps://apps.apple.com/app/id\(draftsIOS)")
    }
    
    static var draftsURL_Mac: URL? {
        URL(string: "macappstore://itunes.apple.com/app/id\(draftsMac)")
    }
    
    static var draftsURL_MacFallback: URL? {
        URL(string: "https://apps.apple.com/us/app/drafts/id\(draftsMac)?mt=12")
    }
}

// MARK: - Extension Manager (Cross-Platform)

class ExtensionManager: ObservableObject {
    @Published var isDraftsInstalled: Bool = false

    #if os(macOS)
    private let safariBundleIdentifier = AppIdentifiers.safariBundleID
    #endif

    func checkDraftsInstalled() {
        #if os(iOS)
        guard let url = URL(string: AppIdentifiers.draftsURLScheme) else {
            isDraftsInstalled = false
            return
        }
        isDraftsInstalled = UIApplication.shared.canOpenURL(url)
        #else
        // First check URL scheme
        if let url = URL(string: AppIdentifiers.draftsURLScheme),
           NSWorkspace.shared.urlForApplication(toOpen: url) != nil {
            isDraftsInstalled = true
            return
        }
        // Fallback to bundle identifier
        isDraftsInstalled = NSWorkspace.shared.urlForApplication(withBundleIdentifier: AppIdentifiers.draftsMacBundleID) != nil
        #endif
    }

    func openDraftsAppStore() {
        #if os(iOS)
        if let url = AppStoreIDs.draftsURL_iOS {
            UIApplication.shared.open(url)
        }
        #else
        if let deepLink = AppStoreIDs.draftsURL_Mac,
           NSWorkspace.shared.open(deepLink) {
            return
        }
        if let fallback = AppStoreIDs.draftsURL_MacFallback {
            NSWorkspace.shared.open(fallback)
        }
        #endif
    }

    #if os(iOS)
    /// Opens Safari extension settings using iOS 26.2+ API, or falls back to showing instructions
    func openSafariExtensionSettings(fallback: @escaping () -> Void) {
        if #available(iOS 26.2, *) {
            Task { @MainActor in
                do {
                    try await SFSafariSettings.openExtensionsSettings(
                        forIdentifiers: [AppIdentifiers.extensionBundle]
                    )
                } catch {
                    fallback()
                }
            }
        } else {
            fallback()
        }
    }
    #endif

    #if os(macOS)
    func openSafariPreferences() {
        launchSafariIfNeeded { [weak self] launchedOrAlreadyRunning in
            guard let self = self, launchedOrAlreadyRunning else { return }
            self.showSafariExtensionPreferences()
        }
    }

    private func isSafariRunning() -> Bool {
        return !NSRunningApplication.runningApplications(withBundleIdentifier: safariBundleIdentifier).isEmpty
    }

    private func launchSafariIfNeeded(completion: @escaping (Bool) -> Void) {
        if isSafariRunning() {
            completion(true)
            return
        }

        guard let safariURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: safariBundleIdentifier) else {
            completion(false)
            return
        }

        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = true
        NSWorkspace.shared.openApplication(at: safariURL, configuration: configuration) { runningApp, error in
            completion(error == nil && runningApp != nil)
        }
    }

    private func showSafariExtensionPreferences() {
        SFSafariApplication.showPreferencesForExtension(
            withIdentifier: AppIdentifiers.extensionBundle
        ) { error in
            if error != nil {
                let bundleId = self.safariBundleIdentifier
                if let safariURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) {
                    NSWorkspace.shared.open(safariURL)
                }
            }
        }
    }
    #endif
}

#Preview {
    MainSettingsView()
}
