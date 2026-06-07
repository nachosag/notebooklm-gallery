/**
 * Cloudflare Turnstile verification.
 */

export async function verifyTurnstile(token, env) {
	if (!token) return { success: false };
	if (!env.TURNSTILE_SECRET) return { success: true }; // dev mode: skip verification

	const formData = new FormData();
	formData.append("secret", env.TURNSTILE_SECRET);
	formData.append("response", token);

	const res = await fetch(
		"https://challenges.cloudflare.com/turnstile/v0/siteverify",
		{
			method: "POST",
			body: formData,
		},
	);

	return res.json();
}
