---
name: astro-font-api
description: Use when adding, configuring, or debugging web fonts in this Astro project. Covers the built-in astro:assets Font API — Google, Fontsource, local files, Bunny, Adobe providers — plus wiring fonts to Tailwind v4 theme tokens. Invoke whenever the user says "add a font", "change the typeface", "load a Google font", "set up a custom font", or is debugging FOUT/FOIT, preload, or missing font-family issues.
---

# Astro Font API

Astro ships a first-party, type-safe Fonts API that downloads, subsets, preloads, and generates fallback metrics automatically. **Use this instead of `<link>` to Google Fonts, `@fontsource/*` imports, or manual `@font-face`.** Configure once in `astro.config.mjs`, consume via `<Font />` in layouts.

## Font entry shape

Each entry in `astro.config.mjs` → `fonts: [...]`:

| Field         | Required | Notes                                                           |
| ------------- | -------- | --------------------------------------------------------------- |
| `name`        | yes      | Display name, e.g. `"Inter"`.                                   |
| `cssVariable` | yes      | Exposed custom property, e.g. `"--font-sans"`.                  |
| `provider`    | yes      | One of `fontProviders.*`.                                       |
| `weights`     | no       | Numeric weights. Defaults to `[400]`.                           |
| `styles`      | no       | Defaults to `["normal", "italic"]`.                             |
| `subsets`     | no       | Defaults to `["latin"]`.                                        |
| `fallbacks`   | no       | Stack used for metric-adjusted fallback, e.g. `["sans-serif"]`. |

Repeat the same font with different weight/style combos — Astro merges them and downloads only what you use.

## Providers

### Google

```js
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

Self-hosted at build time — no runtime request to `fonts.googleapis.com`.

### Fontsource

```js
{
  name: "JetBrains Mono",
  cssVariable: "--font-mono",
  provider: fontProviders.fontsource(),
  weights: [400, 700],
  fallbacks: ["ui-monospace", "monospace"],
}
```

For fonts on npm but not Google Fonts.

### Local (client-supplied)

```js
{
  name: "Client Display",
  cssVariable: "--font-display",
  provider: fontProviders.local(),
  options: {
    variants: [
      { src: ["./src/assets/fonts/ClientDisplay-Regular.woff2"], weight: "400", style: "normal" },
      { src: ["./src/assets/fonts/ClientDisplay-Bold.woff2"],    weight: "700", style: "normal" },
    ],
  },
  fallbacks: ["Georgia", "serif"],
}
```

**Convention:** drop client fonts in `src/assets/fonts/`, not `public/`, so the build pipeline fingerprints them.

### Bunny

```js
{ name: "Figtree", cssVariable: "--font-sans", provider: fontProviders.bunny(), weights: [400, 600] }
```

GDPR-friendly Google Fonts mirror — same catalogue, different CDN.

### Adobe (Typekit)

```js
{ name: "Proxima Nova", cssVariable: "--font-sans", provider: fontProviders.adobe({ id: "YOUR_KIT_ID" }), weights: [400, 700] }
```

Requires a kit ID. Can't be self-hosted outside the licensed site.

## Consuming

Render `<Font />` in your base layout's `<head>`, once per `cssVariable`:

```astro
---
import { Font } from "astro:assets";
---
<head>
  <Font cssVariable="--font-sans" preload />
  <Font cssVariable="--font-display" preload />
  <Font cssVariable="--font-mono" />
</head>
```

`preload` only for above-the-fold fonts — 3+ preloads usually hurts LCP.

Reference the variable anywhere:

```css
body { font-family: var(--font-sans); }
h1 { font-family: var(--font-display); }
code { font-family: var(--font-mono); }
```

## Tailwind v4 wiring

This template uses Tailwind v4 with a CSS-first `@theme` block in `src/styles/global.css`. Bind each font variable via `@theme inline`:

```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --font-mono: var(--font-mono);
}
```

**Why `inline`:** plain `@theme` copies the value literally → infinite recursion. `@theme inline` emits `font-family: var(--font-sans)` verbatim so Astro's injected `@font-face` fills in the file. After this, `font-sans` / `font-display` utilities Just Work in both `.astro` and React islands.

## Fallback metrics (CLS prevention)

`fallbacks[0]` isn't cosmetic — Astro computes a metric-adjusted `@font-face` rule matching the web font's x-height and advance width, dramatically reducing layout shift. Always include a sensible first entry:

- Sans body: `["system-ui", "sans-serif"]`
- Serif editorial: `["Georgia", "serif"]`
- Monospace: `["ui-monospace", "monospace"]`

## Pitfalls

1. **Config without `<Font />`** — the component injects the `@font-face` rules; config alone emits nothing.
2. **Preloading everything** — hurts LCP. Only above-the-fold.
3. **Subset mismatch** — cyrillic/accented glyphs fall back silently if the subset isn't loaded.
4. **Duplicate `cssVariable`** — each entry must be unique (`--font-sans`, `--font-sans-alt`…).
5. **Local fonts in `public/`** — works but skips hashing. Use `src/assets/fonts/`.
6. **`@theme` without `inline`** — infinite var recursion when aliasing to itself.

## Quick workflow: "add a Google font called X"

1. Add an entry to `fonts: [...]` in `astro.config.mjs` using `fontProviders.google()`.
2. Pick a semantic `cssVariable` (`--font-sans`, `--font-display`, `--font-mono`).
3. Add `<Font cssVariable="..." />` to `src/layouts/Layout.astro` head (add `preload` only above-the-fold).
4. Alias in `src/styles/global.css` under `@theme inline`.
5. Restart `bun dev` (font config isn't picked up by HMR).
6. Verify in DevTools → Network that the file is served from your origin, not `fonts.gstatic.com`.
