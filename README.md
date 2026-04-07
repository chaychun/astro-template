# Astro Template

Personal starter for client website work — marketing sites, creative dev, landing pages.

## Stack

- **Astro 6** + TypeScript (strict)
- **Tailwind 4** via `@tailwindcss/vite` — tokens in `src/styles/global.css` under `@theme` (no `tailwind.config.js`)
- **React 19** islands, on demand
- **Motion** (`motion.dev`) — `motion/react` in islands, `motion` for vanilla
- **`cn` + `cva`** via `clsx` + `tailwind-merge` + `class-variance-authority`
- **oxlint + oxfmt**
- **`@astrojs/sitemap`** + `robots.txt`

## Commands

| Command            | Action                                          |
| ------------------ | ----------------------------------------------- |
| `bun install`      | Install dependencies                            |
| `bun dev`          | Start dev server at `localhost:4321`            |
| `bun build`        | Build to `./dist/`                              |
| `bun preview`      | Preview the production build locally            |
| `bun lint`         | Run oxlint                                      |
| `bun lint:fix`     | Run oxlint with autofix                         |
| `bun format`       | Format with oxfmt                               |
| `bun format:check` | Check formatting without writing                |
| `bun check`        | `astro check` + `oxlint` + `oxfmt --check` (CI) |

## Project layout

```
src/
├── components/        # .astro and .tsx (React islands)
│   ├── BaseHead.astro # Shared <head>: SEO, OG, favicon, global CSS
│   └── FadeIn.tsx     # Reference Motion island
├── layouts/
│   └── Layout.astro   # Root <html>/<body> shell
├── lib/
│   └── cn.ts          # Tailwind-aware className merger
├── pages/
│   └── index.astro    # File-based routes
└── styles/
    └── global.css     # Tailwind import + @theme tokens
```

Path alias: `@/*` → `src/*`.

## Per-client setup

1. Update `package.json` `name` and `astro.config.mjs` `site`.
2. Replace `@theme` tokens in `src/styles/global.css` with the client's palette and typeface.
3. Add fonts via the Astro Font API — ask Claude to "add the X font" (see `.claude/skills/astro-font-api/`).
4. Update `public/robots.txt` and `public/favicon.svg`.
5. Add `public/og-default.png` (referenced by `BaseHead.astro`).

## Editor setup (Zed)

`.zed/settings.json` configures oxfmt as the external formatter (format-on-save), the Astro LSP, and Tailwind IntelliSense inside `cn(...)` / `cva(...)` calls.

Install via Zed's extensions panel:

- **Astro** — `.astro` syntax + LSP
- **Oxc** — oxlint diagnostics (LSP bundled)

`oxfmt` runs via project-local `bun x oxfmt`, so every collaborator uses the version pinned in `bun.lock`.

## Linting & formatting

- `.oxlintrc.json`: `correctness` + `suspicious` as errors, `perf` as warnings.
- `.oxfmtrc.json`: defaults + ignore list. oxfmt is 0.x — expect rough edges on exotic JSX.
- oxlint only handles JS/TS/JSX/TSX. `.astro` frontmatter is type-checked by `astro check`.

## Claude Code skills

`.claude/skills/` holds project-specific skills auto-loaded by Claude:

- **`astro-font-api`** — add or debug fonts (all five providers + Tailwind v4 wiring).

## Future (deferred)

- **CMS** — TBD (Sanity / Contentful / Decap / Storyblok)
- More skills: deployment, image optimization, content collections, view transitions
