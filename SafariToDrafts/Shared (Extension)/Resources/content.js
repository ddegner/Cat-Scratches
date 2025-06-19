// Content script for SafariToDrafts extension
// This script ensures Turndown is available and provides minimal fallback functionality

// Ensure Turndown is available globally for the executeScript function
if (typeof window.TurndownService === 'undefined' && typeof TurndownService !== 'undefined') {
    window.TurndownService = TurndownService;
}

// Minimal legacy function for compatibility
function getPageContentLegacy() {
    return {
        title: document.title,
        url: window.location.href,
        body: document.body.innerText || '',
        source: 'page'
    };
}
