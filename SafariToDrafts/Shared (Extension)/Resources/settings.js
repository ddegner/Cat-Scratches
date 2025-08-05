// Settings script for Cat Scratches extension

// Default settings configuration (single source of truth for all settings)
const DEFAULT_SETTINGS = {
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
            '.wp-block-post-content',
            '.story-body',
            '.article-body',
            '.article-content',
            '.content-body',
            '.main-content',
            '.kg-post',
            '.postArticle-content',
            '.markup',
            '.node .content',
            '.content',
            '.post',
            '.entry',
            '.article',
            'section[name="articleBody"]',
            '[itemprop="articleBody"]',
            '.StoryBodyCompanionColumn',
            '.content__article-body',
            '.article__content',
            '.article__body',
            '.post-body',
            '.entry-body',
            '.itemFullText',
            '#js-article-text'
        ]
    },
    outputFormat: {
        titleFormat: 'h1',
        includeSource: true,
        includeSeparator: true,
        includeTimestamp: false,
        customTemplate: '',
        defaultTag: ''
    },
    advancedFiltering: {
        customFilters: [
            'img',
            'picture',
            'figure',
            'figcaption',
            'video',
            'audio',
            'source',
            '.image',
            '.img',
            '.photo',
            '.picture',
            '.gallery',
            '.slideshow',
            '.carousel',
            '.lightbox',
            '.media',
            '.caption',
            '.image-caption',
            '.photo-caption',
            '.media-caption',
            '.image-credit',
            '.photo-credit',
            '.media-credit',
            '.image-container',
            '.photo-container',
            '.media-container',
            'nav',
            'header',
            'footer',
            'aside',
            '.nav',
            '.navigation',
            '.header',
            '.footer',
            '.sidebar',
            '.breadcrumb',
            '.pagination',
            'h1.entry-title',
            'h1.post-title',
            'h1.article-title',
            'h1.page-title',
            '.entry-title',
            '.post-title',
            '.article-title',
            '.page-title',
            '.headline',
            '.title',
            '.story-headline',
            '.article-headline',
            'h1.headline',
            'h1.title',
            'h1.story-headline',
            'h1.article-headline',
            '.post-header h1',
            '.article-header h1',
            '.entry-header h1',
            '.content-header h1',
            '.story-header h1',
            '.page-header h1',
            'header h1',
            '.header h1',
            '.masthead h1',
            '[class*="title"] h1',
            '[class*="headline"] h1',
            'h1[class*="title"]',
            'h1[class*="headline"]',
            '.wp-block-post-title',
            '.single-title',
            '.post-title-wrapper h1',
            '.ad',
            '.ads',
            '.advertisement',
            '.sponsored',
            '.banner',
            '.google-ad',
            '.outbrain',
            '.taboola',
            '[class*="ad-"]',
            '[id*="ad-"]',
            '.social',
            '.share',
            '.sharing',
            '.social-buttons',
            '.facebook',
            '.twitter',
            '.linkedin',
            '.comments',
            '.comment',
            '.disqus',
            '.comment-form',
            '.comment-section',
            '.related',
            '.recommended',
            '.more-stories',
            '.trending',
            '.popular',
            '.suggestions',
            '.newsletter',
            '.subscription',
            '.signup',
            '.email-signup',
            '.cta',
            '.popup',
            '.modal',
            '.overlay',
            '.cookie-notice',
            '.cookie-banner',
            '.author-bio',
            '.tags',
            '.categories',
            '.meta',
            '.widget',
            '.secondary',
            '.sidebar-widget',
            '.wp-caption',
            '.wp-gallery',
            '.sharedaddy',
            '[data-testid="related-topics"]',
            '[data-testid="related-links"]',
            '[data-testid="related-content"]',
            '[data-testid="related-articles"]',
            '[data-testid="related-stories"]',
            '[data-testid="related-topics-list"]',
            '[data-testid="related-topics-item"]',
            '[data-testid="advertisement"]',
            '[data-testid="ad"]',
            '[data-testid="sponsored"]',
            '[data-testid="skip-advertisement"]',
            '[data-testid="ad-skip"]',
            '[data-testid="supported-by"]',
            '[data-testid="sponsored-content"]',
            '[data-testid="partner-content"]',
            '[data-testid="share-tools"]',
            '[data-testid="social-share"]',
            '[data-testid="article-tools"]',
            '[data-testid="listen-button"]',
            '[data-testid="audio-player"]',
            '[data-testid="listen-to-article"]',
            '[data-testid="byline"]',
            '[data-testid="author-info"]',
            '[data-testid="article-meta"]',
            '[data-testid="article-info"]',
            '[data-testid="dateline"]',
            '[data-testid="image-caption"]',
            '[data-testid="photo-caption"]',
            '[data-testid="image-credit"]',
            '[data-testid="photo-credit"]',
            '[data-testid="caption"]',
            '[data-testid="credit"]',
            '[data-testid="newsletter"]',
            '[data-testid="subscription"]',
            '[data-testid="subscribe"]',
            '[data-testid="sign-up"]',
            '[data-testid="comments"]',
            '[data-testid="recommended"]',
            '[data-testid="more-stories"]',
            '[data-testid="see-more"]',
            '[data-testid="share-full-article"]',
            '[data-testid="skip-ad"]',
            '[data-testid*="listen"]',
            '[data-testid*="audio"]',
            '[data-testid*="share"]',
            '[data-testid*="learn-more"]',
            '[data-testid*="updated"]',
            '.related-topics',
            '.related-links',
            '.related-content',
            '.related-articles',
            '.related-stories',
            '.advertisement',
            '.supported-by',
            '.share-tools',
            '.social-share',
            '.article-tools',
            '.listen-button',
            '.audio-player',
            '.byline',
            '.author-info',
            '.article-meta',
            '.article-info',
            '.dateline',
            '.image-caption',
            '.photo-caption',
            '.image-credit',
            '.photo-credit',
            '.caption',
            '.credit',
            '.newsletter',
            '.subscription',
            '.subscribe',
            '.sign-up',
            '.comments',
            '.recommended',
            '.more-stories',
            '.see-more',
            '.share-full-article',
            '.skip-ad',
            'nav[role="navigation"]',
            '.navigation',
            '.nav-menu',
            '.nav-list',
            '.nav-items',
            '.nav-links',
            '.site-header',
            '.site-footer',
            '.global-header',
            '.global-footer',
            '[class*="listen"]',
            '[class*="audio"]',
            '[class*="share-full"]',
            '[class*="learn-more"]',
            '[class*="updated-time"]',
            '[class*="see-more"]',
            '[class*="related-content"]',
            '[class*="skip-ad"]',
            '[class*="advertisement"]',
            'iframe',
            'embed',
            'object',
            'canvas',
            'form',
            '.instagram',
            '.instagram-media',
            '.twitter-tweet',
            '.fb-post',
            'script',
            'noscript'
        ],
        minContentLength: 150,
        maxLinkRatio: 0.3
    }
};

// Global settings object
let currentSettings = {};

// Initialize settings page
document.addEventListener('DOMContentLoaded', async () => {
    // Load current settings
    await loadSettings();

    // Set up event listeners
    setupEventListeners();

    // Update UI with current settings
    updateUI();
});

// Load settings from storage
async function loadSettings() {
    try {
        const stored = await browser.storage.local.get(['safariToDraftsSettings']);
        if (stored.safariToDraftsSettings) {
            // User has saved settings - use them exactly as saved
            currentSettings = stored.safariToDraftsSettings;
        } else {
            // No saved settings - use defaults for initial setup
            currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        showStatus('Failed to load settings. Using defaults.', 'error');
    }
}

// Save settings to storage
async function saveSettings() {
    try {
        await browser.storage.local.set({
            safariToDraftsSettings: currentSettings
        });
        showStatus('Settings saved successfully!', 'success');
    } catch (error) {
        console.error('Failed to save settings:', error);
        showStatus('Failed to save settings. Please try again.', 'error');
    }
}

// Merge settings function removed - no longer needed
// User settings now completely replace defaults when saved

// Set up all event listeners
function setupEventListeners() {

    // Content extraction checkboxes
    // Individual removal checkboxes removed - now using customFilters only

    // Content selectors textarea
    document.getElementById('contentSelectors').addEventListener('input', updateContentSelectorsFromUI);

    // Output format inputs
    document.getElementById('titleFormat').addEventListener('change', updateOutputFormatFromUI);
    document.getElementById('includeSource').addEventListener('change', updateOutputFormatFromUI);
    document.getElementById('includeSeparator').addEventListener('change', updateOutputFormatFromUI);
    document.getElementById('includeTimestamp').addEventListener('change', updateOutputFormatFromUI);
    document.getElementById('customTemplate').addEventListener('input', updateOutputFormatFromUI);
    document.getElementById('defaultTag').addEventListener('input', updateOutputFormatFromUI);

    // Advanced filtering inputs (using customFilters from HTML)
    document.getElementById('customFilters').addEventListener('input', updateAdvancedFilteringFromUI);

    // Action buttons
    document.getElementById('saveSettings').addEventListener('click', handleSaveSettings);
    document.getElementById('resetSettings').addEventListener('click', handleResetSettings);
}

// Update UI with current settings
function updateUI() {

    // Content extraction - individual removal settings removed, now using customFilters only

    // Update content selectors textarea
    updateContentSelectorsUI();

    // Output format
    document.getElementById('titleFormat').value = currentSettings.outputFormat.titleFormat;
    document.getElementById('includeSource').checked = currentSettings.outputFormat.includeSource;
    document.getElementById('includeSeparator').checked = currentSettings.outputFormat.includeSeparator;
    document.getElementById('includeTimestamp').checked = currentSettings.outputFormat.includeTimestamp;
    document.getElementById('customTemplate').value = currentSettings.outputFormat.customTemplate;
    document.getElementById('defaultTag').value = currentSettings.outputFormat.defaultTag || '';

    // Advanced filtering
    document.getElementById('customFilters').value = currentSettings.advancedFiltering.customFilters.join('\n');
}



// Update content selectors textarea display
function updateContentSelectorsUI() {
    const contentSelectorsTextarea = document.getElementById('contentSelectors');
    if (contentSelectorsTextarea) {
        contentSelectorsTextarea.value = currentSettings.contentExtraction.customSelectors.join('\n');
    }
}







// Update content selectors from UI textarea
function updateContentSelectorsFromUI() {
    const contentSelectorsValue = document.getElementById('contentSelectors').value;
    const selectors = contentSelectorsValue
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

    currentSettings.contentExtraction.customSelectors = selectors;


}

// Update output format from UI
function updateOutputFormatFromUI() {
    currentSettings.outputFormat.titleFormat = document.getElementById('titleFormat').value;
    currentSettings.outputFormat.includeSource = document.getElementById('includeSource').checked;
    currentSettings.outputFormat.includeSeparator = document.getElementById('includeSeparator').checked;
    currentSettings.outputFormat.includeTimestamp = document.getElementById('includeTimestamp').checked;
    currentSettings.outputFormat.customTemplate = document.getElementById('customTemplate').value;
    currentSettings.outputFormat.defaultTag = document.getElementById('defaultTag').value.trim();
}

// Update advanced filtering from UI
function updateAdvancedFilteringFromUI() {
    const customFilters = document.getElementById('customFilters').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

    currentSettings.advancedFiltering.customFilters = customFilters;
}

// Handle save settings
async function handleSaveSettings() {
    // Validate settings
    if (!validateSettings()) {
        return;
    }

    await saveSettings();

    showStatus('Settings saved successfully!', 'success');
}

// Handle reset settings
async function handleResetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        updateUI();
        await saveSettings();
    }
}



// Validate current settings
function validateSettings() {

    // Validate minimum content length
    const minLength = currentSettings.advancedFiltering.minContentLength;
    if (minLength < 0 || isNaN(minLength)) {
        showStatus('Minimum content length must be a positive number', 'error');
        return false;
    }

    // Validate link ratio
    const linkRatio = currentSettings.advancedFiltering.maxLinkRatio;
    if (linkRatio < 0 || linkRatio > 1 || isNaN(linkRatio)) {
        showStatus('Link ratio must be between 0 and 1', 'error');
        return false;
    }

    return true;
}



// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type || 'info'}`;
    statusEl.style.display = 'block';

    // Different timeout durations based on message type
    const timeout = type === 'error' ? 7000 : 5000;

    setTimeout(() => {
        statusEl.style.display = 'none';
    }, timeout);
}


