//
//  ViewController.swift
//  Shared (App)
//
//  Created by David Degner on 6/18/25.
//

import SwiftUI
import SafariServices

let extensionBundleIdentifier = "com.daviddegner.SafariToDrafts.Extension"

// MARK: - SwiftUI Views

struct ContentView: View {
    @StateObject private var extensionManager = ExtensionManager()
    
    var body: some View {
        VStack(spacing: 24) {
            // App Icon
            Image("LargeIcon")
                .resizable()
                .frame(width: 128, height: 128)
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
            
            // Title
            Text("Cat Scratches")
                .font(.largeTitle)
                .fontWeight(.semibold)
            
            // Status Section
            VStack(spacing: 16) {
                statusView
                actionButton
            }
            .frame(maxWidth: 400)
        }
        .padding(40)
        .frame(minWidth: 480, minHeight: 360)
        .onAppear {
            extensionManager.checkExtensionState()
        }
    }
    
    @ViewBuilder
    private var statusView: some View {
        HStack(spacing: 12) {
            statusIcon
            
            VStack(alignment: .leading, spacing: 4) {
                Text(statusTitle)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Text(statusDescription)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.leading)
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
    
    @ViewBuilder
    private var statusIcon: some View {
        Image(systemName: statusIconName)
            .font(.title2)
            .foregroundColor(statusIconColor)
            .frame(width: 24, height: 24)
    }
    
    @ViewBuilder
    private var actionButton: some View {
        Button(action: {
            extensionManager.openSafariPreferences()
        }) {
            HStack(spacing: 8) {
                Image(systemName: "safari")
                    .font(.system(size: 14, weight: .medium))
                Text(buttonTitle)
                    .font(.system(size: 14, weight: .medium))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
    }
    
    // MARK: - Computed Properties
    
    private var statusTitle: String {
        switch extensionManager.state {
        case .unknown:
            return "Extension Status Unknown"
        case .enabled:
            return "Extension Enabled"
        case .disabled:
            return "Extension Disabled"
        }
    }
    
    private var statusDescription: String {
        let settingsLocation = extensionManager.useSettingsInsteadOfPreferences ? 
            "Extensions section of Safari Settings" : "Safari Extensions preferences"
        
        switch extensionManager.state {
        case .unknown:
            return "You can enable Cat Scratches in the \(settingsLocation)."
        case .enabled:
            return "Cat Scratches is active and ready to use. You can disable it in the \(settingsLocation)."
        case .disabled:
            return "Cat Scratches is currently disabled. You can enable it in the \(settingsLocation)."
        }
    }
    
    private var statusIconName: String {
        switch extensionManager.state {
        case .unknown:
            return "questionmark.circle"
        case .enabled:
            return "checkmark.circle.fill"
        case .disabled:
            return "xmark.circle"
        }
    }
    
    private var statusIconColor: Color {
        switch extensionManager.state {
        case .unknown:
            return .orange
        case .enabled:
            return .green
        case .disabled:
            return .red
        }
    }
    
    private var buttonTitle: String {
        extensionManager.useSettingsInsteadOfPreferences ? 
            "Open Safari Settings" : "Open Safari Extensions Preferences"
    }
}

// MARK: - Extension Manager

class ExtensionManager: ObservableObject {
    enum ExtensionState {
        case unknown
        case enabled
        case disabled
    }
    
    @Published var state: ExtensionState = .unknown
    @Published var useSettingsInsteadOfPreferences = false
    
    func checkExtensionState() {
        // Since we're targeting macOS 15+, always use Settings instead of Preferences
        useSettingsInsteadOfPreferences = true
        
        SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: extensionBundleIdentifier) { [weak self] (state, error) in
            DispatchQueue.main.async {
                guard let state = state, error == nil else {
                    self?.state = .unknown
                    return
                }
                
                self?.state = state.isEnabled ? .enabled : .disabled
                
                // Auto-open Safari preferences after a brief delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    self?.openSafariPreferences()
                }
            }
        }
    }
    
    func openSafariPreferences() {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: extensionBundleIdentifier) { error in
            guard error == nil else {
                return
            }
            
            DispatchQueue.main.async {
                NSApp.terminate(nil)
            }
        }
    }
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
