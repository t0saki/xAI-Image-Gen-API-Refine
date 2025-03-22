# xAI API Proxy

[English](README-en.md) | [中文](README.md)

This Cloudflare Worker serves as a proxy for the xAI API, specifically handling image generation requests and preserving only the parameters supported in the documentation. When clients like Open-WebUI use the grok-2-image model, you must fill in the image resolution, which will cause failed requests to prompt `The size parameter is not supported at the moment. Leave it empty.` This project filters out unsupported parameters to avoid this issue.

## Features

- Proxies requests to all xAI API endpoints
- Specifically filters image generation request parameters, keeping only supported parameters:
  - `model` (e.g., "grok-2-image")
  - `prompt` (required)
  - `n` (number of images to generate, 1-10, default is 1)
  - `response_format` ("url" or "b64_json")
- Handles CORS to support cross-origin requests

**Note:** According to xAI's official documentation, the `quality`, `size`, and `style` parameters are currently not supported, and these parameters will be filtered out.

## Deployment Instructions

### Prerequisites

- Install [Node.js](https://nodejs.org/) (version 14.x or higher recommended)
- Install [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

### Development

Local development:

```bash
npm run dev
```

This will start a local development server, typically at http://localhost:8787

### Configuration

Edit the `wrangler.toml` file to update route and domain settings.

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Usage

Send your API requests to the Worker URL instead of directly to the xAI API.
The Worker will forward the request to the xAI API and filter parameters for image generation requests.

### Example

If your Worker is deployed at `https://xai-proxy.your-domain.workers.dev`:

```javascript
fetch('https://xai-proxy.your-domain.workers.dev/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-xai-api-key'
  },
  body: JSON.stringify({
    prompt: 'A kitten playing with a ball of yarn',
    model: 'grok-2-image',
    n: 1,
    response_format: 'url',
    // Other unsupported parameters will be filtered out, such as quality, size, style
  })
})
```

Example response:

```json
{
  "data": [
    {
      "url": "https://...",
      "revised_prompt": "..."
    }
  ]
}
```

If `response_format` is set to `b64_json`, the response will contain `b64_json` instead of `url`. 