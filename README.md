# Astro Template

Personal starter for client website work — marketing sites, creative dev, landing pages.

## Stack

- **Astro v6** + TypeScript (strict)
- **Tailwind CSS v4** via `@tailwindcss/vite` (no `tailwind.config.js` — tokens live in `src/styles/global.css` under `@theme`)
- **React 19** as an island framework, on demand
- **Motion** (`motion.dev`, formerly Framer Motion) for animation — `motion/react` in islands, `motion` for vanilla JS
- **`cn` + `cva`** (`clsx` + `tailwind-merge` + `class-variance-authority`) for class composition
- **oxlint + oxfmt** for linting and formatting (Rust-based, ~50–100× faster than ESLint/Prettier)
- **`@astrojs/sitemap`** + `robots.txt` for SEO baseline

## Commands

| Command            | Action                                          |
| ------------------ | ----------------------------------------------- |
| `bun install`      | Install dependencies                            |
| `bun dev`          | Start dev server at `localhost:4321`            |
| `bun build`        | Build to `./dist/`                              |
| `bun preview`      | Preview the production build locally            |
| `bun lint`         | Run oxlint                                      |
| `bun lint:fix`     | Run oxlint with autofix                         |
| `bun format`       | Format the repo with oxfmt                      |
| `bun format:check` | Check formatting without writing                |
| `bun check`        | `astro check` + `oxlint` + `oxfmt --check` (CI) |

## Project layout

```
src/
├── components/        # .astro and .tsx components (React islands live here)
│   ├── BaseHead.astro # Shared <head>: SEO, OG, favicon, global CSS import
│   └── FadeIn.tsx     # Reference Motion island
├── layouts/
│   └── Layout.astro   # Root <html>/<body> shell
├── lib/
│   └── cn.ts          # Tailwind-aware className merger
├── pages/
│   └── index.astro    # Routes (file-based)
└── styles/
    └── global.css     # Tailwind import + @theme tokens
```

Path alias: `~/*` → `src/*` (configured in `tsconfig.json`).

## Per-client setup checklist

When starting a new client project from this template:

1. Update `package.json` `name` and `astro.config.mjs` `site`.
2. Replace tokens in `src/styles/global.css` (`@theme` block) with the client's brand palette and typeface.
3. Add fonts via the **Astro Font API** — see `.claude/skills/astro-font-api/SKILL.md` (Claude has a skill for this; ask it to "add the X font").
4. Update `public/robots.txt` and `public/favicon.svg`.
5. Add an `og-default.png` to `public/` (referenced by `BaseHead.astro`).

## Editor setup (Zed)

This template ships `.zed/settings.json` configured for:

- **oxfmt** as the external formatter for JS/TS/JSX/TSX/JSON, format-on-save enabled
- **Astro language server** for `.astro` files
- **Tailwind IntelliSense** that recognizes classes inside `cn(...)` and `cva(...)` calls

You'll need two extensions installed via Zed's extensions panel:

- **Astro** — `.astro` syntax + LSP
- **Oxc** — oxlint diagnostics surfaced inline (the LSP server is bundled with the extension)

`oxfmt` runs through the project-local install via `bun x oxfmt`, so every collaborator uses the version pinned in `bun.lock`.

## Linting & formatting notes

- oxlint config: `.oxlintrc.json` — categories `correctness` and `suspicious` are errors, `perf` is warnings, everything else off. Customize per project.
- oxfmt config: `.oxfmtrc.json` — defaults plus an ignore list. oxfmt is still 0.x; expect occasional rough edges around exotic JSX or template literal cases.
- oxlint does **not** lint `.astro` files (JS/TS/JSX/TSX only). Type errors in `.astro` frontmatter are caught by `astro check`.

## Claude Code skills

The `.claude/skills/` directory contains project-specific skills that Claude Code (and other Claude clients with skill support) auto-load when relevant:

- **`astro-font-api`** — invoked when adding/changing fonts. Covers all five providers (Google, Fontsource, local, Bunny, Adobe), the Tailwind v4 wiring, and common pitfalls.

Add more skills as the template grows: CMS integration, deployment, image pipeline, etc.

## Future setup (deferred)

- **CMS** — TBD (Sanity / Contentful / Decap / Storyblok depending on client needs)
- More skills: deployment, image optimization, content collections, view transitions choreography
