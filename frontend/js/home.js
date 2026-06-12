function escapeHtml(str) {
	if (!str) return '';
	const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
	return String(str).replace(/[&<>"'`]/g, c => map[c]);
}

function injectStructuredData(jsonObj) {
	const existing = document.querySelector('script[type="application/ld+json"]');
	if (existing) existing.remove();
	const script = document.createElement('script');
	script.type = 'application/ld+json';
	script.textContent = JSON.stringify(jsonObj);
	document.head.appendChild(script);
}

// NotebookLM Gallery - Discover Page
const state = {
	page: 1,
	category: null,
	tag: null,
	search: "",
	sort: "recent",
	loading: false,
	hasMore: true,
	notebooks: [],
};

function buildQueryString() {
	const params = new URLSearchParams();
	params.set("page", state.page);
	params.set("limit", CONFIG.PAGE_LIMIT);
	if (state.category) params.set("category", state.category);
	if (state.tag) params.set("tag", state.tag);
	if (state.search) params.set("search", state.search);
	params.set("sort", state.sort);
	return params.toString();
}

async function fetchNotebooks() {
	const url = `${CONFIG.API_BASE}/api/notebooks?${buildQueryString()}`;
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} catch (err) {
		console.error("Failed to fetch notebooks:", err);
		return { notebooks: [], total: 0 };
	}
}

function createCardHTML(notebook) {
	const catNames = notebook.categories || [];
	const primaryCat = catNames[0] || "";
	const catLabel =
		CONFIG.CATEGORIES.find((c) => c.slug === primaryCat)?.name || primaryCat;
	const catIcon =
		CONFIG.CATEGORIES.find((c) => c.slug === primaryCat)?.icon || "category";

	// Preview: use image if available, else fallback gradient
	const thumbContent = notebook.preview_url
		? `<img class="w-full h-full object-cover" src="${escapeHtml(notebook.preview_url)}" alt="${escapeHtml(notebook.title)} - ${escapeHtml((notebook.description || '').slice(0, 100))}" />`
		: `<div class="w-full h-full thumbnail-fallback flex items-center justify-center"><span class="material-symbols-outlined text-4xl text-white/60">${catIcon}</span></div>`;

	const likeIcon = `favorite`; // Material Symbol for heart

	return `
        <a href="/notebook/${notebook.id}" class="notebook-card bg-surface-white border border-border-subtle rounded-xl overflow-hidden transition-all duration-300 block">
            <div class="aspect-video relative overflow-hidden bg-surface-container-high">
                ${thumbContent}
                <div class="absolute bottom-3 left-3 flex gap-2">
                    <span class="bg-primary/90 text-white font-label-sm text-label-sm px-3 py-1 rounded-full backdrop-blur-sm">${escapeHtml(catLabel)}</span>
                </div>
            </div>
            <div class="p-5 space-y-2">
                <h3 class="font-headline-sm text-headline-sm text-text-main line-clamp-2">${escapeHtml(notebook.title)}</h3>
                <p class="font-body-sm text-body-sm text-text-muted line-clamp-2 leading-relaxed">${escapeHtml(notebook.description)}</p>
                <div class="pt-2 flex items-center gap-1.5 text-text-muted">
                    <span class="material-symbols-outlined text-lg heart-icon ${notebook.liked ? "liked" : ""}" data-liked="${notebook.liked || false}" role="button" tabindex="0" aria-pressed="${notebook.liked ? "true" : "false"}" aria-label="Like ${escapeHtml(notebook.title)}" onclick="event.preventDefault(); toggleLike('${notebook.id}', this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();this.click()}">${likeIcon}</span>
                    <span class="font-label-sm text-label-sm like-count">${notebook.likes || 0}</span>
                </div>
            </div>
        </a>
    `;
}

function renderNotebooks(notebooks) {
	const grid = document.getElementById("notebookGrid");
	grid.setAttribute("aria-live", "polite");
	grid.setAttribute("aria-atomic", "true");
	if (!notebooks || notebooks.length === 0) {
		if (state.page === 1) {
			grid.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <span class="material-symbols-outlined text-6xl text-text-muted/30">menu_book</span>
                    <h3 class="font-headline-md text-headline-md text-text-main mt-4">No notebooks yet</h3>
                    <p class="font-body-md text-body-md text-text-muted mt-2">Be the first to share a NotebookLM notebook!</p>
                    <a href="/submit" class="mt-6 bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:shadow-lg transition-all">Submit a Notebook</a>
                </div>
            `;
		}
		state.hasMore = false;
		injectHomeStructuredData(state.notebooks);
		return;
	}

	const html = notebooks.map(createCardHTML).join("");
	if (state.page === 1) {
		state.notebooks = notebooks;
		grid.innerHTML = html;
	} else {
		state.notebooks.push(...notebooks);
		grid.insertAdjacentHTML("beforeend", html);
	}

	state.hasMore = notebooks.length >= CONFIG.PAGE_LIMIT;
	updatePagination();
	injectHomeStructuredData(state.notebooks);
}

function injectHomeStructuredData(notebooks) {
	const graph = [
		{
			"@type": "WebSite",
			"name": "NotebookLM Gallery",
			"url": "https://notebooklm.gallery/",
			"potentialAction": {
				"@type": "SearchAction",
				"target": {
					"@type": "EntryPoint",
					"urlTemplate": "https://notebooklm.gallery/?q={search_term_string}"
				},
				"query-input": "required name=search_term_string"
			}
		}
	];

	if (notebooks && notebooks.length > 0) {
		graph.push({
			"@type": "ItemList",
			"itemListElement": notebooks.map((nb, i) => ({
				"@type": "ListItem",
				"position": i + 1,
				"item": {
					"@type": "CreativeWork",
					"name": nb.title,
					"description": nb.description,
					"url": `https://notebooklm.gallery/notebook/${nb.id}`,
					"image": nb.preview_url || "",
					"category": (nb.categories || [])[0] || "",
					"datePublished": nb.created_at || ""
				}
			}))
		});
	}

	injectStructuredData({
		"@context": "https://schema.org",
		"@graph": graph
	});
}

function updatePagination() {
	const loadMore = document.getElementById("loadMore");
	if (loadMore) {
		loadMore.style.display = state.hasMore ? "" : "none";
	}
}

async function loadNotebooks(reset = false) {
	if (state.loading) return;
	state.loading = true;

	if (reset) {
		state.page = 1;
		state.notebooks = [];
		document.getElementById("notebookGrid").innerHTML = "";
	}

	const loadMore = document.getElementById("loadMore");
	if (loadMore) loadMore.disabled = true;

	const data = await fetchNotebooks();
	renderNotebooks(data.notebooks || []);

	if (loadMore) loadMore.disabled = false;
	state.loading = false;
}

function setupSearch() {
	const input = document.getElementById("searchInput");
	if (!input) return;

	let debounceTimer;
	input.addEventListener("input", () => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			state.search = input.value.trim();
			loadNotebooks(true);
		}, 400);
	});

	// Ctrl+K shortcut
	window.addEventListener("keydown", (e) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "k") {
			e.preventDefault();
			input.focus();
		}
	});
}

function setupCategoryFilter() {
	const links = document.querySelectorAll("[data-category]");
	links.forEach((link) => {
		link.addEventListener("click", (e) => {
			e.preventDefault();
			const cat = link.dataset.category;

			// Update active state
			links.forEach((l) => {
				l.classList.remove(
					"category-active",
					"bg-primary-container",
					"text-on-primary-container",
					"font-semibold",
				);
				l.classList.add(
					"text-on-secondary-container",
					"hover:bg-surface-container-highest",
				);
				l.removeAttribute("aria-current");
			});
			link.classList.add("category-active");
			link.classList.remove(
				"text-on-secondary-container",
				"hover:bg-surface-container-highest",
			);
			link.setAttribute("aria-current", "page");

			state.category = cat === "all" ? null : cat;
			loadNotebooks(true);
		});
	});

	// Set "All Notebooks" as active initially
	const allLink = document.querySelector('[data-category="all"]');
	if (allLink) {
		allLink.classList.add("category-active");
		allLink.classList.remove(
			"text-on-secondary-container",
			"hover:bg-surface-container-highest",
		);
		allLink.setAttribute("aria-current", "page");
	}
}

function setupPagination() {
	const loadMore = document.getElementById("loadMore");
	if (!loadMore) return;

	loadMore.addEventListener("click", () => {
		state.page++;
		loadNotebooks(false);
	});
}

async function toggleLike(notebookId, element) {
	const liked = element.dataset.liked === "true";
	const newLiked = !liked;

	// Optimistic update
	element.dataset.liked = newLiked;
	element.classList.toggle("liked", newLiked);
	element.setAttribute("aria-pressed", newLiked);
	const countSpan = element.parentElement.querySelector(".like-count");
	const currentCount = parseInt(countSpan.textContent || "0");
	countSpan.textContent = newLiked
		? currentCount + 1
		: Math.max(0, currentCount - 1);

	try {
		await fetch(`${CONFIG.API_BASE}/api/notebooks/${notebookId}/like`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
		});
	} catch (err) {
		// Revert on error
		element.dataset.liked = liked;
		element.classList.toggle("liked", liked);
		element.setAttribute("aria-pressed", liked);
		countSpan.textContent = currentCount;
	}
}

function init() {
	setupSearch();
	setupCategoryFilter();
	setupPagination();
	setupMobileMenu();
	loadNotebooks(true);
}

function setupMobileMenu() {
	const btn = document.getElementById("mobileMenuBtn");
	const nav = document.getElementById("mobileNav");
	if (!btn || !nav) return;
	btn.addEventListener("click", () => {
		const isOpen = !nav.classList.contains("hidden");
		nav.classList.toggle("hidden", isOpen);
		btn.querySelector(".material-symbols-outlined").textContent = isOpen
			? "menu"
			: "close";
		btn.setAttribute("aria-expanded", (!isOpen).toString());
	});
}

document.addEventListener("DOMContentLoaded", init);
