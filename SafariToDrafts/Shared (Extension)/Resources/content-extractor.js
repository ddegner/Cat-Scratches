// Shared content extraction logic for Cat Scratches (Safari-only)
// Used by background.js (tab content extraction) and settings.js (preview)
'use strict';

(function () {
    // Support both window (extension pages) and service worker (globalThis/self) contexts
    const root = (typeof globalThis !== 'undefined')
        ? globalThis
        : (typeof self !== 'undefined')
            ? self
            : (typeof window !== 'undefined' ? window : {});

    /**
     * Extract content from a document object (DOM) using settings.
     * Adapted from original background.js logic.
     * 
     * @param {Document} doc - The DOM document to extract from
     * @param {Object} settings - Extension settings object
     * @param {string} url - The URL of the page (for context)
     * @returns {Object} { title, body }
     */
    function extractContentFromDoc(doc, settings, url) {
        // Initialize Turndown
        // Assumes TurndownService is globally available (injected scripts)
        let turndownService = null;
        let useMarkdownConversion = false;
        const configuredFilters = Array.isArray(settings?.advancedFiltering?.customFilters)
            ? settings.advancedFiltering.customFilters
            : [];
        const validCustomFilters = [];
        const mediaNodeNames = new Set(['IMG', 'PICTURE', 'FIGURE', 'VIDEO', 'AUDIO', 'FIGCAPTION']);

        for (const filter of configuredFilters) {
            if (typeof filter !== 'string') {
                continue;
            }

            const trimmed = filter.trim();
            if (!trimmed) {
                continue;
            }

            try {
                // Validate selector once up front instead of failing repeatedly per node.
                doc.querySelector(trimmed);
                validCustomFilters.push(trimmed);
            } catch (e) {
                // Ignore invalid selectors
            }
        }

        const hasMediaFilter = validCustomFilters.some(filter => {
            const lower = filter.toLowerCase();
            return lower.includes('img') ||
                lower.includes('picture') ||
                lower.includes('figure') ||
                lower.includes('video') ||
                lower.includes('audio') ||
                lower.includes('media');
        });

        try {
            if (typeof TurndownService !== 'undefined') {
                turndownService = new TurndownService({
                    headingStyle: 'atx',
                    hr: '---',
                    bulletListMarker: '*',
                    codeBlockStyle: 'fenced',
                    linkStyle: 'inline'
                });

                // Add custom rules
                turndownService.addRule('removeUnwanted', {
                    filter: function (node) {
                        // Remove script/style/noscript elements
                        if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE' || node.nodeName === 'NOSCRIPT') {
                            return true;
                        }

                        // Use customFilters for removal logic
                        if (validCustomFilters.length === 0) {
                            return false;
                        }

                        // Check for image/media elements
                        if (hasMediaFilter && mediaNodeNames.has(node.nodeName)) {
                            return true;
                        }

                        // Remove links to images
                        if (node.nodeName === 'A' && node.getAttribute('href')) {
                            const href = node.getAttribute('href').toLowerCase();
                            if (href.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff?)(\?.*)?$/)) {
                                return true;
                            }
                        }

                        // Check all customFilters for element matching
                        for (const filter of validCustomFilters) {
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

        // Main extraction logic
        let content = "";

        // In preview mode (settings.js), we likely passed a single specific selector.
        // In background mode (tab), we search through all configured selectors.

        // Check if we are focusing on a valid specific element first?
        // The previous logic for background.js had complex scoring.
        // settings.js logic for preview used a SINGLE selector.

        // To unify: We can check if settings.contentExtraction.customSelectors has 1 item vs many?
        // Or we can just run the full scoring logic effectively.
        // If customSelectors has only 1 item (the preview case), the loop will run once and pick it.

        let bestElement = null;
        let bestScore = 0;

        // If no custom selectors, use defaults?
        const contentSelectors = settings?.contentExtraction?.customSelectors || [];

        if (contentSelectors.length > 0) {
            for (const selector of contentSelectors) {
                try {
                    // Special case for Preview: if we passed a selector that might not exist yet?
                    // No, in preview we parse the fetched HTML string into a doc, so it should exist.

                    const elements = doc.querySelectorAll(selector);
                    for (const element of elements) {
                        // Start scoring
                        const textLength = (element.textContent || '').trim().length;
                        const minContentLength = settings?.advancedFiltering?.minContentLength || 150;

                        if (textLength >= minContentLength) {
                            // Calculate link ratio
                            const linkLength = Array.from(element.querySelectorAll('a'))
                                .reduce((total, link) => total + (link.textContent || '').length, 0);
                            const linkRatio = textLength > 0 ? linkLength / textLength : 1;
                            const maxLinkRatio = settings?.advancedFiltering?.maxLinkRatio || 0.3;

                            if (linkRatio < maxLinkRatio) {
                                let score = textLength;

                                // Bonus for semantic elements
                                if (element.tagName === 'ARTICLE') score += 1000;
                                if (element.getAttribute('role') === 'main') score += 800;
                                if (element.getAttribute('itemtype')) score += 600;

                                // Bonus for content-indicating classes/IDs
                                const classAndId = ((element.getAttribute('class') || '') + ' ' + (element.id || '')).toLowerCase();
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
        }

        // If we found a best element, use it
        if (bestElement) {
            if (useMarkdownConversion) {
                content = turndownService.turndown(bestElement.innerHTML);
            } else {
                content = bestElement.textContent || bestElement.innerText || '';
            }
        } else {
            // Fallback or "strategy: default" logic often fell back to body
            // Only if we searched and found nothing (or if we are in preview mode and the selector failed)

            // For preview mode: we want to be strict. If selector fails, show empty/error. 
            // But for consistency: if I provide a specific selector and it fails, bestElement is null.

            // However, the original background.js fallback logic:
            // if no BEST element found -> fallback to BODY.

            if (useMarkdownConversion) {
                const bodyClone = doc.body.cloneNode(true);

                if (validCustomFilters.length > 0) {
                    for (const filter of validCustomFilters) {
                        const elementsToRemove = bodyClone.querySelectorAll(filter);
                        elementsToRemove.forEach(el => el.remove());
                    }
                }

                content = turndownService.turndown(bodyClone.innerHTML);
            } else {
                content = doc.body.textContent || doc.body.innerText || '';
                content = content.substring(0, 10000);
            }

            // If content is still empty, and we had specific selectors, maybe return message?
            if (!content && contentSelectors.length > 0) {
                content = "(Content selector matched no elements or content was empty)";
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
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#0*39;/g, "'")
            .replace(/&[a-zA-Z]+;/g, '')
            .trim();

        return {
            title: doc.title || 'Untitled',
            body: content || 'No content extracted'
        };
    }

    // Expose globally
    root.extractContentFromDoc = extractContentFromDoc;
})();
