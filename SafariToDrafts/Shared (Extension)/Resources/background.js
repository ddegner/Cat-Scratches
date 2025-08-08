// Background script for Cat Scratches extension
// Handles keyboard shortcuts and toolbar button clicks
// Ensure defaults are loaded in MV3 service worker context
try { /* ESM import for MV3 */
    importScripts; // reference to avoid bundlers removing next line in non-module contexts
} catch (_) { /* noop */ }
try {
    // For MV3 module service worker, prefer static import
    // Note: This will be ignored by MV2/background page
    // eslint-disable-next-line import/no-unresolved
    // @ts-ignore
    import('./defaults.js');
} catch (_) {
    // Fallback for non-module worker environments (not expected on MV3)
    try { self.importScripts('defaults.js'); } catch (_) {}
}

// Global settings object
let extensionSettings = null;

// Provide robust defaults even if defaults.js fails to load in MV3 worker
function getEffectiveDefaults() {
    try {
        if (typeof getDefaultSettings === 'function') {
            return getDefaultSettings();
        }
        if (typeof DEFAULT_SETTINGS !== 'undefined') {
            return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }
    } catch (_) { /* ignore */ }
    // Minimal built-in defaults to ensure first-run works
    return {
        contentExtraction: {
            strategy: 'default',
            customSelectors: [
                '[itemtype*="Article"]',
                '[itemtype*="BlogPosting"]',
                '[itemtype*="NewsArticle"]',
                'article[role="main"]',
                'main[role="main"]',
                'article',
                'main',
                '[role="main"]',
                '.entry-content',
                '.post-content',
                '.article-content',
                '.content',
                '.post',
                '.entry'
            ]
        },
        outputFormat: {
            template: '# {title}\n\n<{url}>\n\n---\n\n{content}',
            defaultTag: ''
        },
        advancedFiltering: {
            customFilters: ['img', 'picture', 'figure', 'video', 'audio', 'nav', 'header', 'footer', '.ad', '.ads', '.advertisement', '.social', '.share', '.comments'],
            minContentLength: 150,
            maxLinkRatio: 0.3
        }
    };
}

// Listen for extension startup
browser.runtime.onStartup.addListener(() => {
    loadExtensionSettings();
});

browser.runtime.onInstalled.addListener(async () => {
    // Check if we have permission to run on all websites
    checkPermissions();

    // Initialize with default settings on first install
    try {
        const result = await browser.storage.local.get(['catScratchesSettings']);
        if (!result.catScratchesSettings) {
            // First install - save default settings
            const defaultSettings = getEffectiveDefaults();
            await browser.storage.local.set({
                catScratchesSettings: defaultSettings
            });
            extensionSettings = defaultSettings;
        } else {
            // Extension already has settings
            extensionSettings = migrateSettings(result.catScratchesSettings);
            // Persist migrated structure if changes were applied
            await browser.storage.local.set({ catScratchesSettings: extensionSettings });
        }
    } catch (error) {
        console.error('Failed to initialize extension settings:', error);
        // Don't throw here - let the extension load and show error when used
    }
});

// Listen for settings changes
browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.catScratchesSettings) {
        extensionSettings = migrateSettings(changes.catScratchesSettings.newValue);
    }
});

// Function to load extension settings from storage
async function loadExtensionSettings() {
    try {
        const result = await browser.storage.local.get(['catScratchesSettings']);
        if (result.catScratchesSettings) {
            extensionSettings = migrateSettings(result.catScratchesSettings);
            // Persist migrated structure
            await browser.storage.local.set({ catScratchesSettings: extensionSettings });
        } else {
            // No settings found - initialize from defaults to support true first-run actions
            const defaults = getEffectiveDefaults();
            extensionSettings = migrateSettings(defaults);
            await browser.storage.local.set({ catScratchesSettings: extensionSettings });
        }
    } catch (error) {
        console.error('Failed to load extension settings:', error);
        // Last-resort fallback to in-memory defaults so user action can still proceed
        if (!extensionSettings) {
            try { extensionSettings = migrateSettings(getEffectiveDefaults()); }
            catch (_) { /* keep null; caller will surface a friendly error */ }
        }
        throw new Error('Failed to load extension settings: ' + error.message);
    }
}

// Default settings are provided by defaults.js (getDefaultSettings)

// Remove broad permission checks to avoid host-wide prompts; rely on activeTab
async function checkPermissions() { /* no-op */ }

// Listen for toolbar button clicks
browser.action.onClicked.addListener(async (tab) => {
    await createDraftFromCurrentTab();
});

// Listen for messages (keeping for settings page communication)
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.action === 'captureContent') {
        await createDraftFromCurrentTab();
    } else if (message.action === 'createDraftFromData') {
        const data = message.data;
        const isSelection = data.source === 'selection';
        await createDraft(data.title, data.url, data.body, isSelection);
    }
});



// Listen for command (keyboard shortcut)
browser.commands.onCommand.addListener(async (command) => {
    if (command === "create_draft_command") {
        await createDraftFromCurrentTab();
    }
});

// Context menus not needed for this extension

async function createDraftFromCurrentTab() {
    try {
        // Ensure settings are loaded
        if (!extensionSettings) {
            await loadExtensionSettings();
        }

        // Get the active tab. activeTab permission enables temporary scripting on user gesture.
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (!activeTab) {
            console.error("No active tab found");
            return;
        }

        // Inject Turndown library and content utilities under the current user gesture
        await browser.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['turndown.js'] });
        await browser.scripting.executeScript({ target: { tabId: activeTab.id }, files: ['content.js'] });

        // Execute content script to get page content
        const results = await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: getPageContent,
            args: [extensionSettings]
        });

        if (results && results[0] && results[0].result) {
            const pageData = results[0].result;
            const isSelection = pageData.source === 'selection';
            await createDraft(pageData.title, pageData.url, pageData.body, isSelection);
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
    // Try to initialize Turndown for markdown conversion with fallback
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

            // Add custom rules to filter out unwanted elements using customFilters
            turndownService.addRule('removeUnwanted', {
                filter: function(node) {
                    // Remove only obvious non-content elements
                    if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || node.nodeName === 'NOSCRIPT') {
                        return true;
                    }

                    // Use customFilters for all removal logic
                    if (!extensionSettings?.advancedFiltering?.customFilters) {
                        throw new Error('No custom filters configured. Please check extension settings.');
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

                    // Remove elements with JSON-LD that are not article content
                    if (node.getAttribute &&
                        node.getAttribute('type') === 'application/ld+json') {
                        return true;
                    }

                    return false;
                },
                replacement: function() {
                    return '';
                }
            });

            useMarkdownConversion = true;
        } else {
            // TurndownService not available, using fallback text extraction
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
            // Simplified content extraction for full page
            let mainContent = null;

            // Get content selectors from settings - no fallbacks
            if (!extensionSettings?.contentExtraction?.customSelectors) {
                throw new Error('No content selectors configured. Please check extension settings.');
            }
            const contentSelectors = extensionSettings.contentExtraction.customSelectors;

            // Find the best content element using a simplified scoring system
            let bestElement = null;
            let bestScore = 0;

            for (const selector of contentSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    for (const element of elements) {
                        const textLength = (element.textContent || '').trim().length;
                        const minContentLength = extensionSettings?.advancedFiltering?.minContentLength;
                        if (minContentLength === undefined || minContentLength === null) {
                            throw new Error('Minimum content length not configured. Please check extension settings.');
                        }
                        
                        if (textLength >= minContentLength) {
                            // Calculate link ratio
                            const linkLength = Array.from(element.querySelectorAll('a'))
                                .reduce((total, link) => total + (link.textContent || '').length, 0);
                            const linkRatio = textLength > 0 ? linkLength / textLength : 1;
                            const maxLinkRatio = extensionSettings?.advancedFiltering?.maxLinkRatio;
                            if (maxLinkRatio === undefined || maxLinkRatio === null) {
                                throw new Error('Maximum link ratio not configured. Please check extension settings.');
                            }
                            
                            if (linkRatio < maxLinkRatio) {
                                // Simple scoring system
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
                // Fallback to body if no content found
                if (useMarkdownConversion) {
                    // Create a clone of the body to modify
                    const bodyClone = document.body.cloneNode(true);

                    // Remove elements using customFilters for fallback
                    if (!extensionSettings?.advancedFiltering?.customFilters) {
                        throw new Error('No custom filters configured. Please check extension settings.');
                    }
                    const customFilters = extensionSettings.advancedFiltering.customFilters;
                    const elementsToRemove = bodyClone.querySelectorAll(customFilters.join(', '));
                    elementsToRemove.forEach(el => el.remove());

                    content = turndownService.turndown(bodyClone.innerHTML);
                } else {
                    content = document.body.textContent || document.body.innerText || '';
                    content = content.substring(0, 10000);
                }
            }
        }

        // Content cleanup (single normalization pass)
        content = content
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .replace(/ +/g, ' ')
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
            .replace(/\n\s*\n\s*\n/g, '\n\n')
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

async function createDraft(title, url, markdownBody, isSelection = false) {

    // Format draft content using settings
    const draftContent = formatDraftContent(title, url, markdownBody, isSelection);

    // URL encode the content for the Drafts URL scheme
    const encodedContent = encodeURIComponent(draftContent);
    
    // Build the Drafts URL with optional tag
    let draftsURL = `drafts://x-callback-url/create?text=${encodedContent}`;
    
    // Add tag if specified in settings
    const defaultTag = extensionSettings?.outputFormat?.defaultTag;
    if (defaultTag && defaultTag.trim()) {
        // Handle multiple tags separated by commas
        const tags = defaultTag.split(',').map(tag => tag.trim()).filter(tag => tag);
        if (tags.length > 0) {
            // For multiple tags, use comma-separated format in a single tag parameter
            const encodedTags = encodeURIComponent(tags.join(','));
            draftsURL += `&tag=${encodedTags}`;
        }
    }

    // Debug logging
    console.log("Draft content length:", draftContent.length);
    console.log("Drafts URL length:", draftsURL.length);

    try {
        // Get the active tab
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (activeTab) {
            // Store the current URL so we can navigate back
            const currentURL = activeTab.url;

            // Execute the URL scheme by navigating to it (primary method)
            await browser.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: function(draftsUrl, originalUrl) {
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

// Format draft content: unified template engine with default template
function formatDraftContent(title, url, content, _isSelection = false) {
    const defaults = (typeof DEFAULT_SETTINGS !== 'undefined') ? DEFAULT_SETTINGS.outputFormat : null;
    const outputFormat = (extensionSettings && extensionSettings.outputFormat) || defaults || {};
    const template = (outputFormat.template || '').trim() || '# {title}\n\n<{url}>\n\n---\n\n{content}';
    const timestampISO = new Date().toISOString();
    const defaultTag = outputFormat.defaultTag || '';

    return template
        .replace('{title}', title)
        .replace('{url}', url)
        .replace('{content}', content)
        .replace('{timestamp}', timestampISO)
        .replace('{tag}', defaultTag);
}

// Migrate older settings to unified template model
function migrateSettings(inputSettings) {
    const settings = JSON.parse(JSON.stringify(inputSettings || {}));
    settings.outputFormat = settings.outputFormat || {};

    // Construct a template if missing, leveraging legacy flags if present
    if (!settings.outputFormat.template) {
        const legacy = settings.outputFormat;
        const legacyCustom = (legacy.customTemplate || '').trim();
        if (legacyCustom) {
            settings.outputFormat.template = legacyCustom;
        } else {
            // Build from legacy include flags or fall back to default
            const defaultTemplate = (typeof DEFAULT_SETTINGS !== 'undefined' && DEFAULT_SETTINGS.outputFormat && DEFAULT_SETTINGS.outputFormat.template)
                ? DEFAULT_SETTINGS.outputFormat.template
                : '# {title}\n\n<{url}>\n\n---\n\n{content}';
            let tpl = defaultTemplate;
            // If legacy includeSource was false, remove {url} line
            if (legacy.hasOwnProperty('includeSource') && legacy.includeSource === false) {
                tpl = tpl.replace(/\n?\n?\{url\}\n?/g, '\n');
            }
            // If legacy includeSeparator was false, remove separator line
            if (legacy.hasOwnProperty('includeSeparator') && legacy.includeSeparator === false) {
                tpl = tpl.replace(/\n?\n?---\n?/g, '\n');
            }
            // If legacy includeTimestamp true, append timestamp after URL line
            if (legacy.hasOwnProperty('includeTimestamp') && legacy.includeTimestamp === true) {
                // Insert a timestamp line after formattedTitle/url block if url present, else after title
                if (tpl.includes('{url}')) {
                    tpl = tpl.replace('{url}', '{url}\n\n{timestamp}');
                } else if (tpl.includes('{title}')) {
                    tpl = tpl.replace('{title}', '{title}\n\n{timestamp}');
                }
            }
            settings.outputFormat.template = tpl;
        }
    }

    // Replace {formattedTitle} with a concrete heading based on legacy titleFormat
    if (settings.outputFormat.template && settings.outputFormat.template.includes('{formattedTitle}')) {
        const legacyFormat = settings.outputFormat.titleFormat || 'h1';
        let headingSyntax = '# {title}';
        if (legacyFormat === 'h2') headingSyntax = '## {title}';
        else if (legacyFormat === 'h3') headingSyntax = '### {title}';
        else if (legacyFormat === 'bold') headingSyntax = '**{title}**';
        else if (legacyFormat === 'none') headingSyntax = '';
        settings.outputFormat.template = settings.outputFormat.template.replace('{formattedTitle}', headingSyntax).replace(/\n\n\n+/g, '\n\n').trim();
    }

    // Cleanup legacy fields
    delete settings.outputFormat.includeSource;
    delete settings.outputFormat.includeSeparator;
    delete settings.outputFormat.includeTimestamp;
    delete settings.outputFormat.customTemplate;
    delete settings.outputFormat.titleFormat;

    return settings;
}
