---
name: sveltia-cms-design
description: Use when expanding Sveltia CMS beyond basic content collections to make a site fully client-editable — component copy, image slots, navigation, design tokens (colors/spacing/typography), or layout variants. Covers the layered model (collections → singletons → component slots → image slots → tokens) and concrete patterns for each layer in this Astro template. Triggers "make this editable", "client should be able to change [X]", "CMS-driven design", "expose this to the CMS", "design tokens via CMS", "component-level content binding", "let the client change colors", "editable hero", "editable footer", "editable nav".
---

# Sveltia CMS — CMS-driven design

Goal: progress this template from "CMS edits markdown pages" to **"every written word, every image, every style token is editable in `/admin/` without touching code."** The core `sveltia-cms` skill handles Layer 1 (content collections). This skill covers Layers 2-5: making the rest of the site editable.

Read the core `sveltia-cms` skill first if you're not familiar with how `astro.config.mjs` single-source config and `sveltiaLoader()` work in this project. Every pattern here assumes that architecture.

## The layering model

Layers are **additive and independent.** Start at the layer the client actually needs, not at the top. Adding Layer 2 doesn't require Layer 3; every layer is valuable on its own. Don't build Layer 5 infrastructure speculatively.

| Layer                  | What becomes editable                                   | Complexity       | Typical trigger                              |
| ---------------------- | ------------------------------------------------------- | ---------------- | -------------------------------------------- |
| **1. Collections**     | Pages, blog posts, case studies                         | Low (core skill) | "Clients need to add pages"                  |
| **2. Singletons**      | Site settings (contact, social, footer copy)            | Low              | "Change the footer email without deploying"  |
| **3. Component slots** | Hero, features grid, testimonials, CTA blocks           | Medium           | "Edit the homepage without code"             |
| **4. Image slots**     | Per-component optimized images with responsive variants | Medium           | "Swap the hero image from the CMS"           |
| **5. Design tokens**   | Brand colors, spacing scale, type ramp                  | High             | "Let the client rebrand without a developer" |

## Layer 2 — Singleton "site settings"

For fields that exist **once per site** (contact email, social handles, copyright line, header CTA text), use Sveltia's `files` collection type. One collection, one file, lots of fields.

**`astro.config.mjs`:**

```js
collections: [
  {
    name: "settings",
    label: "Site Settings",
    delete: false,          // can't delete the singleton
    editor: { preview: false },
    files: [
      {
        name: "site",
        label: "Site",
        file: "src/content/settings/site.json",
        fields: [
          { label: "Site title",  name: "siteTitle",   widget: "string" },
          { label: "Tagline",     name: "tagline",     widget: "string" },
          { label: "Contact email", name: "email",     widget: "string" },
          { label: "Copyright",   name: "copyright",   widget: "string" },
          {
            label: "Social links",
            name: "social",
            widget: "object",
            fields: [
              { label: "Twitter",   name: "twitter",   widget: "string", required: false },
              { label: "Instagram", name: "instagram", widget: "string", required: false },
              { label: "LinkedIn",  name: "linkedin",  widget: "string", required: false },
            ],
          },
        ],
      },
    ],
  },
],
```

**`src/content.config.ts`:**

```ts
import { defineCollection } from "astro:content";
import { sveltiaLoader } from "astro-loader-sveltia-cms/loader";

const settings = defineCollection({ loader: sveltiaLoader("settings") });

export const collections = { settings };
```

**Consume anywhere:**

```astro
---
import { getEntry } from "astro:content";
const site = await getEntry("settings", "site");
---
<footer>
  <p>{site.data.copyright}</p>
  <a href={`mailto:${site.data.email}`}>{site.data.email}</a>
</footer>
```

**Why it's low-complexity:** same loader, same Zod auto-generation, one entry per field group. The `delete: false` + `create: false` (implicit from `files:`) prevents the client from accidentally deleting the only entry.

## Layer 3 — Component slots via singleton collections

Each editable component gets its **own** single-file collection. The component reads its own content at build time from a fixed path.

Example: editable hero section.

**`astro.config.mjs`:**

```js
{
  name: "blocks",
  label: "Homepage Blocks",
  delete: false,
  files: [
    {
      name: "hero",
      label: "Hero section",
      file: "src/content/blocks/hero.json",
      fields: [
        { label: "Eyebrow", name: "eyebrow", widget: "string" },
        { label: "Heading", name: "heading", widget: "string" },
        { label: "Body",    name: "body",    widget: "text" },
        { label: "Primary CTA label", name: "ctaLabel", widget: "string" },
        { label: "Primary CTA href",  name: "ctaHref",  widget: "string" },
      ],
    },
    // Add more block entries (features, testimonials, cta) as they're needed
  ],
},
```

**`src/components/Hero.astro`:**

```astro
---
import { getEntry } from "astro:content";
const hero = await getEntry("blocks", "hero");
---
<section class="mx-auto max-w-3xl py-24 text-center">
  <p class="text-sm uppercase tracking-widest text-muted">{hero.data.eyebrow}</p>
  <h1 class="mt-3 text-5xl font-semibold tracking-tight text-ink">
    {hero.data.heading}
  </h1>
  <p class="mt-6 text-lg text-muted">{hero.data.body}</p>
  <a
    href={hero.data.ctaHref}
    class="mt-8 inline-flex rounded-md bg-ink px-5 py-3 text-surface"
  >
    {hero.data.ctaLabel}
  </a>
</section>
```

**Pattern rules:**

- One file per component, one component per file. Don't put "hero" and "footer" in the same file — it makes the CMS UI confusing and forces recompile on any change.
- Use the component's name as the entry name. `hero.json`, `footer.json`, `cta-band.json`. Predictable paths = easy mental model.
- Default values in the widget definitions (`default: "Welcome"`) make the initial form pre-filled; authors see what the current state is before they start editing.
- Keep the Astro component **dumb**: it reads its own entry, renders. If you find yourself passing data in via props _and_ reading from the CMS, pick one.

**Scaling:** when you have 10+ blocks, consider promoting to a real collection with a single folder of entries. Layer 3 is fine up to ~15 singletons.

## Layer 4 — Image slots (optimized)

Images are where this gets spicy. You want:

- Editors can upload/swap images from the CMS
- Astro optimizes them (hash, WebP/AVIF, responsive `srcset`, lazy loading)
- Paths that survive both the CMS write and the build pipeline

The page-bundle pattern (from the core skill) is the answer when the image belongs to a specific entry. For **component-level** image slots (hero image, about page portrait, etc.), use page-bundle on the component singleton:

**`astro.config.mjs`:**

```js
{
  name: "blocks",
  files: [
    {
      name: "hero",
      label: "Hero section",
      file: "src/content/blocks/hero/index.json",
      media_folder: "",      // co-locate with index.json
      public_folder: "",
      fields: [
        { label: "Heading",       name: "heading", widget: "string" },
        { label: "Background image", name: "background", widget: "image" },
      ],
    },
  ],
},
```

Resulting structure:

```
src/content/blocks/hero/
├── index.json         # { "heading": "...", "background": "./sunset.jpg" }
└── sunset.jpg         # Sveltia uploads land here
```

The auto-generated Zod uses `image()` for the `background` field, so `./sunset.jpg` becomes an `ImageMetadata` object ready for `<Image />`:

```astro
---
import { Image } from "astro:assets";
import { getEntry } from "astro:content";
const hero = await getEntry("blocks", "hero");
---
<section>
  <Image
    src={hero.data.background}
    alt=""
    widths={[640, 960, 1280, 1920]}
    sizes="100vw"
    class="h-screen w-full object-cover"
  />
  <h1>{hero.data.heading}</h1>
</section>
```

**Why this works:** the loader auto-generates `image()` for image widgets when the collection is configured with page-bundle paths. You get the full Astro asset pipeline — hash, format conversion, responsive variants, zero runtime cost — and the editor sees a file picker, not a URL field.

## Layer 5 — Design tokens via CMS

This is the "rebrand without a developer" layer. Tread carefully — the runtime vs build-time trade-off is real.

### Two approaches

**Approach A: Build-time tokens (recommended for most clients)**

The CMS writes a JSON file with the brand colors, spacing scale, and type ramp. A small Astro integration or Vite plugin reads it at build time and generates `src/styles/theme-generated.css`, which `global.css` imports into `@theme inline`.

- **Pros:** zero runtime cost, works with static hosting, integrates with Tailwind 4's `@theme inline` pattern
- **Cons:** every token change requires a rebuild + redeploy (Cloudflare Pages / Netlify / Vercel auto-rebuild on git push, so this is usually fine)

**Approach B: Runtime tokens**

The CMS writes the tokens to a JSON file; a small client-side script reads it and applies CSS custom properties on page load.

- **Pros:** instant token changes, live preview works
- **Cons:** FOUC risk, requires JS to theme the page, skips static optimization, duplicates the token source

For nearly every client marketing site, **Approach A is the right answer.** Runtime tokens are for dashboards and editor tools where instant preview is a core feature.

### Approach A in detail

**1. Define the tokens collection in `astro.config.mjs`:**

```js
{
  name: "theme",
  label: "Theme",
  delete: false,
  files: [
    {
      name: "tokens",
      label: "Design tokens",
      file: "src/content/theme/tokens.json",
      fields: [
        {
          label: "Colors",
          name: "colors",
          widget: "object",
          fields: [
            { label: "Surface", name: "surface", widget: "color" },
            { label: "Ink",     name: "ink",     widget: "color" },
            { label: "Muted",   name: "muted",   widget: "color" },
            { label: "Accent",  name: "accent",  widget: "color" },
          ],
        },
        {
          label: "Typography",
          name: "typography",
          widget: "object",
          fields: [
            { label: "Sans font family",    name: "fontSans",    widget: "string" },
            { label: "Display font family", name: "fontDisplay", widget: "string" },
          ],
        },
      ],
    },
  ],
},
```

**2. Write a small build script that reads `src/content/theme/tokens.json` and emits CSS.** Options:

- Run it as an Astro integration hook (`astro:build:start` reads the JSON, writes `src/styles/theme-generated.css` before Vite picks it up)
- Or a tiny `scripts/build-tokens.ts` run via `bun run build-tokens && bun build` in the `build` npm script
- Or a Vite plugin that generates the file in the `buildStart` hook

Example integration:

```js
// integrations/theme-tokens.js
import { readFileSync, writeFileSync } from "node:fs";

export default function themeTokens() {
  return {
    name: "theme-tokens",
    hooks: {
      "astro:config:setup": () => {
        const tokens = JSON.parse(readFileSync("src/content/theme/tokens.json", "utf8"));
        const css = `@theme inline {
  --color-surface: ${tokens.colors.surface};
  --color-ink:     ${tokens.colors.ink};
  --color-muted:   ${tokens.colors.muted};
  --color-accent:  ${tokens.colors.accent};
  --font-sans:     ${tokens.typography.fontSans};
  --font-display:  ${tokens.typography.fontDisplay};
}`;
        writeFileSync("src/styles/theme-generated.css", css);
      },
    },
  };
}
```

**3. Import the generated file from `src/styles/global.css`:**

```css
@import "tailwindcss";
@import "./theme-generated.css";

/* Remove the inline @theme block — it now lives in theme-generated.css */
```

**4. Add `src/styles/theme-generated.css` to `.gitignore`** — it's build output, not source. Seed a committed version with the template defaults so fresh clones work.

### Pitfalls at Layer 5

- **The generated file must exist at dev-server startup** — if your integration only writes on `astro:build:start`, dev fails. Run it on `astro:config:setup` (as above) or ship a committed default.
- **Token changes don't HMR cleanly** — CSS custom properties inside `@theme inline` require a dev-server restart when the generated file changes. Acceptable for now; monitor Tailwind v5 for better live-token support.
- **Sveltia's `color` widget returns `#rrggbb` hex by default** — if your tokens are `oklch()` (as the template baseline uses), either add a conversion step in the build script or switch the baseline to hex. Hex is simpler for CMS editing.
- **Clients will break their own color contrast** — add a Sveltia `hint:` text on each color field pointing at a contrast checker, or ship a lint step in the build that rejects tokens that fail WCAG AA against each other.

## Checklist when adding a new editable surface

1. **Decide the layer.** Use the table above. Don't jump to Layer 5 when Layer 2 solves the real ask.
2. **Add the widget** in `astro.config.mjs`. Use clear labels and `hint:` text — authors see these, not your variable names.
3. **Set a default value** that matches the current hardcoded state so the site keeps rendering the same way until the client actually edits something.
4. **Register the collection** in `src/content.config.ts` if it's new.
5. **Consume in the component/layout** via `getEntry()` or `getCollection()`.
6. **Remove the hardcoded value** from the component — single source of truth, don't leave a copy behind.
7. **Test in `/admin/`**: load the admin page, confirm the field renders, change it, save, confirm the change appears on reload.
8. **Run `bun run check`** — schema mismatches surface here.

## Scope discipline (the important one)

The ambition is "every written piece, every image, every style token editable via the CMS." **That is the end state, not the starting point.** For any given client:

- Layer 1 is almost always worth doing on day one
- Layer 2 is worth doing if the client has asked to edit _anything_ global (contact info, footer copy, social links)
- Layer 3 is worth doing per-component when the client has asked for that specific component to be editable
- Layer 4 follows naturally from Layer 3 when a component has images
- **Layer 5 is almost never worth doing on day one.** Brand changes are rare and disruptive; a rebuild-on-git-push pipeline handles token changes fast enough that a full Layer 5 system is usually over-engineering. Add it only when the client has explicitly said "I want to change our brand colors myself."

Don't turn every site into a fully flexible visual editor. That path leads to Webflow, not Astro — and if the client needed Webflow, they would have picked Webflow.
