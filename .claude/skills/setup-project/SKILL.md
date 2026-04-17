---
name: setup-project
description: Use ONCE right after cloning this template via `astro --template` to bootstrap a new client project. Sets agent context (CLAUDE.md), updates per-client settings (package name, site URL, robots), and enables or strips the Sveltia CMS layer. Trigger when the user runs `/setup-project [description]` or says "set up this project / new client / bootstrap from template".
---

# Setup Project

One-shot bootstrap after `npm create astro@latest -- --template <repo>`. Adapts the generic template to a specific client website.

## What `create-astro` already did

`create-astro` uses `@bluwy/giget-core` to fetch the template as a tarball (no `.git` history copied). It then:

- Sets `package.json` `name` to the project directory name and drops `"private"`.
- Deletes `CHANGELOG.md` and `.codesandbox` if present.
- Strips `<!-- ASTRO:REMOVE:START --> … <!-- ASTRO:REMOVE:END -->` blocks from `README.md` and rewrites `npm`/`npm run` to the chosen package manager.
- Optionally runs `git init` + `git add -A` + `git commit -m "Initial commit from Astro" --author="houston[bot] …"`. The first commit author is the Astro bot, not the user.

So: hidden dirs (`.claude/`, `.zed/`, `.vscode/`) **are** in the clone. `.git` is fresh, only the bot commit. No template git history exists.

## When to run

- Fresh clone, no client-specific edits beyond what `create-astro` did automatically.
- `astro.config.mjs` still says `site: "https://example.com"` and `CLAUDE.md` does not exist.
- If `CLAUDE.md` already exists with content, **stop and confirm** — likely already bootstrapped.

## Inputs

The user invokes `/setup-project <free-form description>`. The description is the seed. Extract:

1. **Project name** — kebab-case, used as `package.json` `name`. Derive from client + site purpose if obvious.
2. **Production URL** — used as `site` in `astro.config.mjs` and in `robots.txt` sitemap line.
3. **CMS enabled?** — yes/no. Default: ask. If the description mentions "client-editable", "blog", "case studies", "marketing team updates", "non-technical edits", lean **yes**. If "landing page", "one-pager", "experiment", "prototype", lean **no**.
4. **CMS repo** (only if CMS yes) — `OWNER/REPO` for the GitHub backend, plus default branch (assume `main`).
5. **Short pitch** — 1-2 sentence summary of what the site is for. Goes into `CLAUDE.md`.

If any are missing or ambiguous, ask the user in a single batched question. Do **not** ask one at a time.

## Steps

Run in this order. Use `Edit` for surgical changes, not `Write` (preserve unrelated content).

### 1. `package.json`

`create-astro` already set `name` to the project directory name. Verify it matches the kebab-case name the user wants — if not, edit. Otherwise skip.

### 2. `astro.config.mjs`

- Replace `site: "https://example.com"` with the production URL.
- If CMS **disabled**:
  - Remove `import sveltia from "astro-loader-sveltia-cms";`.
  - Remove the `sveltia({ ... })` entry from `integrations`.
- If CMS **enabled**:
  - Replace `repo: "OWNER/REPO"` with the actual repo.
  - Update `branch` if not `main`.

### 3. `public/robots.txt`

- If it references the example domain or has a `Sitemap:` line, update it to the new production URL (`<site>/sitemap-index.xml`).

### 4. `CLAUDE.md` (root, create if missing)

High-level context for future agent sessions. Keep terse. Template:

```markdown
# <Project name>

<1-2 sentence pitch from the user's description.>

**Client**: <client name if known, else "TBD">
**Production URL**: <site>
**CMS**: <enabled (Sveltia, GitHub backend `OWNER/REPO`) | disabled>

## Stack

Astro 6 · TypeScript strict · Tailwind 4 (`@theme` tokens in `src/styles/global.css`) · React 19 islands · Motion · oxlint+oxfmt. Path alias `@/*` → `src/*`.

## Conventions

- Tailwind tokens live under `@theme` in `src/styles/global.css` — no `tailwind.config.js`.
- Use `cn()` from `src/lib/cn.ts` for class merging; `cva` for variants.
- React only as islands (`client:*` directive). Default to `.astro`.
- Run `bun check` before declaring work done (astro check + oxlint + oxfmt --check).
- Fonts: use the Astro Font API via the `astro-font-api` skill — never `<link>` to Google Fonts.

## Per-client TODO

- [ ] Replace `@theme` tokens in `src/styles/global.css` with the client palette/typeface.
- [ ] Add fonts via `astro-font-api` skill.
- [ ] Add `public/og-default.png` (referenced by `BaseHead.astro`).
- [ ] Replace `public/favicon.svg` and `public/favicon.ico`.
<!-- if CMS enabled: -->
- [ ] Define first collection in `astro.config.mjs` → `sveltia.config.collections` and register in `src/content.config.ts`. See `sveltia-cms` skill.
- [ ] Wire production CMS auth (`infra/sveltia-authenticator/README.md` + `sveltia-cms-auth` skill).
```

If `CLAUDE.md` already exists, **do not overwrite** — show the user the diff you'd apply and ask.

### 5. CMS strip (only if disabled)

Destructive — list the files first, get one explicit confirmation, then execute as a single batch:

- `bun remove astro-loader-sveltia-cms` (do not run `bun install` separately — `remove` updates lock).
- Delete:
  - `src/content/` (if empty or contains only loader-generated files)
  - `src/content.config.ts`
  - `src/assets/uploads/` (if empty)
  - `infra/sveltia-authenticator/`
  - `.claude/skills/sveltia-cms/`
  - `.claude/skills/sveltia-cms-design/`
  - `.claude/skills/sveltia-cms-auth/`
- Trim the README "CMS (Sveltia)" section and the Sveltia bullet from the Stack list.

If `src/content/` has user-authored files, **stop and ask** — they may have started authoring before running setup.

### 6. Dev-workflow gitignore (NOT delete)

The template carries author-side workflow files that the client repo should not inherit **in git**. Goal: keep them on the dev's local disk (so future Claude sessions still have skills, agent context, editor config) but stop tracking them so the committed history stays clean for client handoff.

**Mechanism**: append to `.gitignore` + `git rm --cached -r` for anything already tracked. **Do not `rm` from disk.**

**Default ignore list** (append to `.gitignore`, dedupe against existing entries):

```gitignore
# Local dev tooling — kept on disk, not tracked
CLAUDE.md
.claude/
.cursor/
.windsurf/
.aider*
*.local.json
*.local.yml
.env.local
```

`.zed/` — **ask** before adding. It pins oxfmt + Astro LSP via `bun x oxfmt`, which is useful for any collaborator (not just the template author). Default: leave tracked.

`.vscode/` — if present and contains only template-author personal settings, propose ignoring; if it has shared workspace settings (recommended extensions etc.), leave tracked. Show contents and ask.

After updating `.gitignore`, run a single batch:

```sh
git rm --cached -r --ignore-unmatch CLAUDE.md .claude .cursor .windsurf .aider* *.local.json *.local.yml .env.local
```

`--ignore-unmatch` makes missing entries a no-op (safe).

Confirm the list with the user once before running.

### 7. Report

Print at the end:

- Files edited (`astro.config.mjs`, `public/robots.txt`, `package.json` if changed).
- Files created (`CLAUDE.md`).
- Files deleted from disk (CMS strip group, only if CMS disabled).
- Files untracked + gitignored (dev-workflow group — note these are still on disk).
- Next manual steps (theme tokens, fonts, OG image, favicon — pull from the per-client TODO in `CLAUDE.md`).
- Suggest the user amend the existing "Initial commit from Astro" (`git commit --amend --reset-author -m "Initial commit: <project name>"`) **or** add a new commit on top. Do not run either automatically.

This skill file stays on disk under `.claude/skills/setup-project/` (now gitignored). It is one-shot — won't trigger again because `CLAUDE.md` exists. No self-deletion needed.

## Guardrails

- **Never** run `git commit`, `git push`, or `git commit --amend` automatically — only the user does that.
- **Never** `rm` files in the dev-workflow group. Use `git rm --cached` only. The user keeps everything on local disk.
- **Never** push, deploy, or touch shared infra.
- Destructive ops (CMS strip is the only one that touches disk) require one explicit confirmation. Batch with the gitignore confirmation into a single user prompt — do not ask twice.
- If `git status` shows uncommitted changes beyond the Astro bot's initial commit, refuse and ask the user to commit or stash first — they may have started authoring before running setup.
- Do not re-run if `CLAUDE.md` already exists with content — likely already bootstrapped.

## Note on `<!-- ASTRO:REMOVE -->` markers

`create-astro` strips `<!-- ASTRO:REMOVE:START --> … <!-- ASTRO:REMOVE:END -->` blocks from `README.md` automatically at clone time (template-author roadmap, dev-only notes). If you spot dev-only sections in `README.md` while running this skill, suggest the template author wrap them in those markers so future clones get them stripped for free — but do **not** edit the live README to add markers (this skill runs *after* `create-astro` already processed it).
