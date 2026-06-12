// NotebookLM Gallery - Submit Page
document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("submissionForm");
	const successState = document.getElementById("successState");
	const formHeader = document.getElementById("formHeader");
	const dropzone = document.getElementById("dropzone");
	const imageInput = document.getElementById("imageInput");
	const imagePreview = document.getElementById("imagePreview");
	const previewImg = document.getElementById("previewImg");
	const removeImg = document.getElementById("removeImg");
	const tagInput = document.getElementById("tagInput");
	const tagContainer = document.getElementById("tagContainer");
	const publishBtn = document.getElementById("publishBtn");

	// Build category chips from CONFIG
	const chipsContainer = document.getElementById("categoryChips");
	CONFIG.CATEGORIES.forEach((cat) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className =
			"category-chip px-4 py-1.5 rounded-full border border-border-subtle bg-surface-container-low text-text-muted font-label-md text-label-md chip-transition hover:border-primary hover:text-primary";
		btn.dataset.category = cat.slug;
		btn.textContent = cat.name;
		chipsContainer.appendChild(btn);
	});

	// Multi-select categories
	const chips = document.querySelectorAll(".category-chip");
	let selectedCategories = [];
	chips.forEach((chip) => {
		chip.addEventListener("click", () => {
			const slug = chip.dataset.category;
			const isActive = chip.classList.contains("bg-primary-container");
			if (isActive) {
				chip.classList.remove(
					"bg-primary-container",
					"text-on-primary-container",
					"border-primary",
				);
				chip.classList.add(
					"bg-surface-container-low",
					"text-text-muted",
					"border-border-subtle",
				);
				selectedCategories = selectedCategories.filter((s) => s !== slug);
			} else {
				if (selectedCategories.length >= 3) return; // max 3
				chip.classList.add(
					"bg-primary-container",
					"text-on-primary-container",
					"border-primary",
				);
				chip.classList.remove(
					"bg-surface-container-low",
					"text-text-muted",
					"border-border-subtle",
				);
				selectedCategories.push(slug);
			}
		});
	});

	// Tags input
	const tagsError = document.getElementById("tagsError");

	tagInput.addEventListener("keydown", (e) => {
		if (e.key === "Enter" && tagInput.value.trim() !== "") {
			e.preventDefault();
			const raw = tagInput.value.trim();
			if (raw.length < 2) {
				showError("tagInput", "tagsError", "Tags must be at least 2 characters");
				return;
			}
			const existingTags = tagContainer.querySelectorAll("div:not(#tagInput)");
			if (existingTags.length >= 10) {
				showError("tagInput", "tagsError", "Maximum 10 tags allowed");
				return;
			}
			clearError("tagInput", "tagsError");
			const tagText = raw.slice(0, 30);
			const tagElement = document.createElement("div");
			tagElement.className =
				"flex items-center gap-1 bg-surface-container-high text-on-secondary-container px-3 py-1 rounded-full font-label-sm text-label-sm";
			const span = document.createElement("span");
			span.textContent = tagText;
			tagElement.appendChild(span);
			const removeBtn = document.createElement("button");
			removeBtn.type = "button";
			removeBtn.className = "hover:text-error flex items-center";
			const closeIcon = document.createElement("span");
			closeIcon.className = "material-symbols-outlined text-[14px]";
			closeIcon.textContent = "close";
			removeBtn.appendChild(closeIcon);
			removeBtn.addEventListener("click", () => tagElement.remove());
			tagElement.appendChild(removeBtn);
			tagContainer.insertBefore(tagElement, tagInput);
			tagInput.value = "";
		}
	});

	// Image upload
	dropzone.addEventListener("click", () => imageInput.click());
	dropzone.addEventListener("keydown", (e) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			imageInput.click();
		}
	});
	const imageError = document.getElementById("imageError");
	const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
	const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

	imageInput.addEventListener("change", () => {
		const file = imageInput.files[0];
		if (!file) return;
		if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
			imageError.textContent = "Image must be PNG, JPEG, or WebP";
			imageError.classList.remove("hidden");
			imageInput.value = "";
			return;
		}
		if (file.size > MAX_IMAGE_SIZE) {
			imageError.textContent = "Image must be under 5 MB";
			imageError.classList.remove("hidden");
			imageInput.value = "";
			return;
		}
		imageError.classList.add("hidden");
		const reader = new FileReader();
		reader.onload = (e) => {
			previewImg.src = e.target.result;
			dropzone.classList.add("hidden");
			imagePreview.classList.remove("hidden");
		};
		reader.readAsDataURL(file);
	});
	removeImg.addEventListener("click", () => {
		imageInput.value = "";
		imagePreview.classList.add("hidden");
		dropzone.classList.remove("hidden");
	});
	// Drag and drop
	dropzone.addEventListener("dragover", (e) => {
		e.preventDefault();
		dropzone.classList.add("border-primary");
	});
	dropzone.addEventListener("dragleave", () =>
		dropzone.classList.remove("border-primary"),
	);
	dropzone.addEventListener("drop", (e) => {
		e.preventDefault();
		dropzone.classList.remove("border-primary");
		imageInput.files = e.dataTransfer.files;
		imageInput.dispatchEvent(new Event("change"));
	});

	// Show error on field
	function showError(inputId, errorId, message) {
		const input = document.getElementById(inputId);
		const error = document.getElementById(errorId);
		input.classList.add("border-error");
		error.textContent = message;
		error.classList.remove("hidden");
	}

	function clearError(inputId, errorId) {
		document.getElementById(inputId).classList.remove("border-error");
		document.getElementById(errorId).classList.add("hidden");
	}

	// Form submission
	form.addEventListener("submit", async (e) => {
		e.preventDefault();
		let isValid = true;

		// Collect tags
		const tagElements = tagContainer.querySelectorAll("div:not(#tagInput)");
		const tags = [];
		tagElements.forEach((el) => {
			const span = el.querySelector("span");
			if (span) tags.push(span.textContent);
		});

		// Validate title
		const title = document.getElementById("title").value.trim();
		if (title.length < 3 || title.length > 120) {
			showError(
				"title",
				"titleError",
				"Title must be between 3 and 120 characters",
			);
			isValid = false;
		} else {
			clearError("title", "titleError");
		}

		// Validate link
		const link = document.getElementById("link").value.trim();
		let validLink = false;
		try {
			const parsed = new URL(link);
			validLink = parsed.protocol === "https:" && parsed.hostname === "notebooklm.google.com";
		} catch {
			validLink = false;
		}
		if (!validLink) {
			showError(
				"link",
				"linkError",
				"Must be a valid NotebookLM link (notebooklm.google.com)",
			);
			isValid = false;
		} else {
			clearError("link", "linkError");
		}

		// Validate description
		const description = document.getElementById("description").value.trim();
		if (description.length < 20 || description.length > 1000) {
			showError(
				"description",
				"descriptionError",
				"Description must be between 20 and 1000 characters",
			);
			isValid = false;
		} else {
			clearError("description", "descriptionError");
		}

		// Validate categories
		if (selectedCategories.length === 0) {
			document.getElementById("categoriesError").classList.remove("hidden");
			isValid = false;
		} else {
			document.getElementById("categoriesError").classList.add("hidden");
		}

		if (!isValid) return;

		// Get Turnstile token
		const turnstileToken = turnstile?.getResponse();
		if (!turnstileToken) {
			alert("Please complete the security check before publishing.");
			return;
		}

		// Submit
		publishBtn.disabled = true;
		publishBtn.innerHTML = `<span class="material-symbols-outlined animate-spin">progress_activity</span> Publishing...`;

		try {
			const body = {
				title,
				share_url: link,
				description,
				categories: selectedCategories,
				tags,
			};

			// If image, convert to base64 and include (simplified for MVP)
			// In production, upload to R2 via Worker
			if (imageInput.files[0]) {
				const reader = new FileReader();
				body.preview_image = await new Promise((resolve) => {
					reader.onload = () => resolve(reader.result);
					reader.readAsDataURL(imageInput.files[0]);
				});
			}

			const res = await fetch(`${CONFIG.API_BASE}/api/notebooks`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"CF-Turnstile-Token": turnstileToken,
				},
				body: JSON.stringify(body),
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.error?.message || `HTTP ${res.status}`);
			}

			const data = await res.json();

			// Success
			formHeader.classList.add("hidden");
			form.classList.add("hidden");
			const successLink = document.getElementById("successLink");
			successLink.href = `/notebook/${data.id}`;
			successState.classList.remove("hidden");
		} catch (err) {
			alert("Failed to publish: " + err.message);
			publishBtn.disabled = false;
			publishBtn.innerHTML =
				'Publish Notebook <span class="material-symbols-outlined">send</span>';
		}
	});
});
