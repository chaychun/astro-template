// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import sveltia from "astro-loader-sveltia-cms";

// https://astro.build/config
export default defineConfig({
  site: "https://example.com",

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react(),
    sitemap(),
    sveltia({
      // Sveltia CMS is mounted at /admin. Collections live here (single
      // source of truth — the loader auto-generates Zod schemas from the
      // widget definitions). Replace OWNER/REPO per-client. See the
      // sveltia-cms skill for the full walkthrough.
      config: {
        backend: {
          name: "github",
          repo: "OWNER/REPO",
          branch: "main",
        },
        media_folder: "src/assets/uploads",
        public_folder: "/src/assets/uploads",
        collections: [],
      },
    }),
  ],
});
