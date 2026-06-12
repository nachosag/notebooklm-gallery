import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./src/index.js",
      miniflare: {
        d1Databases: {
          DB: "00000000-0000-0000-0000-000000000000",
        },
        r2Buckets: {
          PREVIEW_IMAGES: "test-previews",
        },
      },
    }),
  ],
});
