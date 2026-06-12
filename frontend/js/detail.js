function escapeHtml(str) {
	if (!str) return '';
	const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
	return String(str).replace(/[&<>"'`]/g, c => map[c]);
}

// NotebookLM Gallery - Detail Page
document.addEventListener("DOMContentLoaded", () => {
	const notebookId = window.location.pathname.split("/").pop();
	if (!notebookId) {
		document.getElementById("detailContent").innerHTML =
			'<p class="text-text-muted text-center py-16">No notebook ID specified.</p>';
		return;
	}

	const content = document.getElementById("detailContent");
	const loading = document.getElementById("loadingState");
	const notFound = document.getElementById("notFoundState");

	async function loadDetail() {
		try {
			const res = await fetch(`${CONFIG.API_BASE}/api/notebooks/${notebookId}`);
			if (res.status === 404) {
				loading.classList.add("hidden");
				notFound.classList.remove("hidden");
				return;
			}
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const notebook = await res.json();
			renderDetail(notebook);
		} catch (err) {
			loading.classList.add("hidden");
			content.innerHTML = `
                <div class="text-center py-16">
                    <span class="material-symbols-outlined text-6xl text-text-muted/30">error</span>
                    <h3 class="font-headline-md text-headline-md text-text-main mt-4">Failed to load notebook</h3>
                    <p class="font-body-md text-body-md text-text-muted mt-2">${err.message}</p>
                    <button onclick="location.reload()" class="mt-6 bg-primary text-on-primary font-label-md text-label-md px-6 py-3 rounded-lg hover:shadow-lg transition-all">Try again</button>
                </div>
            `;
		}
	}

	function renderDetail(nb) {
		const primaryCat = (nb.categories || [])[0] || "";
		const catIcon =
			CONFIG.CATEGORIES.find((c) => c.slug === primaryCat)?.icon || "category";

		const categoriesHTML = (nb.categories || [])
			.map((slug) => {
				const label = CONFIG.CATEGORIES.find((c) => c.slug === slug)?.name || slug;
				return `<span class="font-label-sm text-label-sm px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container">${escapeHtml(label)}</span>`;
			})
			.join("");

		const thumbContent = nb.preview_url
			? `<img class="w-full h-full object-cover" src="${escapeHtml(nb.preview_url)}" alt="${escapeHtml(nb.title)}">`
			: `<div class="w-full h-full thumbnail-fallback flex items-center justify-center"><span class="material-symbols-outlined text-6xl text-white/60">${catIcon}</span></div>`;

		const tagsHTML = (nb.tags || [])
			.map(
				(t) =>
					`<span class="px-4 py-1.5 bg-surface-container-low border border-outline-variant hover:border-primary hover:text-primary transition-all rounded-full font-label-sm text-label-sm text-on-secondary-container">${escapeHtml(t)}</span>`,
			)
			.join("");

		const dateStr = nb.created_at
			? new Date(nb.created_at).toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})
			: "";

		loading.classList.add("hidden");
		content.classList.remove("hidden");

		content.innerHTML = `
            <div class="back-link">
                <a class="inline-flex items-center text-text-muted hover:text-primary transition-colors group" href="/">
                    <span class="material-symbols-outlined mr-2 group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    <span class="font-label-md text-label-md">Back to Discover</span>
                </a>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                <!-- Left Column: Image + Info -->
                <div class="lg:col-span-8 space-y-stack-lg">

                    <!-- Preview Image -->
                    <div class="relative aspect-video w-full overflow-hidden rounded-xl bg-surface-container shadow-lg group">
                        ${thumbContent}
                        <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>

                    <div class="space-y-stack-md">
                        <div class="flex items-center gap-4">
                            ${categoriesHTML}
                            ${dateStr ? `<span class="font-body-sm text-body-sm text-text-muted">Published ${dateStr}</span>` : ""}
                        </div>
                        <h1 class="font-display-lg text-display-lg text-text-main tracking-tight">${escapeHtml(nb.title)}</h1>
                        <div>
                            <p class="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">${escapeHtml(nb.description)}</p>
                        </div>
                    </div>

                    <!-- Tags -->
                    ${
											tagsHTML
												? `
                    <div class="pt-6 border-t border-border-subtle">
                        <h3 class="font-label-md text-label-md text-text-main mb-4 uppercase tracking-wider">Tags</h3>
                        <div class="flex flex-wrap gap-2">${tagsHTML}</div>
                    </div>`
												: ""
										}
                </div>

                <!-- Right Column: Actions -->
                <aside class="lg:col-span-4 space-y-6">
                    <div class="bg-surface-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-6 sticky top-24">

                        <!-- Like + Open in NotebookLM -->
                        <div class="space-y-4">
                            <div class="flex items-center gap-3">
                                <button id="likeBtn" class="flex items-center gap-2 px-5 py-3 border border-border-subtle rounded-lg hover:bg-surface-container-low transition-colors">
                                    <span class="material-symbols-outlined heart-icon ${nb.liked ? "liked" : ""}" id="likeIcon">favorite</span>
                                    <span class="font-label-md text-label-md" id="likeCount">${nb.likes || 0}</span>
                                </button>
                                <span class="font-body-sm text-body-sm text-text-muted">likes</span>
                            </div>

                            <a class="flex items-center justify-center gap-2 w-full py-4 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:shadow-lg active:scale-[0.98] transition-all" href="${escapeHtml(nb.share_url)}" target="_blank" rel="noopener">
                                <span class="material-symbols-outlined">open_in_new</span>
                                Open in NotebookLM
                            </a>

                            <button onclick="navigator.clipboard.writeText(window.location.href); this.textContent='Copied!'; setTimeout(()=>this.innerHTML='<span class=\\'material-symbols-outlined\\'>share</span> Share Notebook', 2000);" class="flex items-center justify-center gap-2 w-full py-4 border border-border-subtle bg-surface-white text-text-main font-label-md text-label-md rounded-lg hover:bg-surface-container-low transition-colors">
                                <span class="material-symbols-outlined">share</span>
                                Share Notebook
                            </button>
                        </div>
                    </div>
                </aside>
            </div>
        `;

		// Like toggle
		let liked = nb.liked || false;
		let likeCount = nb.likes || 0;
		const likeBtn = document.getElementById("likeBtn");
		const likeIcon = document.getElementById("likeIcon");
		const likeCountEl = document.getElementById("likeCount");

		likeBtn.addEventListener("click", async () => {
			liked = !liked;
			likeCount += liked ? 1 : -1;
			likeIcon.classList.toggle("liked", liked);
			likeCountEl.textContent = likeCount;

			try {
				await fetch(`${CONFIG.API_BASE}/api/notebooks/${notebookId}/like`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
				});
			} catch (err) {
				// Revert
				liked = !liked;
				likeCount += liked ? 1 : -1;
				likeIcon.classList.toggle("liked", liked);
				likeCountEl.textContent = likeCount;
			}
		});
	}

	loadDetail();
});
