/**
 * Input validation for notebook submissions.
 */

const VALID_CATEGORIES = [
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

export function validateNotebook(data) {
	const errors = {};

	if (!data.title || data.title.length < 3 || data.title.length > 120) {
		errors.title = "Title must be between 3 and 120 characters";
	}

	if (
		!data.description ||
		data.description.length < 20 ||
		data.description.length > 1000
	) {
		errors.description = "Description must be between 20 and 1000 characters";
	}

	if (!data.share_url || !data.share_url.includes("notebooklm.google.com")) {
		errors.share_url =
			"Must be a valid NotebookLM link (notebooklm.google.com)";
	}

	if (!data.categories || !Array.isArray(data.categories)) {
		errors.categories = "Select 1-3 categories from the list";
	} else if (data.categories.length < 1 || data.categories.length > 3) {
		errors.categories = "Select 1-3 categories from the list";
	} else if (!data.categories.every((c) => VALID_CATEGORIES.includes(c))) {
		errors.categories = "One or more invalid categories";
	}

	if (data.tags) {
		if (!Array.isArray(data.tags)) {
			errors.tags = "Tags must be an array";
		} else if (data.tags.length > 10) {
			errors.tags = "Maximum 10 tags allowed";
		} else {
			const invalid = data.tags.filter(
				(t) => typeof t !== "string" || t.length < 2 || t.length > 30,
			);
			if (invalid.length) errors.tags = "Tags must be 2-30 characters each";
		}
	}

	return {
		valid: Object.keys(errors).length === 0,
		errors: Object.keys(errors).length ? errors : null,
	};
}
