/**
 * Notebook list, detail, categories, and trending tags handlers.
 */

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

function sanitizeFts5(query) {
	const cleaned = query.replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ]/gi, " ").trim();
	if (!cleaned) return null;
	return cleaned
		.split(/\s+/)
		.map((w) => `"${w.replace(/"/g, "")}"`)
		.join(" AND ");
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

function safeJson(val) {
	try {
		return JSON.parse(val);
	} catch {
		return [];
	}
}

export async function handleList(request, env) {
	const url = new URL(request.url);
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
		if (!ftsQuery) {
			return new Response(
				JSON.stringify({ notebooks: [], total: 0, page, limit }),
				{ headers: { "Content-Type": "application/json" } },
			);
		}
		rows = await env.DB.prepare(
			`SELECT n.id, n.title, n.description, n.share_url,
			        n.categories, n.tags, n.preview_url, n.likes, n.created_at
			 FROM notebooks n
			 JOIN notebooks_fts fts ON n.rowid = fts.rowid
			 WHERE notebooks_fts MATCH ?1
			 ${category ? "AND n.categories LIKE '%' || ?2 || '%'" : ""}
			 ORDER BY rank
			 LIMIT ?3 OFFSET ?4`,
		)
			.bind(
				...(category
					? [ftsQuery, `"${category}"`, limit, offset]
					: [ftsQuery, limit, offset]),
			)
			.all();
		totalRows = await env.DB.prepare(
			`SELECT count(*) as cnt FROM notebooks n
			 JOIN notebooks_fts fts ON n.rowid = fts.rowid
			 WHERE notebooks_fts MATCH ?1
			 ${category ? "AND n.categories LIKE '%' || ?2 || '%'" : ""}`,
		)
			.bind(...(category ? [ftsQuery, `"${category}"`] : [ftsQuery]))
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
			`SELECT id, title, description, share_url, categories, tags, preview_url, likes, created_at
			 FROM notebooks ${where} ${order} LIMIT ? OFFSET ?`,
		)
			.bind(...params, limit, offset)
			.all();
		totalRows = await env.DB.prepare(
			`SELECT count(*) as cnt FROM notebooks ${where}`,
		)
			.bind(...params)
			.first();
	}

	return new Response(
		JSON.stringify({
			notebooks: rows.results.map((r) => rowToNotebook(r)),
			total: totalRows?.cnt || 0,
			page,
			limit,
		}),
		{ headers: { "Content-Type": "application/json" } },
	);
}

export async function handleDetail(request, env, id) {
	const row = await env.DB.prepare(
		`SELECT id, title, description, share_url, categories, tags, preview_url, likes, created_at
		 FROM notebooks WHERE id = ?1`,
	)
		.bind(id)
		.first();

	if (!row) {
		return new Response(
			JSON.stringify({
				error: { code: "NOT_FOUND", message: "Notebook not found" },
			}),
			{ status: 404, headers: { "Content-Type": "application/json" } },
		);
	}

	return new Response(JSON.stringify(rowToNotebook(row, true)), {
		headers: { "Content-Type": "application/json" },
	});
}

export async function handleCategories(request, env) {
	const allRows = await env.DB.prepare(
		"SELECT categories FROM notebooks",
	).all();

	const countMap = {};
	for (const row of allRows.results) {
		const cats = safeJson(row.categories);
		for (const c of cats) {
			countMap[c] = (countMap[c] || 0) + 1;
		}
	}

	const categories = CATEGORIES_META.map((m) => ({
		...m,
		count: countMap[m.slug] || 0,
	}));

	return new Response(JSON.stringify({ categories }), {
		headers: { "Content-Type": "application/json" },
	});
}

export async function handleTrendingTags(request, env) {
	const rows = await env.DB.prepare(
		`SELECT tags FROM notebooks
		 WHERE created_at > datetime('now', '-30 days')`,
	).all();

	const tagCount = {};
	for (const row of rows.results) {
		const tags = safeJson(row.tags);
		for (const t of tags) {
			tagCount[t] = (tagCount[t] || 0) + 1;
		}
	}

	const tags = Object.entries(tagCount)
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	return new Response(JSON.stringify({ tags }), {
		headers: { "Content-Type": "application/json" },
	});
}
