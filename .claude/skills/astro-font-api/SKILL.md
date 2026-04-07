---
name: astro-font-api
description: Use when adding, configuring, or debugging web fonts in this Astro project. Covers the built-in astro:assets Font API — Google, Fontsource, local files, Bunny, Adobe providers — plus wiring fonts to Tailwind v4 theme tokens. Invoke whenever the user says "add a font", "change the typeface", "load a Google font", "set up a custom font", or is debugging FOUT/FOIT, preload, or missing font-family issues.
---

# Astro Font API

Astro ships with a first-party, type-safe Fonts API that handles downloading, subsetting, preloading, and fallback metrics automatically. **Use this instead of `<link>` tags to Google Fonts, `@fontsource/*` imports, or manual `@font-face` declarations.** The API is configured once in `astro.config.mjs` and consumed via a `<Font />` component in layouts.

## When to reach for this skill

- Adding a new typeface to the project
- Changing weights, styles, or subsets of an existing font
- Loading a local custom font (client-supplied `.woff2`)
- Debugging FOUT/FOIT, layout shift, or missing preload tags
- Wiring an Astro-managed font into Tailwind v4's `@theme` tokens

## Core model

A font entry is an object in `astro.config.mjs` → `fonts: [...]`. Each entry has:

| Field         | Required | Notes                                                                |
| ------------- | -------- | -------------------------------------------------------------------- |
| `name`        | yes      | Display name, e.g. `"Inter"`, `"Space Grotesk"`.                     |
| `cssVariable` | yes      | The CSS custom property Astro exposes, e.g. `"--font-sans"`.         |
| `provider`    | yes      | One of the `fontProviders.*` functions.                              |
| `weights`     | no       | Array of numeric weights. Defaults to `[400]`.                       |
| `styles`      | no       | `["normal", "italic"]`. Defaults to `["normal", "italic"]`.          |
| `subsets`     | no       | e.g. `["latin", "latin-ext"]`. Defaults to `["latin"]`.              |
| `fallbacks`   | no       | CSS fallback stack used for adjusted metrics, e.g. `["sans-serif"]`. |

Specify the same font multiple times with different weight/style combos and Astro merges them, downloading only the files you actually need.

## Providers

### Google Fonts

```js
// astro.config.mjs
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  fonts: [
    {
      name: "Inter",
      cssVariable: "--font-sans",
      provider: fontProviders.google(),
      weights: [400, 500, 600, 700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["system-ui", "sans-serif"],
    },
  ],
});
```

Astro downloads the files at build time and self-hosts them — no runtime request to `fonts.googleapis.com`, which is better for privacy and performance.

### Fontsource

```js
{
  name: "JetBrains Mono",
  cssVariable: "--font-mono",
  provider: fontProviders.fontsource(),
  weights: [400, 700],
  subsets: ["latin"],
  fallbacks: ["ui-monospace", "monospace"],
}
```

Use Fontsource for fonts not on Google Fonts but available on npm.

### Local files (client-supplied typefaces)

```js
{
  name: "Client Display",
  cssVariable: "--font-display",
  provider: fontProviders.local(),
  options: {
    variants: [
      {
        src: ["./src/assets/fonts/ClientDisplay-Regular.woff2"],
        weight: "400",
        style: "normal",
      },
      {
        src: ["./src/assets/fonts/ClientDisplay-Bold.woff2"],
        weight: "700",
        style: "normal",
      },
    ],
  },
  fallbacks: ["Georgia", "serif"],
}
```

**Convention for this template:** drop client fonts into `src/assets/fonts/` so they sit next to other owned assets rather than in `public/`. Astro's Font API will fingerprint and copy them into the build output automatically.

### Bunny Fonts

```js
{
  name: "Figtree",
  cssVariable: "--font-sans",
  provider: fontProviders.bunny(),
  weights: [400, 600],
}
```

Bunny is a GDPR-friendly Google Fonts mirror. Same catalogue, different CDN.

### Adobe Fonts (Typekit)

```js
{
  name: "Proxima Nova",
  cssVariable: "--font-sans",
  provider: fontProviders.adobe({ id: "YOUR_KIT_ID" }),
  weights: [400, 700],
}
```

Requires an Adobe Fonts kit ID. Respect the license — Adobe kits cannot be self-hosted outside the paid-for sites.

## Consuming fonts in pages

Step 1 — render the `<Font />` component in your base layout's `<head>`, once per `cssVariable`:

```astro
---
// src/layouts/Layout.astro
import { Font } from "astro:assets";
---
<html lang="en">
  <head>
    <Font cssVariable="--font-sans" preload />
    <Font cssVariable="--font-display" preload />
    <Font cssVariable="--font-mono" />
  </head>
  <body><slot /></body>
</html>
```

`preload` adds a `<link rel="preload">` tag — use it for fonts that appear above the fold. Don't preload every font; preloading too many hurts LCP.

Step 2 — reference the CSS variable anywhere:

```astro
<style>
  body { font-family: var(--font-sans); }
  h1, h2, h3 { font-family: var(--font-display); }
  code { font-family: var(--font-mono); }
</style>
```

## Wiring into Tailwind v4 (this template)

This template uses Tailwind v4 with a CSS-first `@theme` block in `src/styles/global.css`. Bind the Astro-managed CSS variable through `@theme inline` so utility classes like `font-sans` / `font-display` resolve to the actual font at runtime:

```css
/* src/styles/global.css */
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --font-mono: var(--font-mono);
}
```

**Why `@theme inline` and not plain `@theme`:** plain `@theme` copies the value literally, so if you wrote `--font-sans: var(--font-sans)` you'd get infinite recursion. `@theme inline` tells Tailwind to treat the value as a reference that resolves at use-time — meaning the `font-sans` utility class emits `font-family: var(--font-sans)` verbatim, and Astro's injected `@font-face` rule fills in the actual file.

After that, `className="font-display"` in React islands and `class="font-display"` in `.astro` files Just Work.

## Fallback metrics (preventing CLS)

The `fallbacks` array isn't just cosmetic — Astro uses the first entry to compute **font-metric-adjusted fallback `@font-face` rules** that match the web font's x-height and advance width. This dramatically reduces layout shift when the real font finishes loading. Always include at least one sensible fallback:

- Sans body copy: `["system-ui", "sans-serif"]`
- Serif editorial: `["Georgia", "serif"]`
- Monospace code: `["ui-monospace", "monospace"]`

## Common pitfalls

1. **Forgot the `<Font />` component** — config alone doesn't emit CSS. The `<Font />` component injects the `@font-face` rules and (optionally) preload tags into the document head.
2. **Preloading everything** — only preload fonts used above the fold. 3+ preloads usually hurt LCP.
3. **Subsetting mismatch** — if copy contains cyrillic/accented characters and you only loaded `["latin"]`, glyphs fall back. Add the relevant subset.
4. **Multiple variable fonts claiming the same `cssVariable`** — each entry must have a unique `cssVariable`. Use `--font-sans`, `--font-sans-alt`, etc.
5. **Local fonts in `public/`** — works but skips Astro's hashing/optimization. Prefer `src/assets/fonts/` so the build pipeline owns them.
6. **Tailwind v4 `@theme` without `inline`** — causes infinite var recursion. Always use `@theme inline` when aliasing a CSS variable to itself.

## Quick workflow: "add a Google font called X"

1. Open `astro.config.mjs`, add an entry to `fonts: [...]` using `fontProviders.google()`.
2. Pick a `cssVariable` name that matches the token's semantic role (`--font-sans`, `--font-display`, `--font-mono`).
3. Add `<Font cssVariable="..." preload />` to `src/layouts/Layout.astro` head (add `preload` only for above-the-fold fonts).
4. In `src/styles/global.css`, alias the Tailwind theme token via `@theme inline`.
5. Restart `bun run dev` (Astro picks up font config on server restart, not HMR).
6. Verify in DevTools → Network that the font file is served from your own origin, not `fonts.gstatic.com`.
