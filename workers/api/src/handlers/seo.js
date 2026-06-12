/**
 * SEO handlers: sitemap.xml and robots.txt
 */

const SITE_URL = "https://notebooklm.gallery";

/**
 * GET /sitemap.xml — Generate XML sitemap with all notebook URLs.
 *
 * - Static pages: home (priority 1.0, daily), submit (priority 0.5, weekly)
 * - Dynamic pages: each notebook detail page (priority 0.8, weekly)
 * - lastmod uses notebook created_at ISO date
 * - Caches result via ctx.waitUntil + SITEMAP_CACHE KV if available
 */
export async function handleSitemap(request, env, ctx) {
	// Try cache first
	if (env.SITEMAP_CACHE) {
		try {
			const cached = await env.SITEMAP_CACHE.get("sitemap.xml");
			if (cached) {
				return new Response(cached, {
					headers: { "Content-Type": "application/xml" },
				});
			}
		} catch {
			// Cache miss or error, continue to generate
		}
	}

	// Query all notebooks
	let notebooks;
	try {
		const result = await env.DB.prepare(
			"SELECT id, created_at FROM notebooks ORDER BY created_at DESC",
		).all();
		notebooks = result.results || [];
	} catch (err) {
		console.error("Sitemap DB error:", err);
		notebooks = [];
	}

	const now = new Date().toISOString();

	// Build XML
	const urls = [
		`  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
		`  <url>
    <loc>${SITE_URL}/submit</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`,
	];

	for (const nb of notebooks) {
		const lastmod = nb.created_at
			? new Date(nb.created_at).toISOString()
			: now;
		urls.push(`  <url>
    <loc>${SITE_URL}/notebook/${nb.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

	// Cache in background if KV available
	if (env.SITEMAP_CACHE) {
		ctx.waitUntil(env.SITEMAP_CACHE.put("sitemap.xml", xml));
	}

	return new Response(xml, {
		headers: { "Content-Type": "application/xml" },
	});
}

/**
 * GET /robots.txt — Return robots.txt with sitemap URL.
 */
export function handleRobots(_request, _env) {
	const body = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

	return new Response(body, {
		headers: { "Content-Type": "text/plain" },
	});
}
