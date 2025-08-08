// Settings script for Cat Scratches extension

// Default settings are provided by defaults.js (window.DEFAULT_SETTINGS)

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
        const stored = await browser.storage.local.get(['catScratchesSettings']);
        if (stored.catScratchesSettings) {
            // User has saved settings - use them exactly as saved
            currentSettings = migrateSettings(stored.catScratchesSettings);
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
            catScratchesSettings: currentSettings
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
    document.getElementById('template').addEventListener('input', updateOutputFormatFromUI);
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
    // Validate settings
    if (!validateSettings()) {
        return;
    }

    await saveSettings();

    showStatus('Settings saved successfully!', 'success');
}

// Handle reset settings
async function handleResetSettings() {
    try {
        // Remove any saved settings
        await browser.storage.local.remove('catScratchesSettings');

        // Recreate defaults as on first install
        const defaults = (typeof getDefaultSettings === 'function')
            ? getDefaultSettings()
            : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

        await browser.storage.local.set({ catScratchesSettings: defaults });

        // Update in-memory and UI state
        currentSettings = JSON.parse(JSON.stringify(defaults));
        updateUI();
        showStatus('Settings reset to defaults.', 'success');
    } catch (error) {
        console.error('Failed to reset settings:', error);
        showStatus('Failed to reset settings. Please try again.', 'error');
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

// Migrate older settings structure to the new unified template approach
function migrateSettings(inputSettings) {
    const settings = JSON.parse(JSON.stringify(inputSettings || {}));
    settings.outputFormat = settings.outputFormat || {};
    // If legacy customTemplate exists or include* flags exist, convert to template
    const hasLegacyFlags = (
        settings.outputFormat.hasOwnProperty('includeSource') ||
        settings.outputFormat.hasOwnProperty('includeSeparator') ||
        settings.outputFormat.hasOwnProperty('includeTimestamp') ||
        settings.outputFormat.hasOwnProperty('customTemplate')
    );

    // Ensure a template exists; prefer legacy customTemplate if present
    if (!settings.outputFormat.template) {
        const legacyTemplate = (settings.outputFormat.customTemplate || '').trim();
        if (legacyTemplate) {
            settings.outputFormat.template = legacyTemplate;
        } else {
            // Use current defaults from DEFAULT_SETTINGS if available
            const defaultTemplate = (DEFAULT_SETTINGS && DEFAULT_SETTINGS.outputFormat && DEFAULT_SETTINGS.outputFormat.template)
                ? DEFAULT_SETTINGS.outputFormat.template
                : '# {title}\n\n<{url}>\n\n---\n\n{content}';
            settings.outputFormat.template = defaultTemplate;
        }
    }

    // Replace {formattedTitle} placeholder with concrete heading if present
    if (settings.outputFormat.template && settings.outputFormat.template.includes('{formattedTitle}')) {
        const legacyFormat = settings.outputFormat.titleFormat || 'h1';
        let headingSyntax = '# {title}';
        if (legacyFormat === 'h2') headingSyntax = '## {title}';
        else if (legacyFormat === 'h3') headingSyntax = '### {title}';
        else if (legacyFormat === 'bold') headingSyntax = '**{title}**';
        else if (legacyFormat === 'none') headingSyntax = '';
        settings.outputFormat.template = settings.outputFormat.template.replace('{formattedTitle}', headingSyntax).replace(/\n\n\n+/g, '\n\n').trim();
    }

    // Remove legacy fields to keep storage clean
    delete settings.outputFormat.includeSource;
    delete settings.outputFormat.includeSeparator;
    delete settings.outputFormat.includeTimestamp;
    delete settings.outputFormat.customTemplate;
    delete settings.outputFormat.titleFormat;

    return settings;
}

// Enhance UX: clickable placeholder tags to insert into template
document.addEventListener('DOMContentLoaded', () => {
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
});


