// Settings script for SafariToDrafts extension

// Default settings configuration
const DEFAULT_SETTINGS = {
    keyboardShortcut: {
        modifier1: 'Command',
        modifier2: 'Shift',
        key: 'D'
    },
    contentExtraction: {
        strategy: 'default',
        removeImages: true,
        removeAds: true,
        removeNavigation: true,
        removeComments: true,
        removeRelated: true,
        customSelectors: [
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
            
            // Major news sites
            '.story-body',
            '.article-body',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.content-body',
            '.main-content',
            
            // WordPress (most common CMS)
            '.single-post .entry-content',
            '.post .entry-content',
            '.hentry .entry-content',
            '.wp-block-post-content',
            
            // Other CMS platforms
            '.node .content', // Drupal
            '.kg-post', // Ghost
            '.postArticle-content', // Medium
            '.markup', // Substack
            
            // Generic selectors
            '.blog-post-content',
            '.content-area',
            '.primary-content',
            '.content',
            '.post',
            '.entry',
            '.article'
        ]
    },
    outputFormat: {
        titleFormat: 'h1',
        includeSource: true,
        includeSeparator: true,
        includeTimestamp: false,
        customTemplate: ''
    },
    advancedFiltering: {
        customFilters: [
            'nav',
            'header',
            'footer',
            'aside',
            '.nav',
            '.navigation',
            '.header',
            '.footer',
            '.sidebar',
            '.ad',
            '.ads',
            '.advertisement',
            '.social',
            '.share',
            '.comments',
            '.comment',
            '.related',
            '.recommended'
        ],
        minContentLength: 100,
        maxLinkRatio: 0.5
    }
};

// Preset configurations for content extraction
const EXTRACTION_PRESETS = {
    default: {
        removeImages: true,
        removeAds: true,
        removeNavigation: true,
        removeComments: true,
        removeRelated: true,
        customSelectors: [
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
            
            // Major news sites
            '.story-body',
            '.article-body',
            '.article-content',
            '.post-content',
            '.entry-content',
            '.content-body',
            '.main-content',
            
            // Specific major news sites
            '.css-53u6y8', // New York Times
            '.zn-body__paragraph', // CNN
            '.story-body__inner', // BBC
            '.content__article-body', // Guardian
            '.ArticleBody-articleBody', // Wall Street Journal
            
            // WordPress (most common CMS)
            '.single-post .entry-content',
            '.post .entry-content',
            '.hentry .entry-content',
            '.wp-block-post-content',
            '.site-main .entry-content',
            '.content-area .entry-content',
            
            // Other CMS platforms
            '.node .content', // Drupal
            '.field-name-body', // Drupal
            '.kg-post', // Ghost
            '.postArticle-content', // Medium
            '.markup', // Substack
            '.sqs-block-content', // Squarespace
            '.w-richtext', // Webflow
            
            // Generic content selectors
            '.blog-post-content',
            '.content-area',
            '.primary-content',
            '.article-wrapper',
            '.content-wrapper',
            '.content',
            '.post',
            '.entry',
            '.article'
        ],
        customFilters: [
            // Navigation & structure
            'nav', 'header', 'footer', 'aside',
            '.nav', '.navigation', '.header', '.footer', '.sidebar',
            '.breadcrumb', '.pagination',
            
            // Advertisements
            '.ad', '.ads', '.advertisement', '.sponsored',
            '.banner', '.google-ad', '.outbrain', '.taboola',
            '[class*="ad-"]', '[id*="ad-"]',
            
            // Social & sharing
            '.social', '.share', '.sharing', '.social-buttons',
            '.facebook', '.twitter', '.linkedin',
            
            // Comments & discussions
            '.comments', '.comment', '.disqus',
            '.comment-form', '.comment-section',
            
            // Related content
            '.related', '.recommended', '.more-stories',
            '.trending', '.popular', '.suggestions',
            
            // Newsletter & subscriptions
            '.newsletter', '.subscription', '.signup',
            '.email-signup', '.cta',
            
            // Popups & overlays
            '.popup', '.modal', '.overlay',
            '.cookie-notice', '.cookie-banner',
            
            // Metadata & widgets
            '.author-bio', '.tags', '.categories', '.meta',
            '.widget', '.secondary', '.sidebar-widget',
            
            // WordPress specific
            '.wp-caption', '.wp-gallery', '.sharedaddy'
        ],
        minContentLength: 150,
        maxLinkRatio: 0.3
    },
    custom: {
        // Will be populated from current settings
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

    // Set initial preset selection
    updatePresetSelection();
});

// Load settings from storage
async function loadSettings() {
    try {
        const stored = await browser.storage.local.get(['safariToDraftsSettings']);
        if (stored.safariToDraftsSettings) {
            currentSettings = mergeSettings(DEFAULT_SETTINGS, stored.safariToDraftsSettings);
        } else {
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

// Merge settings objects, keeping structure intact
function mergeSettings(defaults, stored) {
    const result = JSON.parse(JSON.stringify(defaults));

    for (const key in stored) {
        if (stored[key] !== null && typeof stored[key] === 'object' && !Array.isArray(stored[key])) {
            result[key] = mergeSettings(result[key] || {}, stored[key]);
        } else {
            result[key] = stored[key];
        }
    }

    return result;
}

// Set up all event listeners
function setupEventListeners() {
    // Keyboard shortcut inputs
    document.getElementById('shortcutModifier1').addEventListener('change', updateShortcutFromUI);
    document.getElementById('shortcutModifier2').addEventListener('change', updateShortcutFromUI);
    document.getElementById('shortcutKey').addEventListener('input', updateShortcutFromUI);

    // Content extraction preset buttons
    document.querySelectorAll('.preset-button').forEach(button => {
        button.addEventListener('click', () => {
            const preset = button.dataset.preset;
            applyPreset(preset);
        });
    });

    // Content extraction checkboxes
    document.getElementById('removeImages').addEventListener('change', updateContentExtractionFromUI);
    document.getElementById('removeAds').addEventListener('change', updateContentExtractionFromUI);
    document.getElementById('removeComments').addEventListener('change', updateContentExtractionFromUI);

    // Content selectors textarea
    document.getElementById('contentSelectors').addEventListener('input', updateContentSelectorsFromUI);

    // Output format inputs
    document.getElementById('titleFormat').addEventListener('change', updateOutputFormatFromUI);
    document.getElementById('includeSource').addEventListener('change', updateOutputFormatFromUI);
    document.getElementById('includeSeparator').addEventListener('change', updateOutputFormatFromUI);
    document.getElementById('includeTimestamp').addEventListener('change', updateOutputFormatFromUI);
    document.getElementById('customTemplate').addEventListener('input', updateOutputFormatFromUI);

    // Advanced filtering inputs (using customFilters from HTML)
    document.getElementById('customFilters').addEventListener('input', updateAdvancedFilteringFromUI);

    // Action buttons
    document.getElementById('saveSettings').addEventListener('click', handleSaveSettings);
    document.getElementById('resetSettings').addEventListener('click', handleResetSettings);
}

// Update UI with current settings
function updateUI() {
    // Keyboard shortcut
    document.getElementById('shortcutModifier1').value = currentSettings.keyboardShortcut.modifier1;
    document.getElementById('shortcutModifier2').value = currentSettings.keyboardShortcut.modifier2;
    document.getElementById('shortcutKey').value = currentSettings.keyboardShortcut.key;

    // Content extraction
    document.getElementById('removeImages').checked = currentSettings.contentExtraction.removeImages;
    document.getElementById('removeAds').checked = currentSettings.contentExtraction.removeAds;
    document.getElementById('removeComments').checked = currentSettings.contentExtraction.removeComments;

    // Update content selectors textarea
    updateContentSelectorsUI();

    // Output format
    document.getElementById('titleFormat').value = currentSettings.outputFormat.titleFormat;
    document.getElementById('includeSource').checked = currentSettings.outputFormat.includeSource;
    document.getElementById('includeSeparator').checked = currentSettings.outputFormat.includeSeparator;
    document.getElementById('includeTimestamp').checked = currentSettings.outputFormat.includeTimestamp;
    document.getElementById('customTemplate').value = currentSettings.outputFormat.customTemplate;

    // Advanced filtering
    document.getElementById('customFilters').value = currentSettings.advancedFiltering.customFilters.join('\n');
}

// Update preset selection UI
function updatePresetSelection() {
    const strategy = currentSettings.contentExtraction.strategy;

    document.querySelectorAll('.preset-button').forEach(button => {
        button.classList.remove('active');
    });

    const activeButton = document.querySelector(`[data-preset="${strategy}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Update content selectors textarea display
function updateContentSelectorsUI() {
    const contentSelectorsTextarea = document.getElementById('contentSelectors');
    if (contentSelectorsTextarea) {
        contentSelectorsTextarea.value = currentSettings.contentExtraction.customSelectors.join('\n');
    }
}

// Apply preset configuration
function applyPreset(presetName) {
    if (presetName === 'custom') {
        currentSettings.contentExtraction.strategy = 'custom';
        updatePresetSelection();
        return;
    }

    const preset = EXTRACTION_PRESETS[presetName];
    if (!preset) return;

    currentSettings.contentExtraction.strategy = presetName;
    currentSettings.contentExtraction.removeImages = preset.removeImages;
    currentSettings.contentExtraction.removeAds = preset.removeAds;
    currentSettings.contentExtraction.removeNavigation = preset.removeNavigation;
    currentSettings.contentExtraction.removeComments = preset.removeComments;
    currentSettings.contentExtraction.removeRelated = preset.removeRelated;
    currentSettings.contentExtraction.customSelectors = [...preset.customSelectors];

    // Apply advanced filtering settings if they exist in the preset
    if (preset.customFilters) {
        currentSettings.advancedFiltering.customFilters = [...preset.customFilters];
    }
    if (preset.minContentLength !== undefined) {
        currentSettings.advancedFiltering.minContentLength = preset.minContentLength;
    }
    if (preset.maxLinkRatio !== undefined) {
        currentSettings.advancedFiltering.maxLinkRatio = preset.maxLinkRatio;
    }

    updateUI();
    updatePresetSelection();
}

// Update keyboard shortcut from UI
function updateShortcutFromUI() {
    currentSettings.keyboardShortcut.modifier1 = document.getElementById('shortcutModifier1').value;
    currentSettings.keyboardShortcut.modifier2 = document.getElementById('shortcutModifier2').value;
    currentSettings.keyboardShortcut.key = document.getElementById('shortcutKey').value.toUpperCase();

    // Show notification that shortcut changes require restart
    showStatus('Keyboard shortcut changes require restarting Safari to take effect.', 'info');
}

// Update content extraction settings from UI
function updateContentExtractionFromUI() {
    currentSettings.contentExtraction.removeImages = document.getElementById('removeImages').checked;
    currentSettings.contentExtraction.removeAds = document.getElementById('removeAds').checked;
    currentSettings.contentExtraction.removeComments = document.getElementById('removeComments').checked;

    // When user changes settings, switch to custom preset
    currentSettings.contentExtraction.strategy = 'custom';
    updatePresetSelection();
}

// Update content selectors from UI textarea
function updateContentSelectorsFromUI() {
    const contentSelectorsValue = document.getElementById('contentSelectors').value;
    const selectors = contentSelectorsValue
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

    currentSettings.contentExtraction.customSelectors = selectors;
    
    // When user changes selectors, switch to custom preset
    currentSettings.contentExtraction.strategy = 'custom';
    updatePresetSelection();
}

// Update output format from UI
function updateOutputFormatFromUI() {
    currentSettings.outputFormat.titleFormat = document.getElementById('titleFormat').value;
    currentSettings.outputFormat.includeSource = document.getElementById('includeSource').checked;
    currentSettings.outputFormat.includeSeparator = document.getElementById('includeSeparator').checked;
    currentSettings.outputFormat.includeTimestamp = document.getElementById('includeTimestamp').checked;
    currentSettings.outputFormat.customTemplate = document.getElementById('customTemplate').value;
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

    // Always show reminder about keyboard shortcut changes since they require Safari restart
    showStatus('Settings saved! Note: Keyboard shortcut changes require restarting Safari to take effect.', 'info');
}

// Handle reset settings
async function handleResetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        updateUI();
        updatePresetSelection();
        await saveSettings();
    }
}

// Handle export settings
function handleExportSettings() {
    const dataStr = JSON.stringify(currentSettings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'safari-to-drafts-settings.json';
    link.click();

    URL.revokeObjectURL(url);
    showStatus('Settings exported successfully!', 'success');
}

// Handle import settings
function handleImportSettings() {
    document.getElementById('importFile').click();
}

// Handle file import
async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const importedSettings = JSON.parse(text);

        // Validate imported settings
        if (!validateImportedSettings(importedSettings)) {
            showStatus('Invalid settings file format', 'error');
            return;
        }

        currentSettings = mergeSettings(DEFAULT_SETTINGS, importedSettings);
        updateUI();
        updatePresetSelection();
        showStatus('Settings imported successfully!', 'success');
    } catch (error) {
        console.error('Import error:', error);
        showStatus('Failed to import settings. Please check the file format.', 'error');
    }

    // Clear the file input
    event.target.value = '';
}

// Validate current settings
function validateSettings() {
    // Validate keyboard shortcut
    const key = currentSettings.keyboardShortcut.key;
    if (!key || key.length !== 1) {
        showStatus('Invalid keyboard shortcut key', 'error');
        return false;
    }

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

// Validate imported settings structure
function validateImportedSettings(settings) {
    // Basic structure validation
    if (!settings || typeof settings !== 'object') {
        return false;
    }

    // Check for required sections
    const requiredSections = ['keyboardShortcut', 'contentExtraction', 'outputFormat', 'advancedFiltering'];

    for (const section of requiredSections) {
        if (!settings[section] || typeof settings[section] !== 'object') {
            return false;
        }
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

// Safari Web Extension API polyfill and fallback
if (typeof browser === 'undefined') {
    if (typeof chrome !== 'undefined') {
        window.browser = chrome;
    } else {
        // Create a minimal polyfill for Safari
        window.browser = {
            storage: {
                local: {
                    get: async function(keys) {
                        try {
                            const result = {};
                            if (Array.isArray(keys)) {
                                keys.forEach(key => {
                                    const value = localStorage.getItem(key);
                                    if (value) {
                                        result[key] = JSON.parse(value);
                                    }
                                });
                            } else if (typeof keys === 'object') {
                                for (const key in keys) {
                                    const value = localStorage.getItem(key);
                                    result[key] = value ? JSON.parse(value) : keys[key];
                                }
                            }
                            return result;
                        } catch (error) {
                            console.error('Storage get error:', error);
                            return {};
                        }
                    },
                    set: async function(items) {
                        try {
                            for (const key in items) {
                                localStorage.setItem(key, JSON.stringify(items[key]));
                            }
                        } catch (error) {
                            console.error('Storage set error:', error);
                            throw error;
                        }
                    }
                }
            }
        };
    }
}
