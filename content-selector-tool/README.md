# Content Selector Finder

A Cloudflare Worker that analyzes article URLs and uses Google's Gemini AI to suggest CSS selectors for the Cat Scratches Safari extension.

## Setup

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key (you'll need it in step 4)

### 2. Install Wrangler (Cloudflare CLI)

```bash
npm install -g wrangler
```

### 3. Login to Cloudflare

```bash
wrangler login
```

This will open a browser window to authenticate.

### 4. Deploy the Worker

```bash
cd content-selector-tool
wrangler deploy
```

### 5. Add Your API Key as a Secret

```bash
wrangler secret put GEMINI_API_KEY
```

Paste your Gemini API key when prompted. This stores it securely—it won't be visible in your code.

### 6. Access Your Tool

After deployment, Wrangler will show your URL:
```
https://selector-finder.<your-subdomain>.workers.dev
```

## Optional: Custom Domain

To use `selectors.daviddegner.com` instead:

1. In Cloudflare Dashboard → Workers & Pages → selector-finder
2. Go to Settings → Triggers → Custom Domains
3. Add `selectors.daviddegner.com`

## Usage

1. Open the tool URL in your browser
2. Paste an article URL
3. Click "Analyze Page"
4. Copy the suggested selector and elements to your extension settings

## Local Development

```bash
wrangler dev
```

This runs the worker locally at `http://localhost:8787`
