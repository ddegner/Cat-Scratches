/**
 * Content Selector Finder - Cloudflare Worker
 * Analyzes article URLs and suggests CSS selectors using Gemini AI
 */

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
            });
        }

        // Serve the HTML page
        if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
            return new Response(HTML_PAGE, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }

        // Handle API request
        if (request.method === 'POST' && url.pathname === '/api/analyze') {
            return handleAnalyze(request, env);
        }

        return new Response('Not Found', { status: 404 });
    },
};

async function handleAnalyze(request, env) {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    try {
        const { url: targetUrl } = await request.json();

        if (!targetUrl) {
            return new Response(JSON.stringify({ error: 'URL is required' }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        // Validate URL
        let parsedUrl;
        try {
            parsedUrl = new URL(targetUrl);
            if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
                throw new Error('Invalid protocol');
            }
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        // Fetch the target page
        let htmlContent;
        try {
            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            htmlContent = await response.text();
        } catch (fetchError) {
            return new Response(JSON.stringify({
                error: `Could not fetch page: ${fetchError.message}`
            }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        // Preprocess HTML to reduce tokens and focus on structure
        htmlContent = preprocessHtml(htmlContent);

        // Truncate to avoid token limits (keep first 50KB of cleaned HTML)
        const maxLength = 50000;
        if (htmlContent.length > maxLength) {
            htmlContent = htmlContent.substring(0, maxLength) + '\n<!-- truncated -->';
        }

        // Call Gemini API
        const geminiResponse = await analyzeWithGemini(htmlContent, parsedUrl.hostname, env.GEMINI_API_KEY);

        return new Response(JSON.stringify({
            success: true,
            url: targetUrl,
            html: htmlContent,  // Include HTML for client-side preview (avoids CORS issues)
            ...geminiResponse,
        }), {
            headers: corsHeaders,
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: error.message || 'Analysis failed'
        }), {
            status: 500,
            headers: corsHeaders,
        });
    }
}

/**
 * Preprocess HTML to reduce tokens while keeping all CSS selector info
 * Removes: script/style/svg/noscript content, comments, srcset
 * Keeps: ALL attributes that could be used in CSS selectors (class, id, role, data-*, aria-*, etc.)
 */
function preprocessHtml(html) {
    return html
        // Remove script tags and content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove style tags and content
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        // Remove SVG tags and content (often huge, not useful for article selectors)
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '<svg></svg>')
        // Remove HTML comments
        .replace(/<!--[\s\S]*?-->/g, '')
        // Remove noscript tags
        .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, '')
        // Remove srcset (very long, not useful for selectors)
        .replace(/\ssrcset="[^"]*"/gi, '')
        // Remove sizes attribute
        .replace(/\ssizes="[^"]*"/gi, '')
        // Remove href URLs but keep the attribute (shorten long links)
        .replace(/\shref="https?:\/\/[^"]*"/gi, ' href="#"')
        // Remove src URLs for images (shorten)
        .replace(/\ssrc="https?:\/\/[^"]*"/gi, ' src="#"')
        // Collapse multiple whitespace to single space
        .replace(/\s+/g, ' ')
        // Remove space between tags
        .replace(/>\s+</g, '><')
        .trim();
}

async function analyzeWithGemini(html, hostname, apiKey) {
    const prompt = `Find CSS selectors for extracting article content from this ${hostname} page.

CONTENT SELECTOR: Return ONE selector for the main article body. Priority:
1. [itemprop="articleBody"] or [data-testid="article-body"]
2. Semantic: article, main, [role="main"]
3. Class-based: .article-body, .post-content, .entry-content

ELEMENTS TO REMOVE: Return selectors for cruft INSIDE the content area:
- Ads: .ad, .advertisement, [data-ad], .sponsored
- Social: .share-buttons, .social-share
- Navigation: .related-posts, .recommended, .more-stories
- Clutter: .author-bio, .newsletter-signup, .comments, aside, nav

Use simple selectors. Prefer classes/IDs over tag paths.

${html}`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1, // Lower temperature for more deterministic output
                    maxOutputTokens: 4096,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "object",
                        properties: {
                            contentSelector: {
                                type: "string",
                                description: "ONE CSS selector for the main article content"
                            },
                            elementsToRemove: {
                                type: "array",
                                items: { type: "string" },
                                maxItems: 20, // Limit array size to prevent truncation
                                description: "Up to 20 CSS selectors for elements to remove"
                            }
                        },
                        required: ["contentSelector", "elementsToRemove"]
                    }
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Extract the text response
    let textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
        throw new Error('No response from Gemini');
    }

    // Clean markdown wrappers if present (rare with responseMimeType but possible)
    textResponse = textResponse.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();

    try {
        const parsed = JSON.parse(textResponse);
        return {
            contentSelector: parsed.contentSelector || '',
            elementsToRemove: parsed.elementsToRemove || [],
        };
    } catch (parseError) {
        throw new Error(`Failed to parse AI response: ${textResponse.substring(0, 300)}...`);
    }
}

// Embedded HTML page (matches Cat Scratches settings.html design)
const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Selector Finder</title>
    <style>
        :root {
            color-scheme: light dark;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif;
            margin: 0;
            padding: 32px 24px;
            background: #ffffff;
            color: #1d1d1f;
            line-height: 1.6;
        }

        @media (prefers-color-scheme: dark) {
            body {
                background: #0b0b0c;
                color: #f5f5f7;
            }
        }

        .container {
            max-width: 700px;
            margin: 0 auto;
            background: transparent;
        }

        .header {
            background: #ffffff;
            color: #1d1d1f;
            padding: 32px 32px 24px 32px;
            border-bottom: 1px solid #f0f0f0;
            display: flex;
            align-items: center;
            gap: 16px;
        }

        @media (prefers-color-scheme: dark) {
            .header {
                background: #0b0b0c;
                color: #f5f5f7;
                border-bottom-color: #1f1f22;
            }
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: inherit;
        }

        .content {
            padding: 32px;
        }

        .section {
            margin-bottom: 48px;
            padding-bottom: 40px;
            border-bottom: 1px solid #f0f0f0;
        }

        @media (prefers-color-scheme: dark) {
            .section {
                border-bottom-color: #1f1f22;
            }
        }

        .section:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
        }

        .section h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 24px 0;
            color: inherit;
        }

        .form-group {
            margin-bottom: 28px;
        }

        .form-group label {
            display: block;
            font-weight: 500;
            color: inherit;
            font-size: 14px;
            margin-bottom: 8px;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            box-sizing: border-box;
            transition: all 0.2s ease;
            background: #ffffff;
            color: inherit;
        }

        @media (prefers-color-scheme: dark) {
            .form-group input,
            .form-group textarea {
                background: #111113;
                border-color: #2a2a2e;
            }

            .form-group input:focus,
            .form-group textarea:focus {
                box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.25);
                border-color: #0a84ff;
            }
        }

        .form-group input:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #007aff;
            box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
        }

        .form-group textarea {
            resize: vertical;
            min-height: 120px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.5;
        }

        .form-group .help-text {
            font-size: 13px;
            color: #666666;
            margin-top: 6px;
            line-height: 1.4;
        }

        @media (prefers-color-scheme: dark) {
            .form-group .help-text {
                color: #a1a1aa;
            }
        }

        .button {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #007aff;
            color: #ffffff;
        }

        .button:hover {
            background: #0066d6;
        }

        .button:disabled {
            background: #999999;
            cursor: not-allowed;
        }

        @media (prefers-color-scheme: dark) {
            .button {
                background: #0a84ff;
            }

            .button:hover {
                background: #409cff;
            }
        }

        .button-secondary {
            background: #f8f9fa;
            color: #1d1d1f;
            border: 1px solid #e0e0e0;
        }

        .button-secondary:hover {
            background: #e9ecef;
        }

        @media (prefers-color-scheme: dark) {
            .button-secondary {
                background: #1c1c1e;
                color: #f5f5f7;
                border-color: #2a2a2e;
            }

            .button-secondary:hover {
                background: #2c2c2e;
            }
        }

        .button-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .status-message {
            padding: 16px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 24px;
            display: none;
            border-left: 4px solid;
        }

        .status-message.success {
            background: #f0f9f0;
            color: #166534;
            border-left-color: #22c55e;
        }

        @media (prefers-color-scheme: dark) {
            .status-message.success {
                background: #0f2f1a;
                color: #86efac;
            }
        }

        .status-message.error {
            background: #fef2f2;
            color: #dc2626;
            border-left-color: #ef4444;
        }

        @media (prefers-color-scheme: dark) {
            .status-message.error {
                background: #3c0d0d;
                color: #fca5a5;
            }
        }

        .status-message.info {
            background: #f0f9ff;
            color: #1e40af;
            border-left-color: #3b82f6;
        }

        @media (prefers-color-scheme: dark) {
            .status-message.info {
                background: #0a223a;
                color: #93c5fd;
            }
        }

        .preview-content {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
            font-size: 15px;
            line-height: 1.6;
            color: #1d1d1f;
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
            max-height: 400px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        @media (prefers-color-scheme: dark) {
            .preview-content {
                background: #1c1c1e;
                color: #f5f5f7;
            }
        }

        .results-section {
            display: none;
        }

        .results-section.visible {
            display: block;
        }

        .loading {
            display: none;
            align-items: center;
            gap: 12px;
            padding: 20px;
            color: #666666;
        }

        .loading.visible {
            display: flex;
        }

        @media (prefers-color-scheme: dark) {
            .loading {
                color: #a1a1aa;
            }
        }

        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #e0e0e0;
            border-top-color: #007aff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @media (prefers-color-scheme: dark) {
            .spinner {
                border-color: #2a2a2e;
                border-top-color: #0a84ff;
            }
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .copy-feedback {
            font-size: 12px;
            color: #22c55e;
            margin-left: 8px;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .copy-feedback.visible {
            opacity: 1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Content Selector Finder</h1>
        </div>

        <div class="content">
            <!-- Input Section -->
            <div class="section">
                <h2>Analyze a Page</h2>
                <div class="form-group">
                    <label for="urlInput">Article URL</label>
                    <input type="url" id="urlInput" placeholder="https://example.com/article" autocomplete="off">
                    <div class="help-text">Enter the URL of an article page to analyze its structure.</div>
                </div>
                <button class="button" id="analyzeBtn">Analyze Page</button>
            </div>

            <!-- Loading State -->
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <span>Analyzing page structure...</span>
            </div>

            <!-- Error Message -->
            <div class="status-message error" id="errorMessage"></div>

            <!-- Results Section -->
            <div class="section results-section" id="resultsSection">
                <h2>Results</h2>

                <div class="form-group">
                    <label for="contentSelector">Content Selector</label>
                    <input type="text" id="contentSelector" readonly>
                    <div class="button-group" style="margin-top: 12px;">
                        <button class="button button-secondary" onclick="copyToClipboard('contentSelector')">
                            Copy
                            <span class="copy-feedback" id="contentSelector-feedback">✓ Copied</span>
                        </button>
                    </div>
                </div>

                <div class="form-group">
                    <label for="elementsToRemove">Elements to Remove</label>
                    <textarea id="elementsToRemove" readonly></textarea>
                    <div class="button-group" style="margin-top: 12px;">
                        <button class="button button-secondary" onclick="copyToClipboard('elementsToRemove')">
                            Copy All
                            <span class="copy-feedback" id="elementsToRemove-feedback">✓ Copied</span>
                        </button>
                    </div>
                </div>

                <div class="form-group">
                    <label>Extraction Preview</label>
                    <div id="previewText" class="preview-content"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const urlInput = document.getElementById('urlInput');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const loading = document.getElementById('loading');
        const errorMessage = document.getElementById('errorMessage');
        const resultsSection = document.getElementById('resultsSection');
        const contentSelector = document.getElementById('contentSelector');
        const elementsToRemove = document.getElementById('elementsToRemove');
        const previewText = document.getElementById('previewText');

        // Allow Enter key to submit
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                analyzeBtn.click();
            }
        });

        analyzeBtn.addEventListener('click', async () => {
            const url = urlInput.value.trim();

            if (!url) {
                showError('Please enter a URL');
                return;
            }

            // Basic URL validation
            try {
                new URL(url);
            } catch {
                showError('Please enter a valid URL');
                return;
            }

            // Reset UI
            hideError();
            resultsSection.classList.remove('visible');
            loading.classList.add('visible');
            analyzeBtn.disabled = true;

            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url }),
                });

                const data = await response.json();

                if (!response.ok || data.error) {
                    throw new Error(data.error || 'Analysis failed');
                }

                // Display results
                const foundContentSelector = (typeof data.contentSelector === 'string') ? data.contentSelector : '';
                const foundElementsToRemove = Array.isArray(data.elementsToRemove) ? data.elementsToRemove : [];
                contentSelector.value = foundContentSelector;
                elementsToRemove.value = foundElementsToRemove.join('\\n');
                previewText.textContent = data.preview || generatePreviewFromHtml(
                    data.html,
                    foundContentSelector,
                    foundElementsToRemove
                );
                resultsSection.classList.add('visible');

            } catch (error) {
                showError(error.message);
            } finally {
                loading.classList.remove('visible');
                analyzeBtn.disabled = false;
            }
        });

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
        }

        function hideError() {
            errorMessage.style.display = 'none';
        }

        function generatePreviewFromHtml(html, contentSelectorValue, elementsToRemoveList) {
            if (typeof html !== 'string' || !html.trim()) {
                return '(No preview available: no HTML returned)';
            }

            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                const candidateSelectors = [contentSelectorValue, 'article', 'main', '[role="main"]']
                    .filter(selector => typeof selector === 'string' && selector.trim());

                let contentElement = null;
                for (const selector of candidateSelectors) {
                    try {
                        contentElement = doc.querySelector(selector);
                    } catch {
                        continue; // Ignore invalid selectors from AI output
                    }

                    if (contentElement) {
                        break;
                    }
                }

                if (!contentElement) {
                    return '(No preview available: content selector did not match)';
                }

                const workingNode = contentElement.cloneNode(true);
                for (const selector of elementsToRemoveList) {
                    if (typeof selector !== 'string' || !selector.trim()) {
                        continue;
                    }
                    try {
                        workingNode.querySelectorAll(selector).forEach((el) => el.remove());
                    } catch {
                        continue; // Ignore invalid selectors from AI output
                    }
                }

                let text = '';
                const paragraphNodes = workingNode.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote');
                if (paragraphNodes.length > 0) {
                    text = Array.from(paragraphNodes)
                        .map(node => node.textContent ? node.textContent.trim() : '')
                        .filter(Boolean)
                        .join('\\n\\n');
                } else {
                    text = workingNode.textContent ? workingNode.textContent.trim() : '';
                }

                text = text.replace(/[ \\t]+/g, ' ').replace(/\\n{3,}/g, '\\n\\n');

                if (!text) {
                    return '(Preview is empty after applying selectors)';
                }

                const maxPreviewLength = 3000;
                if (text.length > maxPreviewLength) {
                    return text.substring(0, maxPreviewLength) + '...';
                }

                return text;
            } catch (error) {
                console.error('Preview generation failed:', error);
                return '(Preview generation failed)';
            }
        }

        function copyToClipboard(elementId) {
            const element = document.getElementById(elementId);
            const text = element.value;

            navigator.clipboard.writeText(text).then(() => {
                const feedback = document.getElementById(elementId + '-feedback');
                feedback.classList.add('visible');
                setTimeout(() => {
                    feedback.classList.remove('visible');
                }, 2000);
            }).catch(err => {
                console.error('Copy failed:', err);
            });
        }
    </script>
</body>
</html>`;
