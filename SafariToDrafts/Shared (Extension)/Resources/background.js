// Background script for SafariToDrafts extension
// Handles keyboard shortcuts and toolbar button clicks

// Listen for extension startup
browser.runtime.onStartup.addListener(() => {
    console.log('SafariToDrafts extension started');
});

browser.runtime.onInstalled.addListener(() => {
    console.log('SafariToDrafts extension installed');
});

// Listen for popup messages
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
            
            // Add custom rules to filter out unwanted elements
            turndownService.addRule('removeUnwanted', {
                filter: function (node) {
                    // Remove script tags, style tags, and JSON-LD
                    if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || node.nodeName === 'NOSCRIPT') {
                        return true;
                    }
                    
                    // Get node attributes for analysis (safely handle different types)
                    const className = (node.className ? String(node.className) : '').toLowerCase();
                    const id = (node.id ? String(node.id) : '').toLowerCase();
                    const tagName = node.tagName?.toLowerCase() || '';
                    const textContent = (node.textContent ? String(node.textContent) : '').toLowerCase();
                    
                    // Aggressive ad and promotional content patterns
                    const adPatterns = [
                        // Navigation
                        'nav', 'header', 'footer', 'aside', 'menu', 'breadcrumb',
                        
                        // Ads and promotions
                        'ad', 'ads', 'advertisement', 'advertising', 'sponsor', 'sponsored',
                        'promo', 'promotion', 'promotional', 'banner', 'popup', 'modal',
                        'overlay', 'interstitial', 'affiliate', 'marketing',
                        
                        // Social and sharing
                        'social', 'share', 'sharing', 'follow', 'subscribe', 'newsletter',
                        'signup', 'join', 'login', 'register', 'membership',
                        
                        // Comments and user content
                        'comment', 'comments', 'discussion', 'reply', 'replies',
                        'user-content', 'ugc', 'review', 'reviews', 'rating',
                        
                        // Related content and recommendations
                        'related', 'recommendation', 'recommend', 'suggested', 'similar',
                        'trending', 'popular', 'more-from', 'also-read', 'next-read',
                        'continue-reading', 'read-more', 'read-next', 'up-next',
                        'dont-miss', 'you-might', 'related-articles', 'related-posts',
                        'related-stories', 'more-stories', 'other-stories',
                        
                        // Widgets and extras
                        'widget', 'sidebar', 'rail', 'aside-content', 'secondary',
                        'supplementary', 'extras', 'tools', 'utility', 'meta',
                        'byline-extra', 'article-meta', 'post-meta',
                        
                        // Newsletter and subscription
                        'newsletter', 'subscription', 'subscribe', 'email-signup',
                        'mailing-list', 'updates', 'notifications',
                        
                        // Cookie and privacy
                        'cookie', 'privacy', 'gdpr', 'consent', 'tracking',
                        
                        // Video and multimedia extras
                        'video-playlist', 'gallery-nav', 'slideshow-nav', 'carousel-nav',
                        
                        // Tags and categories (often promotional)
                        'tags', 'categories', 'filed-under', 'topics', 'subjects',
                        
                        // Author bio and social (can be promotional)
                        'author-bio', 'author-social', 'author-follow', 'bio-box',
                        'byline', 'author-info', 'article-byline', 'post-byline',
                        
                        // Paywall and subscription prompts
                        'paywall', 'subscription-prompt', 'premium', 'member-only',
                        'subscriber-only', 'unlock', 'continue-reading-prompt',
                        
                        // News site specific patterns
                        'donate', 'donation', 'support', 'funding', 'membership',
                        'contribution', 'sponsor', 'patron', 'sustain', 'pledge'
                    ];
                    
                    // Check class names and IDs against patterns
                    for (const pattern of adPatterns) {
                        if (className.includes(pattern) || id.includes(pattern)) {
                            return true;
                        }
                    }
                    
                    // Remove specific problematic selectors
                    const unwantedSelectors = [
                        // Semantic elements often used for non-content
                        'nav', 'header', 'footer', 'aside',
                        
                        // Common class patterns
                        '.nav', '.navigation', '.header', '.footer', '.sidebar',
                        '.ad', '.ads', '.advertisement', '.promo', '.promotion',
                        '.social', '.share', '.sharing', '.comments', '.comment',
                        '.related', '.recommendations', '.newsletter', '.subscription',
                        '.popup', '.modal', '.overlay', '.banner', '.cookie',
                        '.widget', '.rail', '.secondary', '.supplementary',
                        '.trending', '.popular', '.suggested', '.similar',
                        '.more-from', '.also-read', '.read-more', '.up-next',
                        '.author-bio', '.byline-extra', '.article-meta', '.post-meta',
                        '.byline', '.author-info', '.article-byline', '.post-byline',
                        '.tags', '.categories', '.filed-under', '.topics',
                        '.paywall', '.subscription-prompt', '.premium-content',
                        '.donate', '.donation', '.support', '.funding', '.membership',
                        '.contribution', '.sponsor', '.patron', '.sustain', '.pledge',
                        
                        // ID patterns
                        '#nav', '#navigation', '#header', '#footer', '#sidebar',
                        '#comments', '#related', '#recommendations', '#newsletter',
                        '#social', '#share', '#ads', '#advertisement', '#promo',
                        '#trending', '#popular', '#suggested', '#widget',
                        '#author-bio', '#tags', '#categories', '#paywall',
                        
                        // Role attributes
                        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
                        '[role="complementary"]', '[role="advertisement"]',
                        
                        // Data attributes commonly used for ads
                        '[data-ad]', '[data-advertisement]', '[data-sponsored]',
                        '[data-promo]', '[data-widget]', '[data-module="ads"]',
                        
                        // Specific ad networks and services
                        '.google-ad', '.doubleclick', '.adsystem', '.adnxs',
                        '.amazon-ad', '.taboola', '.outbrain', '.revcontent',
                        '.content-ad', '.native-ad', '.sponsored-content'
                    ];
                    
                    for (const selector of unwantedSelectors) {
                        if (node.matches && node.matches(selector)) {
                            return true;
                        }
                    }
                    
                    // Remove elements with JSON-LD or schema.org content
                    if (node.getAttribute && (
                        node.getAttribute('type') === 'application/ld+json' ||
                        node.getAttribute('itemtype') ||
                        node.getAttribute('itemscope') !== null
                    )) {
                        return true;
                    }
                    
                    // Text content analysis for promotional language
                    if (textContent && textContent.length < 1000) { // Analyze text blocks up to 1000 chars
                        const promotionalPhrases = [
                            'subscribe', 'newsletter', 'sign up', 'join us', 'follow us',
                            'more from', 'you might also', 'don\'t miss', 'trending now',
                            'related articles', 'related stories', 'recommended for you',
                            'advertisement', 'sponsored', 'promoted', 'affiliate',
                            'continue reading', 'read more', 'full story',
                            'share this', 'follow on', 'like us on', 'connect with us',
                            'make your contribution', 'donate today', 'support to make',
                            'funded by sponsors', 'member donations', 'help us thrive',
                            'donate now', 'support our work', 'become a member',
                            'published at', 'updated at', 'getty images', 'corbis',
                            'image credit', 'photo credit', 'source:'
                        ];
                        
                        for (const phrase of promotionalPhrases) {
                            if (textContent.includes(phrase)) {
                                return true;
                            }
                        }
                    }
                    
                    // Remove elements that are likely ads based on size and positioning
                    if (node.getBoundingClientRect) {
                        const rect = node.getBoundingClientRect();
                        // Common ad sizes (in pixels)
                        const commonAdSizes = [
                            [728, 90], [300, 250], [336, 280], [320, 50], [300, 600],
                            [970, 250], [300, 50], [320, 100], [468, 60], [234, 60]
                        ];
                        
                        for (const [width, height] of commonAdSizes) {
                            if (Math.abs(rect.width - width) < 10 && Math.abs(rect.height - height) < 10) {
                                return true;
                            }
                        }
                    }
                    
                    return false;
                },
                replacement: function () {
                    return '';
                }
            });
            
            useMarkdownConversion = true;
            console.log("TurndownService initialized successfully");
        } else {
            console.warn("TurndownService not available, using fallback text extraction");
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
            // Smart content extraction for full page
            let mainContent = null;
            
            // Try multiple strategies to find the main content
            const contentSelectors = [
                // Most specific content areas first
                '.article-body .content',
                '.story-body .content', 
                '.post-content .content',
                'article .content',
                '[role="main"] .content',
                
                // High-confidence content patterns
                '.article-content',
                '.post-content',
                '.entry-content',
                '.story-body',
                '.article-body',
                '.post-body',
                '.content-body',
                
                // Semantic HTML5 elements
                'article',
                'main',
                '[role="main"]',
                '.main-content article',
                '.content article',
                
                // News-specific patterns
                '.story-content',
                '.article-text',
                '.story-text',
                '.content-text',
                
                // Blog patterns
                '.post',
                '.entry',
                '.blog-post',
                '.single-post',
                
                // Generic content patterns (most general)
                '.content',
                '.main-content',
                '.primary-content',
                '.page-content',
                '.site-content',
                
                // Container patterns
                '.container article',
                '.wrapper article',
                '.main article'
            ];
            
            for (const selector of contentSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    // Choose the element with the most text content
                    mainContent = Array.from(elements).reduce((prev, current) => {
                        const prevText = (prev.textContent || '').trim().length;
                        const currentText = (current.textContent || '').trim().length;
                        return currentText > prevText ? current : prev;
                    });
                    console.log(`Found content using selector: ${selector}`);
                    break;
                }
            }
            
            if (mainContent) {
                if (useMarkdownConversion) {
                    content = turndownService.turndown(mainContent.innerHTML);
                } else {
                    // For fallback, extract text content and clean up HTML artifacts
                    content = mainContent.textContent || mainContent.innerText || '';
                }
            } else {
                console.log("No main content found, using body fallback");
                if (useMarkdownConversion) {
                    // Create a clone of the body to modify
                    const bodyClone = document.body.cloneNode(true);
                    
                    // Remove obvious non-content elements
                    const elementsToRemove = bodyClone.querySelectorAll([
                        'nav', 'header', 'footer', 'aside',
                        '.nav', '.navigation', '.header', '.footer', '.sidebar',
                        '.ad', '.ads', '.advertisement', '.social', '.share',
                        '.comments', '.comment', '.related', '.newsletter',
                        '#nav', '#navigation', '#header', '#footer', '#sidebar',
                        '#comments', '#social', '#ads'
                    ].join(', '));
                    
                    elementsToRemove.forEach(el => el.remove());
                    
                    content = turndownService.turndown(bodyClone.innerHTML);
                } else {
                    content = document.body.textContent || document.body.innerText || '';
                    // Limit content to avoid excessive text when using fallback
                    content = content.substring(0, 5000);
                }
            }
        }

        // Universal content cleanup (handles both markdown and text)
        content = content
            // Basic whitespace cleanup
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .replace(/ +/g, ' ')
            .trim()
            // Remove donation/support appeals
            .replace(/We rely on your support.*?Donate today/gi, '')
            .replace(/.*funded by sponsors.*member donations.*/gi, '')
            .replace(/Make your contribution.*?thrive in \d{4}\./gi, '')
            // Remove image credits and captions
            .replace(/^\s*.*Getty Images.*$/gm, '')
            .replace(/^\s*.*Corbis.*$/gm, '')
            .replace(/^\s*Viviane Moos\/.*$/gm, '')
            // Remove standalone author bylines
            .replace(/^By\s*\n.*\nPublished.*$/gm, '')
            // Remove navigation elements
            .replace(/^News\s*$/gm, '')
            .replace(/^\s*News\s*#/gm, '#')
            // Remove HTML artifacts (for fallback mode)
            .replace(/<!--\[-->/g, '')
            .replace(/<!--\]-->/g, '')
            .replace(/<[^>]*>/g, '')
            .replace(/&[^;]+;/g, '')
            // Remove UI framework artifacts
            .replace(/p-button[^"]*"/g, '')
            .replace(/flexible-link internal/g, '')
            .replace(/--\d+:none;/g, '')
            // Final cleanup
            .replace(/---\s*---/g, '---')
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
    // Debug logging
    console.log("Creating draft for:", title);
    console.log("URL:", url);
    console.log("Content length:", markdownBody.length);
    console.log("Is selection:", isSelection);

    // Draft format: Title as header, URL as markdown link, then content
    const draftContent = `# ${title}\n\n[${url}](${url})\n\n${markdownBody}`;

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
                    console.log("Attempting to navigate to Drafts URL...");
                    
                    // Navigate to the Drafts URL
                    window.location.href = draftsUrl;
                    
                    // Set up a timer to navigate back to the original page
                    setTimeout(() => {
                        console.log("Navigating back to original page...");
                        window.location.href = originalUrl;
                    }, 2000);
                },
                args: [draftsURL, currentURL]
            });
            
            console.log("Successfully executed navigation script");
        }
    } catch (error) {
        console.error("Failed to execute navigation script:", error);
        
        // Fallback: try creating a new tab with the URL scheme
        try {
            console.log("Trying fallback: creating new tab...");
            const newTab = await browser.tabs.create({ 
                url: draftsURL, 
                active: false 
            });
            
            // Close the tab after a delay
            setTimeout(async () => {
                try {
                    await browser.tabs.remove(newTab.id);
                    console.log("Closed fallback tab");
                } catch (e) {
                    console.log("Could not close fallback tab:", e);
                }
            }, 1500);
            
        } catch (fallbackError) {
            console.error("Fallback method also failed:", fallbackError);
            
            // Show user a message if all methods fail
            alert("Could not open Drafts. Please ensure Drafts is installed and try again.");
        }
    }
}
