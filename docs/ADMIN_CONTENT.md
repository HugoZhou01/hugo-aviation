# Bilingual content administration

The admin navigation includes a Chinese/English content workspace. It catalogs homepage text, public static labels, built-in translations, and photo titles, alternative text, notes and spotting locations. Search and status filters retain in-memory drafts; only 30 rows render per page.

Chinese and English overrides are independent. An unchanged or cleared field falls back to the original text/built-in English translation. Identical original strings share an override across the site. This is a source-string catalog, not a rich-text or page-layout builder. If you change original homepage text, save that change first, then translate the new source. Airport identifiers, URLs and photo structure remain in their existing editors.

Homepage editing also exposes hero text, about title/body, contact labels/links, metric labels and about-stat labels. All homepage and translation changes share one Save action and automatic pre-save backup. Overrides are stored in site.localization as version 1 with entry_N records containing source and optional zh/en plain text. GET /api/translations returns only this public text catalog and its timestamp; writes require the existing authenticated PUT /api/site route. Do not store secrets or private notes in public text.

Repeated saves are guarded, controls are locked during writes, and failures retain drafts. Leaving with unsaved content triggers the browser warning. Export bilingual drafts before resolving conflicts or reloading; draft exports are local files and must not be committed to the public repository. A submitted updatedAt that differs from the stored version returns 409 instead of overwriting newer changes. Older clients without updatedAt remain supported. Translation shapes, duplicate sources, field types and size limits are validated server-side. Existing backups include the full site object and therefore its translations.

## Local verification

Run node scripts/build.mjs then node scripts/dev-admin.mjs. This starts a loopback-only, isolated Miniflare R2 sandbox at http://127.0.0.1:4187/admin, with the test-only token printed in the terminal. It does not connect to production R2. Each run has separate temporary storage; restarting resets to repository seeds. Never reuse its test token for production. Stop with Ctrl-C.

Automated coverage includes catalog construction, serialization, dirty warnings, independent locale switching, public translation cache validation, stale-write rejection and invalid translation rejection. Chrome desktop manual checks confirm login, search, independent Chinese/English saves, frontend language switching and reload persistence. Mobile viewport emulation did not apply reliably in the current browser connection; actual mobile visual acceptance remains pending.
