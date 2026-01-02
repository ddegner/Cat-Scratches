//
//  SafariWebExtensionHandler.swift
//  Shared (Extension)
//
//  Created by David Degner on 6/18/25.
//

import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    
    // iCloud Key-Value Store for cross-device sync
    // Uses single-key pattern: store entire settings dict under "settings" key
    private let store = NSUbiquitousKeyValueStore.default
    private let settingsKey = "settings"

    func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems.first as? NSExtensionItem
        let message = item?.userInfo?[SFExtensionMessageKey]
        
        guard let messageDict = message as? [String: Any],
              let action = messageDict["action"] as? String else {
            context.completeRequest(returningItems: nil, completionHandler: nil)
            return
        }
        
        var response: [String: Any] = ["success": true]
        
        switch action {
        case "getSettings":
            // Sync from iCloud first (only call synchronize on READ, not write)
            store.synchronize()
            
            // Load settings dictionary from iCloud Key-Value Store
            if let settingsDict = store.dictionary(forKey: settingsKey) {
                response["settings"] = settingsDict
                os_log(.info, "Loaded settings from iCloud KVS")
            } else {
                response["settings"] = NSNull()
                os_log(.info, "No settings found in iCloud KVS")
            }
            
        case "saveSettings":
            // Save settings to iCloud Key-Value Store (single dictionary key pattern)
            // NOTE: Do NOT call synchronize() on every write - let iCloud handle it
            if let settings = messageDict["settings"] as? [String: Any] {
                // Store as dictionary - must be property-list safe types
                store.set(settings, forKey: settingsKey)
                response["saved"] = true
                os_log(.info, "Settings saved to iCloud KVS (will sync automatically)")
            } else {
                response["success"] = false
                response["error"] = "Settings must be a dictionary"
                os_log(.error, "Failed to save settings: not a dictionary")
            }
            
        case "openOptions":
            os_log(.info, "Options page request received")
            
        default:
            os_log(.info, "Ignoring action: %{public}@", action)
        }
        
        // Send response back to JavaScript
        let responseItem = NSExtensionItem()
        responseItem.userInfo = [SFExtensionMessageKey: response]
        context.completeRequest(returningItems: [responseItem], completionHandler: nil)
    }
}
