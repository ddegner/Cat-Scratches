// Content utilities for Cat Scratches extension
// This file is now only used for utility functions when injected dynamically

// Ensure Turndown is available globally for the executeScript function
if (typeof window.TurndownService === 'undefined' && typeof TurndownService !== 'undefined') {
    window.TurndownService = TurndownService;
}
