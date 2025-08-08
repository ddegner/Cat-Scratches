//
//  ViewController.swift
//  Shared (App)
//
//  Created by David Degner on 6/18/25.
//

import SwiftUI
import SafariServices
import AppKit

let extensionBundleIdentifier = "com.daviddegner.Cat-Scratches.Extension"

// MARK: - SwiftUI Views

struct ContentView: View {
    @StateObject private var extensionManager = ExtensionManager()
    
    var body: some View {
        Group {
            if extensionManager.isDraftsInstalled == false {
                VStack(spacing: 24) {
                    Image("LargeIcon")
                        .resizable()
                        .frame(width: 128, height: 128)
                        .clipShape(RoundedRectangle(cornerRadius: 22))
                        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)

                    Text("Cat Scratches")
                        .font(.largeTitle)
                        .fontWeight(.semibold)

                    VStack(spacing: 16) {
                        draftsRequiredView
                    }
                    .frame(maxWidth: 520)
                }
                .padding(40)
            } else {
                // When Drafts is installed, show a clear button to open Safari's Extensions preferences
                VStack(spacing: 24) {
                    Image("LargeIcon")
                        .resizable()
                        .frame(width: 96, height: 96)
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                        .shadow(color: .black.opacity(0.08), radius: 3, x: 0, y: 1)

                    Text("Cat Scratches")
                        .font(.title2)
                        .fontWeight(.semibold)

                    Button(action: {
                        extensionManager.openSafariPreferences()
                    }) {
                        Label("Open Safari Extensions Preferences", systemImage: "safari")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(40)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .frame(minWidth: 720, minHeight: 520)
        .onAppear {
            extensionManager.checkDraftsInstalled()
        }
    }
    
    // MARK: - Drafts gating UI (shown only when Drafts is not installed)

    @ViewBuilder
    private var draftsRequiredView: some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
                .font(.title2)
                .frame(width: 24, height: 24)

            VStack(alignment: .leading, spacing: 6) {
                Text("Drafts for Mac is required")
                    .font(.headline)
                Text("Cat Scratches sends content to the Drafts app. Install Drafts from the App Store before installing the Safari extension.")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .fixedSize(horizontal: false, vertical: true)

                HStack(spacing: 12) {
                    Button(action: {
                        extensionManager.openDraftsAppStore()
                    }) {
                        Label("Get Drafts on the App Store", systemImage: "link")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .buttonStyle(.borderedProminent)

                    Button(role: .none) {
                        extensionManager.openSafariPreferences()
                    } label: {
                        Label("Install Extension Anyway", systemImage: "exclamationmark.circle")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .buttonStyle(.bordered)
                    .help("The extension will not work until Drafts is installed.")
                }

                Text("The extension will not work until Drafts is installed.")
                    .font(.footnote)
                    .foregroundColor(.secondary)
            }

            Spacer()
        }
        .padding(16)
        .background(Color(NSColor.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color(NSColor.separatorColor), lineWidth: 0.5)
        )
    }

}

// MARK: - Extension Manager

class ExtensionManager: ObservableObject {
    @Published var isDraftsInstalled: Bool = false
    private let safariBundleIdentifier = "com.apple.Safari"

    // MARK: - Drafts detection and helpers

    func checkDraftsInstalled() {
        // Prefer URL scheme check
        if let url = URL(string: "drafts://"),
           NSWorkspace.shared.urlForApplication(toOpen: url) != nil {
            isDraftsInstalled = true
            return
        }

        // Fallback to bundle identifier check
        if NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.agiletortoise.Drafts-OSX") != nil {
            isDraftsInstalled = true
            return
        }

        isDraftsInstalled = false
    }

    func openDraftsAppStore() {
        // Prefer app-store deep link when possible
        if let deepLink = URL(string: "macappstore://itunes.apple.com/app/id1435957248") {
            if NSWorkspace.shared.open(deepLink) { return }
        }
        guard let url = URL(string: "https://apps.apple.com/us/app/drafts/id1435957248?mt=12") else { return }
        NSWorkspace.shared.open(url)
    }
    
    func openSafariPreferences() {
        print("Attempting to open Safari preferences for extension: \(extensionBundleIdentifier)")

        launchSafariIfNeeded { [weak self] launchedOrAlreadyRunning in
            guard let self = self else { return }

            guard launchedOrAlreadyRunning else {
                print("Failed to open Safari preferences: Safari did not launch.")
                return
            }

            // Safari can take a moment to become ready after launch; retry briefly if needed.
            self.showSafariExtensionPreferencesWithRetry(remainingAttempts: 4, initialDelay: 0.2)
        }
    }

    // MARK: - Safari helpers

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
            if let error = error {
                print("Failed to launch Safari: \(error.localizedDescription)")
                completion(false)
                return
            }
            completion(runningApp != nil)
        }
    }

    private func showSafariExtensionPreferencesWithRetry(remainingAttempts: Int, initialDelay: TimeInterval) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            if let error = error {
                if remainingAttempts > 0 {
                    let nextDelay = min(initialDelay * 1.5, 1.5)
                    DispatchQueue.main.asyncAfter(deadline: .now() + nextDelay) {
                        self.showSafariExtensionPreferencesWithRetry(remainingAttempts: remainingAttempts - 1, initialDelay: nextDelay)
                    }
                } else {
                    print("Failed to open Safari preferences: \(error.localizedDescription)")
                }
                return
            }
            print("Successfully opened Safari preferences")
        }
    }

    // no-op
}

// MARK: - ViewController

import Cocoa

class ViewController: NSViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Host SwiftUI ContentView
        let contentView = ContentView()
        let hostingController = NSHostingController(rootView: contentView)
        
        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }
}
