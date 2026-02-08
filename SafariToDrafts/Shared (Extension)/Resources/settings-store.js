// Shared settings storage helpers for Cat Scratches
// Used by background.js and settings.js
'use strict';

(function () {
    const root = (typeof globalThis !== 'undefined')
        ? globalThis
        : (typeof self !== 'undefined')
            ? self
            : (typeof window !== 'undefined' ? window : {});

    const SETTINGS_CACHE_KEY = 'catScratchesSettings';

    function isPlainObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    async function loadCatScratchesSettings() {
        try {
            const response = await browser.runtime.sendNativeMessage(NATIVE_APP_ID, {
                action: 'getSettings'
            });

            if (isPlainObject(response?.settings)) {
                const cloudSettings = migrateSettings(response.settings);
                await browser.storage.local.set({ [SETTINGS_CACHE_KEY]: cloudSettings });
                return { settings: cloudSettings, source: 'icloud' };
            }
        } catch (error) {
            console.log('Could not load settings from iCloud, trying local cache:', error.message);
        }

        try {
            const localResult = await browser.storage.local.get([SETTINGS_CACHE_KEY]);
            if (isPlainObject(localResult?.[SETTINGS_CACHE_KEY])) {
                return {
                    settings: migrateSettings(localResult[SETTINGS_CACHE_KEY]),
                    source: 'local'
                };
            }
        } catch (error) {
            console.log('Could not load settings from local cache:', error.message);
        }

        return {
            settings: getDefaultSettings(),
            source: 'defaults'
        };
    }

    async function saveCatScratchesSettings(settings) {
        const normalizedSettings = migrateSettings(settings);

        await browser.storage.local.set({ [SETTINGS_CACHE_KEY]: normalizedSettings });

        try {
            const response = await browser.runtime.sendNativeMessage(NATIVE_APP_ID, {
                action: 'saveSettings',
                settings: normalizedSettings
            });

            return {
                settings: normalizedSettings,
                savedToCloud: Boolean(response?.success)
            };
        } catch (error) {
            console.log('Could not save settings to iCloud (saved locally):', error.message);
            return {
                settings: normalizedSettings,
                savedToCloud: false
            };
        }
    }

    root.SETTINGS_CACHE_KEY = SETTINGS_CACHE_KEY;
    root.loadCatScratchesSettings = loadCatScratchesSettings;
    root.saveCatScratchesSettings = saveCatScratchesSettings;
})();
