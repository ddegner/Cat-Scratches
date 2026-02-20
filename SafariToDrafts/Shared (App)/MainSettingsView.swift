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
        .frame(minWidth: 560, minHeight: 700)
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
        #if os(iOS)
        List {
            settingsSections
        }
        .listRowSeparator(.hidden)
        .listStyle(.insetGrouped)
        .navigationBarHidden(true)
        #else
        Form {
            settingsSections
        }
        .formStyle(.grouped)
        #endif
    }
    
    @ViewBuilder
    private var settingsSections: some View {
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
            
        }
        
        if !extensionManager.isDraftsInstalled {
            // System Status
            Section {
                HStack(spacing: 12) {
                    Image(systemName: "doc.text")
                        .foregroundColor(.secondary)
                        .frame(width: 24)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Drafts Application")
                            .foregroundColor(.primary)
                        Text("Not Detected")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
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
            } header: {
                Text("System Check")
            }
        }
        
        // Setup Section
        Section {
            Button(action: openExtensionSettings) {
                SettingsRow(
                    icon: "safari",
                    iconColor: .blue,
                    title: "Open Extension Settings",
                    subtitle: platformSubtitle(
                        ios: "Safari → Extensions → Cat Scratches → Settings · Syncs via iCloud",
                        mac: "Extensions → Cat Scratches → Settings · Syncs via iCloud"
                    )
                )
            }
            .buttonStyle(.plain)
        } header: {
            Text("Setup")
        }
        
        // Connect Section
        Section {
            Link(destination: URL(string: "https://github.com/ddegner/cat-scratches")!) {
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
        
        // Help Section
        Section {
            VStack(alignment: .leading, spacing: 12) {
                InstructionRow(number: 1, text: "Enable Cat Scratches in Extension Settings")
                InstructionRow(number: 2, text: "Open any page in Safari")
                #if os(iOS)
                InstructionRow(number: 3, text: "Use Extensions (puzzle) for Cat Scratches, or press ⇧⌘D")
                #else
                InstructionRow(number: 3, text: "Click Cat Scratches in the toolbar, or press ⇧⌘D")
                #endif
            }
            .padding(.vertical, 8)
        } header: {
            Text("Help")
        }
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
