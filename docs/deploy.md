# Deploying Unbox Box

Unbox Box is a static site: `npm run build` writes plain files to `apps/web/out`, and any static
host can serve them. Everything here uses free plans.

1. [Repository settings](#1-repository-settings) (once, on GitHub)
2. [Data on Hugging Face](#2-data-on-hugging-face) (optional: without it the site uses the bundled demo data)
3. [Hosting on Vercel](#3-hosting-on-vercel)
4. [Other hosts](#4-other-hosts)

## 1. Repository settings

Push `main` first, then protect it (the ruleset blocks direct pushes, including the first one).

**Protect `main`.** Settings → Rules → Rulesets → New ruleset → **Import a ruleset**, and pick
[`.github/rulesets/main.json`](../.github/rulesets/main.json). It:

- requires a pull request with one code-owner approval, re-approved after the last push, and
  every conversation resolved;
- requires every CI check to pass on a branch that is up to date with `main`;
- blocks CodeQL alerts of high severity or above;
- allows squash merges only, and requires linear, signed history (GitHub signs squash merges);
- blocks force-pushes and deletion.

Repository admins can bypass it **through a pull request only**, so a solo maintainer can merge
their own pull request once CI is green (GitHub doesn't let you approve your own). Leave that
for yourself alone, and wait for the checks before using it.

The required checks are matched by job name. They appear in the ruleset once each has run
at least once, so open a first pull request before relying on them.

**Security** (Settings → Advanced Security):

- Dependency graph, Dependabot alerts and Dependabot security updates: on.
- Secret scanning and **push protection**: on. Pushes containing known key formats are
  blocked.
- Private vulnerability reporting: on ([SECURITY.md](../SECURITY.md) points reporters there).
- Code scanning: leave it to the committed CodeQL workflow (don't enable "default setup" as
  well; the two conflict).

**Actions** (Settings → Actions → General):

- Fork pull request workflows: require approval for all external contributors.
- Workflow permissions: **Read repository contents**; leave "Allow GitHub Actions to create
  and approve pull requests" off.

**Pull requests** (Settings → General):

- Allow squash merging only, with the default message set to **Pull request title and
  description**.
- Always suggest updating pull request branches, and automatically delete head branches.

**Community:** enable Discussions (Settings → General → Features), and create the
`good first issue` and `help wanted` labels if they're missing.

## 2. Data on Hugging Face

The bundled data covers one weekend (Monza 2025) and a few archive seasons. The full archive is
too big for Git, so it lives in a free public Hugging Face dataset.

1. Create a free account at [huggingface.co](https://huggingface.co), then a **dataset**
   (public), e.g. `your-name/unbox-box-data`.
2. Create an access token with **write** access (Settings → Access Tokens).
3. Build and upload once from your machine (needs [uv](https://docs.astral.sh/uv/)):

   ```bash
   npm run data:sync                                  # builds data/ (several GB of downloads)
   HF_TOKEN=hf_… npm run data:publish -- your-name/unbox-box-data
   ```

   Keep the token in your shell only; never put it in a file in the repository.

4. To keep it current automatically, add the token as a repository **secret** `HF_TOKEN` and
   the dataset name as a repository **variable** `HF_DATASET` (Settings → Secrets and
   variables → Actions). The [Sync session data](../.github/workflows/sync-data.yml) workflow
   then publishes new sessions every three hours.

The site reads it from
`https://huggingface.co/datasets/your-name/unbox-box-data/resolve/main`. That host is already
allowed by the Content Security Policy.

## 3. Hosting on Vercel

1. Vercel → **Add New… → Project** → import `unbox-box` from GitHub.
2. **Root Directory:** `apps/web`. Leave the framework, build and output settings at their
   defaults: `apps/web/vercel.json` overrides them, serving the export as plain static files
   (`framework: null`, output `out`) so its deep-link rewrites apply. The build runs
   `npm run build`, which also writes that file's security headers and rewrites.
3. **Node.js version:** 22.x or later (Settings → Build and Deployment).
4. **Environment variables** (Settings → Environment Variables), for Production and Preview:

   | Name                        | Value                                                                   | Needed                    |
   | --------------------------- | ----------------------------------------------------------------------- | ------------------------- |
   | `NEXT_PUBLIC_DATA_BASE`     | `https://huggingface.co/datasets/your-name/unbox-box-data/resolve/main` | For the full archive      |
   | `NEXT_PUBLIC_WEB3FORMS_KEY` | Your Web3Forms access key                                               | For bug reports by email  |
   | `NEXT_PUBLIC_SITE_URL`      | Your custom domain, e.g. `https://unboxbox.app`                         | Only with a custom domain |

   Every `NEXT_PUBLIC_` value ends up in the page, so none of them may be a secret. The
   Web3Forms key is public by design: it can only send mail to the inbox that created it.
   Keep your local copy in `apps/web/.env.local`, which Git ignores.

5. **Deploy.** Vercel builds every push to `main` and gives each pull request a preview URL.

Check the deployment:

- a deep link such as `/races/1988/3/qualifying/` opens that session directly;
- the response headers include `Content-Security-Policy` and `Strict-Transport-Security`
  ([securityheaders.com](https://securityheaders.com) should score A);
- the Help page's report form sends a test report to your inbox.

With a custom domain, set `NEXT_PUBLIC_SITE_URL` to it and redeploy, so link previews, the
sitemap and canonical links use it.

## 4. Other hosts

The build writes config for the common hosts from one source (`apps/web/scripts/host-config.mjs`):

| Host                      | Files used                              |
| ------------------------- | --------------------------------------- |
| Vercel                    | `vercel.json` (headers, rewrites)       |
| Netlify, Cloudflare Pages | `out/_headers`, `out/_redirects`        |
| `npx serve out`           | `out/serve.json` (local preview, tests) |

On Netlify or Cloudflare Pages, set the base directory to `apps/web`, the build command to
`npm run build` and the publish directory to `out`, with the same environment variables.

Any other static host works if it can rewrite `/<view>/*` to `/<view>/index.html` (for deep
links) and send the headers from `apps/web/public/_headers`. Without rewrites, only the view
roots (`/duel/`, `/races/`, …) and older query links (`/races/?season=1988`) open directly.
