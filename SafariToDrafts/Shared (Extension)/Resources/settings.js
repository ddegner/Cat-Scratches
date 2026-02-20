// Settings script for Cat Scratches extension
'use strict';

// Shared defaults and settings-store helpers are provided by defaults.js + settings-store.js

// Global settings object
let currentSettings = {};
let isDirty = false;

const ADVANCED_ACCORDION_STORAGE_KEY = 'catScratches.advancedAccordionOpen';

// Initialize settings page
document.addEventListener('DOMContentLoaded', async () => {
    // Load current settings
    await loadSettings();

    // Set up event listeners
    setupEventListeners();

    // Restore advanced accordion state
    initializeAdvancedAccordion();

    // Update UI with current settings
    updateUI();

    // Set up clickable placeholder tags
    setupPlaceholderTags();

    // Check if Drafts is installed and show banner if not
    await checkDraftsInstallation();

    setDirtyState(false);
});

// Load settings using shared storage logic
async function loadSettings() {
    try {
        const result = await loadCatScratchesSettings();
        currentSettings = result.settings;

        if (result.source === 'icloud') {
            console.log('Settings loaded from iCloud');
        } else if (result.source === 'local') {
            console.log('Settings loaded from local cache');
        } else {
            showStatus('Using default settings.', 'info');
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        currentSettings = getDefaultSettings();
        showStatus('Using default settings.', 'info');
    }
}

// Save settings using shared storage logic
async function saveSettings() {
    try {
        const result = await saveCatScratchesSettings(currentSettings);
        currentSettings = result.settings;

        if (result.savedToCloud) {
            showStatus('Settings saved to iCloud!', 'success');
        } else {
            showStatus('Settings saved locally (iCloud unavailable).', 'success');
        }
        setDirtyState(false);
        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        showStatus('Failed to save settings. Please try again.', 'error');
        return false;
    }
}

// Set up all event listeners
function setupEventListeners() {
    // Destination toggle
    document.querySelectorAll('input[name="saveDestination"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateDestinationFromUI();
        });
    });

    // Advanced settings accordion (UI only)
    const advancedAccordion = document.getElementById('advancedSettingsAccordion');
    if (advancedAccordion) {
        advancedAccordion.addEventListener('toggle', () => {
            saveAdvancedAccordionPreference(advancedAccordion.open);
        });
    }

    // Get Drafts link
    const getDraftsLink = document.getElementById('getDraftsLink');
    if (getDraftsLink) {
        getDraftsLink.addEventListener('click', (e) => {
            e.preventDefault();
            openDraftsAppStore();
        });
    }

    // Content selectors textarea
    document.getElementById('contentSelectors').addEventListener('input', updateContentSelectorsFromUI);

    // Output format inputs
    document.getElementById('template').addEventListener('input', updateOutputFormatFromUI);
    document.getElementById('defaultTag').addEventListener('input', updateOutputFormatFromUI);

    // Advanced filtering inputs
    document.getElementById('customFilters').addEventListener('input', updateAdvancedFilteringFromUI);
    document.querySelectorAll('input[name="draftsUrlMode"]').forEach((input) => {
        input.addEventListener('change', updateDraftsURLFromUI);
    });
    document.getElementById('draftsActionName').addEventListener('input', updateDraftsActionFromUI);

    // Action buttons
    document.getElementById('saveSettings').addEventListener('click', handleSaveSettings);
    document.getElementById('resetSettings').addEventListener('click', handleResetSettings);
}

// Update UI with current settings
function updateUI() {
    // Update destination toggle
    const dest = currentSettings.saveDestination === 'share' ? 'share' : 'drafts';
    const destDrafts = document.getElementById('destDrafts');
    const destShare = document.getElementById('destShare');
    if (destDrafts && destShare) {
        destDrafts.checked = dest === 'drafts';
        destShare.checked = dest === 'share';
    }

    // Update content selectors textarea
    updateContentSelectorsUI();

    // Output format
    document.getElementById('template').value = currentSettings.outputFormat.template || '';
    document.getElementById('defaultTag').value = currentSettings.outputFormat.defaultTag || '';

    // Drafts URL scheme
    const draftsMode = currentSettings?.draftsURL?.mode === 'runAction' ? 'runAction' : 'create';
    const draftsUrlCreate = document.getElementById('draftsUrlCreate');
    const draftsUrlRunAction = document.getElementById('draftsUrlRunAction');
    if (draftsUrlCreate && draftsUrlRunAction) {
        draftsUrlCreate.checked = draftsMode === 'create';
        draftsUrlRunAction.checked = draftsMode === 'runAction';
    }
    document.getElementById('draftsActionName').value = currentSettings?.draftsURL?.actionName || '';
    updateDraftsActionVisibility(draftsMode);

    // Advanced filtering
    document.getElementById('customFilters').value = currentSettings.advancedFiltering.customFilters.join('\n');
}

function initializeAdvancedAccordion() {
    const advancedAccordion = document.getElementById('advancedSettingsAccordion');
    if (!advancedAccordion) {
        return;
    }
    advancedAccordion.open = loadAdvancedAccordionPreference();
}

function loadAdvancedAccordionPreference() {
    try {
        const saved = localStorage.getItem(ADVANCED_ACCORDION_STORAGE_KEY);
        if (saved === 'open') {
            return true;
        }
        if (saved === 'closed') {
            return false;
        }
        return false;
    } catch (error) {
        console.log('Could not read advanced accordion preference:', error.message);
        return false;
    }
}

function saveAdvancedAccordionPreference(isOpen) {
    try {
        localStorage.setItem(ADVANCED_ACCORDION_STORAGE_KEY, isOpen ? 'open' : 'closed');
    } catch (error) {
        console.log('Could not save advanced accordion preference:', error.message);
    }
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
    setDirtyState(true);
}

// Update output format from UI
function updateOutputFormatFromUI() {
    currentSettings.outputFormat.template = document.getElementById('template').value;
    currentSettings.outputFormat.defaultTag = document.getElementById('defaultTag').value.trim();
    setDirtyState(true);
}

// Update Drafts URL mode from UI
function updateDraftsURLFromUI() {
    const selected = document.querySelector('input[name="draftsUrlMode"]:checked');
    const mode = selected?.value === 'runAction' ? 'runAction' : 'create';

    currentSettings.draftsURL = currentSettings.draftsURL || {};
    currentSettings.draftsURL.mode = mode;
    updateDraftsActionVisibility(mode);
    setDirtyState(true);
}

// Update Drafts action name from UI
function updateDraftsActionFromUI() {
    currentSettings.draftsURL = currentSettings.draftsURL || {};
    currentSettings.draftsURL.actionName = document.getElementById('draftsActionName').value.trim();
    setDirtyState(true);
}

function updateDraftsActionVisibility(mode) {
    const resolvedMode = mode === 'runAction' ? 'runAction' : 'create';
    const actionGroup = document.getElementById('draftsActionNameGroup');
    const actionInput = document.getElementById('draftsActionName');

    if (actionGroup) {
        actionGroup.style.display = 'block';
    }

    if (actionInput) {
        actionInput.required = resolvedMode === 'runAction';
    }
}

// Update advanced filtering from UI
function updateAdvancedFilteringFromUI() {
    const customFilters = document.getElementById('customFilters').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line);

    currentSettings.advancedFiltering.customFilters = customFilters;
    setDirtyState(true);
}

// Handle save settings
async function handleSaveSettings() {
    if (!isDirty) {
        showStatus('No unsaved changes.', 'info');
        return;
    }

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
        setDirtyState(true);
        const saved = await saveSettings();  // Uses native messaging to save to iCloud
        if (saved) {
            showStatus('Settings reset to defaults.', 'success');
        }
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

    const draftsMode = currentSettings?.draftsURL?.mode === 'runAction' ? 'runAction' : 'create';
    const actionName = (currentSettings?.draftsURL?.actionName || '').trim();
    if (currentSettings.saveDestination === 'drafts' && draftsMode === 'runAction' && !actionName) {
        showStatus('Drafts Action Name is required when Action URL is selected.', 'error');
        return false;
    }

    return true;
}

function setDirtyState(dirty) {
    isDirty = Boolean(dirty);

    const saveButton = document.getElementById('saveSettings');
    if (!saveButton) {
        return;
    }

    saveButton.disabled = !isDirty;
    saveButton.classList.toggle('button-primary', isDirty);
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

// Update destination from UI toggle
function updateDestinationFromUI() {
    const selected = document.querySelector('input[name="saveDestination"]:checked');
    currentSettings.saveDestination = selected?.value || 'drafts';
    setDirtyState(true);
}

// Check if Drafts is installed and show banner if not
async function checkDraftsInstallation() {
    try {
        const response = await browser.runtime.sendNativeMessage(NATIVE_APP_ID, {
            action: 'checkDraftsInstalled'
        });

        // Only show banner if we explicitly know Drafts is NOT installed (false)
        // If null (iOS extension can't check) or undefined, don't show banner
        if (response?.draftsInstalled === false) {
            const banner = document.getElementById('draftsNotInstalledBanner');
            if (banner) {
                banner.style.display = 'block';
            }
        }
    } catch (error) {
        console.log('Could not check Drafts installation:', error.message);
        // Don't show banner on error - assume Drafts might be installed
    }
}

// Open Drafts App Store page
function openDraftsAppStore() {
    // Detect platform and use appropriate App Store URL
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    if (isIOS) {
        window.open(DRAFTS_APP_STORE.iosURL, '_blank');
    } else {
        window.open(DRAFTS_APP_STORE.macURL, '_blank');
    }
}

// ============================================
// Selector Finder
// ============================================

const SELECTOR_FINDER_API = 'https://selector-finder.catscratches.workers.dev/api/analyze';

// State for storing found selectors
let foundSelectors = {
    contentSelector: '',
    elementsToRemove: []
};

// Initialize Selector Finder when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const addSelectorsBtn = document.getElementById('addSelectorsBtn');
    const finderUrl = document.getElementById('finderUrl');

    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', handleAnalyze);
    }

    if (addSelectorsBtn) {
        addSelectorsBtn.addEventListener('click', handleAddSelectors);
    }

    // Allow Enter key to submit
    if (finderUrl) {
        finderUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAnalyze();
            }
        });
    }
});

async function handleAnalyze() {
    const finderUrl = document.getElementById('finderUrl');
    const finderLoading = document.getElementById('finderLoading');
    const finderError = document.getElementById('finderError');
    const finderResults = document.getElementById('finderResults');
    const analyzeBtn = document.getElementById('analyzeBtn');

    const url = finderUrl.value.trim();

    if (!url) {
        showFinderError('Please enter a URL');
        return;
    }

    // Validate URL
    try {
        new URL(url);
    } catch {
        showFinderError('Please enter a valid URL');
        return;
    }

    // Reset UI
    hideFinderError();
    finderResults.classList.remove('visible');
    finderLoading.classList.add('visible');
    analyzeBtn.disabled = true;

    try {
        // Step 1: Get selectors from AI Worker
        const apiResponse = await fetch(SELECTOR_FINDER_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });

        const apiData = await apiResponse.json();

        if (!apiResponse.ok || apiData.error) {
            throw new Error(apiData.error || 'Analysis failed');
        }

        // Store found selectors
        foundSelectors.contentSelector = apiData.contentSelector || '';
        foundSelectors.elementsToRemove = apiData.elementsToRemove || [];

        // Use HTML from API response (Worker already fetched it - avoids CORS issues)
        const html = apiData.html;
        if (!html) {
            throw new Error('No HTML content returned from analysis');
        }

        // Generate preview using local engine
        const previewText = await generatePreview(html, foundSelectors.contentSelector, foundSelectors.elementsToRemove, url);

        // Display results
        document.getElementById('foundContentSelector').textContent = foundSelectors.contentSelector;
        document.getElementById('foundElementsToRemove').textContent = foundSelectors.elementsToRemove.join('\n');
        document.getElementById('finderPreview').textContent = previewText;
        finderResults.classList.add('visible');

    } catch (error) {
        console.error('Selector Finder error:', error);
        showFinderError(error.message);
    } finally {
        finderLoading.classList.remove('visible');
        analyzeBtn.disabled = false;
    }
}

// Generate preview using the same logic as background.js
async function generatePreview(html, contentSelector, elementsToRemove, url) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Mock the extension settings for the extraction function
        const mockSettings = {
            contentExtraction: {
                customSelectors: [contentSelector] // Use ONLY the finding selector
            },
            advancedFiltering: {
                customFilters: elementsToRemove, // Use the found filters
                minContentLength: currentSettings.advancedFiltering?.minContentLength || 150,
                maxLinkRatio: currentSettings.advancedFiltering?.maxLinkRatio || 0.3
            },
            outputFormat: currentSettings.outputFormat // Use current Output Format settings
        };

        // Extract content (adapted from background.js getPageContent)
        const extractionResult = extractContentFromDoc(doc, mockSettings, url);

        // Apply template (adapted from background.js formatDraftContent)
        return formatDraftContent(extractionResult.title, url, extractionResult.body, mockSettings);

    } catch (e) {
        console.error("Preview generation failed:", e);
        return `(Preview generation failed: ${e.message})`;
    }
}

function handleAddSelectors() {
    // Get current selectors
    const contentSelectorsTextarea = document.getElementById('contentSelectors');
    const customFiltersTextarea = document.getElementById('customFilters');
    const toUniqueLines = (lines) => {
        const seen = new Set();
        const unique = [];

        for (const line of lines) {
            if (typeof line !== 'string') continue;
            const trimmed = line.trim();
            if (!trimmed || seen.has(trimmed)) continue;
            seen.add(trimmed);
            unique.push(trimmed);
        }

        return unique;
    };

    // Add content selector to the beginning of the list (highest priority)
    if (foundSelectors.contentSelector) {
        const currentSelectors = contentSelectorsTextarea.value.split('\n');
        const mergedSelectors = toUniqueLines([foundSelectors.contentSelector, ...currentSelectors]);
        contentSelectorsTextarea.value = mergedSelectors.join('\n');
        updateContentSelectorsFromUI();
    }

    // Add elements to remove to the list
    if (foundSelectors.elementsToRemove.length > 0) {
        const currentFilters = customFiltersTextarea.value.split('\n');
        const mergedFilters = toUniqueLines([...currentFilters, ...foundSelectors.elementsToRemove]);
        customFiltersTextarea.value = mergedFilters.join('\n');
        updateAdvancedFilteringFromUI();
    }

    // Show success message
    showStatus('Selectors added! Click "Save Settings" to keep them.', 'success');

    // Scroll to the "What to capture" section
    document.getElementById('contentSelectors').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function showFinderError(message) {
    const finderError = document.getElementById('finderError');
    finderError.textContent = message;
    finderError.style.display = 'block';
}

function hideFinderError() {
    const finderError = document.getElementById('finderError');
    finderError.style.display = 'none';
}
