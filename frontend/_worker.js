// NotebookLM Gallery — Workers + Assets (Pages _worker.js)

// --- CORS ---
const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, CF-Turnstile-Token",
};

function corsPreflight(method) {
	if (method === "OPTIONS") {
		return new Response(null, { status: 204, headers: corsHeaders });
	}
	return null;
}

function withCors(response) {
	if (response) {
		for (const [k, v] of Object.entries(corsHeaders))
			response.headers.set(k, v);
	}
	return response;
}

// --- Helpers ---
function json(data, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", ...corsHeaders },
	});
}

function safeJson(val) {
	try {
		return JSON.parse(val);
	} catch {
		return [];
	}
}

function rowToNotebook(row, fullDesc = false) {
	return {
		id: row.id,
		title: row.title,
		description: fullDesc ? row.description : row.description?.slice(0, 200),
		share_url: row.share_url,
		categories: safeJson(row.categories),
		tags: safeJson(row.tags),
		preview_url: row.preview_url,
		likes: row.likes,
		created_at: row.created_at,
	};
}

function sanitizeFts5(query) {
	const cleaned = query.replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ]/gi, " ").trim();
	if (!cleaned) return null;
	return cleaned
		.split(/\s+/)
		.map((w) => `"${w.replace(/"/g, "")}"`)
		.join(" AND ");
}

async function hashIp(ip) {
	const data = new TextEncoder().encode(ip + "notebooklm-marketplace-salt");
	const hash = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hash))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

async function verifyTurnstile(token, env) {
	if (!token) return { success: false };
	if (!env.TURNSTILE_SECRET) return { success: true };
	const fd = new FormData();
	fd.append("secret", env.TURNSTILE_SECRET);
	fd.append("response", token);
	const res = await fetch(
		"https://challenges.cloudflare.com/turnstile/v0/siteverify",
		{ method: "POST", body: fd },
	);
	return res.json();
}

// --- Validation ---
const CATEGORIES = [
	"education",
	"technology",
	"research",
	"creative",
	"business",
	"health",
	"productivity",
	"history",
	"reference",
	"other",
];

function validateNotebook(data) {
	const errors = [];
	if (
		!data.title ||
		typeof data.title !== "string" ||
		data.title.trim().length < 3 ||
		data.title.trim().length > 120
	)
		errors.push({ field: "title", message: "Title must be 3-120 characters" });
	if (
		!data.description ||
		typeof data.description !== "string" ||
		data.description.trim().length < 20 ||
		data.description.trim().length > 1000
	)
		errors.push({
			field: "description",
			message: "Description must be 20-1000 characters",
		});
	if (!data.share_url || typeof data.share_url !== "string")
		errors.push({ field: "share_url", message: "Share URL is required" });
	else {
		try {
			const url = new URL(data.share_url);
			if (!url.hostname.includes("notebooklm.google"))
				errors.push({
					field: "share_url",
					message: "Must be a valid NotebookLM URL",
				});
		} catch {
			errors.push({ field: "share_url", message: "Invalid URL format" });
		}
	}
	if (data.categories && Array.isArray(data.categories)) {
		for (const c of data.categories)
			if (!CATEGORIES.includes(c))
				errors.push({ field: "categories", message: `Invalid category: ${c}` });
	}
	if (data.tags && Array.isArray(data.tags)) {
		if (data.tags.length > 10)
			errors.push({ field: "tags", message: "Maximum 10 tags" });
		for (const t of data.tags)
			if (typeof t !== "string" || t.length < 2 || t.length > 30)
				errors.push({
					field: "tags",
					message: "Each tag must be 2-30 characters",
				});
	}
	return { valid: errors.length === 0, errors };
}

// --- Rate Limiting ---
async function checkRateLimit(env, ipHash, type) {
	if (type === "submission") {
		const row = await env.DB.prepare(
			"SELECT count(*) as cnt FROM submissions_log WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 hour')",
		)
			.bind(ipHash)
			.first();
		return { allowed: (row?.cnt || 0) < 3 };
	}
	if (type === "like") {
		const row = await env.DB.prepare(
			"SELECT count(*) as cnt FROM likes_log WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 hour')",
		)
			.bind(ipHash)
			.first();
		return { allowed: (row?.cnt || 0) < 30 };
	}
	return { allowed: true };
}

// === API Handlers ===

async function handleList(url, env) {
	const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
	const limit = Math.min(
		50,
		Math.max(1, parseInt(url.searchParams.get("limit") || "12")),
	);
	const category = url.searchParams.get("category");
	const tag = url.searchParams.get("tag");
	const search = url.searchParams.get("search");
	const sort =
		url.searchParams.get("sort") === "popular" ? "popular" : "recent";
	const offset = (page - 1) * limit;

	let rows, totalRows;

	if (search) {
		const ftsQuery = sanitizeFts5(search);
		if (!ftsQuery) return json({ notebooks: [], total: 0, page, limit });

		let query = `SELECT n.id, n.title, n.description, n.share_url, n.categories, n.tags, n.preview_url, n.likes, n.created_at
			FROM notebooks n JOIN notebooks_fts fts ON n.rowid = fts.rowid
			WHERE notebooks_fts MATCH ?1`;
		const params = [ftsQuery];

		if (category) {
			query += " AND n.categories LIKE ?2";
			params.push(`%"${category}"%`);
		}
		query += " ORDER BY rank LIMIT ? OFFSET ?";
		params.push(limit, offset);

		rows = await env.DB.prepare(query)
			.bind(...params)
			.all();

		let cntQuery = `SELECT count(*) as cnt FROM notebooks n JOIN notebooks_fts fts ON n.rowid = fts.rowid WHERE notebooks_fts MATCH ?1`;
		const cntParams = [ftsQuery];
		if (category) {
			cntQuery += " AND n.categories LIKE ?2";
			cntParams.push(`%"${category}"%`);
		}
		totalRows = await env.DB.prepare(cntQuery)
			.bind(...cntParams)
			.first();
	} else {
		const conditions = [];
		const params = [];
		if (category) {
			conditions.push("categories LIKE ?");
			params.push(`%"${category}"%`);
		}
		if (tag) {
			conditions.push("tags LIKE ?");
			params.push(`%"${tag}"%`);
		}
		const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
		const order =
			sort === "popular"
				? "ORDER BY likes DESC, created_at DESC"
				: "ORDER BY created_at DESC";

		rows = await env.DB.prepare(
			`SELECT id, title, description, share_url, categories, tags, preview_url, likes, created_at FROM notebooks ${where} ${order} LIMIT ? OFFSET ?`,
		)
			.bind(...params, limit, offset)
			.all();
		totalRows = await env.DB.prepare(
			`SELECT count(*) as cnt FROM notebooks ${where}`,
		)
			.bind(...params)
			.first();
	}

	return json({
		notebooks: rows.results.map((r) => rowToNotebook(r)),
		total: totalRows?.cnt || 0,
		page,
		limit,
	});
}

async function handleDetail(env, id) {
	const row = await env.DB.prepare(
		`SELECT id, title, description, share_url, categories, tags, preview_url, likes, created_at FROM notebooks WHERE id = ?1`,
	)
		.bind(id)
		.first();
	if (!row)
		return json(
			{ error: { code: "NOT_FOUND", message: "Notebook not found" } },
			404,
		);
	return json(rowToNotebook(row, true));
}

async function handleSubmit(request, env) {
	try {
		const contentType = request.headers.get("Content-Type") || "";
		let jsonData, file;

		if (contentType.includes("multipart/form-data")) {
			const fd = await request.formData();
			jsonData = {};
			for (const key of [
				"title",
				"description",
				"share_url",
				"categories",
				"tags",
			]) {
				const val = fd.get(key);
				if (val) {
					try {
						jsonData[key] = JSON.parse(val);
					} catch {
						jsonData[key] = val;
					}
				}
			}
			const f = fd.get("preview_image");
			file = f instanceof File ? f : null;
		} else {
			jsonData = await request.json();
			file = null;
		}

		const validation = validateNotebook(jsonData);
		if (!validation.valid)
			return json(
				{
					error: {
						code: "VALIDATION_ERROR",
						message: "Invalid fields",
						fields: validation.errors,
					},
				},
				400,
			);

		const turnstileToken =
			request.headers.get("CF-Turnstile-Token") || jsonData.cf_turnstile_token;
		const turnstileResult = await verifyTurnstile(turnstileToken, env);
		if (!turnstileResult.success)
			return json(
				{
					error: { code: "TURNSTILE_FAILED", message: "Security check failed" },
				},
				403,
			);

		const ipHash = await hashIp(
			request.headers.get("CF-Connecting-IP") || "unknown",
		);
		const rateCheck = await checkRateLimit(env, ipHash, "submission");
		if (!rateCheck.allowed)
			return json(
				{
					error: { code: "RATE_LIMITED", message: "Max 3 notebooks per hour" },
				},
				429,
			);

		let previewUrl = null;
		if (file && file.name) {
			const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
			if (!ALLOWED.has(file.type))
				return json(
					{
						error: {
							code: "VALIDATION_ERROR",
							message: "Image must be PNG, JPEG, or WebP",
						},
					},
					400,
				);
			if (file.size > 5 * 1024 * 1024)
				return json(
					{
						error: {
							code: "VALIDATION_ERROR",
							message: "Image must be under 5 MB",
						},
					},
					400,
				);

			const key = `preview-images/${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
			await env.PREVIEW_IMAGES.put(key, await file.arrayBuffer(), {
				httpMetadata: { contentType: file.type },
			});
			previewUrl = `/api/images/${key}`;
		} else if (
			jsonData.preview_image &&
			typeof jsonData.preview_image === "string" &&
			jsonData.preview_image.startsWith("data:")
		) {
			const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp"]);
			const matches = jsonData.preview_image.match(
				/^data:(image\/(png|jpeg|webp));base64,(.+)$/,
			);
			if (!matches)
				return json(
					{
						error: {
							code: "VALIDATION_ERROR",
							message: "Invalid image format",
						},
					},
					400,
				);

			const mimeType = matches[1];
			const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
			const base64Data = matches[3];

			if (!ALLOWED.has(mimeType))
				return json(
					{
						error: {
							code: "VALIDATION_ERROR",
							message: "Image must be PNG, JPEG, or WebP",
						},
					},
					400,
				);

			const binaryStr = atob(base64Data);
			const bytes = new Uint8Array(binaryStr.length);
			for (let i = 0; i < binaryStr.length; i++)
				bytes[i] = binaryStr.charCodeAt(i);

			if (bytes.length > 5 * 1024 * 1024)
				return json(
					{
						error: {
							code: "VALIDATION_ERROR",
							message: "Image must be under 5 MB",
						},
					},
					400,
				);

			const key = `preview-images/${crypto.randomUUID()}.${ext}`;
			await env.PREVIEW_IMAGES.put(key, bytes, {
				httpMetadata: { contentType: mimeType },
			});
			previewUrl = `/api/images/${key}`;
		}

		const id = crypto.randomUUID();
		await env.DB.prepare(
			`INSERT INTO notebooks (id, title, description, share_url, categories, tags, preview_url, ip_hash, submitted_at)
			 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))`,
		)
			.bind(
				id,
				jsonData.title.trim(),
				jsonData.description.trim(),
				jsonData.share_url.trim(),
				JSON.stringify(jsonData.categories || []),
				JSON.stringify(jsonData.tags || []),
				previewUrl,
				ipHash,
			)
			.run();

		await env.DB.prepare(
			`INSERT INTO submissions_log (ip_hash, created_at) VALUES (?1, datetime('now'))`,
		)
			.bind(ipHash)
			.run();

		return json({ id, success: true }, 201);
	} catch (err) {
		console.error("Submit error:", err);
		return json(
			{ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
			500,
		);
	}
}

async function handleLike(request, env, id) {
	try {
		const ipHash = await hashIp(
			request.headers.get("CF-Connecting-IP") || "unknown",
		);

		const rateCheck = await checkRateLimit(env, ipHash, "like");
		if (!rateCheck.allowed)
			return json(
				{ error: { code: "RATE_LIMITED", message: "Too many likes" } },
				429,
			);

		const existing = await env.DB.prepare(
			"SELECT id FROM likes_log WHERE notebook_id = ?1 AND ip_hash = ?2",
		)
			.bind(id, ipHash)
			.first();

		if (existing) {
			await env.DB.prepare(
				"DELETE FROM likes_log WHERE notebook_id = ?1 AND ip_hash = ?2",
			)
				.bind(id, ipHash)
				.run();
			await env.DB.prepare(
				"UPDATE notebooks SET likes = MAX(0, likes - 1) WHERE id = ?1",
			)
				.bind(id)
				.run();
		} else {
			await env.DB.prepare(
				"INSERT INTO likes_log (notebook_id, ip_hash, created_at) VALUES (?1, ?2, datetime('now'))",
			)
				.bind(id, ipHash)
				.run();
			await env.DB.prepare(
				"UPDATE notebooks SET likes = likes + 1 WHERE id = ?1",
			)
				.bind(id)
				.run();
		}

		const nb = await env.DB.prepare(
			"SELECT id, likes FROM notebooks WHERE id = ?1",
		)
			.bind(id)
			.first();
		return json({ id: nb.id, likes: nb.likes, liked: !existing });
	} catch (err) {
		console.error("Like error:", err);
		return json(
			{ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
			500,
		);
	}
}

async function handleCategories(env) {
	const allRows = await env.DB.prepare(
		"SELECT categories FROM notebooks",
	).all();
	const countMap = {};
	for (const row of allRows.results) {
		for (const c of safeJson(row.categories))
			countMap[c] = (countMap[c] || 0) + 1;
	}
	const CATEGORIES_META = [
		{ slug: "education", name: "Education", icon: "school" },
		{ slug: "technology", name: "Technology", icon: "memory" },
		{ slug: "research", name: "Research", icon: "science" },
		{ slug: "creative", name: "Creative", icon: "palette" },
		{ slug: "business", name: "Business", icon: "business_center" },
		{ slug: "health", name: "Health & Medicine", icon: "ecg_heart" },
		{ slug: "productivity", name: "Productivity", icon: "checklist" },
		{ slug: "history", name: "History & Humanities", icon: "history" },
		{ slug: "reference", name: "Reference", icon: "menu_book" },
		{ slug: "other", name: "Other", icon: "category" },
	];
	return json({
		categories: CATEGORIES_META.map((m) => ({
			...m,
			count: countMap[m.slug] || 0,
		})),
	});
}

async function handleTrendingTags(env) {
	const rows = await env.DB.prepare(
		"SELECT tags FROM notebooks WHERE created_at > datetime('now', '-30 days')",
	).all();
	const tagCount = {};
	for (const row of rows.results) {
		for (const t of safeJson(row.tags)) tagCount[t] = (tagCount[t] || 0) + 1;
	}
	return json({
		tags: Object.entries(tagCount)
			.map(([n, c]) => ({ name: n, count: c }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10),
	});
}

async function handleImage(_req, env, m) {
	const key = m[1];
	const obj = await env.PREVIEW_IMAGES.get(key);
	if (!obj) {
		return new Response("Not found", { status: 404 });
	}
	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	return new Response(obj.body, { headers });
}

// === Route matching ===
const routes = [
	{
		method: "GET",
		pattern: /^\/api\/notebooks$/,
		handler: async (req, env, _m) => handleList(new URL(req.url), env),
	},
	{
		method: "GET",
		pattern: /^\/api\/notebooks\/([a-f0-9-]+)$/,
		handler: async (_req, env, m) => handleDetail(env, m[1]),
	},
	{
		method: "POST",
		pattern: /^\/api\/notebooks$/,
		handler: async (req, env) => handleSubmit(req, env),
	},
	{
		method: "POST",
		pattern: /^\/api\/notebooks\/([a-f0-9-]+)\/like$/,
		handler: async (req, env, m) => handleLike(req, env, m[1]),
	},
	{
		method: "GET",
		pattern: /^\/api\/categories$/,
		handler: async (_req, env) => handleCategories(env),
	},
	{
		method: "GET",
		pattern: /^\/api\/tags\/trending$/,
		handler: async (_req, env) => handleTrendingTags(env),
	},
	{
		method: "GET",
		pattern: /^\/api\/images\/(.+)$/,
		handler: handleImage,
	},
];

function matchRoute(method, pathname) {
	for (const r of routes) {
		if (r.method !== method) continue;
		const match = pathname.match(r.pattern);
		if (match) return r;
	}
	return null;
}

// === Entry point ===
async function handleRequest(request, env, _ctx) {
	const url = new URL(request.url);

	// Serve notebook.html for /notebook/* (client-side routing loads detail from API)
	if (url.pathname.startsWith("/notebook/")) {
		// ASSETS redirects /notebook.html → /notebook, so we follow the redirect
		const res = await env.ASSETS.fetch(
			new Request(new URL("/notebook.html", request.url)),
		);
		if (
			res.status === 301 ||
			res.status === 302 ||
			res.status === 307 ||
			res.status === 308
		) {
			const location = res.headers.get("location");
			if (location) {
				return env.ASSETS.fetch(new Request(new URL(location, request.url)));
			}
		}
		return res;
	}

	// Only handle /api/* — fall through to ASSETS for everything else
	if (!url.pathname.startsWith("/api/")) {
		return env.ASSETS.fetch(request);
	}

	// CORS preflight
	const preflight = corsPreflight(request.method);
	if (preflight) return preflight;

	// Route matching
	const route = matchRoute(request.method, url.pathname);
	if (!route) {
		return withCors(
			json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404),
		);
	}

	try {
		const response = await route.handler(
			request,
			env,
			url.pathname.match(route.pattern),
		);
		return withCors(response);
	} catch (err) {
		console.error("Request error:", err);
		return withCors(
			json(
				{ error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
				500,
			),
		);
	}
}

export default {
	async fetch(request, env, ctx) {
		return handleRequest(request, env, ctx);
	},
};
