# Sveltia CMS Authenticator

This directory holds **deployment instructions** for the production OAuth broker that lets non-technical clients sign into `/admin/` with GitHub. There is deliberately **no source code here** — the Worker is maintained upstream at [`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) and this directory would only drift.

Use this when:

- You're deploying a client site somewhere other than Netlify (Vercel, Cloudflare Pages, custom hosting)
- Non-technical editors need to log in without fiddling with personal access tokens

**Skip this entirely if:**

- The client site is on Netlify → enable Netlify's built-in OAuth provider in the site dashboard, leave `backend.base_url` unset in `public/admin/config.yml`, done.
- Only you (or a technical handover contact) edit content → use the "Sign in with Token" PAT flow instead.
- You only edit locally → File System Access API works with zero auth, zero config.

See the `sveltia-cms-auth` skill in `.claude/skills/` for the full decision tree.

## One Worker, all clients (the key insight)

You do **not** need to deploy a Worker per client. The authenticator's `ALLOWED_DOMAINS` environment variable accepts a comma-separated list with wildcards, so one Worker + one GitHub OAuth app serves every client site you build. Per-client overhead drops to "add a line, redeploy the Worker."

## One-time global setup

### 1. Deploy the Worker

Click the "Deploy to Cloudflare Workers" button on [`sveltia/sveltia-cms-auth`](https://github.com/sveltia/sveltia-cms-auth) and follow the prompts. It signs in via Cloudflare, forks the repo to your account, and deploys to `https://sveltia-cms-auth.<your-subdomain>.workers.dev`.

Alternatively, clone the repo and run `wrangler deploy` locally.

Copy the resulting Worker URL — you need it in steps 2 and 4.

### 2. Register one GitHub OAuth app

Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App** and fill in:

| Field                      | Value                                             |
| -------------------------- | ------------------------------------------------- |
| Application name           | `Sveltia CMS Authenticator` (anything you like)   |
| Homepage URL               | Your Worker URL from step 1 (or your agency site) |
| Authorization callback URL | `<YOUR_WORKER_URL>/callback` ← must be exact      |

Click **Register application**, then **Generate a new client secret**. Copy both the **Client ID** and the **Client Secret** — the secret is shown only once.

### 3. Set Worker environment variables

In the Cloudflare dashboard: **Workers & Pages → `sveltia-cms-auth` → Settings → Variables**.

Add these environment variables:

- `GITHUB_CLIENT_ID` — Client ID from step 2
- `GITHUB_CLIENT_SECRET` — Client Secret from step 2 (click **Encrypt** before saving)
- `ALLOWED_DOMAINS` — comma-separated list of client domains authorized to use this Worker. Start with one; append more over time.

Example `ALLOWED_DOMAINS` as your client list grows:

```
clientone.com, *.clientone.com, clienttwo.com, *.clienttwo.com, *.staging.agency.com
```

Save. Cloudflare redeploys the Worker automatically.

## Per-client setup

For each new client site you build from this template:

1. Append the client's production domain (and any staging subdomains) to `ALLOWED_DOMAINS` in the Cloudflare dashboard. Save — takes ~5 seconds.
2. In the client's repo, edit `public/admin/config.yml` and add the `base_url` line:

   ```yaml
   backend:
     name: github
     repo: owner/client-repo
     branch: main
     base_url: https://sveltia-cms-auth.<your-subdomain>.workers.dev
   ```

3. Commit and deploy. Client visits `https://client-site.com/admin/`, clicks **Sign in with GitHub**, approves the OAuth app once, and they're in.

## Security notes

- `ALLOWED_DOMAINS` is the only gate preventing random sites from abusing your Worker. Keep it tight — remove domains when clients leave.
- The GitHub Client Secret lives only in Cloudflare's Variables panel (encrypted). Never commit it. Rotating it requires updating it in Cloudflare, no client-side changes.
- One shared OAuth app means one blast radius: if the secret leaks, rotate it and every client's login will break until Cloudflare redeploys. Usually a non-event but worth knowing.
- For high-stakes clients who can't tolerate shared-infrastructure risk, deploy a dedicated Worker per client — same procedure, separate Worker name.

## Troubleshooting

| Symptom                            | Cause                                                           | Fix                                        |
| ---------------------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| "Refused to connect" on login      | Client's domain not in `ALLOWED_DOMAINS`                        | Add it, Cloudflare auto-redeploys          |
| Callback 404 after GitHub approval | GitHub OAuth app callback URL doesn't end in `/callback`        | Fix in GitHub app settings                 |
| Login loop                         | `base_url` in `config.yml` doesn't match the Worker URL exactly | Copy-paste from Cloudflare dashboard       |
| "Bad verification code"            | Client Secret wrong or not encrypted                            | Regenerate in GitHub, update in Cloudflare |
