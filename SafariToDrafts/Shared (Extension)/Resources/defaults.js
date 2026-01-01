// Shared default settings for Cat Scratches (Safari-only)
// Provides a single source of truth for defaults used by background and settings pages
'use strict';

(function () {
  // Support both window (extension pages) and service worker (globalThis/self) contexts
  const root = (typeof globalThis !== 'undefined')
    ? globalThis
    : (typeof self !== 'undefined')
      ? self
      : (typeof window !== 'undefined' ? window : {});

  const BASE_SELECTORS = [
    '[itemtype*="Article"]',
    '[itemtype*="BlogPosting"]',
    '[itemtype*="NewsArticle"]',
    '[itemprop="articleBody"]',
    'section[name="articleBody"]',
    '[data-testid="article-body"]',
    '[data-testid="story-body"]',
    '[data-component="articleBody"]',
    'article[role="main"]',
    'main[role="main"]',
    'article',
    'main',
    '[role="main"]',
    '.entry-content',
    '.post-content',
    '.wp-block-post-content',
    '.post-body',
    '.entry-body',
    '.postArticle-content',
    '.markup',
    '.node .content',
    '.content',
    '.post',
    '.entry',
    '.article',
    '.article-body',
    '.article-content',
    '.article__content',
    '.article__body',
    '.article-body__content',
    '.Article__content',
    '.content-body',
    '.main-content',
    '.kg-post',
    '.prose',
    '.body__container',
    '.c-entry-content',
    '.content__article-body',
    '.StoryBodyCompanionColumn',
    'article#story',
    '#article',
    '#js-article-text',
    '.itemFullText',
    '.article__content-body',
    '.blog-post__content',
    '.post-content__body',
    '.article-content-container',
    '.article-entry',
    '.article-main',
    '.read__content',
    '[data-component="text-block"]'
  ];

  const BASE_FILTERS = [
    'img',
    'picture',
    'figure',
    'figcaption',
    'video',
    'audio',
    'source',
    'iframe',
    'embed',
    'object',
    'canvas',
    'script',
    'noscript',
    'form',
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
    '.site-header',
    '.site-footer',
    '.global-header',
    '.global-footer',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="complementary"]',
    '[role="contentinfo"]',
    '.nav-menu',
    '.nav-list',
    '.nav-items',
    '.nav-links',
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
    '.advert',
    '.advertisement',
    '.adContainer',
    '.adcontainer',
    '.banner',
    '.sponsored',
    '.promo',
    '.promo-unit',
    '.promo-block',
    '.promo-card',
    '.google-ad',
    '.outbrain',
    '.taboola',
    '[class*="ad-"]',
    '[id*="ad-"]',
    '[class*="-ad"]',
    '[class*="dfp"]',
    '[id*="dfp"]',
    '[href^="#after-dfp"]',
    '[href*="#after-dfp"]',
    '[id^="story-ad-"]',
    '[class*="promo"]',
    '[id*="-promo"]',
    '[id*="promo-"]',
    '[aria-label*="advertisement"]',
    '[aria-label*="Advertisement"]',
    '[data-testid="advertisement"]',
    '[data-testid="ad"]',
    '[data-testid="sponsored"]',
    '[data-testid="partner-content"]',
    '[data-testid="supported-by"]',
    '[data-testid="skip-advertisement"]',
    '[data-testid="skip-ad"]',
    '[data-testid*="skip"]',
    '[data-component*="promo"]',
    '[data-testid="inline-message"]',
    '[class*="inline-message"]',
    '.sponsor-wrapper',
    '.supported-by',
    '.skip-ad',
    '[class*="skip"]',
    '[id*="skip"]',
    '.social',
    '.share',
    '.sharing',
    '.social-buttons',
    '.facebook',
    '.twitter',
    '.linkedin',
    '.share-tools',
    '.social-share',
    '.article-tools',
    '[class*="share"]',
    '[class*="social"]',
    '[class*="share-tool"]',
    '[data-testid="share-tools"]',
    '[data-testid="social-share"]',
    '[data-testid="article-tools"]',
    '.comments',
    '.comment',
    '.comment-thread',
    '.disqus',
    '.comment-form',
    '.comment-section',
    '[id*="comments"]',
    '[data-testid="comments"]',
    '[data-testid*="comments"]',
    '.related',
    '.recommended',
    '.more-stories',
    '.trending',
    '.popular',
    '.suggestions',
    '.related-topics',
    '.related-links',
    '.related-content',
    '.related-articles',
    '.related-stories',
    '[id*="related"]',
    '[class*="related"]',
    '[id*="-recirc"]',
    '[class*="recirc"]',
    '[href*="module=RelatedLinks"]',
    '[href*="module=inlineRecirc"]',
    '[data-testid="related-topics"]',
    '[data-testid="related-links"]',
    '[data-testid="related-content"]',
    '[data-testid="related-articles"]',
    '[data-testid="related-stories"]',
    '[data-testid="related-coverage"]',
    '[data-testid="RelatedReading"]',
    '[data-component="related"]',
    '[data-component="related-stories"]',
    '[data-component*="recirc"]',
    '.inline-related',
    '.inline-newsletter',
    '.newsletter',
    '.subscription',
    '.subscribe',
    '.signup',
    '.email-signup',
    '.newsletter-signup',
    '[data-testid="newsletter"]',
    '[data-testid="subscription"]',
    '[data-testid="subscribe"]',
    '[data-testid="sign-up"]',
    '.modal',
    '.popup',
    '.overlay',
    '.cta',
    '.cookie-notice',
    '.cookie-banner',
    '.author-bio',
    '.byline',
    '.author-info',
    '.article-meta',
    '.article-info',
    '.dateline',
    '.tags',
    '.categories',
    '.meta',
    '.widget',
    '.secondary',
    '.sidebar-widget',
    '.wp-caption',
    '.wp-gallery',
    '.sharedaddy',
    '.paywall',
    '.paywall-banner',
    '.premium-message',
    '.visually-hidden',
    '.sr-only',
    '.screen-reader-text',
    '[data-testid="byline"]',
    '[data-testid="author-info"]',
    '[data-testid="article-meta"]',
    '[data-testid="article-info"]',
    '[data-testid="dateline"]',
    '.section-header',
    '[id*="masthead"]',
    '.header-ad',
    '.footer-ad',
    '[class*="inline-interactive"]',
    'section[data-testid="inline-interactive"]',
    'div[data-test-id="RecommendedNewsletter"]',
    '.bottom-of-article',
    '[class*="bottom-of-article"]',
    '.css-g92qtk',
    '[class*="g92qtk"]',
    '[class*="18crmh6"]',
    '.css-18crmh6',
    '[class*="kyszhr"]'
  ];

  const unique = arr => Array.from(new Set(arr.map(s => (typeof s === 'string' ? s.trim() : s)).filter(Boolean)));

  const DEFAULT_SETTINGS = {
    contentExtraction: {
      strategy: 'default',
      customSelectors: unique(BASE_SELECTORS)
    },
    outputFormat: {
      template: '# {title}\n\n<{url}>\n\n---\n\n{content}',
      titleFormat: 'h1',
      defaultTag: ''
    },
    advancedFiltering: {
      customFilters: unique(BASE_FILTERS),
      minContentLength: 150,
      maxLinkRatio: 0.3
    }
  };

  function getDefaultSettings() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  /**
   * Migrate older settings structure to the unified template approach.
   * Shared by background.js and settings.js.
   * @param {Object} inputSettings - Settings object to migrate
   * @returns {Object} Migrated settings
   */
  function migrateSettings(inputSettings) {
    const settings = JSON.parse(JSON.stringify(inputSettings || {}));
    settings.outputFormat = settings.outputFormat || {};

    // Construct a template if missing, leveraging legacy flags if present
    if (!settings.outputFormat.template) {
      const legacy = settings.outputFormat;
      const legacyCustom = (legacy.customTemplate || '').trim();
      if (legacyCustom) {
        settings.outputFormat.template = legacyCustom;
      } else {
        // Build from legacy include flags or fall back to default
        let tpl = DEFAULT_SETTINGS.outputFormat.template;
        // If legacy includeSource was false, remove {url} line
        if (legacy.hasOwnProperty('includeSource') && legacy.includeSource === false) {
          tpl = tpl.replace(/\n?\n?\{url\}\n?/g, '\n');
        }
        // If legacy includeSeparator was false, remove separator line
        if (legacy.hasOwnProperty('includeSeparator') && legacy.includeSeparator === false) {
          tpl = tpl.replace(/\n?\n?---\n?/g, '\n');
        }
        // If legacy includeTimestamp true, append timestamp after URL line
        if (legacy.hasOwnProperty('includeTimestamp') && legacy.includeTimestamp === true) {
          if (tpl.includes('{url}')) {
            tpl = tpl.replace('{url}', '{url}\n\n{timestamp}');
          } else {
            tpl = tpl.replace('{formattedTitle}', '{formattedTitle}\n\n{timestamp}');
          }
        }
        settings.outputFormat.template = tpl;
      }
    }

    // Cleanup legacy fields
    delete settings.outputFormat.includeSource;
    delete settings.outputFormat.includeSeparator;
    delete settings.outputFormat.includeTimestamp;
    delete settings.outputFormat.customTemplate;

    if (!settings.outputFormat.titleFormat) {
      settings.outputFormat.titleFormat = 'h1';
    }

    return settings;
  }

  // Expose globally for background and settings pages
  root.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
  root.getDefaultSettings = getDefaultSettings;
  root.migrateSettings = migrateSettings;
})();
