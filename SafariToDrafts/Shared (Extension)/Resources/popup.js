// Popup script for SafariToDrafts extension

document.addEventListener('DOMContentLoaded', async () => {
    // Set up event listeners
    document.getElementById('captureContent').addEventListener('click', captureContent);
    
    // Check permissions on load
    checkPermissionsOnLoad();
    
    // Check if user has used extension before (to hide first-time tips)
    checkFirstTimeUsage();
});

// Capture content from current page
async function captureContent() {
    try {
        // Send message to background script to capture content
        await browser.runtime.sendMessage({ action: 'captureContent' });
        
        // Track usage
        await incrementUsageCount();
        
        // Close popup
        window.close();
    } catch (error) {
        console.error('Error capturing content:', error);
        
        // Fallback: directly execute the capture
        try {
            const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
            
            if (activeTab) {
                // Execute content script to get page content
                const results = await browser.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    func: getPageContentForPopup
                });

                if (results && results[0] && results[0].result) {
                    const pageData = results[0].result;
                    
                    // Send to background script for processing
                    await browser.runtime.sendMessage({
                        action: 'createDraftFromData',
                        data: pageData
                    });
                }
            }
            
            window.close();
        } catch (fallbackError) {
            console.error('Fallback capture also failed:', fallbackError);
            
            // Check if this is a permission error
            if (fallbackError.message && fallbackError.message.includes('permission')) {
                showError('Permission required. Enable extension for all websites in Safari settings.');
                showPermissionInfo();
            } else {
                showError('Could not capture content. Please try again.');
            }
        }
    }
}

// Simplified content capture for popup use
function getPageContentForPopup() {
    // Check for selected text first
    const selection = window.getSelection();
    let selectedText = selection.toString().trim();
    
    if (selectedText) {
        return {
            title: document.title,
            url: window.location.href,
            body: selectedText,
            source: 'selection'
        };
    }
    
    // If no selection, get page content (simplified version)
    let content = '';
    
    // Try to find main content
    const contentSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.content',
        '.post-content',
        '.article-content',
        '.entry-content',
        '.post-body'
    ];
    
    let mainElement = null;
    for (const selector of contentSelectors) {
        mainElement = document.querySelector(selector);
        if (mainElement) break;
    }
    
    if (mainElement) {
        content = mainElement.innerText || mainElement.textContent || '';
    } else {
        // Fallback to body, but clean it up
        const bodyText = document.body.innerText || document.body.textContent || '';
        // Take first 2000 characters to avoid too much content
        content = bodyText.substring(0, 2000);
    }
    
    return {
        title: document.title,
        url: window.location.href,
        body: content.trim(),
        source: 'page'
    };
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: absolute;
        top: 10px;
        left: 10px;
        right: 10px;
        background: #ff3b30;
        color: white;
        padding: 12px;
        border-radius: 6px;
        font-size: 14px;
        text-align: center;
        z-index: 1000;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Show permission info section
function showPermissionInfo() {
    const permissionInfo = document.getElementById('permissionInfo');
    if (permissionInfo) {
        permissionInfo.style.display = 'block';
    }
}

// Check permissions when popup loads
async function checkPermissionsOnLoad() {
    try {
        // Try to get the active tab to see if we have permission
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        
        if (activeTab) {
            // Test if we can execute a simple script
            await browser.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => true  // Simple test function
            });
        }
    } catch (error) {
        // If we can't execute script, likely a permission issue
        if (error.message && (error.message.includes('permission') || error.message.includes('Cannot access'))) {
            showPermissionInfo();
        }
    }
}

// Check if this is first time usage and manage tips accordingly
async function checkFirstTimeUsage() {
    try {
        // Get usage count from storage
        const result = await browser.storage.local.get(['usageCount']);
        const usageCount = result.usageCount || 0;
        
        // Hide first-time tips after a few uses
        if (usageCount > 3) {
            const draftsPermissionInfo = document.getElementById('draftsPermissionInfo');
            if (draftsPermissionInfo) {
                draftsPermissionInfo.style.display = 'none';
            }
        }
    } catch (error) {
        // If storage isn't available, that's okay
        console.log('Storage not available for usage tracking');
    }
}

// Increment usage count for tip management
async function incrementUsageCount() {
    try {
        const result = await browser.storage.local.get(['usageCount']);
        const usageCount = (result.usageCount || 0) + 1;
        await browser.storage.local.set({ usageCount });
    } catch (error) {
        // If storage isn't available, that's okay
        console.log('Storage not available for usage tracking');
    }
} 