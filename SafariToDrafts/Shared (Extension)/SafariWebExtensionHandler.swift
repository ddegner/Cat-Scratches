//
//  SafariWebExtensionHandler.swift
//  Shared (Extension)
//
//  Created by David Degner on 6/18/25.
//

import SafariServices
import os.log

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {

	func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems.first as? NSExtensionItem
        let message = item?.userInfo?[SFExtensionMessageKey]
        
        // Check if this is a message from our extension
        if let messageDict = message as? [String: Any],
           let action = messageDict["action"] as? String {
            if action == "openOptions" {
                openOptionsPage()
            } else {
                os_log("Ignoring action '%@' (Drafts opening handled in JS)", type: .info, action)
            }
        }
        
        context.completeRequest(returningItems: nil, completionHandler: nil)
	}
    
    // No native Drafts opening path; handled fully in background.js
    
    private func openOptionsPage() {
        // For Safari Web Extensions, the options page should be handled automatically
        // by Safari when the user right-clicks the extension button and selects "Settings"
        os_log("Options page request received", type: .info)
    }
}

let SFExtensionMessageKey = "message"
