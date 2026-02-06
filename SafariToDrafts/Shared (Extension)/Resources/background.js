// Background script for Cat Scratches extension
// Handles keyboard shortcuts and toolbar button clicks
'use strict';

// Load defaults.js in service worker context
try {
    self.importScripts('defaults.js');
} catch (e) {
    console.error('Failed to load defaults.js:', e);
}

// Global settings object
let extensionSettings = null;

// NATIVE_APP_ID is provided by defaults.js

// ============================================================================
// SETTINGS SYNC ARCHITECTURE:
// - Primary storage: iCloud via NSUbiquitousKeyValueStore (accessed via native messaging)
// - Cache: browser.storage.local for offline support
// - browser.storage.sync is NOT used because Safari doesn't actually sync it across devices
// ============================================================================

// Load settings from iCloud (with local cache fallback)
async function loadSettingsFromCloud() {
    try {
        // Try to get settings from iCloud via native messaging
        const response = await browser.runtime.sendNativeMessage(NATIVE_APP_ID, {
            action: 'getSettings'
        });

        if (response && response.settings && typeof response.settings === 'object') {
            extensionSettings = migrateSettings(response.settings);
            // Cache locally for offline access
            await browser.storage.local.set({ catScratchesSettings: extensionSettings });
            console.log('Settings loaded from iCloud');
            return extensionSettings;
        }
    } catch (error) {
        console.log('Could not load from iCloud, trying local cache:', error.message);
    }

    // Fallback to local cache
    try {
        const localResult = await browser.storage.local.get(['catScratchesSettings']);
        if (localResult.catScratchesSettings) {
            extensionSettings = migrateSettings(localResult.catScratchesSettings);
            console.log('Settings loaded from local cache');
            return extensionSettings;
        }
    } catch (error) {
        console.log('Local cache also failed:', error.message);
    }

    // Last resort: use defaults
    extensionSettings = getDefaultSettings();
    console.log('Using default settings');
    return extensionSettings;
}

// Save settings to iCloud (and local cache)
async function saveSettingsToCloud(settings) {
    // Always cache locally first
    await browser.storage.local.set({ catScratchesSettings: settings });

    // Then save to iCloud
    try {
        const response = await browser.runtime.sendNativeMessage(NATIVE_APP_ID, {
            action: 'saveSettings',
            settings: settings
        });
        if (response && response.success) {
            console.log('Settings saved to iCloud');
        }
    } catch (error) {
        console.log('Could not save to iCloud (saved locally):', error.message);
    }
}

// Listen for extension startup
browser.runtime.onStartup.addListener(async () => {
    await loadSettingsFromCloud();
});

browser.runtime.onInstalled.addListener(async () => {
    // Initialize with default settings on first install, or load from iCloud
    try {
        await loadSettingsFromCloud();

        // If we have no settings, initialize with defaults
        if (!extensionSettings || Object.keys(extensionSettings).length === 0) {
            extensionSettings = getDefaultSettings();
        }

        // Check if Drafts is installed and set default destination accordingly
        // Note: iOS extension cannot check this, so it returns null
        try {
            const response = await browser.runtime.sendNativeMessage(NATIVE_APP_ID, {
                action: 'checkDraftsInstalled'
            });
            // If draftsInstalled is null (iOS extension limitation), keep current/default setting
            // If defined (macOS), set destination based on availability
            if (response?.draftsInstalled !== null && response?.draftsInstalled !== undefined) {
                const draftsInstalled = response.draftsInstalled;
                extensionSettings.saveDestination = draftsInstalled ? 'drafts' : 'share';
                console.log('Drafts installed:', draftsInstalled, '- default destination:', extensionSettings.saveDestination);
            } else {
                // iOS or unknown - keep existing setting, default to drafts
                console.log('Cannot determine Drafts installation (iOS extension), keeping current destination:', extensionSettings.saveDestination);
            }
        } catch (checkError) {
            console.log('Could not check Drafts installation, keeping current setting:', checkError.message);
        }

        await saveSettingsToCloud(extensionSettings);
        console.log('Initialized settings in iCloud');
    } catch (error) {
        console.error('Failed to initialize extension settings:', error);
        extensionSettings = getDefaultSettings();
    }
});

// Listen for toolbar button clicks
browser.action.onClicked.addListener(async () => {
    await createDraftFromCurrentTab();
});

// Listen for messages (for settings page communication)
browser.runtime.onMessage.addListener(async (message) => {
    if (message.action === 'captureContent') {
        await createDraftFromCurrentTab();
    } else if (message.action === 'createDraftFromData') {
        const data = message.data;
        await createDraft(data.title, data.url, data.body);
    }
});

// Listen for settings changes in storage
browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.catScratchesSettings) {
        extensionSettings = migrateSettings(changes.catScratchesSettings.newValue);
        console.log('Settings updated from local storage change');
    }
});



async function createDraftFromCurrentTab() {
    try {
        // Ensure settings are loaded
        if (!extensionSettings) {
            await loadSettingsFromCloud();
        }

        // Get the active tab
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (!activeTab) {
            console.error("No active tab found");
            return;
        }

        // Inject Turndown library AND Shared Content Extractor
        await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['turndown.js', 'content-extractor.js']
        });

        // Execute content script to get page content
        const results = await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (settings) => {
                // This runs in the Tab context
                // Check for user selection first
                const selection = window.getSelection();
                const hasSelection = selection && !selection.isCollapsed && selection.rangeCount > 0;

                if (hasSelection) {
                    // User has selected text - prioritize this
                    try {
                        const range = selection.getRangeAt(0);
                        const container = document.createElement("div");
                        container.appendChild(range.cloneContents());

                        // Use Turndown if available
                        let content;
                        if (typeof TurndownService !== 'undefined') {
                            const turndownService = new TurndownService({
                                headingStyle: 'atx',
                                hr: '---',
                                bulletListMarker: '*',
                                codeBlockStyle: 'fenced',
                                linkStyle: 'inline'
                            });
                            content = turndownService.turndown(container.innerHTML);
                        } else {
                            content = container.textContent || '';
                        }

                        return {
                            title: document.title || 'Untitled',
                            url: window.location.href,
                            body: content || 'No content in selection',
                            source: 'selection'
                        };
                    } catch (e) {
                        console.error("Selection extraction failed:", e);
                        // Fall through to page extraction
                    }
                }

                // No selection - use full page extraction via shared function
                try {
                    const result = window.extractContentFromDoc(document, settings, window.location.href);
                    return {
                        title: result.title,
                        url: window.location.href,
                        body: result.body,
                        source: 'page'
                    };
                } catch (e) {
                    return { error: e.toString() };
                }
            },
            args: [extensionSettings]
        });

        if (results && results[0] && results[0].result) {
            const pageData = results[0].result;
            if (pageData.error) throw new Error(pageData.error);

            await createDraft(pageData.title, pageData.url, pageData.body);
        }
    } catch (error) {
        console.error("Error creating draft:", error);

        // Show user-friendly error message
        try {
            const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (activeTab) {
                await browser.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    func: (errorMessage) => {
                        alert('Cat Scratches Error: ' + errorMessage);
                    },
                    args: [error.message]
                });
            }
        } catch (alertError) {
            console.error("Could not show error message:", alertError);
        }
    }
}

async function createDraft(title, url, markdownBody) {
    const destination = extensionSettings?.saveDestination || 'drafts';

    if (destination === 'notes' || destination === 'share') {
        await invokeShareSheet(title, url, markdownBody);
    } else {
        await sendToDrafts(title, url, markdownBody);
    }
}

async function sendToDrafts(title, url, markdownBody) {
    // Format draft content using settings (from defaults.js)
    const draftContent = formatDraftContent(title, url, markdownBody, extensionSettings);

    // URL encode the content for the Drafts URL scheme
    const encodedContent = encodeURIComponent(draftContent);

    // Build the Drafts URL with optional tag
    let draftsURL = `drafts://x-callback-url/create?text=${encodedContent}`;

    // Add tag if specified in settings
    const defaultTag = extensionSettings?.outputFormat?.defaultTag;
    if (defaultTag && defaultTag.trim()) {
        const tags = defaultTag.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (tags.length > 0) {
            const encodedTags = encodeURIComponent(tags.join(','));
            draftsURL += `&tag=${encodedTags}`;
        }
    }

    // Check URL length before opening - very long URLs will fail
    const MAX_URL_LENGTH = 65000;
    if (draftsURL.length > MAX_URL_LENGTH) {
        await showContentTooLargeError('Drafts');
        return;
    }

    await openURLScheme(draftsURL);
}

async function invokeShareSheet(title, url, markdownBody) {
    // Format content for sharing (from defaults.js)
    const shareContent = formatDraftContent(title, url, markdownBody, extensionSettings);

    try {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (activeTab?.id) {
            // Use the Web Share API from the page context
            await browser.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: (shareData) => {
                    if (navigator.share) {
                        navigator.share(shareData)
                            .then(() => console.log('Shared successfully'))
                            .catch((error) => console.log('Error sharing:', error));
                    } else {
                        alert('System sharing is not supported in this browser context.');
                    }
                },
                args: [{
                    title: title,
                    text: shareContent
                }]
            });
        }
    } catch (error) {
        console.error("Failed to share:", error);
    }
}

async function showContentTooLargeError(appName) {
    try {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
            await browser.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: (msg) => alert(msg),
                args: [`Content too large to send to ${appName}. Try selecting a smaller portion of the page.`]
            });
        }
    } catch (e) {
        console.error("Failed to show length warning:", e);
    }
}

async function openURLScheme(targetURL) {
    try {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (activeTab) {
            // Use tabs.update to navigate to the custom scheme
            // This is trusted from the background script and often bypasses the "Open in App?" prompt
            await browser.tabs.update(activeTab.id, { url: targetURL });
        }
    } catch (error) {
        console.error("Error opening URL scheme:", error);
    }
}

