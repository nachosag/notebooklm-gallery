/**
 * Cloudflare Turnstile verification.
 */

export async function verifyTurnstile(token, env) {
	if (!token) return { success: false };

	const formData = new FormData();
	formData.append("secret", env.TURNSTILE_SECRET_KEY);
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
