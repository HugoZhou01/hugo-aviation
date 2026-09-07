# Security

Do not post credentials or exploitable production details in public issues. Use GitHub private vulnerability reporting when available, or ask the maintainer for a private reporting channel without disclosing the vulnerability.

Never commit `.env`, `.dev.vars`, access tokens, cookies, personal data, R2 backups or deployment recovery archives. Public Git history is persistent: deleting a secret in a later commit does not revoke it. Rotate accidentally exposed credentials immediately, then coordinate history cleanup.

Use separate resources for development and production. Keep previews read-only. An R2 binding grants resource access even when application logic rejects writes. Authenticate every management API server-side and retain same-origin checks. Never disable Cloudflare Access to work around login failures.

`npm run check` includes a conservative repository privacy check and tests. Pattern scanning cannot prove absence of every possible secret; inspect changes before publishing. CI has read-only repository permissions and no production credentials.
