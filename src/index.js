/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/**
 * Cloudflare Worker to proxy xAI API requests
 * Specifically filters image generation requests to only include supported parameters
 */

// xAI API configuration
const XAI_API_HOST = 'api.x.ai';
const IMAGE_GENERATION_PATH = '/v1/images/generations';

// Supported parameters for image generation based on documentation
const SUPPORTED_IMAGE_PARAMS = [
	'model', 
	'prompt', 
	'n', 
	'response_format'
];

// Note: 'quality', 'size' and 'style' are explicitly NOT supported by xAI API at the moment

export default {
	async fetch(request, env, ctx) {
		// Parse request URL
		const url = new URL(request.url);
		
		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return handleCors(request);
		}
		
		try {
			// Only proxy requests to xAI API paths
			if (!url.pathname.startsWith('/v1/')) {
				return new Response('Not Found', { status: 404 });
			}
			
			// Build the target URL for xAI API
			const targetUrl = new URL(`https://${XAI_API_HOST}${url.pathname}`);
			
			// Copy query parameters
			url.searchParams.forEach((value, key) => {
				targetUrl.searchParams.append(key, value);
			});
			
			// Special handling for image generation requests
			if (url.pathname === IMAGE_GENERATION_PATH && request.method === 'POST') {
				return await handleImageGenerationRequest(request, targetUrl);
			}
			
			// For other API requests, create a new request to avoid body already consumed issue
			const headers = new Headers(request.headers);
			const newRequest = new Request(targetUrl.toString(), {
				method: request.method,
				headers,
				body: request.body ? request.clone().body : undefined,
			});
			
			return await fetch(newRequest);
			
		} catch (error) {
			return new Response(`Error: ${error.message}`, { status: 500 });
		}
	},
};

/**
 * Handle CORS preflight requests
 */
function handleCors() {
	return new Response(null, {
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
			'Access-Control-Max-Age': '86400',
		},
	});
}

/**
 * Handle image generation requests by filtering parameters
 */
async function handleImageGenerationRequest(request, targetUrl) {
	// Parse request body
	const contentType = request.headers.get('Content-Type') || '';
	
	if (contentType.includes('application/json')) {
		// Clone the request before consuming the body
		const clonedRequest = request.clone();
		const originalBody = await clonedRequest.json();
		
		// Filter out unsupported parameters
		const filteredBody = {};
		for (const param of SUPPORTED_IMAGE_PARAMS) {
			if (originalBody[param] !== undefined) {
				filteredBody[param] = originalBody[param];
			}
		}
		
		// Create new request with filtered parameters
		const newRequest = new Request(targetUrl.toString(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': request.headers.get('Authorization'),
			},
			body: JSON.stringify(filteredBody),
		});
		
		// Forward request to xAI API
		const response = await fetch(newRequest);
		
		// Create a new response with CORS headers
		const responseData = await response.clone().json();
		const newResponse = new Response(JSON.stringify(responseData), {
			status: response.status,
			statusText: response.statusText,
			headers: {
				...Object.fromEntries(response.headers),
				'Access-Control-Allow-Origin': '*',
				'Content-Type': 'application/json'
			}
		});
		
		return newResponse;
	} else {
		return new Response('Unsupported Content-Type. Please use application/json', { 
			status: 400 
		});
	}
}
