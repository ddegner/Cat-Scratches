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
            func: getPageContent
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
async function getPageContent() {
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

            // Add custom rules to filter out unwanted elements - now less aggressive
            turndownService.addRule('removeUnwanted', {
                filter: function(node) {
                    // Remove only obvious non-content elements
                    if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || node.nodeName === 'NOSCRIPT') {
                        return true;
                    }

                    // Check settings to see if we should remove images
                    const shouldRemoveImages = !extensionSettings?.contentExtraction?.removeImages === false;
                    if (shouldRemoveImages && (node.nodeName === 'IMG' || node.nodeName === 'PICTURE' || node.nodeName === 'FIGURE')) {
                        return true;
                    }

                    // Remove figcaptions (image captions)
                    if (node.nodeName === 'FIGCAPTION') {
                        return true;
                    }

                    // Remove links to images
                    if (node.nodeName === 'A' && node.getAttribute('href')) {
                        const href = node.getAttribute('href').toLowerCase();
                        if (href.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff?)(\?.*)?$/i)) {
                            return true;
                        }
                    }

                    // Get node attributes for analysis (safely handle different types)
                    const className = (node.className ? String(node.className) : '').toLowerCase();
                    const id = (node.id ? String(node.id) : '').toLowerCase();
                    const tagName = node.tagName?.toLowerCase() || '';

                    // More conservative filtering patterns - only obvious non-content
                    const unwantedPatterns = [
                        // Navigation and structure (only obvious ones)
                        'nav-', 'navigation-', 'header-', 'footer-', 'sidebar-',
                        'menu-', 'breadcrumb-',

                        // WordPress specific (only obvious ones)
                        'wp-admin', 'wp-sidebar', 'wp-widget', 'wp-meta',

                        // Ads and promotions (only obvious ones)
                        'advertisement', 'google-ad', 'doubleclick', 'adsystem', 
                        'ad-container', 'ad-wrapper', 'sponsored-content',

                        // Social sharing (only obvious ones)
                        'share-buttons', 'sharing-buttons', 'social-share',
                        'follow-buttons',

                        // Comments (only obvious ones)
                        'comments-section', 'comment-form', 'disqus',

                        // Newsletter and subscription (only obvious ones)
                        'newsletter-signup', 'email-signup', 'subscription-form',
                        'newsletter-promo', 'subscription-nag',

                        // Cookie and privacy notices (only obvious ones)
                        'cookie-banner', 'privacy-notice', 'gdpr-notice', 'consent-banner'
                    ];

                    // Check class names and IDs against patterns
                    for (const pattern of unwantedPatterns) {
                        if (className.includes(pattern) || id.includes(pattern)) {
                            return true;
                        }
                    }

                    // Very conservative unwanted selectors - only obvious non-content
                    const unwantedSelectors = [
                        // Only the most obvious structural elements
                        'nav', 'header', 'footer',
                        
                        // Only obvious ads
                        '.google-ad', '.taboola', '.outbrain',
                        '.advertisement', '.sponsored-content',

                        // Only obvious social/sharing widgets
                        '.share-buttons', '.social-share',

                        // Only obvious comment forms
                        '.comment-form', '.disqus',

                        // Only obvious popups/modals
                        '.popup', '.modal', '.overlay',

                        // Only obvious cookie banners
                        '.cookie-banner', '.privacy-notice',

                        // Role attributes for ads only
                        '[role="advertisement"]',

                        // Data attributes for ads only
                        '[data-ad]', '[data-advertisement]'
                    ];

                    for (const selector of unwantedSelectors) {
                        try {
                            if (node.matches && node.matches(selector)) {
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

                    // Less aggressive text content analysis - only for very short elements
                    const textContent = (node.textContent ? String(node.textContent) : '').toLowerCase().trim();
                    if (textContent && textContent.length < 100 && textContent.length > 10) {
                        const obviousPromotional = [
                            'click here to subscribe', 'sign up now', 'join our newsletter',
                            'follow us on', 'download our app', 'get breaking news',
                            'advertisement', 'sponsored by', 'affiliate link'
                        ];

                        for (const phrase of obviousPromotional) {
                            if (textContent.includes(phrase)) {
                                return true;
                            }
                        }
                    }

                    return false;
                },
                replacement: function() {
                    return '';
                }
            });

            // Add rule to completely remove images and media (if enabled in settings)
            if (extensionSettings?.contentExtraction?.removeImages !== false) {
                turndownService.addRule('removeImages', {
                    filter: ['img', 'picture', 'figure', 'figcaption', 'video', 'audio', 'source'],
                    replacement: function() {
                        return '';
                    }
                });
            }

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
            // Enhanced smart content extraction for full page
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
                '.single-post .entry-content',
                '.post .entry-content',
                '.hentry .entry-content',
                '.wp-block-post-content',
                '.entry-content',
                '.post-content',

                // Major news sites and policy sites
                '.story-body',
                '.article-body',
                '.article-content',
                '.content-body',
                '.main-content',
                '.commentary-content',
                '.policy-content',

                // Generic content selectors (broader matching)
                '.blog-post',
                '.content-main',
                '.primary-content',
                '.article-container',
                '.content',
                '.post',
                '.entry',
                '.text-content',
                '.body-content',

                // ID-based selectors
                '#article',
                '#content',
                '#main-content',
                '#post-content',

                // Fallback selectors - more comprehensive
                'section[class*="content"]',
                'div[class*="article"]',
                'div[class*="content"]',
                'div[class*="post"]',
                'div[class*="text"]',
                'section',
                
                // Very broad fallback - look for divs with substantial text content
                'div'
            ];

            // Collect all valid content candidates from all selectors with improved scoring
            let candidates = [];

            for (const selector of contentSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        // Evaluate each element found by this selector
                        for (const element of elements) {
                            const textLength = (element.textContent || '').trim().length;

                            // Use minimum content length from settings - more lenient
                            const minContentLength = extensionSettings?.advancedFiltering?.minContentLength || 100;
                            if (textLength >= minContentLength) {
                                // Calculate link ratio - more lenient
                                const linkLength = Array.from(element.querySelectorAll('a'))
                                    .reduce((total, link) => total + (link.textContent || '').length, 0);
                                const linkRatio = textLength > 0 ? linkLength / textLength : 1;

                                // Use max link ratio from settings - more lenient
                                const maxLinkRatio = extensionSettings?.advancedFiltering?.maxLinkRatio || 0.8;
                                if (linkRatio < maxLinkRatio) {
                                    // Enhanced scoring system
                                    let score = (contentSelectors.length - contentSelectors.indexOf(selector)) * 1000;

                                    // Bonus points for semantic elements
                                    if (element.tagName === 'ARTICLE') score += 500;
                                    if (element.getAttribute('role') === 'main') score += 400;
                                    if (element.getAttribute('itemtype')) score += 300;

                                    // Bonus for content-indicating classes/IDs
                                    const classAndId = ((element.className || '') + ' ' + (element.id || '')).toLowerCase();
                                    if (classAndId.includes('article')) score += 200;
                                    if (classAndId.includes('story')) score += 200;
                                    if (classAndId.includes('content')) score += 150;
                                    if (classAndId.includes('main')) score += 150;
                                    if (classAndId.includes('post')) score += 100;
                                    if (classAndId.includes('text')) score += 100;

                                    // Strong bonus for substantial text content
                                    if (textLength > 1000) score += 500;
                                    if (textLength > 2000) score += 1000;
                                    if (textLength > 5000) score += 1500;

                                    // Text length bonus (but not overwhelming)
                                    score += Math.min(textLength / 10, 1000);

                                    // Less harsh penalty for links
                                    score -= linkRatio * 300;

                                    // Penalty for elements that are likely navigation or metadata
                                    if (classAndId.includes('nav') || classAndId.includes('menu') || 
                                        classAndId.includes('header') || classAndId.includes('footer')) {
                                        score -= 1000;
                                    }

                                    candidates.push({
                                        element: element,
                                        selector: selector,
                                        textLength: textLength,
                                        linkRatio: linkRatio,
                                        score: score
                                    });
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Skip selectors that cause errors
                }
            }

            // Pick the best candidate based on score
            if (candidates.length > 0) {
                const bestCandidate = candidates.reduce((prev, current) =>
                    current.score > prev.score ? current : prev
                );
                mainContent = bestCandidate.element;
            }

            if (mainContent) {
                if (useMarkdownConversion) {
                    content = turndownService.turndown(mainContent.innerHTML);
                } else {
                    // For fallback, extract text content and clean up HTML artifacts
                    content = mainContent.textContent || mainContent.innerText || '';
                }
            } else {
                // No main content found, trying WordPress fallback

                // Try WordPress-specific fallback selectors
                const wpFallbackSelectors = [
                    '.post .entry-content',
                    '.single .entry-content',
                    '.hentry .entry-content',
                    '.type-post .entry-content',
                    '.entry-content',
                    '.post-content',
                    '.post-body',
                    '.content-area',
                    '.site-content',
                    '.primary-content',
                    '.main-content',
                    '.content',
                    '.post',
                    '.single-post',
                    '.hentry',
                    'article'
                ];

                for (const selector of wpFallbackSelectors) {
                    try {
                        const wpElement = document.querySelector(selector);
                        if (wpElement) {
                            const wpTextLength = (wpElement.textContent || '').trim().length;
                            if (wpTextLength >= 100) {
                                mainContent = wpElement;
                                break;
                            }
                        }
                    } catch (e) {
                        console.warn(`WordPress fallback selector "${selector}" caused error:`, e);
                    }
                }

                if (mainContent) {
                    if (useMarkdownConversion) {
                        content = turndownService.turndown(mainContent.innerHTML);
                    } else {
                        content = mainContent.textContent || mainContent.innerText || '';
                    }
                } else {
                    // WordPress fallback failed, using enhanced body fallback
                    if (useMarkdownConversion) {
                        // Create a clone of the body to modify
                        const bodyClone = document.body.cloneNode(true);

                        // Remove obvious non-content elements for fallback
                        const elementsToRemove = bodyClone.querySelectorAll([
                            // Images and media
                            'img', 'picture', 'figure', 'figcaption',
                            '.image', '.img', '.photo', '.picture', '.gallery',
                            '.slideshow', '.carousel', '.lightbox', '.media',
                            '.caption', '.image-caption', '.photo-caption', '.media-caption',
                            '.image-credit', '.photo-credit', '.media-credit',
                            '.image-container', '.photo-container', '.media-container',
                            // Bottom-of-article content
                            '.bottom-of-article', '.article-bottom', '.story-bottom',
                            '.article-footer', '.story-footer', '.post-footer',
                            '.author-info', '.author-bio', '.author-details', '.author-section',
                            '.byline', '.byline-info', '.contributors', '.contributor-info',
                            '.see-more-on', '.more-on', '.topics-covered', '.story-topics',
                            '.share-article', '.share-story', '.share-full-article',
                            '.article-sharing', '.story-sharing', '.share-this-article',
                            '.article-tools', '.story-tools', '.content-tools',
                            '.about-author', '.author-profile', '.writer-bio',
                            // Structure elements
                            'nav', 'header', 'footer', 'aside',
                            '.nav', '.navigation', '.header', '.footer', '.sidebar',
                            '.menu', '.breadcrumb', '.breadcrumbs',
                            '.ad', '.ads', '.advertisement', '.promo', '.promotion',
                            '.social', '.share', '.sharing', '.social-share', '.share-buttons',
                            '.comments', '.comment', '.comments-section',
                            '.newsletter', '.subscription', '.newsletter-signup',
                            '.related-articles', '.recommended-articles', '.more-stories',
                            '.trending-now', '.popular-stories', '.widget', '.rail',
                            '.secondary', '.supplementary', '.popup', '.modal',
                            '.overlay', '.banner', '.cookie', '.privacy', '.gdpr',
                            '#nav', '#navigation', '#header', '#footer', '#sidebar',
                            '#comments', '#social-sharing', '#ads', '#newsletter',
                            'script', 'style', 'noscript'
                        ].join(', '));

                        elementsToRemove.forEach(el => el.remove());

                        content = turndownService.turndown(bodyClone.innerHTML);
                    } else {
                        content = document.body.textContent || document.body.innerText || '';
                        // More generous fallback length
                        content = content.substring(0, 10000);
                    }
                }
            }
        }

        // More gentle content cleanup (handles both markdown and text)
        content = content
            // Basic whitespace cleanup
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .replace(/ +/g, ' ')
            .trim()
            // Remove obvious promotional content - targeted approach
            .replace(/.*click here to subscribe.*$/gim, '')
            .replace(/.*sign up for our newsletter.*$/gim, '')
            .replace(/.*download our app.*$/gim, '')
            .replace(/.*get breaking news alerts.*$/gim, '')
            .replace(/.*follow us on (twitter|facebook|instagram).*$/gim, '')
            // Remove image credits that are clearly separate
            .replace(/^\s*.*\(Getty Images\).*$/gm, '')
            .replace(/^\s*.*\(AP Photo.*\).*$/gm, '')
            .replace(/^\s*.*Photo credit:.*$/gm, '')
            .replace(/^\s*.*Image credit:.*$/gm, '')
            .replace(/^\s*.*\(Corbis\).*$/gm, '')
            // Remove standalone promotional phrases (but not if part of larger content)
            .replace(/^\s*subscribe today\s*$/gim, '')
            .replace(/^\s*join our newsletter\s*$/gim, '')
            .replace(/^\s*advertisement\s*$/gim, '')
            .replace(/^\s*sponsored content\s*$/gim, '')
            // Remove HTML artifacts (for fallback mode only)
            .replace(/<!--.*?-->/g, '')
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&[a-zA-Z]+;/g, ' ')
            // Final cleanup
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
    const draftsURL = `drafts://x-callback-url/create?text=${encodedContent}`;

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
            return customTemplate
                .replace('{title}', title)
                .replace('{url}', url)
                .replace('{content}', content)
                .replace('{timestamp}', timestamp);
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
