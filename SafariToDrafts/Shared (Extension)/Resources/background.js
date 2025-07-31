// Background script for SafariToDrafts extension
// Handles keyboard shortcuts and toolbar button clicks

// Global settings object
let extensionSettings = null;

// Listen for extension startup
browser.runtime.onStartup.addListener(() => {
    loadExtensionSettings();
});

browser.runtime.onInstalled.addListener(() => {
    // Check if we have permission to run on all websites
    checkPermissions();

    // Load settings
    loadExtensionSettings();
});

// Listen for settings changes
browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.safariToDraftsSettings) {
        extensionSettings = changes.safariToDraftsSettings.newValue;
    }
});

// Function to load extension settings from storage
async function loadExtensionSettings() {
    try {
        const result = await browser.storage.local.get(['safariToDraftsSettings']);
        if (result.safariToDraftsSettings) {
            extensionSettings = result.safariToDraftsSettings;
        } else {
            extensionSettings = null;
        }
    } catch (error) {
        console.error('Failed to load extension settings:', error);
        extensionSettings = null;
    }
}

// Function to check and request permissions
async function checkPermissions() {
    try {
        // In Safari, we can't actually request permissions programmatically
        // But we can detect when we don't have them and inform the user
        const hasPermission = await browser.permissions.contains({
            origins: ["<all_urls>"]
        });

        if (!hasPermission) {
            // Note: Safari doesn't support requesting permissions programmatically
            // Users must manually enable in Safari settings
        }
    } catch (error) {
        // Permission check not supported in Safari
    }
}

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
        // Get the active tab
        const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });

        if (!activeTab) {
            console.error("No active tab found");
            return;
        }

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

        // Check if this is a permission error
        if (error.message && error.message.includes('permission')) {
            // Permission denied - user needs to enable extension for this website
            // To enable on all websites: Safari → Settings → Extensions → SafariToDrafts → Allow on Every Website
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
                    const customFilters = extensionSettings?.advancedFiltering?.customFilters || [];
                    
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

            // Get content selectors from settings or use defaults
            const contentSelectors = extensionSettings?.contentExtraction?.customSelectors || [
                // Schema.org structured data (highest priority)
                '[itemtype*="Article"]',
                '[itemtype*="BlogPosting"]',
                '[itemtype*="NewsArticle"]',
                
                // Semantic HTML5
                'article[role="main"]',
                'main[role="main"]',
                'article',
                'main',
                '[role="main"]',

                // WordPress (most common CMS)
                '.entry-content',
                '.post-content',
                '.wp-block-post-content',

                // Major news sites
                '.story-body',
                '.article-body',
                '.article-content',
                '.content-body',
                '.main-content',

                // Other CMS platforms
                '.kg-post', // Ghost
                '.postArticle-content', // Medium
                '.markup', // Substack
                '.node .content', // Drupal

                // Generic content selectors
                '.content',
                '.post',
                '.entry',
                '.article'
            ];

            // Find the best content element using a simplified scoring system
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
                    const customFilters = extensionSettings?.advancedFiltering?.customFilters || [];
                    const elementsToRemove = bodyClone.querySelectorAll(customFilters.join(', '));
                    elementsToRemove.forEach(el => el.remove());

                    content = turndownService.turndown(bodyClone.innerHTML);
                } else {
                    content = document.body.textContent || document.body.innerText || '';
                    content = content.substring(0, 10000);
                }
            }
        }

        // Content cleanup
        content = content
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .replace(/ +/g, ' ')
            .trim()
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

            // Execute the URL scheme by navigating to it
            await browser.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: function(draftsUrl, originalUrl) {
                    // Navigate to the Drafts URL
                    window.location.href = draftsUrl;

                    // Set up a timer to navigate back to the original page
                    setTimeout(() => {
                        window.location.href = originalUrl;
                    }, 2000);
                },
                args: [draftsURL, currentURL]
            });


        }
    } catch (error) {
        console.error("Failed to execute navigation script:", error);

        // Fallback: try creating a new tab with the URL scheme
        try {
            const newTab = await browser.tabs.create({
                url: draftsURL,
                active: false
            });

            // Close the tab after a delay
            setTimeout(async () => {
                try {
                    await browser.tabs.remove(newTab.id);
                } catch (e) {
                    // Could not close fallback tab
                }
            }, 1500);

        } catch (fallbackError) {
            console.error("Fallback method also failed:", fallbackError);

            // Show user a message if all methods fail
            alert("Could not open Drafts. Please ensure Drafts is installed and try again.");
        }
    }
}

// Format draft content according to user settings
function formatDraftContent(title, url, content, isSelection = false) {
        // Load settings with defaults
        const outputFormat = extensionSettings?.outputFormat || {};

        // Simple settings (fallback to defaults if not specified)
        const titleFormat = 'h1'; // Always use h1 for simple settings
        const includeSource = outputFormat.includeSource !== false;
        const includeSeparator = true; // Always include separator for simple settings
        const includeTimestamp = outputFormat.includeTimestamp || false;
        const customTemplate = ''; // Don't use custom template for simple settings

        // If custom template is provided, use it
        if (customTemplate.trim()) {
            const timestamp = new Date().toISOString();
            const defaultTag = extensionSettings?.outputFormat?.defaultTag || '';
            return customTemplate
                .replace('{title}', title)
                .replace('{url}', url)
                .replace('{content}', content)
                .replace('{timestamp}', timestamp)
                .replace('{tag}', defaultTag);
        }

        // Build content using standard format
        let result = '';

        // Add title if enabled
        if (titleFormat !== 'none') {
            switch (titleFormat) {
                case 'h1':
                    result += `# ${title}\n\n`;
                    break;
                case 'h2':
                    result += `## ${title}\n\n`;
                    break;
                case 'h3':
                    result += `### ${title}\n\n`;
                    break;
                case 'bold':
                    result += `**${title}**\n\n`;
                    break;
            }
        }

        // Add source URL if enabled
        if (includeSource) {
            result += `**Source:** [${url}](${url})\n\n`;
        }

        // Add timestamp if enabled
        if (includeTimestamp) {
            const timestamp = new Date().toLocaleString();
            result += `**Captured:** ${timestamp}\n\n`;
        }

        // Add separator if enabled
        if (includeSeparator) {
            result += '---\n\n';
        }

        // Add the main content
        result += content;

        return result;
    }
