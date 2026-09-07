# Hugo.aviation — open-source edition

Editable aviation photography portfolio: HTML/CSS/JavaScript, Cloudflare Pages Functions and R2. MIT licensed. Includes searchable galleries, accessible lightboxes, on-demand MapLibre maps, authenticated content editing, backups and concurrency protection.

## Privacy boundary

This is a **sanitized source release**, not a production data backup. Its 40 records and SVG image are synthetic fixtures. Real photos, contact details, account identifiers, production object keys, recovery evidence, secrets and the private recovery Git history are excluded. The original production website and its data are not modified by this repository.

Code and bundled demo assets are MIT licensed. The name/logo and production photographs are not a grant to impersonate the original website. Third-party dependencies retain their licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Run locally

Node.js 24 or newer is required; dependencies are pinned in package-lock.json.

```sh
npm ci
npm run check
npm run dev
```

Open http://127.0.0.1:4173. The local server is read-only, uses synthetic metadata and serves an SVG placeholder for demo media. It does not connect to the production website or R2. The airport catalog is intentionally empty, so there are no real shooting locations in this release.

## Project layout

- `src/`: editable frontend pages, scripts and styles.
- `functions/`: API and media handlers, authentication, R2 and backups.
- `data/seed/`: synthetic fixtures only.
- `public/`: non-sensitive static assets and generated demo image.
- `test/`: frontend, API and isolated workerd/R2 regression tests.
- `scripts/`: build, local preview and release checks.

## Deploy your own instance

Create your own Pages project and R2 bucket. Configure `HUGO_PHOTOS` and a strong `ADMIN_TOKEN` through Cloudflare's secret interface; never commit its value. The checked-in configuration is read-only and has **no production bucket binding**. Replace example.com links and demonstration content before publishing. Keep previews read-only; enable writes only on your intended production deployment after testing.

Build with `npm run check`. For Dashboard upload, run `node scripts/package-dashboard.mjs --preview` and upload the **contents** of `.wrangler/dashboard-preview`. On macOS, use `ditto -c -k --norsrc --noextattr` to create a ZIP without system metadata. The non-preview packaging mode permits authenticated writes; use it only with your own production resources. Never promote the readonly preview bundle as a writable production deployment.

GitHub Actions runs checks only; it does not deploy or receive Cloudflare secrets. Production imports, recovery snapshots and photo backups must stay in separate private storage. Git backups do not back up R2 data.

## Contribute

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Do not attach real credentials, production backups, personal data or original photos to issues/PRs.
