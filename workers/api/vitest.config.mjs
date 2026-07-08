import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./src/index.js",
      miniflare: {
        // Pin compatibility date to the newest value supported by the bundled
        // workerd binary. Without this, the pool defaults the *runner* worker
        // to today's date, which the installed workerd cannot run and throws
        // ERR_RUNTIME_FAILURE in both CI and local test runs.
        compatibilityDate: "2026-06-18",
        d1Databases: {
          DB: "00000000-0000-0000-0000-000000000000",
        },
        r2Buckets: {
          PREVIEW_IMAGES: "test-previews",
        },
        kvNamespaces: {
          SITEMAP_CACHE: "test-cache",
        },
      },
    }),
  ],
});
