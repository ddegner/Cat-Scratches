//
//  ViewController.swift
//  Shared (App) - macOS
//
//  Created by David Degner on 6/18/25.
//

import SwiftUI
import AppKit

// MARK: - ViewController (macOS)

class ViewController: NSViewController {
    private let minimumContentSize = NSSize(width: 560, height: 700)
    private let preferredWindowContentSize = NSSize(width: 620, height: 780)
    private var hasConfiguredWindow = false

    override func viewDidLoad() {
        super.viewDidLoad()

        // Host the shared SwiftUI MainSettingsView
        let settingsView = MainSettingsView()
        let hostingController = NSHostingController(rootView: settingsView)

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
    
    override func viewDidAppear() {
        super.viewDidAppear()
        configureWindowIfNeeded()
    }
    
    private func configureWindowIfNeeded() {
        guard let window = view.window else { return }
        
        window.styleMask.insert(.resizable)
        window.styleMask.insert(.miniaturizable)
        window.contentMinSize = minimumContentSize
        
        guard !hasConfiguredWindow else { return }
        hasConfiguredWindow = true
        
        let visibleFrame = window.screen?.visibleFrame ?? NSScreen.main?.visibleFrame
        let maxWidth = (visibleFrame?.width ?? preferredWindowContentSize.width) * 0.9
        let maxHeight = (visibleFrame?.height ?? preferredWindowContentSize.height) * 0.9

        let targetSize = NSSize(
            width: min(preferredWindowContentSize.width, maxWidth),
            height: min(preferredWindowContentSize.height, maxHeight)
        )
        
        window.setContentSize(targetSize)
        window.center()
    }
}
