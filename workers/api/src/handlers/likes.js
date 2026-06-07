/**
 * Like/unlike handler with rate limiting and toggle logic.
 */

import { hashIp } from "../utils/ip.js";

const RATE_LIMIT_MAX = 100; // actions per hour per IP
const RATE_LIMIT_WINDOW_SEC = 3600;

export async function handleLike(request, env, id) {
	// Check notebook exists first
	const notebook = await env.DB.prepare(
		"SELECT id, likes FROM notebooks WHERE id = ?1",
	)
		.bind(id)
		.first();

	if (!notebook) {
		return new Response(
			JSON.stringify({
				error: { code: "NOT_FOUND", message: "Notebook not found" },
			}),
			{ status: 404, headers: { "Content-Type": "application/json" } },
		);
	}

	// Get hashed IP from CF-Connecting-IP header
	const ip =
		request.headers.get("CF-Connecting-IP") ||
		request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
		"unknown";
	const ipHash = await hashIp(ip);

	// Rate limit check: count like actions from this IP in the last hour
	const recentCount = await env.DB.prepare(
		`SELECT count(*) as cnt FROM likes_log
		 WHERE ip_hash = ?1 AND created_at > datetime('now', ?2)`,
	)
		.bind(ipHash, `-${RATE_LIMIT_WINDOW_SEC} seconds`)
		.first();

	if (recentCount?.cnt >= RATE_LIMIT_MAX) {
		return new Response(
			JSON.stringify({
				error: {
					code: "RATE_LIMITED",
					message: "Too many likes. Try again later.",
				},
			}),
			{ status: 429, headers: { "Content-Type": "application/json" } },
		);
	}

	// Check if already liked
	const existingLike = await env.DB.prepare(
		"SELECT 1 FROM likes_log WHERE notebook_id = ?1 AND ip_hash = ?2",
	)
		.bind(id, ipHash)
		.first();

	let liked;

	if (existingLike) {
		// Unlike: remove like
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
		liked = false;
	} else {
		// Like: add like
		await env.DB.prepare(
			"INSERT INTO likes_log(notebook_id, ip_hash) VALUES (?1, ?2)",
		)
			.bind(id, ipHash)
			.run();
		await env.DB.prepare("UPDATE notebooks SET likes = likes + 1 WHERE id = ?1")
			.bind(id)
			.run();
		liked = true;
	}

	// Get updated count
	const updated = await env.DB.prepare(
		"SELECT likes FROM notebooks WHERE id = ?1",
	)
		.bind(id)
		.first();

	return new Response(
		JSON.stringify({
			id,
			likes: updated?.likes || 0,
			liked,
		}),
		{ headers: { "Content-Type": "application/json" } },
	);
}
