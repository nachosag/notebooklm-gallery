/**
 * IP-based rate limiter for submissions and likes.
 */

const LIMITS = {
	submission: { max: 3, windowHours: 1, table: "submissions_log" },
	like: { max: 100, windowHours: 1, table: "likes_log" },
};

export async function checkRateLimit(env, ipHash, type) {
	const cfg = LIMITS[type];
	if (!cfg) return { allowed: true };

	const { results } = await env.DB.prepare(
		`SELECT COUNT(*) as count FROM ${cfg.table}
     WHERE ip_hash = ?1 AND created_at > datetime('now', ?2)`,
	)
		.bind(ipHash, `-${cfg.windowHours} hours`)
		.all();

	const count = results[0]?.count || 0;
	return {
		allowed: count < cfg.max,
		remaining: Math.max(0, cfg.max - count),
	};
}
