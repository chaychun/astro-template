---
name: sveltia-cms-auth
description: Use when wiring production authentication for Sveltia CMS so a non-technical client can log into /admin in a deployed site. Covers the four auth paths (Personal Access Token, Cloudflare Worker via sveltia-cms-auth, Netlify built-in OAuth, and PKCE), the decision tree for which to use, step-by-step setup for each, a per-client handover checklist, and troubleshooting. Triggers "deploy auth", "client can't log in", "add OAuth to CMS", "production auth", "admin login", "give the client access", "set up editor login", "CMS authentication".
---

# Sveltia CMS — Production auth

Local dev uses the File System Access API and needs no auth at all. **This skill is only for the deployed site**, when non-technical editors need to log in from their browser and edit content that gets committed to a git repo.

This template wires CMS via `astro-loader-sveltia-cms`, so the config (including `backend.base_url` for OAuth) lives in `astro.config.mjs` under `sveltia({ config: { backend: {...} } })`. All examples below assume that location.

## The four auth paths

| Option | Path                                             | Who it's for                                  | Infra required                      |
| ------ | ------------------------------------------------ | --------------------------------------------- | ----------------------------------- |
| **A**  | PAT ("Sign in with Token")                       | You, or a technical handover contact          | None                                |
| **B**  | OAuth via Cloudflare Worker (`sveltia-cms-auth`) | Non-technical editors on any host             | One shared Cloudflare Worker (free) |
| **C**  | Netlify built-in OAuth provider                  | Non-technical editors, site hosted on Netlify | None — comes with Netlify           |
| **D**  | PKCE                                             | Future: non-technical editors, zero backend   | Not yet available on GitHub         |

## Decision tree

```
Where is the client site deployed?
│
├── Netlify ────────────────────────▶ Option C (Netlify built-in OAuth)
│                                     Zero extra infra, done in 2 clicks.
│
├── Vercel / CF Pages / custom ─────▶ Option B (Cloudflare Worker)
│                                     Deploy sveltia-cms-auth once, reuse
│                                     across all client sites via
│                                     ALLOWED_DOMAINS wildcard.
│
├── Only you edit content ──────────▶ Option A (PAT)
│                                     No infra, but you carry the PAT.
│
└── Local dev only ────────────────▶  None — File System Access API
                                      already works with zero config.
```

**Rule of thumb:** if the client is non-technical and the site is not on Netlify, you want Option B. Every other answer is either a detail of that or an edge case.

## Option C — Netlify built-in OAuth (easiest)

If the site is deployed on Netlify, this is free, fast, and requires zero config changes to the template.

**Steps:**

1. Deploy the site to Netlify (normal git push → Netlify build).
2. In the Netlify dashboard: **Site → Integrations** (or the legacy **Identity** panel, depending on when the site was set up).
3. Enable the built-in **GitHub OAuth provider** for editor login. Netlify documents this under "Authentication providers" or "OAuth (Sveltia/Decap CMS)".
4. In `astro.config.mjs`, leave `backend.base_url` **unset** (the default behavior points at Netlify's provider):
   ```js
   sveltia({
     config: {
       backend: {
         name: "github",
         repo: "owner/client-repo",
         branch: "main",
         // no base_url — Netlify's provider is the default
       },
       // ...
     },
   }),
   ```
5. Client visits `/admin/`, clicks **Sign in with GitHub**, approves, they're in.

**Done.** No Worker, no OAuth app registration, no env vars.

**Caveat:** this ties the client site to Netlify. If you migrate hosts later, you lose the auth provider and have to switch to Option B.

## Option B — Cloudflare Worker (sveltia-cms-auth)

The flexible option. Works with any static host. Uses one upstream Worker (`sveltia/sveltia-cms-auth`) that you deploy **once** and reuse across every client site via the `ALLOWED_DOMAINS` wildcard list.

### One-time global setup (~15 minutes, reused forever)

Deployment runbook lives in `infra/sveltia-authenticator/README.md` at the repo root. Summary:

1. **Deploy the Worker:** visit [`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) and click the "Deploy to Cloudflare Workers" button. Copy the Worker URL (e.g. `https://sveltia-cms-auth.yourname.workers.dev`).
2. **Register one GitHub OAuth App** at `https://github.com/settings/developers`:
   - Authorization callback URL: `<WORKER_URL>/callback` (must be exact)
   - Copy the Client ID + Client Secret
3. **Set Cloudflare Worker env vars** in the Cloudflare dashboard:
   - `GITHUB_CLIENT_ID` — from step 2
   - `GITHUB_CLIENT_SECRET` — from step 2, click **Encrypt**
   - `ALLOWED_DOMAINS` — comma-separated wildcard list of client domains
4. **Save.** Cloudflare auto-redeploys.

### Per-client setup (~2 minutes per client)

For each new client site built from this template:

1. **Append the client's production domain** to `ALLOWED_DOMAINS` in the Cloudflare dashboard:
   ```
   clientone.com, *.clientone.com, clienttwo.com, *.clienttwo.com
   ```
   Save. Takes effect in seconds.
2. **Add `base_url` to the client's `astro.config.mjs`:**
   ```js
   sveltia({
     config: {
       backend: {
         name: "github",
         repo: "owner/client-repo",
         branch: "main",
         base_url: "https://sveltia-cms-auth.yourname.workers.dev", // NEW
       },
       // ...
     },
   }),
   ```
3. **Commit, push, deploy.** Client visits `/admin/`, clicks **Sign in with GitHub**, approves the OAuth app once (first time across all your client sites — GitHub remembers after), they're in.

### Why `ALLOWED_DOMAINS` is the key insight

The Worker's only access control is this env var. Every client site you build goes through the same Worker and the same OAuth app. You pay the ~15 minute setup cost **once**, then each new client is a one-line config change + a Cloudflare env var update. No per-client OAuth apps, no per-client Workers, no per-client secrets to manage.

### Trade-offs to be aware of

- **One secret, many clients.** If `GITHUB_CLIENT_SECRET` leaks, rotate it in GitHub + Cloudflare. All clients' logins break until you update. Usually a non-event, but if a client has high security requirements, deploy them their own Worker instead (same procedure, different Worker name).
- **`ALLOWED_DOMAINS` is the only gate.** A site not in this list can't abuse the Worker, but remember to remove ex-client domains when the relationship ends.
- **Cloudflare Workers free tier is 100k requests/day.** Each CMS login is ~2 requests. You'd need ~50,000 client logins per day to hit the limit. Not a concern.

## Option A — Personal Access Token (dev handover or solo)

No infra required. The CMS offers **Sign in with Token** on its login screen; clicking it walks the user through creating a GitHub PAT with pre-selected scopes. The token is stored in `localStorage` and used for every API call.

**When to use:**

- Only you edit the site
- You're handing off to another developer who's comfortable with PATs
- You're debugging a failed OAuth setup and want to bypass it temporarily

**Never use for non-technical clients.** They will:

1. Not understand what a PAT is
2. Get confused by the scopes dialog
3. Paste the token in the wrong place
4. Be locked out when the token expires (30–90 days for fine-grained PATs)

**Security notes:**

- Token lives in `localStorage`. Clear browser data = lose the token.
- Fine-grained tokens can be scoped to just the one repo, but can't be scoped to just the `content/` folder — a compromised token has full repo write access.
- PATs expire. Set a calendar reminder to regenerate, or accept the outage.

## Option D — PKCE (blocked upstream)

GitHub doesn't ship client-side PKCE yet. When it does, Sveltia will support it natively, eliminating the need for a Worker. Track [github/roadmap#1153](https://github.com/github/roadmap/issues/1153) — once shipped, the migration is a single config line change and deleting the Worker.

GitLab already supports PKCE; if a client is on GitLab instead of GitHub, the Worker is unnecessary. See the Sveltia docs under `backends/gitlab`.

## Handover checklist (per client)

For a new client site transitioning from "local dev only" to "client can log in":

- [ ] **Repo:** Create the production GitHub repo and push the site
- [ ] **Collaborator:** Add the client as a repository collaborator (Settings → Collaborators) so they have write access to the files they'll edit through the CMS
- [ ] **Hosting:** Deploy to the chosen host. Confirm `/admin/` renders (it will show a login screen — this is expected)
- [ ] **Auth path:** Pick from the decision tree above. Most likely Option B or C.
- [ ] **Option B only:** Append the client's production domain to `ALLOWED_DOMAINS` in Cloudflare
- [ ] **Config update:** Add `base_url` (Option B) or confirm absence (Option C) in the client's `astro.config.mjs`
- [ ] **Test as client:** Have the client (or a colleague) sign in from a clean browser, create a test entry, confirm it persists
- [ ] **Document for client:** Give them a one-page runbook: "Visit `https://client-site.com/admin/`, sign in with GitHub, edit a page, save. Your changes go live in about a minute."
- [ ] **Backup plan:** Note how to rebuild the site manually if the auth breaks (e.g. you as an admin using Option A / the File System Access API)

## Troubleshooting

| Symptom                                        | Likely cause                                                              | Fix                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| "Refused to connect" after GitHub approval     | Client's domain not in `ALLOWED_DOMAINS` (Option B)                       | Add it in Cloudflare, wait ~5 seconds                                     |
| Callback 404 after GitHub approval             | GitHub OAuth app callback URL wrong                                       | Must end in `/callback` exactly                                           |
| Login loop (redirects forever)                 | `base_url` in `astro.config.mjs` doesn't match the Worker URL exactly     | Copy-paste from the Cloudflare dashboard                                  |
| "Bad verification code"                        | Client Secret wrong or not encrypted                                      | Regenerate in GitHub, update in Cloudflare                                |
| PAT login "Bad credentials"                    | Token expired or revoked (Option A)                                       | Regenerate; see if the client accidentally invalidated it                 |
| `/admin/` 404 on the deployed site             | Build didn't include the integration                                      | Check `astro.config.mjs` has `sveltia({...})` in `integrations:`, rebuild |
| CMS loads but shows no collections             | `collections: []` in config (baseline state) — no collections defined yet | Invoke the `sveltia-cms` skill to add one                                 |
| Changes save in CMS but don't show on the site | Hosting provider hasn't rebuilt                                           | Confirm the host is watching the right branch and auto-deploying on push  |

## Security notes

- **Never commit `.dev.vars`, `wrangler.toml` with secrets, or any file containing `GITHUB_CLIENT_SECRET`.** The secret lives only in Cloudflare's encrypted Variables panel.
- **`ALLOWED_DOMAINS` is not optional.** Without it, the Worker is a public CORS bypass. Always set it tightly.
- **Rotate secrets** if you suspect a leak. GitHub OAuth app → **Generate a new client secret** → update in Cloudflare → all existing sessions stay valid, new logins use the new secret.
- **Client-side PATs are low-stakes** for a single developer but not for handover. They grant full repo write access and can't be scoped tighter. If a client is compromised, revoke in GitHub → **Settings → Developer settings → Personal access tokens**.
- **OAuth app installations** can be reviewed by the client under GitHub → **Settings → Applications → Authorized OAuth Apps**. Useful when offboarding — the client revokes your app, they're out of the CMS cleanly.

## Migration between options

Switching auth paths is cheap; none of them require data migration (the content lives in git regardless).

- **C → B:** add `base_url` to `astro.config.mjs`, append domain to `ALLOWED_DOMAINS`. Now works on any host.
- **B → C:** remove `base_url` from `astro.config.mjs`, deploy to Netlify, enable Netlify's OAuth provider. Now tied to Netlify.
- **A → B:** deploy the Worker (if not already shared), add `base_url`. Client stops needing to manage a PAT.
- **Any → PKCE:** wait for GitHub to ship it, then remove `base_url` entirely.
