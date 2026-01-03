//
//  MainSettingsView.swift
//  Shared (App)
//
//  Cross-platform settings view for Cat Scratches
//

import SwiftUI

#if os(iOS)
import UIKit
#else
import AppKit
import SafariServices
import Combine
#endif

// MARK: - Main Settings View (Cross-Platform)

struct MainSettingsView: View {
    #if os(macOS)
    @StateObject private var extensionManager = ExtensionManager()
    #endif

    var body: some View {
        #if os(macOS)
        VStack(spacing: 0) {
            if !extensionManager.isDraftsInstalled {
                draftsRequiredBanner
            }
            settingsList
        }
        .frame(minWidth: 480, minHeight: 520)
        .onAppear {
            extensionManager.checkDraftsInstalled()
        }
        #else
        settingsList
        #endif
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

            // Setup Section
            Section {
                Button(action: openSafariExtensions) {
                    SettingsRow(
                        icon: "safari",
                        iconColor: .blue,
                        title: "Enable Extension",
                        subtitle: platformSubtitle(ios: "Safari → Extensions", mac: "Safari → Settings → Extensions")
                    )
                }
                .buttonStyle(.plain)

                Button(action: openExtensionSettings) {
                    SettingsRow(
                        icon: "gearshape",
                        iconColor: .blue,
                        title: "Extension Settings",
                        subtitle: platformSubtitle(
                            ios: "Extensions → Cat Scratches",
                            mac: "Extensions → Cat Scratches → Settings"
                        )
                    )
                }
                .buttonStyle(.plain)
            } header: {
                Text("Setup")
            }

            // How to Use Section
            Section {
                VStack(alignment: .leading, spacing: 12) {
                    InstructionRow(number: 1, text: "Enable the extension in Safari settings")
                    InstructionRow(number: 2, text: "Visit any webpage in Safari")
                    #if os(iOS)
                    InstructionRow(number: 3, text: "Tap the Extensions button (puzzle icon)")
                    InstructionRow(number: 4, text: "Select Cat Scratches to clip the page")
                    #else
                    InstructionRow(number: 3, text: "Click the Cat Scratches icon in the toolbar")
                    InstructionRow(number: 4, text: "Content is clipped to Drafts")
                    #endif
                }
                .padding(.vertical, 8)
            } header: {
                Text("How to Use")
            }

            // About Section
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Settings Sync")
                        .font(.subheadline.bold())
                    Text("Extension settings sync automatically via iCloud between Safari on all your devices.")
                        .font(.footnote)
                        .foregroundColor(.secondary)

                    Divider()
                        .padding(.vertical, 4)

                    Text("Edit Settings")
                        .font(.subheadline.bold())
                    #if os(iOS)
                    // swiftlint:disable:next line_length
                    Text("To change template, filters, or other settings, go to Settings → Safari → Extensions → Cat Scratches → Settings.")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                    #else
                    // swiftlint:disable:next line_length
                    Text("To change template, filters, or other settings, go to Safari → Settings → Extensions → Cat Scratches → Settings.")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                    #endif
                }
                .padding(.vertical, 4)
            } header: {
                Text("About")
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

    // MARK: - Drafts Required Banner (macOS only)

    #if os(macOS)
    private var draftsRequiredBanner: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
                .font(.title3)

            VStack(alignment: .leading, spacing: 4) {
                Text("Drafts for Mac is required")
                    .font(.headline)
                Text("Cat Scratches sends content to the Drafts app.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Button("Get Drafts") {
                extensionManager.openDraftsAppStore()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(16)
        .background(Color.orange.opacity(0.1))
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundColor(Color(NSColor.separatorColor)),
            alignment: .bottom
        )
    }
    #endif

    // MARK: - Platform Actions

    private func openSafariExtensions() {
        #if os(iOS)
        if let url = URL(string: "App-Prefs:com.apple.mobilesafari") {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
        #else
        extensionManager.openSafariPreferences()
        #endif
    }

    private func openExtensionSettings() {
        #if os(iOS)
        openSafariExtensions()
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

// MARK: - Extension Manager (macOS only)

#if os(macOS)
let extensionBundleIdentifier = "com.daviddegner.Cat-Scratches.Extension"

class ExtensionManager: ObservableObject {
    @Published var isDraftsInstalled: Bool = false
    private let safariBundleIdentifier = "com.apple.Safari"

    func checkDraftsInstalled() {
        if let url = URL(string: "drafts://"),
           NSWorkspace.shared.urlForApplication(toOpen: url) != nil {
            isDraftsInstalled = true
            return
        }

        if NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.agiletortoise.Drafts-OSX") != nil {
            isDraftsInstalled = true
            return
        }

        isDraftsInstalled = false
    }

    func openDraftsAppStore() {
        if let deepLink = URL(string: "macappstore://itunes.apple.com/app/id1435957248") {
            if NSWorkspace.shared.open(deepLink) { return }
        }
        guard let url = URL(string: "https://apps.apple.com/us/app/drafts/id1435957248?mt=12") else { return }
        NSWorkspace.shared.open(url)
    }

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
            withIdentifier: extensionBundleIdentifier
        ) { error in
            if error != nil {
                let bundleId = self.safariBundleIdentifier
                if let safariURL = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) {
                    NSWorkspace.shared.open(safariURL)
                }
            }
        }
    }
}
#endif

#Preview {
    MainSettingsView()
}
