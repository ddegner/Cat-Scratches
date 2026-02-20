// Background script for Cat Scratches extension
// Handles keyboard shortcuts and toolbar button clicks
'use strict';

// Load shared scripts in service worker context
function importSharedScript(fileName) {
    try {
        self.importScripts(fileName);
    } catch (error) {
        console.error(`Failed to load ${fileName}:`, error);
    }
}

importSharedScript('defaults.js');
importSharedScript('settings-store.js');

// Global settings object
let extensionSettings = null;

// NATIVE_APP_ID is provided by defaults.js

// ============================================================================
// SETTINGS SYNC ARCHITECTURE:
// - Primary storage: iCloud via NSUbiquitousKeyValueStore (accessed via native messaging)
// - Cache: browser.storage.local for offline support
// - browser.storage.sync is NOT used because Safari doesn't actually sync it across devices
// ============================================================================

const LOCAL_SETTINGS_KEY = SETTINGS_CACHE_KEY;

async function loadSettingsFromStore() {
    const result = await loadCatScratchesSettings();
    extensionSettings = result.settings;

    if (result.source === 'icloud') {
        console.log('Settings loaded from iCloud');
    } else if (result.source === 'local') {
        console.log('Settings loaded from local cache');
    } else {
        console.log('Using default settings');
    }

    return extensionSettings;
}

async function saveSettingsToStore(settings) {
    const result = await saveCatScratchesSettings(settings);
    extensionSettings = result.settings;

    if (result.savedToCloud) {
        console.log('Settings saved to iCloud');
    } else {
        console.log('Could not save to iCloud (saved locally).');
    }
}

// Listen for extension startup
browser.runtime.onStartup.addListener(async () => {
    await loadSettingsFromStore();
});

browser.runtime.onInstalled.addListener(async (details) => {
    // Initialize with default settings on first install, or load from iCloud
    try {
        await loadSettingsFromStore();

        // Only set default destination on first install (or if missing/invalid).
        // This preserves an existing user preference during extension updates.
        const isFirstInstall = details?.reason === 'install';
        const hasValidDestination = ['drafts', 'share'].includes(extensionSettings.saveDestination);

        if (isFirstInstall || !hasValidDestination) {
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
        } else {
            console.log('Preserving existing destination setting:', extensionSettings.saveDestination);
        }

        await saveSettingsToStore(extensionSettings);
        console.log('Initialized extension settings');
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
    if (areaName === 'local' && changes[LOCAL_SETTINGS_KEY]) {
        extensionSettings = migrateSettings(changes[LOCAL_SETTINGS_KEY].newValue);
        console.log('Settings updated from local storage change');
    }
});



async function createDraftFromCurrentTab() {
    try {
        // Ensure settings are loaded
        if (!extensionSettings) {
            await loadSettingsFromStore();
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

    if (destination === 'share') {
        await invokeShareSheet(title, url, markdownBody);
    } else {
        await sendToDrafts(title, url, markdownBody);
    }
}

function getEncodedDraftTags(settings) {
    const defaultTag = settings?.outputFormat?.defaultTag;
    if (!defaultTag || !defaultTag.trim()) {
        return '';
    }

    const tags = defaultTag.split(',').map(tag => tag.trim()).filter(tag => tag);
    if (tags.length === 0) {
        return '';
    }

    return encodeURIComponent(tags.join(','));
}

function getDraftsURLMode(settings) {
    return settings.draftsURL.mode;
}

function getEncodedDraftAction(settings) {
    const actionName = settings?.draftsURL?.actionName;
    if (!actionName || !actionName.trim()) {
        return '';
    }

    return encodeURIComponent(actionName.trim());
}

function buildDraftsCreateURL(draftContent, encodedTags, encodedAction) {
    const encodedContent = encodeURIComponent(draftContent);
    let draftsURL = `drafts://x-callback-url/create?text=${encodedContent}`;

    if (encodedTags) {
        draftsURL += `&tag=${encodedTags}`;
    }

    if (encodedAction) {
        draftsURL += `&action=${encodedAction}`;
    }

    return draftsURL;
}

function buildDraftsRunActionURL(draftContent, encodedAction) {
    const encodedContent = encodeURIComponent(draftContent);
    let draftsURL = `drafts://x-callback-url/runAction?text=${encodedContent}`;

    if (encodedAction) {
        draftsURL += `&action=${encodedAction}`;
    }

    return draftsURL;
}

function buildDraftsURL(draftContent, encodedTags, draftsURLMode, encodedAction) {
    if (draftsURLMode === 'runAction') {
        return buildDraftsRunActionURL(draftContent, encodedAction);
    }

    return buildDraftsCreateURL(draftContent, encodedTags, encodedAction);
}

function truncateToCodePointBoundary(text, maxLength) {
    if (maxLength <= 0) {
        return '';
    }

    let truncated = text.slice(0, maxLength);

    // Avoid ending on an unpaired high surrogate.
    const lastCodeUnit = truncated.charCodeAt(truncated.length - 1);
    if (lastCodeUnit >= 0xD800 && lastCodeUnit <= 0xDBFF) {
        truncated = truncated.slice(0, -1);
    }

    return truncated;
}

function buildMaxLengthDraftsURL(draftContent, encodedTags, maxURLLength, draftsURLMode, encodedAction) {
    const fullURL = buildDraftsURL(draftContent, encodedTags, draftsURLMode, encodedAction);
    if (fullURL.length <= maxURLLength) {
        return { url: fullURL, wasTruncated: false };
    }

    let low = 0;
    let high = draftContent.length;
    let bestURL = null;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidateContent = truncateToCodePointBoundary(draftContent, mid);
        const candidateURL = buildDraftsURL(candidateContent, encodedTags, draftsURLMode, encodedAction);

        if (candidateURL.length <= maxURLLength) {
            bestURL = candidateURL;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    if (!bestURL) {
        return null;
    }

    return { url: bestURL, wasTruncated: true };
}

async function sendToDrafts(title, url, markdownBody) {
    // Format draft content using settings (from defaults.js)
    const draftContent = formatDraftContent(title, url, markdownBody, extensionSettings);
    const encodedTags = getEncodedDraftTags(extensionSettings);
    const encodedAction = getEncodedDraftAction(extensionSettings);
    const draftsURLMode = getDraftsURLMode(extensionSettings);
    const MAX_URL_LENGTH = 65000;

    if (draftsURLMode === 'runAction' && !encodedAction) {
        await showDraftsActionRequiredError();
        return;
    }

    const result = buildMaxLengthDraftsURL(
        draftContent,
        encodedTags,
        MAX_URL_LENGTH,
        draftsURLMode,
        encodedAction
    );

    if (!result) {
        await showContentTooLargeError('Drafts');
        return;
    }

    if (result.wasTruncated) {
        console.warn('Draft content exceeded URL length limit and was truncated to fit.');
    }

    await openURLScheme(result.url);
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

async function showDraftsActionRequiredError() {
    try {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (activeTab?.id) {
            await browser.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: () => {
                    alert('Cat Scratches Error: Action URL mode requires a Drafts Action Name in Advanced Settings.');
                }
            });
        }
    } catch (error) {
        console.error('Could not show Drafts action required error:', error);
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
