// Settings script for Cat Scratches extension
'use strict';

// Default settings, migrateSettings, and NATIVE_APP_ID are provided by defaults.js

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

    // Set up clickable placeholder tags
    setupPlaceholderTags();
});

// Load settings from iCloud (with local cache fallback)
async function loadSettings() {
    try {
        // Try to get settings from iCloud via native messaging
        const response = await browser.runtime.sendNativeMessage(NATIVE_APP_ID, {
            action: 'getSettings'
        });

        if (response && response.settings && typeof response.settings === 'object') {
            currentSettings = migrateSettings(response.settings);
            // Cache locally for offline access
            await browser.storage.local.set({ catScratchesSettings: currentSettings });
            console.log('Settings loaded from iCloud');
            return;
        }
    } catch (error) {
        console.log('Could not load from iCloud, trying local cache:', error.message);
    }

    // Fallback to local cache
    try {
        const localResult = await browser.storage.local.get(['catScratchesSettings']);
        if (localResult.catScratchesSettings) {
            currentSettings = migrateSettings(localResult.catScratchesSettings);
            console.log('Settings loaded from local cache');
            return;
        }
    } catch (error) {
        console.log('Local cache also failed:', error.message);
    }

    // Last resort: use defaults
    currentSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    showStatus('Using default settings.', 'info');
}

// Save settings to iCloud (and local cache)
async function saveSettings() {
    try {
        // Always cache locally first
        await browser.storage.local.set({ catScratchesSettings: currentSettings });

        console.log('Attempting to save settings via native messaging...');
        console.log('Settings object:', JSON.stringify(currentSettings).substring(0, 200) + '...');

        // Then save to iCloud
        const response = await browser.runtime.sendNativeMessage(NATIVE_APP_ID, {
            action: 'saveSettings',
            settings: currentSettings
        });

        console.log('Native messaging response:', JSON.stringify(response));

        if (response && response.success) {
            showStatus('Settings saved to iCloud!', 'success');
        } else {
            console.log('Response did not indicate success:', response);
            showStatus('Settings saved locally.', 'success');
        }
    } catch (error) {
        console.error('Native messaging error:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        showStatus('Settings saved locally (iCloud unavailable).', 'success');
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Content selectors textarea
    document.getElementById('contentSelectors').addEventListener('input', updateContentSelectorsFromUI);

    // Output format inputs
    document.getElementById('template').addEventListener('input', updateOutputFormatFromUI);
    document.getElementById('defaultTag').addEventListener('input', updateOutputFormatFromUI);

    // Advanced filtering inputs
    document.getElementById('customFilters').addEventListener('input', updateAdvancedFilteringFromUI);

    // Action buttons
    document.getElementById('saveSettings').addEventListener('click', handleSaveSettings);
    document.getElementById('resetSettings').addEventListener('click', handleResetSettings);
}

// Update UI with current settings
function updateUI() {
    // Update content selectors textarea
    updateContentSelectorsUI();

    // Output format
    document.getElementById('template').value = currentSettings.outputFormat.template || '';
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
    currentSettings.outputFormat.template = document.getElementById('template').value;
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
    if (!validateSettings()) {
        return;
    }
    await saveSettings();
}

// Handle reset settings
async function handleResetSettings() {
    try {
        const defaults = getDefaultSettings();
        currentSettings = JSON.parse(JSON.stringify(defaults));
        updateUI();
        await saveSettings();  // Uses native messaging to save to iCloud
        showStatus('Settings reset to defaults.', 'success');
    } catch (error) {
        console.error('Failed to reset settings:', error);
        showStatus('Failed to reset settings. Please try again.', 'error');
    }
}

// Validate current settings
function validateSettings() {
    const minLength = currentSettings.advancedFiltering.minContentLength;
    if (minLength < 0 || isNaN(minLength)) {
        showStatus('Minimum content length must be a positive number', 'error');
        return false;
    }

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

    const timeout = type === 'error' ? 7000 : 5000;
    setTimeout(() => {
        statusEl.style.display = 'none';
    }, timeout);
}

// Set up clickable placeholder tags to insert into template
function setupPlaceholderTags() {
    const container = document.getElementById('placeholderTags');
    if (!container) return;

    const placeholders = ['{title}', '{url}', '{content}', '{timestamp}', '{tag}'];
    placeholders.forEach(ph => {
        const el = document.createElement('span');
        el.className = 'placeholder-tag';
        el.textContent = ph;
        el.addEventListener('click', () => {
            const textarea = document.getElementById('template');
            if (!textarea) return;
            const start = textarea.selectionStart || 0;
            const end = textarea.selectionEnd || 0;
            const value = textarea.value || '';
            textarea.value = value.substring(0, start) + ph + value.substring(end);
            textarea.dispatchEvent(new Event('input'));
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + ph.length;
        });
        container.appendChild(el);
    });
}
