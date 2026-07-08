// NotebookLM Gallery — Pages Function: thin proxy to the API Worker.
//
// The tested API lives in workers/api/ and is deployed as the Worker
// "notebooklm-gallery-api", reached here via the Pages Service Binding
// (env.API, declared as [[services]] in frontend/wrangler.toml). This
// file deliberately contains NO business logic: it forwards the API and
// SEO routes to the Worker and lets Pages serve everything else (static
// assets + the _redirects SPA fallback for /notebook/*).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (
      url.pathname.startsWith("/api/") ||
      url.pathname === "/sitemap.xml" ||
      url.pathname === "/robots.txt"
    ) {
      return env.API.fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
};