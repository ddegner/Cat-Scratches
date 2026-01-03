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
}
