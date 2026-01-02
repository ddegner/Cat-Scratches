//
//  NativeSettingsView.swift
//  iOS (App)
//
//  Setup guide for Cat Scratches extension
//

import SwiftUI

// MARK: - Main Settings View (Root view for iOS app)

struct MainSettingsView: View {
    
    var body: some View {
        NavigationView {
            List {
                // App Icon and Title
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 12) {
                            Text("🐱")
                                .font(.system(size: 64))
                            Text("Cat Scratches")
                                .font(.title2.bold())
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
                    // Open Safari Extensions Settings
                    Button(action: openSafariExtensions) {
                        HStack {
                            Image(systemName: "safari")
                                .foregroundColor(.blue)
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Enable Extension")
                                    .foregroundColor(.primary)
                                Text("Safari → Extensions")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "arrow.up.forward")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    // Open Extension Settings (in Safari)
                    Button(action: openExtensionSettings) {
                        HStack {
                            Image(systemName: "gearshape")
                                .foregroundColor(.blue)
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Extension Settings")
                                    .foregroundColor(.primary)
                                Text("Extensions → Cat Scratches")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Image(systemName: "arrow.up.forward")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("Setup")
                }
                
                // How to Use Section
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        InstructionRow(number: 1, text: "Enable the extension in Safari settings")
                        InstructionRow(number: 2, text: "Visit any webpage in Safari")
                        InstructionRow(number: 3, text: "Tap the Extensions button (puzzle icon)")
                        InstructionRow(number: 4, text: "Select Cat Scratches to clip the page")
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("How to Use")
                }
                
                // Info Section
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
                        Text("To change template, filters, or other settings, go to Settings → Safari → Extensions → Cat Scratches → Settings.")
                            .font(.footnote)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("About")
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Cat Scratches")
        }
        .navigationViewStyle(.stack)
    }
    
    private func openSafariExtensions() {
        // Open Safari settings - user navigates to Extensions
        if let url = URL(string: "App-Prefs:com.apple.mobilesafari") {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
    }
    
    private func openExtensionSettings() {
        // Same as above - there's no deep link to extension settings
        openSafariExtensions()
    }
}

// MARK: - Helper Views

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

#Preview {
    MainSettingsView()
}
