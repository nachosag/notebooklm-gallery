const ALLOWED_ORIGINS = [
	"https://notebooklm-gallery.pages.dev",
	"http://localhost:8787",
];

export function handleCors(request) {
	if (request.method === "OPTIONS") {
		const origin = request.headers.get("Origin");
		const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : null;
		const headers = new Headers();
		if (allowed) {
			headers.set("Access-Control-Allow-Origin", allowed);
			headers.set("Vary", "Origin");
		}
		headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
		headers.set("Access-Control-Allow-Headers", "Content-Type, CF-Turnstile-Token");
		headers.set("Access-Control-Max-Age", "86400");
		return new Response(null, { status: 204, headers });
	}
	return null;
}

export function addCors(response, request) {
	const origin = request.headers.get("Origin");
	const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : null;
	const headers = new Headers(response.headers);
	if (allowed) {
		headers.set("Access-Control-Allow-Origin", allowed);
		headers.set("Vary", "Origin");
	}
	headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	headers.set("Access-Control-Allow-Headers", "Content-Type, CF-Turnstile-Token");
	headers.set("Access-Control-Max-Age", "86400");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
