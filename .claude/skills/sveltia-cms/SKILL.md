---
name: sveltia-cms
description: Use when configuring, adding content to, or debugging Sveltia CMS in this Astro template. Covers the astro-loader-sveltia-cms integration (single-config pattern), defining collections with the typed loader, widget options and their auto-generated Zod, media strategies (global bucket vs page bundle), the File System Access API local dev workflow, and the fallback to canonical public/admin if the integration goes stale. Triggers "add a collection", "CMS config", "Sveltia", "content collection", "make this content editable", "widget not showing up", "field validation", "admin page".
---

# Sveltia CMS — Core

This template wires Sveltia CMS through **`astro-loader-sveltia-cms`** (by @joknoll) — an Astro 6 integration + content loader that puts the entire CMS config in `astro.config.mjs` and auto-generates Zod schemas from the widget definitions. **No `public/admin/config.yml`, no hand-written Zod for every field, no schema drift.**

Sveltia itself is a git-based headless CMS (successor to Netlify/Decap CMS) with first-class i18n and modern UX. It lives at `/admin`, authors via a browser form, writes markdown into `src/content/`.

## Architecture at a glance

```
┌──────────────────────────────────┐
│  astro.config.mjs                │     single source of truth
│  └─ sveltia({ config: {          │     (widgets, media, backend)
│       collections: [...]         │
│     }})                          │
└───────────────┬──────────────────┘
                │
                │  integration writes config.json to .astro/integrations/
                │  injects /admin route + types
                ▼
┌──────────────────────────────────┐     ┌──────────────────────────────┐
│  src/content.config.ts           │     │  /admin  (injected route)    │
│  sveltiaLoader("posts")  ────────┼────▶│  Sveltia CMS init({config})  │
│   ↑ auto-generated Zod           │     │  writes markdown to disk     │
└───────────────┬──────────────────┘     └──────────────┬───────────────┘
                │                                       │
                ▼                                       ▼
┌──────────────────────────────────┐     ┌──────────────────────────────┐
│  src/pages/**/*.astro            │◀────│  src/content/<name>/*.md     │
│  getCollection() / getEntry()    │     │  (what Sveltia wrote)        │
└──────────────────────────────────┘     └──────────────────────────────┘
```

The integration writes `collections` to `.astro/integrations/astro-loader-sveltia-cms/config.json` at config-time, then injects:

1. A prerendered `/admin` route (Sveltia bootstraps from a virtual module at runtime)
2. Types declaring `sveltiaLoader(name)` as a union of your actual collection names

Result: add a collection in one place, TypeScript knows about it everywhere.

## Adding a collection from scratch

Example: a `pages` collection backing a `[...slug].astro` route.

**1. Add to `astro.config.mjs`:**

```js
sveltia({
  config: {
    backend: { name: "github", repo: "OWNER/REPO", branch: "main" },
    media_folder: "src/assets/uploads",
    public_folder: "/src/assets/uploads",
    collections: [
      {
        name: "pages",
        label: "Pages",
        label_singular: "Page",
        folder: "src/content/pages",
        create: true,
        slug: "{{slug}}",
        path: "{{slug}}/index", // page-bundle: each entry in its own folder
        media_folder: "",        // empty = co-locate with the entry
        public_folder: "",
        fields: [
          { label: "Title",       name: "title",       widget: "string" },
          { label: "Description", name: "description", widget: "string" },
          { label: "Cover image", name: "cover",       widget: "image",   required: false },
          { label: "Draft",       name: "draft",       widget: "boolean", default: false },
          { label: "Body",        name: "body",        widget: "markdown" },
        ],
      },
    ],
  },
}),
```

**2. Register the loader in `src/content.config.ts`:**

```ts
import { defineCollection } from "astro:content";
import { sveltiaLoader } from "astro-loader-sveltia-cms/loader";

const pages = defineCollection({ loader: sveltiaLoader("pages") });

export const collections = { pages };
```

That's it — no Zod written by hand. The loader introspects the `fields:` you defined in step 1 and builds the schema. `"pages"` is type-checked against the names in `astro.config.mjs`; typo → build error with autocomplete suggestion.

**3. Create `src/pages/[...slug].astro`:**

```astro
---
import { getCollection, render } from "astro:content";
import { Image } from "astro:assets";
import Layout from "@/layouts/Layout.astro";

export async function getStaticPaths() {
  const pages = await getCollection("pages", ({ data }) => !data.draft);
  return pages.map((page) => ({
    params: { slug: page.id },
    props: { page },
  }));
}

const { page } = Astro.props;
const { Content } = await render(page);
---

<Layout title={page.data.title} description={page.data.description}>
  <main class="mx-auto max-w-2xl px-6 py-24">
    {page.data.cover && <Image src={page.data.cover} alt="" />}
    <h1 class="text-4xl font-semibold tracking-tight">{page.data.title}</h1>
    <article class="prose mt-8"><Content /></article>
  </main>
</Layout>
```

**4. Test:** `bun dev`, open `/admin/`, click **Work with Local Repository**, pick the project root, create a page. The markdown lands in `src/content/pages/<slug>/index.md`; Astro HMR picks it up and the new route renders.

## Widget cheat sheet (what the auto-Zod produces)

The loader's `fieldToZod` turns Sveltia widgets into Zod schemas. Knowing the mapping lets you predict the generated type and override it when necessary.

| Sveltia widget     | Generated Zod                        | Notes                                                 |
| ------------------ | ------------------------------------ | ----------------------------------------------------- |
| `string`           | `z.string()`                         | `.optional()` if `required: false`                    |
| `text`             | `z.string()`                         | Multiline variant                                     |
| `number`           | `z.number()`                         | Respects `value_type: "int"`                          |
| `boolean`          | `z.boolean()`                        | `.default(...)` when `default` is set                 |
| `datetime`         | `z.coerce.date()`                    | Handles ISO strings from frontmatter                  |
| `date`             | `z.coerce.date()`                    |                                                       |
| `select` (single)  | `z.enum([...options])`               | Enum values from the widget's `options`               |
| `select` (multi)   | `z.array(z.enum([...]))`             | When `multiple: true`                                 |
| `list` (primitive) | `z.array(z.string())`                |                                                       |
| `list` (typed)     | `z.array(z.object({...sub-fields}))` | Recursive over `fields:`                              |
| `object`           | `z.object({...sub-fields})`          | Recursive                                             |
| `image`            | `image()` helper                     | Works with the Astro asset pipeline                   |
| `file`             | `z.string()`                         | Sveltia stores the public path                        |
| `markdown`         | body (excluded from schema)          | `render(entry)` gives you `<Content />`               |
| `relation`         | `reference("<collection>")`          | `collection:` must match an existing Astro collection |
| `color`            | `z.string()`                         | Add your own `.regex(/^#[\da-f]{6}$/i)` via override  |
| `hidden`           | generated per field type             | Not shown in the form but still validated             |

### When you need to override a generated schema

The auto-Zod covers 90% of cases. If you need custom validation (e.g. `.refine()`, a regex, a complex discriminated union), write the schema by hand and skip the loader's auto-generation for that collection:

```ts
import { defineCollection, z } from "astro:content";
import { sveltiaLoader } from "astro-loader-sveltia-cms/loader";

const products = defineCollection({
  loader: sveltiaLoader("products"),
  schema: z.object({
    sku: z.string().regex(/^[A-Z]{3}-\d{4}$/),
    price: z.number().positive(),
    inStock: z.boolean(),
  }),
});
```

When you pass an explicit `schema`, Astro uses yours instead of the loader's auto-generated one. The widget definitions in `astro.config.mjs` still drive the authoring UI, but the build-time validation is fully under your control. **This is the only place schema parity becomes your problem again** — keep the hand-written schema in sync with the widgets.

## Media: global bucket vs page bundle

Same two patterns as the canonical Sveltia setup. Both are valid; pick per collection.

### Global bucket (template default)

`astro.config.mjs` ships with:

```js
media_folder: "src/assets/uploads",
public_folder: "/src/assets/uploads",
```

Uploads go to `src/assets/uploads/` and get fingerprinted by Astro's asset pipeline when imported from component code. Good for:

- **Shared brand assets** — logo, favicon variants, reusable hero imagery
- Images referenced from multiple pages
- Cases where you want to `import logo from "@/assets/uploads/logo.svg"` directly

**Gotcha:** Astro's `image()` helper in content schemas resolves paths **relative to the markdown file**. Absolute paths from the global bucket don't work with `image()`. Two workarounds:

1. Use `z.string()` for the field, render with `<img src={data.cover}>` (no optimization)
2. Switch to page-bundle for that collection (below)

### Page bundle (per-collection override)

Override `media_folder` and `public_folder` to empty strings at the collection level so each entry lives in its own folder with co-located media:

```js
{
  name: "pages",
  folder: "src/content/pages",
  path: "{{slug}}/index",   // each entry → src/content/pages/<slug>/index.md
  media_folder: "",          // empty string = co-locate with the entry
  public_folder: "",
  fields: [
    { label: "Cover", name: "cover", widget: "image" },
  ],
}
```

Resulting structure:

```
src/content/pages/
├── about/
│   ├── index.md       # frontmatter cover: ./hero.jpg
│   └── hero.jpg       # Sveltia uploads land here
└── contact/
    ├── index.md
    └── map.png
```

The loader's auto-generated Zod uses `image()` for image widgets, so `./hero.jpg` resolves correctly and `<Image src={page.data.cover} />` gives you hash + responsive variants.

### Decision tree

- Image specific to **one entry** (blog post cover, page hero) → **page bundle**
- Image **shared** across entries or used from component code → **global bucket**
- Mixed needs → use both: keep the global bucket for shared, override per-collection for entry-specific media

## Local dev workflow (File System Access API)

Sveltia removed proxy-server support; local editing uses the browser's File System Access API instead. Works the same way whether you use the canonical pattern or this integration.

1. `bun dev`
2. Open `http://localhost:4321/admin/` in **Chrome, Edge, Brave, Arc**, or any Chromium-based browser (Firefox/Safari don't support the API)
3. Click **Work with Local Repository**
4. In the native folder picker, pick the **project root** (the directory containing `astro.config.mjs`)
5. Grant read/write permission when prompted
6. Edit content — Sveltia writes markdown files directly; Astro HMR picks them up
7. `git status` shows your edits; commit via your normal git client

**No auth, no proxy, no tokens needed.** The `backend` block in the config is ignored in local-repository mode.

## Common pitfalls

1. **`sveltiaLoader("typo")`** — TypeScript catches it, build fails fast with a clear error. The injected types in `.astro/types.d.ts` are a literal-string union over the collection names you defined. Check `astro check` if the error isn't obvious.
2. **`image()` helper returning undefined in global-bucket mode** — absolute paths don't resolve. Switch to page-bundle or use `z.string()` + `<img>`.
3. **Editing in Firefox/Safari silently fails** — File System Access API is Chromium-only. Use Chrome/Edge/Brave/Arc.
4. **Changed `astro.config.mjs`, CMS still shows old collections** — stop and restart `bun dev`. The virtual module is generated at config-time, not HMR-aware for the Sveltia config block.
5. **Collection in `astro.config.mjs` but not imported into `src/content.config.ts`** — the CMS shows it and lets authors write entries, but `getCollection()` returns nothing because Astro doesn't know about it. Always pair the config entry with a `defineCollection({ loader: sveltiaLoader(...) })` call.
6. **`bun install` warns about `typescript@6.0.2` peer dep** — the loader's deps reference TS slightly differently. Harmless; our TS version is compatible with what's actually needed.
7. **Dev server boots but `/admin` 404s** — you forgot to add the integration to `integrations: [...]`. Re-check `astro.config.mjs`.
8. **Authors see custom validation not firing** — they're seeing Sveltia's form-level validation, which is separate from Zod. Zod runs at build time. Tell authors that Sveltia's preview may accept values the build will reject.

## Fallback: canonical `public/admin/` pattern

`astro-loader-sveltia-cms` is at v0.1.x — early software, single maintainer. If it goes unmaintained or breaks on a future Astro release, the fallback is the canonical pattern that every Decap/Sveltia project has used for years:

1. Remove the `sveltia()` integration and the `astro-loader-sveltia-cms` dep
2. Create `public/admin/index.html` with a CDN script tag:
   ```html
   <!doctype html>
   <html lang="en">
     <head>
       <meta charset="utf-8" />
       <meta name="robots" content="noindex" />
       <title>Content</title>
     </head>
     <body>
       <script src="https://unpkg.com/@sveltia/cms/dist/sveltia-cms.js"></script>
     </body>
   </html>
   ```
3. Create `public/admin/config.yml` with the same fields, in YAML form (same widgets, same structure)
4. In `src/content.config.ts`, replace `sveltiaLoader()` with Astro's native `glob()` loader and hand-write Zod schemas to match the widgets

This migration takes ~30 minutes per project of real size. Worth knowing it exists; not worth pre-empting.

## Handover for production

When the client site is ready to ship and non-technical editors need to log in, invoke the **`sveltia-cms-auth`** skill. It covers the four auth paths (PAT, Cloudflare Worker, Netlify built-in, PKCE) and walks through the per-client `base_url` wiring inside `astro.config.mjs`.

When the client wants more than basic collections — "make the homepage copy editable", "let me change the brand colors", "I need to swap hero images per page" — invoke the **`sveltia-cms-design`** skill, which covers the layered model for turning this template into a fully CMS-driven surface.
