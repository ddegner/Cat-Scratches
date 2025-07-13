// Background script for SafariToDrafts extension
// Handles keyboard shortcuts and toolbar button clicks

// Listen for extension startup
browser.runtime.onStartup.addListener(() => {
    console.log('SafariToDrafts extension started');
});

browser.runtime.onInstalled.addListener(() => {
    console.log('SafariToDrafts extension installed');
    
    // Check if we have permission to run on all websites
    checkPermissions();
});

// Function to check and request permissions
async function checkPermissions() {
    try {
        // In Safari, we can't actually request permissions programmatically
        // But we can detect when we don't have them and inform the user
        const hasPermission = await browser.permissions.contains({
            origins: ["<all_urls>"]
        });
        
        if (!hasPermission) {
            console.log('Extension does not have permission to run on all websites');
            // Note: Safari doesn't support requesting permissions programmatically
            // Users must manually enable in Safari settings
        }
    } catch (error) {
        console.log('Permission check not supported in Safari');
    }
}

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

// Increment usage count for tip management
async function incrementUsageCount() {
    try {
        const result = await browser.storage.local.get(['usageCount']);
        const usageCount = (result.usageCount || 0) + 1;
        await browser.storage.local.set({ usageCount });
    } catch (error) {
        // If storage isn't available, that's okay
        console.log('Storage not available for usage tracking');
    }
}

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
            
            // Track usage for tip management
            await incrementUsageCount();
        }
    } catch (error) {
        console.error("Error creating draft:", error);
        
        // Check if this is a permission error
        if (error.message && error.message.includes('permission')) {
            console.log("Permission denied - user needs to enable extension for this website");
            console.log("To enable on all websites: Safari → Settings → Extensions → SafariToDrafts → Allow on Every Website");
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
                filter: function (node) {
                    // Remove only obvious non-content elements
                    if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || node.nodeName === 'NOSCRIPT') {
                        return true;
                    }
                    
                    // Remove images and image-related elements
                    if (node.nodeName === 'IMG' || node.nodeName === 'PICTURE' || node.nodeName === 'FIGURE') {
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
                    
                    // Comprehensive but targeted filtering patterns
                    const unwantedPatterns = [
                        // Navigation and page structure
                        'nav', 'header', 'footer', 'aside', 'menu', 'breadcrumb',
                        'navigation', 'main-nav', 'primary-nav', 'site-nav',
                        'main-header', 'site-header', 'page-header',
                        'main-footer', 'site-footer', 'page-footer',
                        
                        // WordPress-specific unwanted patterns
                        'wp-admin', 'wp-login', 'wp-json', 'wp-includes',
                        'wp-content-plugins', 'wp-sidebar', 'wp-widget',
                        'wp-calendar', 'wp-tag-cloud', 'wp-recent-posts',
                        'wp-recent-comments', 'wp-archives', 'wp-categories',
                        'wp-meta', 'wp-search', 'wp-links', 'wp-rss',
                        'widget-area', 'sidebar-', 'wp-block-latest-posts',
                        'wp-block-latest-comments', 'wp-block-archives',
                        'wp-block-categories', 'wp-block-tag-cloud',
                        'entry-meta', 'post-meta', 'wp-post-meta',
                        'entry-footer', 'post-footer', 'wp-post-footer',
                        'post-navigation', 'nav-links', 'wp-prev-next',
                        
                        // Images and media
                        'image', 'img', 'photo', 'picture', 'gallery', 'slideshow',
                        'carousel', 'lightbox', 'media', 'video', 'audio',
                        'caption', 'image-caption', 'photo-caption', 'media-caption',
                        'image-credit', 'photo-credit', 'media-credit',
                        
                        // Bottom-of-article content (NYTimes and others)
                        'bottom-of-article', 'article-bottom', 'story-bottom',
                        'article-footer', 'story-footer', 'post-footer',
                        'article-end', 'story-end', 'content-end',
                        'author-info', 'author-bio', 'author-details', 'author-section',
                        'byline', 'byline-info', 'contributors', 'contributor-info',
                        'see-more-on', 'more-on', 'topics-covered', 'story-topics',
                        'share-article', 'share-story', 'share-full-article',
                        'article-sharing', 'story-sharing', 'share-this-article',
                        'article-tools', 'story-tools', 'content-tools',
                        'about-author', 'author-profile', 'writer-bio',
                        
                        // Ads and promotions  
                        'ad', 'ads', 'advertisement', 'advertising', 'sponsor', 'sponsored',
                        'promo', 'promotion', 'promotional', 'banner', 'popup', 'modal',
                        'overlay', 'interstitial', 'affiliate', 'marketing',
                        'google-ad', 'doubleclick', 'adsystem', 'ad-container', 
                        'ad-wrapper', 'ad-placement', 'sponsored-content', 'native-ad',
                        
                        // Social sharing and engagement
                        'social', 'share', 'sharing', 'follow', 'subscribe', 'newsletter',
                        'signup', 'join', 'login', 'register', 'social-share', 
                        'share-buttons', 'sharing-buttons', 'social-links', 'follow-buttons',
                        
                        // Comments and user content
                        'comment', 'comments', 'discussion', 'reply', 'replies',
                        'comments-section', 'comment-form', 'disqus',
                        
                        // Related content (be selective - only obvious non-article patterns)
                        'related-articles', 'recommended-articles', 'more-stories',
                        'trending-now', 'popular-stories', 'you-might-like',
                        'also-read', 'next-read', 'read-more', 'read-next', 'up-next',
                        'more-from',
                        
                        // Widgets and sidebars
                        'widget', 'sidebar', 'rail', 'secondary',
                        'supplementary', 'extras',
                        
                        // Newsletter and subscription specific
                        'newsletter-signup', 'email-signup', 'subscription-form',
                        'newsletter-promo', 'subscription-nag',
                        
                        // Cookie and privacy notices
                        'cookie', 'privacy', 'gdpr', 'consent',
                        'cookie-banner', 'privacy-notice', 'gdpr-notice', 'consent-banner'
                        
                        // Note: Removed overly broad paywall patterns like 'premium', 'member-only'
                        // as these might appear in legitimate article content
                    ];
                    
                    // Check class names and IDs against patterns
                    for (const pattern of unwantedPatterns) {
                        if (className.includes(pattern) || id.includes(pattern)) {
                            return true;
                        }
                    }
                    
                    // Remove specific problematic selectors - comprehensive but targeted
                    const unwantedSelectors = [
                        // Images and media elements
                        'img', 'picture', 'figure', 'figcaption',
                        '.image', '.img', '.photo', '.picture', '.gallery',
                        '.slideshow', '.carousel', '.lightbox', '.media',
                        '.caption', '.image-caption', '.photo-caption', '.media-caption',
                        '.image-credit', '.photo-credit', '.media-credit',
                        '.image-container', '.photo-container', '.media-container',
                        
                        // Bottom-of-article content (NYTimes and others)
                        '.bottom-of-article', '.article-bottom', '.story-bottom',
                        '.article-footer', '.story-footer', '.post-footer',
                        '.article-end', '.story-end', '.content-end',
                        '.author-info', '.author-bio', '.author-details', '.author-section',
                        '.byline', '.byline-info', '.contributors', '.contributor-info',
                        '.see-more-on', '.more-on', '.topics-covered', '.story-topics',
                        '.share-article', '.share-story', '.share-full-article',
                        '.article-sharing', '.story-sharing', '.share-this-article',
                        '.article-tools', '.story-tools', '.content-tools',
                        '.about-author', '.author-profile', '.writer-bio',
                        
                        // Semantic elements often used for non-content
                        'nav', 'header', 'footer', 'aside',
                        
                        // Common class patterns for navigation and structure
                        '.nav', '.navigation', '.header', '.footer', '.sidebar',
                        '.menu', '.breadcrumb', '.breadcrumbs',
                        
                        // WordPress-specific unwanted selectors
                        '.wp-admin', '.wp-login', '.wp-json', '.wp-includes',
                        '.wp-sidebar', '.wp-widget-area', '.widget-area',
                        '.wp-calendar', '.wp-tag-cloud', '.wp-recent-posts',
                        '.wp-recent-comments', '.wp-archives', '.wp-categories',
                        '.wp-meta', '.wp-search', '.wp-links', '.wp-rss',
                        '.sidebar-', '.widget-', '.wp-block-latest-posts',
                        '.wp-block-latest-comments', '.wp-block-archives',
                        '.wp-block-categories', '.wp-block-tag-cloud',
                        '.entry-meta', '.post-meta', '.wp-post-meta',
                        '.entry-footer', '.post-footer', '.wp-post-footer',
                        '.post-navigation', '.nav-links', '.wp-prev-next',
                        '.post-tags', '.entry-tags', '.wp-block-tag-cloud',
                        '.related-posts', '.wp-block-latest-posts',
                        '.comment-navigation', '.comment-meta', '.comment-form',
                        '.trackback', '.pingback', '.wp-block-comments',
                        
                        // Ad patterns
                        '.ad', '.ads', '.advertisement', '.promo', '.promotion',
                        '.google-ad', '.amazon-ad', '.taboola', '.outbrain',
                        '.doubleclick', '.adsystem', '.adnxs', '.revcontent',
                        '.content-ad', '.native-ad', '.sponsored-content',
                        
                        // Social and sharing
                        '.social', '.share', '.sharing', '.comments', '.comment',
                        '.social-share', '.share-buttons', '.sharing-buttons',
                        '.follow', '.follow-buttons', '.social-links',
                        
                        // Newsletters and subscriptions
                        '.newsletter', '.subscription', '.signup', '.newsletter-signup',
                        '.email-signup', '.subscription-form', '.newsletter-promo',
                        '.subscription-nag',
                        
                        // Related content (specific patterns)
                        '.related', '.related-articles', '.recommended-articles', '.more-stories',
                        '.trending-now', '.popular-stories', '.you-might-like',
                        '.also-read', '.read-more', '.up-next', '.more-from',
                        
                        // Widgets and extras
                        '.widget', '.rail', '.secondary', '.supplementary',
                        '.popup', '.modal', '.overlay', '.banner',
                        
                        // Author and meta info that's not part of article
                        '.author-bio', '.byline-extra', '.article-meta', '.post-meta',
                        '.tags', '.categories', '.filed-under', '.topics',
                        
                        // Cookie and privacy
                        '.cookie', '.privacy', '.gdpr', '.consent',
                        '.cookie-banner', '.privacy-notice', '.gdpr-notice',
                        
                        // Donation and support (but keep general, less specific)
                        '.donate', '.donation', '.support', '.funding', '.membership',
                        '.contribution', '.patron', '.sustain', '.pledge',
                        
                        // ID patterns
                        '#nav', '#navigation', '#header', '#footer', '#sidebar',
                        '#comments', '#related', '#recommendations', '#newsletter',
                        '#social', '#share', '#ads', '#advertisement', '#promo',
                        '#trending', '#popular', '#suggested', '#widget',
                        '#author-bio', '#tags', '#categories',
                        
                        // Role attributes
                        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
                        '[role="complementary"]', '[role="advertisement"]',
                        
                        // Data attributes commonly used for ads
                        '[data-ad]', '[data-advertisement]', '[data-sponsored]',
                        '[data-promo]', '[data-widget]', '[data-module="ads"]',
                        '[data-ad-type]',
                        
                        // NYTimes-specific recirculation and bottom content
                        '#bottom-sheet-sensor',
                        '[data-testid="recirculation"]',
                        '[data-testid="recirc-package"]',
                        '[data-testid="recirc-rightrail"]',
                        '[data-testid="recirc-item"]',
                        '.duet--ledes--standard-lede',
                        
                        // Schema.org and JSON-LD (only if obviously not content)
                        'script[type="application/ld+json"]'
                        
                        // Note: Removed overly specific paywall selectors that might catch
                        // legitimate premium content sections
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
                replacement: function () {
                    return '';
                }
            });
            
            // Add rule to completely remove images and media
            turndownService.addRule('removeImages', {
                filter: ['img', 'picture', 'figure', 'figcaption', 'video', 'audio', 'source'],
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
            // Enhanced smart content extraction for full page
            let mainContent = null;
            
            // Expanded and more aggressive content selectors
            const contentSelectors = [
                // High-priority semantic HTML5 and Schema.org
                'article[role="main"]',
                '[itemtype*="Article"]',
                '[itemtype*="BlogPosting"]', 
                '[itemtype*="NewsArticle"]',
                'article',
                'main',
                '[role="main"]',
                '[role="article"]',
                
                // WordPress-specific patterns (high priority)
                '.single-post .entry-content',
                '.post .entry-content',
                '.single .entry-content',
                '.type-post .entry-content',
                '.blog-post .entry-content',
                '.wp-block-post-content',
                '.entry-content',
                '.post-content',
                '.post-body',
                '.post-text',
                '.entry-text',
                '.entry-body',
                '.content-area article',
                '.hentry .entry-content',
                '.single-post-content',
                '.blog-content',
                '.post-wrapper .entry-content',
                '.entry-wrapper .entry-content',
                
                // News-specific patterns (more comprehensive)
                '.article-content',
                '.story-content', 
                '.story-body',
                '.article-body',
                '.content-body',
                '.article-text',
                '.story-text',
                '.content-text',
                '.article-inner',
                '.story-inner',
                '.content-inner',
                
                // Content wrappers and containers
                '.content-main',
                '.main-content',
                '.primary-content',
                '.page-content',
                '.site-content',
                '.article-container',
                '.story-container',
                '.content-container',
                '.post-container',
                
                // Blog and CMS patterns
                '.post',
                '.entry',
                '.blog-post',
                '.single-post',
                '.hentry',
                '.post-body',
                '.entry-body',
                
                // Generic content patterns
                '.content',
                '.text',
                '.copy',
                '.article-wrap',
                '.entry-wrap',
                '.content-wrap',
                
                // Container combinations (child selectors)
                '.container article',
                '.wrapper article', 
                '.main article',
                '.content article',
                'article .text',
                'main .content',
                '.article .body',
                '.story .body',
                
                // ID-based selectors (common patterns)
                '#article',
                '#content',
                '#main-content',
                '#story',
                '#post-content',
                '#article-body',
                
                // More generic but targeted selectors
                'section[class*="content"]',
                'div[class*="article"]',
                'div[class*="story"]',
                'div[class*="post"]',
                
                // Last resort: look for large text blocks
                'section',
                '.section'
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
                            
                            // More lenient minimum text length
                            if (textLength >= 50) {
                                // Calculate link ratio - less strict
                                const linkLength = Array.from(element.querySelectorAll('a'))
                                    .reduce((total, link) => total + (link.textContent || '').length, 0);
                                const linkRatio = textLength > 0 ? linkLength / textLength : 1;
                                
                                // Allow up to 60% links (was 50%) and prioritize article content
                                if (linkRatio < 0.6) {
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
                                    
                                    // Text length bonus (but not overwhelming)
                                    score += Math.min(textLength / 10, 1000);
                                    
                                    // Penalty for excessive links
                                    score -= linkRatio * 500;
                                    
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
                    console.warn(`Selector "${selector}" caused error:`, e);
                }
            }
            
            // Pick the best candidate based on score
            if (candidates.length > 0) {
                const bestCandidate = candidates.reduce((prev, current) => 
                    current.score > prev.score ? current : prev
                );
                mainContent = bestCandidate.element;
                console.log(`Found content using selector: ${bestCandidate.selector} (score: ${bestCandidate.score}, length: ${bestCandidate.textLength})`);
            }
            
            if (mainContent) {
                if (useMarkdownConversion) {
                    content = turndownService.turndown(mainContent.innerHTML);
                } else {
                    // For fallback, extract text content and clean up HTML artifacts
                    content = mainContent.textContent || mainContent.innerText || '';
                }
            } else {
                console.log("No main content found, trying WordPress fallback");
                
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
                                console.log(`Found WordPress content using fallback selector: ${selector} (length: ${wpTextLength})`);
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
                    console.log("WordPress fallback failed, using enhanced body fallback");
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
