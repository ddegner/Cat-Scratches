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
            
            switch action {
            case "createDraft":
                let title = messageDict["title"] as? String ?? "Untitled"
                let url = messageDict["url"] as? String ?? ""
                let body = messageDict["body"] as? String ?? ""
                
                createDraft(title: title, url: url, markdownBody: body)
                
            case "openOptions":
                // Handle options page request
                openOptionsPage()
                
            default:
                os_log("Unknown action received: %@", type: .error, action)
            }
        }
        
        context.completeRequest(returningItems: nil, completionHandler: nil)
	}
    
    private func createDraft(title: String, url: String, markdownBody: String) {
        // Draft format: Title as header, URL as markdown link, then content
        let draftContent = "# \(title)\n\n[\(url)](\(url))\n\n\(markdownBody)"
        
        guard let encodedContent = draftContent.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            os_log("Failed to URL-encode draft content.", type: .error)
            return
        }
        
        let urlString = "drafts://x-callback-url/create?text=\(encodedContent)"
        guard let draftsURL = URL(string: urlString) else {
            os_log("Failed to create Drafts URL object.", type: .error)
            return
        }
        
        DispatchQueue.main.async {
            // Log helpful message for users about the dialog
            os_log("Opening Drafts app - you may see a dialog asking permission to open Drafts", type: .info)
            
            if NSWorkspace.shared.open(draftsURL) {
                os_log("Successfully opened Drafts URL", type: .debug)
            } else {
                os_log("Failed to open Drafts URL. Is the app installed?", type: .error)
            }
        }
    }
    
    private func openOptionsPage() {
        // For Safari Web Extensions, the options page should be handled automatically
        // by Safari when the user right-clicks the extension button and selects "Settings"
        os_log("Options page request received", type: .info)
    }
}

let SFExtensionMessageKey = "message"
