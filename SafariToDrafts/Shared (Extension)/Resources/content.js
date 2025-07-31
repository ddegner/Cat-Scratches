// Content script for SafariToDrafts extension
// This script ensures Turndown is available and provides settings access

// Global settings object
let extensionSettings = null;

// Initialize settings when the script loads
(async function() {
    await loadExtensionSettings();
})();

// Ensure Turndown is available globally for the executeScript function
if (typeof window.TurndownService === 'undefined' && typeof TurndownService !== 'undefined') {
    window.TurndownService = TurndownService;
}

// Function to load extension settings from storage
async function loadExtensionSettings() {
    try {
        if (typeof browser !== 'undefined') {
            const result = await browser.storage.local.get(['safariToDraftsSettings']);
            if (result.safariToDraftsSettings) {
                extensionSettings = result.safariToDraftsSettings;
            } else {
                extensionSettings = null;
            }
        } else {
            console.warn('Content script: Browser API not available for settings');
        }
    } catch (error) {
        console.error('Content script: Failed to load extension settings:', error);
        extensionSettings = null;
    }
}

// Listen for settings changes
if (typeof browser !== 'undefined') {
    browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.safariToDraftsSettings) {
            extensionSettings = changes.safariToDraftsSettings.newValue;
        }
    });
}

// Make settings available to any code that needs it
window.getSafariToDraftsSettings = function() {
    return extensionSettings;
};
