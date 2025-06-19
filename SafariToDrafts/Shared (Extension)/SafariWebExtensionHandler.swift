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
           let action = messageDict["action"] as? String,
           action == "createDraft" {
            
            let title = messageDict["title"] as? String ?? "Untitled"
            let url = messageDict["url"] as? String ?? ""
            let body = messageDict["body"] as? String ?? ""
            
            createDraft(title: title, url: url, markdownBody: body)
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
            if NSWorkspace.shared.open(draftsURL) {
                os_log("Successfully opened Drafts URL", type: .debug)
            } else {
                os_log("Failed to open Drafts URL. Is the app installed?", type: .error)
            }
        }
    }
}

let SFExtensionMessageKey = "message"
