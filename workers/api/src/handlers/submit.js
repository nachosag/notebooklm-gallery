/**
 * POST /api/notebooks — Submit a new notebook.
 * Accepts JSON or multipart/form-data (for optional image upload).
 */

import { validateNotebook } from "../utils/validation.js";
import { verifyTurnstile } from "../middleware/turnstile.js";
import { checkRateLimit } from "../middleware/ratelimit.js";
import { hashIp } from "../utils/ip.js";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, CF-Turnstile-Token",
};

// Allowed image MIME types for preview upload
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

function error(status, code, message, fields) {
	const body = { error: { code, message } };
	if (fields) body.error.fields = fields;
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json", ...corsHeaders },
	});
}

/**
 * Parse the request body — JSON or multipart/form-data.
 */
async function parseBody(request) {
	const contentType = request.headers.get("Content-Type") || "";

	if (contentType.includes("application/json")) {
		return { json: await request.json(), file: null };
	}

	if (contentType.includes("multipart/form-data")) {
		const formData = await request.formData();
		const json = {};
		const fields = ["title", "description", "share_url", "categories", "tags"];
		for (const key of fields) {
			const val = formData.get(key);
			if (val) {
				try {
					json[key] = JSON.parse(val);
				} catch {
					json[key] = val;
				}
			}
		}
		const file = formData.get("preview_image");
		return { json, file: file instanceof File ? file : null };
	}

	// Default to JSON parse
	return { json: await request.json(), file: null };
}

/**
 * Upload image to R2, return public URL.
 */
async function uploadImage(file, env) {
	if (!file || !file.name) return null;

	if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
		throw {
			code: "VALIDATION_ERROR",
			message: "Image must be PNG, JPEG, or WebP",
		};
	}
	if (file.size > MAX_IMAGE_SIZE) {
		throw { code: "VALIDATION_ERROR", message: "Image must be under 5 MB" };
	}

	const ext = file.name.split(".").pop() || "jpg";
	const key = `preview-images/${crypto.randomUUID()}.${ext}`;
	const arrayBuffer = await file.arrayBuffer();

	await env.PREVIEW_IMAGES.put(key, arrayBuffer, {
		httpMetadata: { contentType: file.type },
	});

	return `/api/images/${key}`;
}

/**
 * Upload base64-encoded image from JSON body to R2, return public URL.
 */
async function uploadBase64Image(dataUrl, env) {
	const matches = dataUrl.match(/^data:(image\/(png|jpeg|webp));base64,(.+)$/);
	if (!matches) {
		throw {
			code: "VALIDATION_ERROR",
			message: "Invalid image format",
		};
	}

	const mimeType = matches[1];
	const ext = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
	const base64Data = matches[3];

	if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
		throw {
			code: "VALIDATION_ERROR",
			message: "Image must be PNG, JPEG, or WebP",
		};
	}

	const binaryStr = atob(base64Data);
	const bytes = new Uint8Array(binaryStr.length);
	for (let i = 0; i < binaryStr.length; i++) {
		bytes[i] = binaryStr.charCodeAt(i);
	}

	if (bytes.length > MAX_IMAGE_SIZE) {
		throw { code: "VALIDATION_ERROR", message: "Image must be under 5 MB" };
	}

	const key = `preview-images/${crypto.randomUUID()}.${ext}`;
	await env.PREVIEW_IMAGES.put(key, bytes, {
		httpMetadata: { contentType: mimeType },
	});

	return `/api/images/${key}`;
}

export async function handleSubmit(request, env, _ctx) {
	try {
		// --- 1. Parse body ---
		let json, file;
		try {
			const parsed = await parseBody(request);
			json = parsed.json;
			file = parsed.file;
		} catch {
			return error(400, "VALIDATION_ERROR", "Invalid request body");
		}

		// --- 2. Validate fields ---
		const validation = validateNotebook(json);
		if (!validation.valid) {
			return error(
				400,
				"VALIDATION_ERROR",
				"Invalid fields",
				validation.errors,
			);
		}

		// --- 3. Verify Turnstile ---
		const turnstileToken =
			request.headers.get("CF-Turnstile-Token") || json.cf_turnstile_token;
		const turnstileResult = await verifyTurnstile(turnstileToken, env);
		if (!turnstileResult.success) {
			return error(
				403,
				"TURNSTILE_FAILED",
				"Security check failed. Please try again.",
			);
		}

		// --- 4. Rate limit ---
		const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
		const ipHash = await hashIp(clientIp);
		const rateCheck = await checkRateLimit(env, ipHash, "submission");
		if (!rateCheck.allowed) {
			return error(
				429,
				"RATE_LIMITED",
				"You can submit at most 3 notebooks per hour",
			);
		}

		// --- 5. Upload image (if provided) ---
		let previewUrl = null;
		if (file) {
			try {
				previewUrl = await uploadImage(file, env);
			} catch (err) {
				if (err.code === "VALIDATION_ERROR") {
					return error(400, "VALIDATION_ERROR", err.message);
				}
				// Non-fatal: skip image on R2 failure
				console.error("Image upload failed:", err);
			}
		} else if (
			json.preview_image &&
			typeof json.preview_image === "string" &&
			json.preview_image.startsWith("data:")
		) {
			try {
				previewUrl = await uploadBase64Image(json.preview_image, env);
			} catch (err) {
				if (err.code === "VALIDATION_ERROR") {
					return error(400, "VALIDATION_ERROR", err.message);
				}
				console.error("Image upload failed:", err);
			}
		}

		// --- 6. Generate ID ---
		const id = crypto.randomUUID();

		// --- 7. Insert into D1 ---
		await env.DB.prepare(
			`INSERT INTO notebooks (id, title, description, share_url, categories, tags, preview_url, ip_hash, submitted_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))`,
		)
			.bind(
				id,
				json.title.trim(),
				json.description.trim(),
				json.share_url.trim(),
				JSON.stringify(json.categories || []),
				JSON.stringify(json.tags || []),
				previewUrl,
				ipHash,
			)
			.run();

		// --- 8. Log submission for rate limiting ---
		await env.DB.prepare(
			`INSERT INTO submissions_log (ip_hash, created_at) VALUES (?1, datetime('now'))`,
		)
			.bind(ipHash)
			.run();

		// --- 9. Return 201 ---
		return new Response(JSON.stringify({ id, success: true }), {
			status: 201,
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	} catch (err) {
		console.error("Submit handler error:", err);
		return error(
			500,
			"INTERNAL_ERROR",
			"Something went wrong. Please try again.",
		);
	}
}
