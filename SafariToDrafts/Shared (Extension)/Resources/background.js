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

// Sync settings - load from iCloud if available
async function syncSettings() {
    await loadSettingsFromCloud();
}

// Listen for extension startup
browser.runtime.onStartup.addListener(async () => {
    await loadSettingsFromCloud();
});

browser.runtime.onInstalled.addListener(async () => {
    // Initialize with default settings on first install, or load from iCloud
    try {
        await loadSettingsFromCloud();

        // If we have no settings, initialize with defaults and save to iCloud
        if (!extensionSettings || Object.keys(extensionSettings).length === 0) {
            extensionSettings = getDefaultSettings();
            await saveSettingsToCloud(extensionSettings);
            console.log('Initialized default settings in iCloud');
        }
    } catch (error) {
        console.error('Failed to initialize extension settings:', error);
        extensionSettings = getDefaultSettings();
    }
});

// Function to load extension settings (wrapper for compatibility)
async function loadExtensionSettings() {
    return await loadSettingsFromCloud();
}

// Function to save settings (wrapper for compatibility)
async function saveSettingsWithSync(settings) {
    extensionSettings = settings;
    await saveSettingsToCloud(settings);
}

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

// Listen for command (keyboard shortcut)
browser.commands.onCommand.addListener(async (command) => {
    if (command === "create_draft_command") {
        await createDraftFromCurrentTab();
    }
});

async function createDraftFromCurrentTab() {
    try {
        // Ensure settings are loaded
        if (!extensionSettings) {
            await loadExtensionSettings();
        }

        // Get the active tab
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (!activeTab) {
            console.error("No active tab found");
            return;
        }

        // Inject Turndown library
        await browser.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['turndown.js'] });

        // Execute content script to get page content
        const results = await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: getPageContent,
            args: [extensionSettings]
        });

        if (results && results[0] && results[0].result) {
            const pageData = results[0].result;
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

// Function that will be executed in the content script context
async function getPageContent(extensionSettings) {
    // Try to initialize Turndown for markdown conversion
    let turndownService = null;
    let useMarkdownConversion = false;

    try {
        if (typeof TurndownService !== 'undefined') {
            turndownService = new TurndownService({
                headingStyle: 'atx',
                hr: '---',
                bulletListMarker: '*',
                codeBlockStyle: 'fenced',
                linkStyle: 'inline'
            });

            // Add custom rules to filter out unwanted elements
            turndownService.addRule('removeUnwanted', {
                filter: function (node) {
                    // Remove script/style/noscript elements
                    if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || node.nodeName === 'NOSCRIPT') {
                        return true;
                    }

                    // Use customFilters for removal logic
                    if (!extensionSettings?.advancedFiltering?.customFilters) {
                        return false;
                    }
                    const customFilters = extensionSettings.advancedFiltering.customFilters;

                    // Check for image/media elements
                    if (customFilters.some(filter =>
                        filter.includes('img') || filter.includes('picture') || filter.includes('figure') ||
                        filter.includes('video') || filter.includes('audio') || filter.includes('media')
                    )) {
                        if (node.nodeName === 'IMG' || node.nodeName === 'PICTURE' || node.nodeName === 'FIGURE' ||
                            node.nodeName === 'VIDEO' || node.nodeName === 'AUDIO' || node.nodeName === 'FIGCAPTION') {
                            return true;
                        }
                    }

                    // Remove links to images
                    if (node.nodeName === 'A' && node.getAttribute('href')) {
                        const href = node.getAttribute('href').toLowerCase();
                        if (href.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff?)(\?.*)?$/i)) {
                            return true;
                        }
                    }

                    // Check all customFilters for element matching
                    for (const filter of customFilters) {
                        try {
                            if (node.matches && node.matches(filter)) {
                                return true;
                            }
                        } catch (e) {
                            // Ignore selector errors
                        }
                    }

                    // Remove JSON-LD scripts
                    if (node.getAttribute && node.getAttribute('type') === 'application/ld+json') {
                        return true;
                    }

                    return false;
                },
                replacement: function () {
                    return '';
                }
            });

            useMarkdownConversion = true;
        }
    } catch (error) {
        console.error("Failed to initialize TurndownService:", error);
    }

    const selection = window.getSelection();
    let content = "";
    let selectionSource = "page";

    try {
        // Prioritize a non-empty selection
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            if (useMarkdownConversion) {
                const container = document.createElement("div");
                container.appendChild(range.cloneContents());
                content = turndownService.turndown(container.innerHTML);
            } else {
                content = selection.toString();
            }
            selectionSource = "selection";
        } else {
            // Full page content extraction
            let mainContent = null;

            if (!extensionSettings?.contentExtraction?.customSelectors) {
                throw new Error('No content selectors configured.');
            }
            const contentSelectors = extensionSettings.contentExtraction.customSelectors;

            // Find the best content element using scoring
            let bestElement = null;
            let bestScore = 0;

            for (const selector of contentSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        const textLength = (element.textContent || '').trim().length;
                        const minContentLength = extensionSettings?.advancedFiltering?.minContentLength || 150;

                        if (textLength >= minContentLength) {
                            // Calculate link ratio
                            const linkLength = Array.from(element.querySelectorAll('a'))
                                .reduce((total, link) => total + (link.textContent || '').length, 0);
                            const linkRatio = textLength > 0 ? linkLength / textLength : 1;
                            const maxLinkRatio = extensionSettings?.advancedFiltering?.maxLinkRatio || 0.3;

                            if (linkRatio < maxLinkRatio) {
                                let score = textLength;

                                // Bonus for semantic elements
                                if (element.tagName === 'ARTICLE') score += 1000;
                                if (element.getAttribute('role') === 'main') score += 800;
                                if (element.getAttribute('itemtype')) score += 600;

                                // Bonus for content-indicating classes/IDs
                                const classAndId = ((element.className || '') + ' ' + (element.id || '')).toLowerCase();
                                if (classAndId.includes('article') || classAndId.includes('content') ||
                                    classAndId.includes('post') || classAndId.includes('entry')) {
                                    score += 400;
                                }

                                // Penalty for navigation elements
                                if (classAndId.includes('nav') || classAndId.includes('menu') ||
                                    classAndId.includes('header') || classAndId.includes('footer')) {
                                    score -= 2000;
                                }

                                if (score > bestScore) {
                                    bestScore = score;
                                    bestElement = element;
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Skip selectors that cause errors
                }
            }

            mainContent = bestElement;

            if (mainContent) {
                if (useMarkdownConversion) {
                    content = turndownService.turndown(mainContent.innerHTML);
                } else {
                    content = mainContent.textContent || mainContent.innerText || '';
                }
            } else {
                // Fallback to body
                if (useMarkdownConversion) {
                    const bodyClone = document.body.cloneNode(true);

                    if (extensionSettings?.advancedFiltering?.customFilters) {
                        const customFilters = extensionSettings.advancedFiltering.customFilters;
                        try {
                            const elementsToRemove = bodyClone.querySelectorAll(customFilters.join(', '));
                            elementsToRemove.forEach(el => el.remove());
                        } catch (e) {
                            // Ignore selector errors
                        }
                    }

                    content = turndownService.turndown(bodyClone.innerHTML);
                } else {
                    content = document.body.textContent || document.body.innerText || '';
                    content = content.substring(0, 10000);
                }
            }
        }

        // Content cleanup (single normalized pass)
        content = content
            .replace(/\n\s*\n\s*\n+/g, '\n\n')  // Multiple blank lines to double
            .replace(/ +/g, ' ')                 // Multiple spaces to single
            .replace(/.*click here to subscribe.*$/gim, '')
            .replace(/.*sign up for our newsletter.*$/gim, '')
            .replace(/.*download our app.*$/gim, '')
            .replace(/.*get breaking news alerts.*$/gim, '')
            .replace(/.*follow us on (twitter|facebook|instagram).*$/gim, '')
            .replace(/^\s*.*\(Getty Images\).*$/gm, '')
            .replace(/^\s*.*\(AP Photo.*\).*$/gm, '')
            .replace(/^\s*.*Photo credit:.*$/gm, '')
            .replace(/^\s*.*Image credit:.*$/gm, '')
            .replace(/^\s*.*\(Corbis\).*$/gm, '')
            .replace(/^\s*subscribe today\s*$/gim, '')
            .replace(/^\s*join our newsletter\s*$/gim, '')
            .replace(/^\s*advertisement\s*$/gim, '')
            .replace(/^\s*sponsored content\s*$/gim, '')
            .replace(/<!--.*?-->/g, '')
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&[a-zA-Z]+;/g, ' ')
            .trim();

        return {
            title: document.title || 'Untitled',
            url: window.location.href,
            body: content || 'No content extracted',
            source: selectionSource
        };

    } catch (error) {
        console.error("Error in content extraction:", error);
        return {
            title: document.title || 'Untitled',
            url: window.location.href,
            body: 'Content extraction failed: ' + error.message,
            source: 'error'
        };
    }
}

async function createDraft(title, url, markdownBody) {
    // Format draft content using settings
    const draftContent = formatDraftContent(title, url, markdownBody);

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
    const MAX_DRAFTS_URL_LENGTH = 65000;
    if (draftsURL.length > MAX_DRAFTS_URL_LENGTH) {
        try {
            const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (activeTab?.id) {
                await browser.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    func: (msg) => alert(msg),
                    args: ["Content too large to send to Drafts. Try selecting a smaller portion of the page."]
                });
            }
        } catch (e) {
            console.error("Failed to show length warning:", e);
        }
        return;
    }

    try {
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (activeTab) {
            const currentURL = activeTab.url;

            // Execute the URL scheme by navigating to it
            await browser.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: function (draftsUrl, originalUrl) {
                    window.location.href = draftsUrl;
                    setTimeout(() => {
                        window.location.href = originalUrl;
                    }, 2000);
                },
                args: [draftsURL, currentURL]
            });
        }
    } catch (error) {
        console.error("Error opening Drafts via URL scheme:", error);
    }
}

// Format draft content using unified template engine
function formatDraftContent(title, url, content) {
    const outputFormat = extensionSettings?.outputFormat || DEFAULT_SETTINGS.outputFormat;

    const template = (outputFormat.template || '').trim() || DEFAULT_SETTINGS.outputFormat.template;
    const timestampISO = new Date().toISOString();
    const defaultTag = outputFormat.defaultTag || '';

    return template
        .replace('{title}', title)
        .replace('{url}', url)
        .replace('{content}', content)
        .replace('{timestamp}', timestampISO)
        .replace('{tag}', defaultTag);
}
