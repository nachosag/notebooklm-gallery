import { handleCors, addCors } from "./middleware/cors.js";
import { handleSubmit } from "./handlers/submit.js";
import {
	handleList,
	handleDetail,
	handleCategories,
	handleTrendingTags,
} from "./handlers/notebooks.js";
import { handleLike } from "./handlers/likes.js";
import { handleSitemap, handleRobots } from "./handlers/seo.js";

// ── Image handler (R2) ──────────────────────────────────────────

async function handleImage(req, env) {
	const url = new URL(req.url);
	const key = url.pathname.replace("/api/images/", "");
	const obj = await env.PREVIEW_IMAGES.get(key);
	if (!obj) {
		return new Response("Not found", { status: 404 });
	}
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	return new Response(obj.body, { headers });
}

// ── NOT FOUND fallback ──────────────────────────────────────────

const notFound = () =>
	new Response(
		JSON.stringify({
			error: { code: "NOT_FOUND", message: "Route not found" },
		}),
		{
			status: 404,
			headers: { "Content-Type": "application/json" },
		},
	);

// ── Route table ─────────────────────────────────────────────────
// Each entry: [method, pathname_or_prefix, handler]
// - Exact match: "/api/notebooks"
// - Prefix match: "/api/images/" (anything starting with it)
// - Param match: "/api/notebooks/:id"

const routes = [
	// API
	["GET", "/api/notebooks", (r, e) => handleList(r, e)],
	["GET", "/api/notebooks/:id", (r, e, p) => handleDetail(r, e, p.id)],
	["POST", "/api/notebooks", handleSubmit],
	["POST", "/api/notebooks/:id/like", (r, e, p) => handleLike(r, e, p.id)],
	["GET", "/api/categories", (r, e) => handleCategories(r, e)],
	["GET", "/api/tags/trending", (r, e) => handleTrendingTags(r, e)],
	["GET", "/api/images/", (r, e) => handleImage(r, e)],

	// SEO
	["GET", "/sitemap.xml", (r, e, _p, ctx) => handleSitemap(r, e, ctx)],
	["GET", "/robots.txt", (r, e) => handleRobots(r, e)],
];

// ── Simple match helper ─────────────────────────────────────────

function matchRoute(method, pathname) {
	for (const [m, pattern, handler] of routes) {
		if (m !== method) continue;

		// Prefix match (ends with "/")
		if (pattern.endsWith("/") && pathname.startsWith(pattern)) {
			return (req, env, ctx) => handler(req, env, undefined, ctx);
		}

		// Param match (contains ":")
		if (pattern.includes(":")) {
			const re = new RegExp(
				"^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$",
			);
			const m = pathname.match(re);
			if (m) {
				return (req, env, ctx) => handler(req, env, m.groups, ctx);
			}
		}

		// Exact match
		if (pathname === pattern) {
			return (req, env, ctx) => handler(req, env, undefined, ctx);
		}
	}
	return null;
}

// ── Fetch handler ───────────────────────────────────────────────

export default {
	async fetch(request, env, ctx) {
		const corsPreflight = handleCors(request);
		if (corsPreflight) return corsPreflight;

		const url = new URL(request.url);
		const handler = matchRoute(request.method, url.pathname);
		const response = handler
			? await handler(request, env, ctx)
			: notFound();

		return addCors(response, request);
	},
};
