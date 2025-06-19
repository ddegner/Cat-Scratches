// Popup script for SafariToDrafts extension

document.addEventListener('DOMContentLoaded', async () => {
    // Set up event listeners
    document.getElementById('captureContent').addEventListener('click', captureContent);
});

// Capture content from current page
async function captureContent() {
    try {
        // Send message to background script to capture content
        await browser.runtime.sendMessage({ action: 'captureContent' });
        
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
            showError('Could not capture content. Please try again.');
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