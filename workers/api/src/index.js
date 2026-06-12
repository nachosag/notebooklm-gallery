import { Router } from "itty-router";
import { handleCors, addCors, corsHeaders } from "./middleware/cors.js";

import { handleSubmit } from "./handlers/submit.js";
import {
	handleList,
	handleDetail,
	handleCategories,
	handleTrendingTags,
} from "./handlers/notebooks.js";
import { handleLike } from "./handlers/likes.js";

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

const router = Router();

// API Routes
router.get("/api/notebooks", (req, env) => handleList(req, env));
router.get("/api/notebooks/:id", (req, env) =>
	handleDetail(req, env, req.params.id),
);
router.post("/api/notebooks", handleSubmit);
router.post("/api/notebooks/:id/like", (req, env) =>
	handleLike(req, env, req.params.id),
);
router.get("/api/categories", (req, env) => handleCategories(req, env));
router.get("/api/tags/trending", (req, env) => handleTrendingTags(req, env));
router.get("/api/images/*", (req, env) => handleImage(req, env));

// 404
router.all(
	"*",
	() =>
		new Response(
			JSON.stringify({
				error: { code: "NOT_FOUND", message: "Route not found" },
			}),
			{
				status: 404,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		),
);

export default {
	async fetch(request, env, ctx) {
		const corsPreflight = handleCors(request);
		if (corsPreflight) return corsPreflight;

		const response = await router.handle(request, env, ctx);
		return addCors(response);
	},
};
