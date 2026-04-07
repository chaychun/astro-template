// Single source of truth for collection schemas lives in astro.config.mjs
// under the `sveltia()` integration's `config.collections`. The
// astro-loader-sveltia-cms loader auto-generates Zod schemas from the widget
// definitions there, so you don't have to write them twice.
//
// When defining the first collection, uncomment and adapt:
//
//   import { defineCollection } from "astro:content";
//   import { sveltiaLoader } from "astro-loader-sveltia-cms/loader";
//
//   const posts = defineCollection({ loader: sveltiaLoader("posts") });
//
//   export const collections = { posts };
//
// `sveltiaLoader("posts")` is typed — the collection name must match one
// defined in astro.config.mjs. Autocomplete shows the valid names. See the
// sveltia-cms skill for the widget ↔ Zod cheat sheet and edge cases.

export const collections = {};
