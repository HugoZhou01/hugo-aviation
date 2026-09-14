import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { onRequest as apiRequest } from "../functions/api/[[path]].js";
import { onRequest as mediaRequest } from "../functions/media/[[path]].js";
import {
  createBackup,
  loadBackupIndex,
  loadManifest,
  saveManifest,
  siteMediaKeys,
} from "../functions/_shared/storage.js";

const jpegBlob = (payload = "image") => new Blob([
  new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
  payload,
], { type: "image/jpeg" });

const headerEtagMatches = (header, etag, { weak = false } = {}) => String(header || "").split(",").some((item) => {
  const candidate = item.trim();
  if (candidate === "*") return true;
  if (weak) return candidate.replace(/^W\//, "") === etag.replace(/^W\//, "");
  return !candidate.startsWith("W/") && candidate === etag;
});

class MemoryR2Object {
  constructor(key, value, { bytes = value.bytes, range, includeBody = true } = {}) {
    this.key = key;
    this.value = value;
    this.size = value.bytes.byteLength;
    this.uploaded = value.uploaded;
    this.etag = value.etag;
    this.httpEtag = `"${value.etag}"`;
    this.httpMetadata = value.httpMetadata || {};
    if (includeBody) this.body = new Blob([bytes]).stream();
    this.range = range || (includeBody ? { offset: 0, length: bytes.byteLength } : undefined);
  }

  async text() {
    return new TextDecoder().decode(this.value.bytes);
  }

  writeHttpMetadata(headers) {
    if (this.httpMetadata.contentType) headers.set("content-type", this.httpMetadata.contentType);
  }
}

class MemoryR2Bucket {
  constructor() {
    this.objects = new Map();
    this.failDeleteKeys = new Set();
    this.failNextPutKeys = new Set();
    this.putInterceptor = null;
    this.beforeDelete = null;
    this.mutationSequence = 0;
  }

  async put(key, body, options = {}) {
    if (this.putInterceptor) await this.putInterceptor(key);
    if (this.failNextPutKeys.delete(key)) throw new Error("Simulated R2 put failure");
    const current = this.objects.get(key);
    const onlyIf = options.onlyIf;
    if (onlyIf instanceof Headers && onlyIf.get("if-none-match") === "*" && current) return null;
    if (onlyIf?.etagMatches && current?.etag !== onlyIf.etagMatches) return null;
    if (onlyIf?.etagDoesNotMatch === "*" && current) return null;
    if (onlyIf?.etagDoesNotMatch && onlyIf.etagDoesNotMatch !== "*" && current?.etag === onlyIf.etagDoesNotMatch) {
      return null;
    }
    const bytes = typeof body === "string"
      ? new TextEncoder().encode(body)
      : new Uint8Array(await body.arrayBuffer());
    this.mutationSequence += 1;
    const value = {
      bytes,
      uploaded: new Date(),
      etag: `${this.mutationSequence.toString(16)}-${bytes.byteLength.toString(16)}-${key.length.toString(16)}`,
      httpMetadata: options.httpMetadata || {},
    };
    this.objects.set(key, value);
    return new MemoryR2Object(key, value);
  }

  async get(key, options = {}) {
    const value = this.objects.get(key);
    if (!value) return null;
    if (options.onlyIf instanceof Headers) {
      const etag = `"${value.etag}"`;
      const ifMatch = options.onlyIf.get("if-match");
      const ifNoneMatch = options.onlyIf.get("if-none-match");
      const ifModifiedSince = Date.parse(options.onlyIf.get("if-modified-since") || "");
      const ifUnmodifiedSince = Date.parse(options.onlyIf.get("if-unmodified-since") || "");
      const uploaded = Math.floor(value.uploaded.getTime() / 1000) * 1000;
      const failed = (ifMatch && !headerEtagMatches(ifMatch, etag))
        || (!ifMatch && Number.isFinite(ifUnmodifiedSince) && uploaded > ifUnmodifiedSince)
        || (ifNoneMatch && headerEtagMatches(ifNoneMatch, etag, { weak: true }))
        || (!ifNoneMatch && Number.isFinite(ifModifiedSince) && uploaded <= ifModifiedSince);
      if (failed) return new MemoryR2Object(key, value, { includeBody: false });
    }
    const rangeHeader = options.range instanceof Headers ? options.range.get("range") : "";
    if (!rangeHeader) return new MemoryR2Object(key, value);
    const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
    let start;
    let end;
    if (!match || (!match[1] && !match[2])) {
      const error = new Error("get: The requested range is not satisfiable. (10039)");
      error.code = 10039;
      throw error;
    }
    if (!match[1]) {
      const suffix = Number(match[2]);
      start = Math.max(0, value.bytes.byteLength - suffix);
      end = value.bytes.byteLength - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : value.bytes.byteLength - 1;
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= value.bytes.byteLength) {
      const error = new Error("get: The requested range is not satisfiable. (10039)");
      error.code = 10039;
      throw error;
    }
    end = Math.min(end, value.bytes.byteLength - 1);
    const length = end - start + 1;
    return new MemoryR2Object(key, value, {
      bytes: value.bytes.slice(start, end + 1),
      range: { offset: start, length },
    });
  }

  async head(key) {
    const value = this.objects.get(key);
    return value ? new MemoryR2Object(key, value, { includeBody: false }) : null;
  }

  async delete(keys) {
    const selected = Array.isArray(keys) ? keys : [keys];
    if (selected.length > 1000) throw new Error("R2 delete accepts at most 1000 keys");
    if (selected.some((key) => this.failDeleteKeys.has(key))) throw new Error("Simulated R2 delete failure");
    if (this.beforeDelete) await this.beforeDelete(selected);
    for (const key of selected) this.objects.delete(key);
  }

  async list({ cursor, limit = 1000 } = {}) {
    const entries = [...this.objects].sort(([left], [right]) => left.localeCompare(right));
    const start = Number(cursor || 0);
    const selected = entries.slice(start, start + limit);
    const next = start + selected.length;
    return {
      objects: selected.map(([key, value]) => ({
        key,
        size: value.bytes.byteLength,
        uploaded: value.uploaded,
        etag: value.etag,
      })),
      truncated: next < entries.length,
      cursor: next < entries.length ? String(next) : undefined,
    };
  }
}

const createEnvironment = async () => {
  const bucket = new MemoryR2Bucket();
  const manifest = JSON.parse(await readFile(join("data", "seed", "photos.json"), "utf8"));
  const site = JSON.parse(await readFile(join("data", "seed", "site.json"), "utf8"));
  const onePhotoManifest = { ...manifest, photos: [manifest.photos[0]] };
  await bucket.put("photos/manifest.json", `${JSON.stringify(onePhotoManifest, null, 2)}\n`, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  await bucket.put("site/config.json", `${JSON.stringify(site, null, 2)}\n`, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  await bucket.put("backups/index.json", '{"updatedAt":"1970-01-01T00:00:00.000Z","backups":[],"mediaKeys":[]}', {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  await bucket.put(onePhotoManifest.photos[0].storageKey, new Blob(["original"], { type: "image/jpeg" }), {
    httpMetadata: { contentType: "image/jpeg" },
  });
  await bucket.put(onePhotoManifest.photos[0].thumbnailKey, new Blob(["thumbnail"], { type: "image/jpeg" }), {
    httpMetadata: { contentType: "image/jpeg" },
  });
  for (const key of siteMediaKeys(site)) {
    if (bucket.objects.has(key)) continue;
    await bucket.put(key, new Blob(["site media"], { type: "image/jpeg" }), {
      httpMetadata: { contentType: "image/jpeg" },
    });
  }
  return { HUGO_PHOTOS: bucket, ADMIN_TOKEN: "test-secret" };
};

const callApi = (env, path, { method = "GET", token = "", body, headers = {} } = {}) => {
  const requestHeaders = new Headers(headers);
  if (token) requestHeaders.set("authorization", `Bearer ${token}`);
  return apiRequest({
    request: new Request(`https://hugoaviation.com/api/${path}`, {
      method, headers: requestHeaders, body,
      ...(body instanceof ReadableStream ? { duplex: "half" } : {}),
    }),
    env,
    params: { path: path.split("/") },
  });
};

test("public manifests use validation-friendly cache headers", async () => {
  const env = await createEnvironment();
  const response = await callApi(env, "photos");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("etag"), /^W\/"photos-/);
  assert.equal(response.headers.get("cache-control"), "public, max-age=0, must-revalidate");
  assert.ok(response.headers.get("last-modified"));
  const data = await response.json();
  assert.equal(data.photos.length, 1);

  const conditional = await callApi(env, "photos", {
    headers: { "if-none-match": response.headers.get("etag") },
  });
  assert.equal(conditional.status, 304);

  const head = await callApi(env, "photos", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("etag"), response.headers.get("etag"));
  assert.equal(await head.text(), "");

  const listedConditional = await callApi(env, "photos", {
    headers: { "if-none-match": `W/"not-current", ${response.headers.get("etag")}` },
  });
  assert.equal(listedConditional.status, 304);
  const wildcardConditional = await callApi(env, "photos", { headers: { "if-none-match": "*" } });
  assert.equal(wildcardConditional.status, 304);
  const dateConditional = await callApi(env, "photos", {
    headers: { "if-modified-since": response.headers.get("last-modified") },
  });
  assert.equal(dateConditional.status, 304);

  await env.HUGO_PHOTOS.put("photos/manifest.json", `${JSON.stringify(data, null, 2)}\n`, {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  const replaced = await callApi(env, "photos");
  assert.notEqual(replaced.headers.get("etag"), response.headers.get("etag"));
});

test("homepage API includes only site-referenced photos and validates both source versions", async () => {
  const env = await createEnvironment();
  const manifest = JSON.parse(await readFile(join("data", "seed", "photos.json"), "utf8"));
  await env.HUGO_PHOTOS.put("photos/manifest.json", JSON.stringify(manifest));
  const response = await callApi(env, "home");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=0, must-revalidate");
  const payload = await response.json();
  const selectedKeys = new Set(siteMediaKeys({
    images: payload.site.home.images, airportCovers: payload.site.home.airportCovers,
  }));
  const expectedPhotos = manifest.photos.filter((photo) => selectedKeys.has(photo.storageKey) || selectedKeys.has(photo.thumbnailKey));
  assert.deepEqual(Object.keys(payload).sort(), ["manifest", "site"]);
  assert.deepEqual(payload.manifest, { updatedAt: manifest.updatedAt, revision: manifest.revision, photos: expectedPhotos });
  assert.ok(payload.manifest.photos.length > 0);
  assert.ok(payload.manifest.photos.length < manifest.photos.length);
  const etag = response.headers.get("etag");
  const conditional = await callApi(env, "home", { headers: { "if-none-match": etag } });
  assert.equal(conditional.status, 304);
  const head = await callApi(env, "home", { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("etag"), etag);
  assert.equal(await head.text(), "");
  assert.equal((await callApi(env, "home", { method: "HEAD", headers: { "if-none-match": etag } })).status, 304);
  payload.site.home.hero.greeting = "changed site only";
  await env.HUGO_PHOTOS.put("site/config.json", JSON.stringify(payload.site));
  const changedSite = await callApi(env, "home", { headers: { "if-none-match": etag } });
  assert.equal(changedSite.status, 200);
  const siteEtag = changedSite.headers.get("etag");
  await env.HUGO_PHOTOS.put("photos/manifest.json", JSON.stringify({ ...manifest, revision: manifest.revision + 1 }));
  const changedManifest = await callApi(env, "home", { headers: { "if-none-match": siteEtag } });
  assert.equal(changedManifest.status, 200);
  assert.notEqual(changedManifest.headers.get("etag"), siteEtag);
  assert.equal((await callApi(env, "home", { method: "PUT" })).status, 405);
});

test("homepage API supports an empty new bucket without inventing photo selections", async () => {
  const env = { HUGO_PHOTOS: new MemoryR2Bucket() };
  const response = await callApi(env, "home");
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.deepEqual(payload.site.home, {});
  assert.deepEqual(payload.manifest.photos, []);
});

test("stale manifest writes are rejected instead of losing concurrent edits", async () => {
  const env = await createEnvironment();
  const first = await loadManifest(env.HUGO_PHOTOS);
  const stale = await loadManifest(env.HUGO_PHOTOS);
  await saveManifest(env.HUGO_PHOTOS, first, first.photos.map((photo) => ({ ...photo, title: "first edit" })));
  await assert.rejects(
    saveManifest(env.HUGO_PHOTOS, stale, stale.photos.map((photo) => ({ ...photo, title: "stale edit" }))),
    (error) => error?.status === 409,
  );
  const stored = await loadManifest(env.HUGO_PHOTOS);
  assert.equal(stored.photos[0].title, "first edit");
});

test("corrupted JSON storage shapes fail explicitly instead of leaking invalid public data", async () => {
  const env = await createEnvironment();
  await env.HUGO_PHOTOS.put("photos/manifest.json", "[]", {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  const response = await callApi(env, "photos");
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, "Storage Data Invalid");
});

test("concurrent backup creation retries the index compare-and-swap", async () => {
  const env = await createEnvironment();
  await Promise.all([
    createBackup(env.HUGO_PHOTOS, "concurrent A"),
    createBackup(env.HUGO_PHOTOS, "concurrent B"),
  ]);
  const index = await loadBackupIndex(env.HUGO_PHOTOS);
  assert.equal(index.backups.length, 2);
  assert.deepEqual(new Set(index.backups.map((backup) => backup.reason)), new Set(["concurrent A", "concurrent B"]));
});

test("admin routes reject an invalid bearer token", async () => {
  const env = await createEnvironment();
  const response = await callApi(env, "backups", { token: "wrong" });
  assert.equal(response.status, 401);
  assert.match(response.headers.get("www-authenticate"), /Bearer/);
});

test("site edits create a restorable backup", async () => {
  const env = await createEnvironment();
  const current = await (await callApi(env, "site")).json();
  current.home.hero.greeting = "测试问候";
  const response = await callApi(env, "site", {
    method: "PUT",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify(current),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).home.hero.greeting, "测试问候");
  const backups = await (await callApi(env, "backups", { token: "test-secret" })).json();
  assert.equal(backups.backups.length, 1);
});

test("site validation accepts all recovered seed content and legacy image records without optional slots", async () => {
  const env = await createEnvironment();
  const original = await (await callApi(env, "site")).json();
  const save = (site) => callApi(env, "site", {
    method: "PUT", token: "test-secret", headers: { "content-type": "application/json" },
    body: JSON.stringify(site),
  });
  const seedResult = await save(original);
  assert.equal(seedResult.status, 200);
  const saved = await seedResult.json();
  assert.deepEqual(saved.home, original.home);
  const legacy = structuredClone(saved);
  legacy.home.images.forEach((image) => { delete image.slot; });
  const legacyResult = await save(legacy);
  assert.equal(legacyResult.status, 200);
  assert.deepEqual((await legacyResult.json()).home, legacy.home);
});

test("site edits reject unsafe links and media references before creating a backup", async () => {
  const env = await createEnvironment();
  const current = await (await callApi(env, "site")).json();
  current.home.contact.instagramHref = "javascript:alert(1)";
  current.home.images[0].src = "https://example.com/unmanaged.jpg";
  const response = await callApi(env, "site", {
    method: "PUT",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify(current),
  });
  assert.equal(response.status, 400);
  assert.equal((await loadBackupIndex(env.HUGO_PHOTOS)).backups.length, 0);
});

test("bilingual content round trips, remains public text only, and rejects stale editors", async () => {
  const env = await createEnvironment();
  const original = await (await callApi(env, "site")).json();
  const edited = structuredClone(original);
  edited.localization = { version: 1, entries: { entry_0: { source: "你好", zh: "欢迎", en: "Welcome aboard" } } };
  const save = value => callApi(env, "site", { method: "PUT", token: "test-secret",
    headers: { "content-type": "application/json" }, body: JSON.stringify(value) });
  assert.equal((await save(edited)).status, 200);
  const response = await callApi(env, "translations");
  const content = await response.json();
  assert.deepEqual(content.entries, edited.localization.entries);
  assert.equal(content.home, undefined);
  assert.equal((await callApi(env, "translations", { method: "HEAD" })).status, 200);
  assert.equal((await callApi(env, "translations", { headers: { "if-none-match": response.headers.get("etag") } })).status, 304);
  assert.equal((await save(original)).status, 409);
  assert.equal((await loadBackupIndex(env.HUGO_PHOTOS)).backups.length, 1);
  const current = await (await callApi(env, "site")).json();
  for (const entry of [{ source: "你好", en: {} }, { source: "你好", en: "" }, { source: "你好", en: "Hi", html: "bad" }]) {
    current.localization.entries.entry_0 = entry;
    assert.equal((await save(current)).status, 400);
  }
  assert.equal((await loadBackupIndex(env.HUGO_PHOTOS)).backups.length, 1);
});

test("JSON mutation routes require an explicit JSON content type", async () => {
  const env = await createEnvironment();
  const response = await callApi(env, "site", {
    method: "PUT",
    token: "test-secret",
    headers: { "content-type": "text/plain", origin: "https://hugoaviation.com" },
    body: "{}",
  });
  assert.equal(response.status, 415);
});

test("Cloudflare Pages preview branches are read-only while authenticated reads still work", async () => {
  const env = await createEnvironment();
  env.CF_PAGES_BRANCH = "feature/read-only-preview";
  const site = await (await callApi(env, "site")).json();

  const auth = await callApi(env, "auth/check", {
    method: "POST",
    token: "test-secret",
    headers: { origin: "https://hugoaviation.com" },
  });
  assert.equal(auth.status, 200);
  assert.equal((await callApi(env, "backups", { token: "test-secret" })).status, 200);

  site.home.hero.greeting = "must not be written";
  const siteMutation = await callApi(env, "site", {
    method: "PUT",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify(site),
  });
  assert.equal(siteMutation.status, 403);
  assert.equal((await siteMutation.json()).error, "Preview Is Read-Only");

  const backupMutation = await callApi(env, "backups", {
    method: "POST",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify({ reason: "must not be created" }),
  });
  assert.equal(backupMutation.status, 403);
  assert.equal((await loadBackupIndex(env.HUGO_PHOTOS)).backups.length, 0);
  assert.notEqual((await (await callApi(env, "site")).json()).home.hero.greeting, "must not be written");
});

test("explicit deployment settings override branch inference for local development and every preview mutation", async () => {
  const env = await createEnvironment();
  env.CF_PAGES_BRANCH = "feature/local-edit";
  env.HUGO_READ_ONLY = "false";
  const site = await (await callApi(env, "site")).json();
  const localEdit = await callApi(env, "site", {
    method: "PUT", token: "test-secret", headers: { "content-type": "application/json" },
    body: JSON.stringify(site),
  });
  assert.equal(localEdit.status, 200);

  env.HUGO_READ_ONLY = "true";
  env.CF_PAGES_BRANCH = "main";
  const mutationsBefore = env.HUGO_PHOTOS.mutationSequence;
  for (const [path, method] of [
    ["site", "PUT"], ["photos", "POST"], ["photos", "DELETE"],
    ["photos/batch", "PATCH"], ["photos/thumbnails", "POST"],
    ["photos/valid-photo", "PATCH"], ["photos/valid-photo", "DELETE"],
    ["backups", "POST"], ["backups/import", "POST"],
    ["backups/valid-backup/restore", "POST"], ["backups/valid-backup", "DELETE"],
    ["storage/orphans", "DELETE"],
  ]) {
    const response = await callApi(env, path, { method, token: "test-secret" });
    assert.equal(response.status, 403, `${method} ${path}`);
  }
  assert.equal(env.HUGO_PHOTOS.mutationSequence, mutationsBefore);
});

test("an expired mutation lease can be safely replaced", async () => {
  const env = await createEnvironment();
  await env.HUGO_PHOTOS.put("maintenance/mutation-lock.json", JSON.stringify({
    owner: "abandoned-operation",
    purpose: "test",
    acquiredAt: "2020-01-01T00:00:00.000Z",
    expiresAt: "2020-01-01T00:10:00.000Z",
  }), { httpMetadata: { contentType: "application/json; charset=utf-8" } });
  const site = await (await callApi(env, "site")).json();
  site.home.hero.greeting = "租约已接管";
  const response = await callApi(env, "site", {
    method: "PUT",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify(site),
  });
  assert.equal(response.status, 200);
  const lock = JSON.parse(await (await env.HUGO_PHOTOS.get("maintenance/mutation-lock.json")).text());
  assert.equal(lock.owner, "");
});

test("an unlisted backup cannot be fetched after physical cleanup fails", async () => {
  const env = await createEnvironment();
  const created = await callApi(env, "backups", {
    method: "POST",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify({ reason: "delete failure test" }),
  });
  assert.equal(created.status, 201);
  const id = (await created.json()).backup.id;
  const key = `backups/${id}.json`;
  env.HUGO_PHOTOS.failDeleteKeys.add(key);

  const originalConsoleError = console.error;
  console.error = () => {};
  let removed;
  try {
    removed = await callApi(env, `backups/${id}`, {
      method: "DELETE",
      token: "test-secret",
      headers: { origin: "https://hugoaviation.com" },
    });
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(removed.status, 200);
  assert.ok(env.HUGO_PHOTOS.objects.has(key));
  const inaccessible = await callApi(env, `backups/${id}`, { token: "test-secret" });
  assert.equal(inaccessible.status, 404);
});

test("malformed backup imports are rejected without changing stored data", async () => {
  const env = await createEnvironment();
  const before = await (await callApi(env, "photos")).json();
  const site = await (await callApi(env, "site")).json();
  const response = await callApi(env, "backups/import", {
    method: "POST",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify({ site, manifest: { photos: [null] } }),
  });
  assert.equal(response.status, 400);
  const after = await (await callApi(env, "photos")).json();
  assert.deepEqual(after, before);
  const index = JSON.parse(await (await env.HUGO_PHOTOS.get("backups/index.json")).text());
  assert.equal(index.backups.length, 0);
});

test("a partial restore rolls the manifest back when the site write fails", async () => {
  const env = await createEnvironment();
  const beforeManifest = await (await callApi(env, "photos")).json();
  const beforeSite = await (await callApi(env, "site")).json();
  const importedManifest = structuredClone(beforeManifest);
  const importedSite = structuredClone(beforeSite);
  importedManifest.photos[0].title = "should be rolled back";
  importedSite.home.hero.greeting = "should not be stored";
  env.HUGO_PHOTOS.failNextPutKeys.add("site/config.json");

  const originalConsoleError = console.error;
  console.error = () => {};
  let response;
  try {
    response = await callApi(env, "backups/import", {
      method: "POST",
      token: "test-secret",
      headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
      body: JSON.stringify({ site: importedSite, manifest: importedManifest }),
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(response.status, 500);
  assert.deepEqual(await (await callApi(env, "photos")).json(), beforeManifest);
  assert.deepEqual(await (await callApi(env, "site")).json(), beforeSite);
  const index = await loadBackupIndex(env.HUGO_PHOTOS);
  assert.equal(index.backups.length, 1);
});

test("restore rejects media references that do not exist in R2", async () => {
  const env = await createEnvironment();
  const beforeManifest = await (await callApi(env, "photos")).json();
  const site = await (await callApi(env, "site")).json();
  const importedManifest = structuredClone(beforeManifest);
  importedManifest.photos[0].storageKey = "uploads/demo/missing.jpg";
  importedManifest.photos[0].src = "/media/uploads/demo/missing.jpg";

  const response = await callApi(env, "backups/import", {
    method: "POST",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify({ site, manifest: importedManifest }),
  });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).error, "Referenced Media Missing");
  assert.deepEqual(await (await callApi(env, "photos")).json(), beforeManifest);
  assert.equal((await loadBackupIndex(env.HUGO_PHOTOS)).backups.length, 0);
});

test("restore reports an explicit partial state if compensation also fails", async () => {
  const env = await createEnvironment();
  const beforeManifest = await (await callApi(env, "photos")).json();
  const beforeSite = await (await callApi(env, "site")).json();
  const importedManifest = structuredClone(beforeManifest);
  const importedSite = structuredClone(beforeSite);
  importedManifest.photos[0].title = "partially restored";
  importedSite.home.hero.greeting = "site write should fail";
  let manifestWrites = 0;
  env.HUGO_PHOTOS.putInterceptor = async (key) => {
    if (key === "photos/manifest.json") {
      manifestWrites += 1;
      if (manifestWrites === 2) throw new Error("Simulated manifest compensation failure");
    }
    if (key === "site/config.json") throw new Error("Simulated site write failure");
  };

  const originalConsoleError = console.error;
  console.error = () => {};
  let response;
  try {
    response = await callApi(env, "backups/import", {
      method: "POST",
      token: "test-secret",
      headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
      body: JSON.stringify({ site: importedSite, manifest: importedManifest }),
    });
  } finally {
    console.error = originalConsoleError;
    env.HUGO_PHOTOS.putInterceptor = null;
  }

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "Partial Restore");
  assert.equal((await (await callApi(env, "photos")).json()).photos[0].title, "partially restored");
  assert.deepEqual(await (await callApi(env, "site")).json(), beforeSite);
  assert.equal((await loadBackupIndex(env.HUGO_PHOTOS)).backups.length, 1);
});

test("mutations reject cross-origin browser requests", async () => {
  const env = await createEnvironment();
  const response = await callApi(env, "site", {
    method: "PUT",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://example.com" },
    body: JSON.stringify({ home: {} }),
  });
  assert.equal(response.status, 403);
});

test("JSON limits use actual body bytes when content-length is absent", async () => {
  const env = await createEnvironment();
  const response = await callApi(env, "site", {
    method: "PUT",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify({ home: {}, padding: "x".repeat(5 * 1024 * 1024) }),
  });
  assert.equal(response.status, 413);
});

test("deleting a photo keeps its media protected by the backup index", async () => {
  const env = await createEnvironment();
  const manifest = await (await callApi(env, "photos")).json();
  const photo = manifest.photos[0];
  const response = await callApi(env, `photos/${photo.id}`, {
    method: "DELETE",
    token: "test-secret",
    headers: { origin: "https://hugoaviation.com" },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).manifest.photos.length, 0);
  assert.ok(env.HUGO_PHOTOS.objects.has(photo.storageKey));
  assert.ok(env.HUGO_PHOTOS.objects.has(photo.thumbnailKey));
  const index = JSON.parse(await (await env.HUGO_PHOTOS.get("backups/index.json")).text());
  assert.ok(index.mediaKeys.includes(photo.storageKey));
});

test("site-only media stays protected by current config and backup history", async () => {
  const env = await createEnvironment();
  const key = "uploads/2020/site-only.jpg";
  const site = await (await callApi(env, "site")).json();
  site.home.images[0].src = `/media/${key}`;
  await env.HUGO_PHOTOS.put("site/config.json", JSON.stringify(site), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  await env.HUGO_PHOTOS.put(key, new Blob(["site-only"], { type: "image/jpeg" }), {
    httpMetadata: { contentType: "image/jpeg" },
  });
  env.HUGO_PHOTOS.objects.get(key).uploaded = new Date("2020-01-01T00:00:00.000Z");

  const currentAudit = await (await callApi(env, "storage", { token: "test-secret" })).json();
  assert.equal(currentAudit.orphanCount, 0);

  await createBackup(env.HUGO_PHOTOS, "site media protection");
  const index = await loadBackupIndex(env.HUGO_PHOTOS);
  assert.ok(index.mediaKeys.includes(key));

  const backupKey = `backups/${index.backups[0].id}.json`;
  const legacyBackup = JSON.parse(await (await env.HUGO_PHOTOS.get(backupKey)).text());
  delete legacyBackup.mediaKeys;
  await env.HUGO_PHOTOS.put(backupKey, JSON.stringify(legacyBackup), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  await env.HUGO_PHOTOS.put("backups/index.json", JSON.stringify({ ...index, mediaKeys: [] }), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });

  site.home.images[0].src = "";
  await env.HUGO_PHOTOS.put("site/config.json", JSON.stringify(site), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  const historicalAudit = await (await callApi(env, "storage", { token: "test-secret" })).json();
  assert.equal(historicalAudit.orphanCount, 0);
});

test("thumbnail replacement preserves the previous object through a backup", async () => {
  const env = await createEnvironment();
  const manifest = await (await callApi(env, "photos")).json();
  const photo = manifest.photos[0];
  const previousThumbnailKey = photo.thumbnailKey;
  const form = new FormData();
  form.append("id", photo.id);
  form.append("thumbnail", jpegBlob("replacement"), "replacement.jpg");

  const response = await callApi(env, "photos/thumbnails", {
    method: "POST",
    token: "test-secret",
    headers: { origin: "https://hugoaviation.com" },
    body: form,
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  const updated = data.photos[0];
  assert.notEqual(updated.thumbnailKey, previousThumbnailKey);
  assert.ok(env.HUGO_PHOTOS.objects.has(updated.thumbnailKey));
  assert.ok(env.HUGO_PHOTOS.objects.has(previousThumbnailKey));

  const index = JSON.parse(await (await env.HUGO_PHOTOS.get("backups/index.json")).text());
  assert.ok(index.mediaKeys.includes(previousThumbnailKey));
  const backupKey = `backups/${index.backups[0].id}.json`;
  const backup = JSON.parse(await (await env.HUGO_PHOTOS.get(backupKey)).text());
  assert.equal(backup.manifest.photos[0].thumbnailKey, previousThumbnailKey);
});

test("adding a missing thumbnail does not churn the backup ring", async () => {
  const env = await createEnvironment();
  const manifest = await (await callApi(env, "photos")).json();
  const photo = { ...manifest.photos[0], thumbnailKey: "", thumbSrc: "" };
  await env.HUGO_PHOTOS.put("photos/manifest.json", JSON.stringify({ ...manifest, photos: [photo] }), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
  const form = new FormData();
  form.append("id", photo.id);
  form.append("thumbnail", jpegBlob("new thumbnail"), "thumbnail.jpg");
  const response = await callApi(env, "photos/thumbnails", {
    method: "POST",
    token: "test-secret",
    headers: { origin: "https://hugoaviation.com" },
    body: form,
  });
  assert.equal(response.status, 200);
  const index = JSON.parse(await (await env.HUGO_PHOTOS.get("backups/index.json")).text());
  assert.equal(index.backups.length, 0);
});

test("thumbnail uploads enforce the smaller per-file limit", async () => {
  const env = await createEnvironment();
  const manifest = await (await callApi(env, "photos")).json();
  const form = new FormData();
  form.append("id", manifest.photos[0].id);
  form.append("thumbnail", new Blob([new Uint8Array(4 * 1024 * 1024 + 1)], { type: "image/jpeg" }), "huge.jpg");
  const response = await callApi(env, "photos/thumbnails", {
    method: "POST",
    token: "test-secret",
    headers: { origin: "https://hugoaviation.com" },
    body: form,
  });
  assert.equal(response.status, 413);
});

test("chunked multipart uploads are stopped at the wire-byte limit before fully buffering the request", async () => {
  const env = await createEnvironment();
  let chunksRead = 0;
  let canceled = false;
  const chunk = new Uint8Array(1024 * 1024);
  const body = new ReadableStream({
    pull(controller) {
      chunksRead += 1;
      if (chunksRead === 1) {
        controller.enqueue(new TextEncoder().encode('--test-boundary\r\nContent-Disposition: form-data; name="file"; filename="huge.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'));
      } else if (chunksRead < 100) controller.enqueue(chunk);
      else controller.close();
    },
    cancel() { canceled = true; },
  });
  const response = await callApi(env, "photos", {
    method: "POST", token: "test-secret",
    headers: { "content-type": "multipart/form-data; boundary=test-boundary" }, body,
  });
  assert.equal(response.status, 413);
  assert.ok(chunksRead < 45, `Read ${chunksRead} chunks before rejecting`);
  assert.equal(canceled, true);
  assert.equal((await (await callApi(env, "photos")).json()).photos.length, 1);
});

test("image uploads verify magic bytes and use an extension matching the detected type", async () => {
  const env = await createEnvironment();
  const before = await (await callApi(env, "photos")).json();
  const invalidForm = new FormData();
  invalidForm.append("file", new Blob(["<script>alert(1)</script>"], { type: "image/jpeg" }), "payload.html");
  const invalid = await callApi(env, "photos", {
    method: "POST",
    token: "test-secret",
    headers: { origin: "https://hugoaviation.com" },
    body: invalidForm,
  });
  assert.equal(invalid.status, 415);
  assert.equal((await (await callApi(env, "photos")).json()).photos.length, before.photos.length);

  const validForm = new FormData();
  validForm.append("file", jpegBlob("valid upload"), "plane.html");
  validForm.append("title", "Validated upload");
  const valid = await callApi(env, "photos", {
    method: "POST",
    token: "test-secret",
    headers: { origin: "https://hugoaviation.com" },
    body: validForm,
  });
  assert.equal(valid.status, 200);
  const uploaded = (await valid.json()).photo;
  assert.match(uploaded.storageKey, /plane\.jpg$/);
  assert.equal(env.HUGO_PHOTOS.objects.get(uploaded.storageKey).httpMetadata.contentType, "image/jpeg");
});

test("ISO image signatures respect ftyp boundaries and accept the HEIF umbrella MIME type", async () => {
  const env = await createEnvironment();
  const makeFtyp = (brand, compatibility, declaredType) => {
    const bytes = new Uint8Array(32);
    new DataView(bytes.buffer).setUint32(0, 20);
    bytes.set(new TextEncoder().encode("ftyp"), 4);
    bytes.set(new TextEncoder().encode(brand), 8);
    bytes.set(new TextEncoder().encode(compatibility), 16);
    return new Blob([bytes], { type: declaredType });
  };
  const upload = (file) => {
    const form = new FormData();
    form.append("file", file, "photo.heif");
    return callApi(env, "photos", { method: "POST", token: "test-secret", body: form });
  };
  assert.equal((await upload(makeFtyp("heic", "mif1", "image/heif"))).status, 200);
  assert.equal((await upload(makeFtyp("avif", "mif1", "image/avif"))).status, 200);
  const invalid = new Uint8Array(await makeFtyp("isom", "isom", "image/avif").arrayBuffer());
  invalid.set(new TextEncoder().encode("avif"), 24);
  assert.equal((await upload(new Blob([invalid], { type: "image/avif" }))).status, 415);
});

test("no-op photo edits do not consume backup slots or increment the manifest revision", async () => {
  const env = await createEnvironment();
  const before = await (await callApi(env, "photos")).json();
  const response = await callApi(env, `photos/${before.photos[0].id}`, {
    method: "PATCH",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify({ title: before.photos[0].title, airport: before.photos[0].airport.toLowerCase(), move: "" }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).manifest.revision, before.revision);
  assert.equal((await loadBackupIndex(env.HUGO_PHOTOS)).backups.length, 0);
});

test("photo edits, batch updates, and library clearing preserve restorable data", async () => {
  const env = await createEnvironment();
  const original = await loadManifest(env.HUGO_PHOTOS);
  const second = { ...original.photos[0], id: "second-photo", title: "Second", notes: "", airport: "" };
  await saveManifest(env.HUGO_PHOTOS, original, [{ ...original.photos[0], notes: "Keep this note" }, second]);
  const edited = await callApi(env, `photos/${second.id}`, {
    method: "PATCH", token: "test-secret", headers: { "content-type": "application/json" },
    body: JSON.stringify({ airport: "can", move: "front", layout: "featured" }),
  });
  assert.equal(edited.status, 200);
  const editedBody = await edited.json();
  assert.equal(editedBody.manifest.photos[0].id, second.id);
  assert.equal(editedBody.photo.airport, "CAN");
  assert.equal(editedBody.photo.featured, true);
  const batch = await callApi(env, "photos/batch", {
    method: "PATCH", token: "test-secret", headers: { "content-type": "application/json" },
    body: JSON.stringify({ ids: [original.photos[0].id, second.id], onlyEmpty: true, updates: { notes: "New note" } }),
  });
  assert.equal(batch.status, 200);
  const batchBody = await batch.json();
  assert.equal(batchBody.updated, 1);
  assert.equal(batchBody.manifest.photos.find((photo) => photo.id === original.photos[0].id).notes, "Keep this note");
  const cleared = await callApi(env, "photos", { method: "DELETE", token: "test-secret" });
  assert.equal(cleared.status, 200);
  assert.equal((await cleared.json()).deleted, 2);
  const index = await loadBackupIndex(env.HUGO_PHOTOS);
  assert.equal(index.backups.length, 3);
  assert.equal(index.backups[0].photoCount, 2);
  assert.ok(index.mediaKeys.includes(original.photos[0].storageKey));
  assert.ok(env.HUGO_PHOTOS.objects.has(original.photos[0].storageKey));
});

test("media route serves only uploads and thumbnails", async () => {
  const env = await createEnvironment();
  const manifest = await (await callApi(env, "photos")).json();
  const key = manifest.photos[0].storageKey;
  const response = await mediaRequest({
    request: new Request(`https://hugoaviation.com/media/${key}`),
    env,
    params: { path: key.split("/") },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.ok(response.headers.get("etag"));
  assert.ok(response.headers.get("last-modified"));

  const notModified = await mediaRequest({
    request: new Request(`https://hugoaviation.com/media/${key}`, {
      headers: { "if-none-match": `"unrelated", ${response.headers.get("etag")}` },
    }),
    env,
    params: { path: key.split("/") },
  });
  assert.equal(notModified.status, 304);

  const ranged = await mediaRequest({
    request: new Request(`https://hugoaviation.com/media/${key}`, { headers: { range: "bytes=1-3" } }),
    env,
    params: { path: key.split("/") },
  });
  assert.equal(ranged.status, 206);
  assert.equal(ranged.headers.get("content-range"), "bytes 1-3/8");
  assert.equal(await ranged.text(), "rig");

  const matchedIfRange = await mediaRequest({
    request: new Request(`https://hugoaviation.com/media/${key}`, {
      headers: { range: "bytes=1-3", "if-range": response.headers.get("etag") },
    }),
    env,
    params: { path: key.split("/") },
  });
  assert.equal(matchedIfRange.status, 206);
  assert.equal(await matchedIfRange.text(), "rig");

  const staleIfRange = await mediaRequest({
    request: new Request(`https://hugoaviation.com/media/${key}`, {
      headers: { range: "bytes=1-3", "if-range": '"stale"' },
    }),
    env,
    params: { path: key.split("/") },
  });
  assert.equal(staleIfRange.status, 200);
  assert.equal(await staleIfRange.text(), "original");

  const invalidRange = await mediaRequest({
    request: new Request(`https://hugoaviation.com/media/${key}`, { headers: { range: "bytes=99-100" } }),
    env,
    params: { path: key.split("/") },
  });
  assert.equal(invalidRange.status, 416);
  assert.equal(invalidRange.headers.get("content-range"), "bytes */8");

  const head = await mediaRequest({
    request: new Request(`https://hugoaviation.com/media/${key}`, { method: "HEAD" }),
    env,
    params: { path: key.split("/") },
  });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), String("original".length));
  assert.equal(await head.text(), "");

  const blocked = await mediaRequest({
    request: new Request("https://hugoaviation.com/media/photos/manifest.json"),
    env,
    params: { path: ["photos", "manifest.json"] },
  });
  assert.equal(blocked.status, 404);
});

test("media route forces unexpected R2 content types to download safely", async () => {
  const env = await createEnvironment();
  const key = "uploads/2026/untrusted.html";
  await env.HUGO_PHOTOS.put(key, new Blob(["<h1>not an image</h1>"], { type: "text/html" }), {
    httpMetadata: { contentType: "text/html" },
  });
  const response = await mediaRequest({
    request: new Request(`https://hugoaviation.com/media/${key}`),
    env,
    params: { path: key.split("/") },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/octet-stream");
  assert.match(response.headers.get("content-disposition"), /^attachment/);
});

test("media GET and HEAD share HTTP precondition precedence and second-granularity dates", async () => {
  const env = await createEnvironment();
  const manifest = await loadManifest(env.HUGO_PHOTOS);
  const key = manifest.photos[0].storageKey;
  const object = env.HUGO_PHOTOS.objects.get(key);
  object.uploaded = new Date("2026-08-01T12:00:00.500Z");
  const etag = `"${object.etag}"`;
  const modified = object.uploaded.toUTCString();
  for (const method of ["GET", "HEAD"]) {
    for (const [headers, status] of [
      [{ "if-modified-since": modified }, 304],
      [{ "if-match": etag, "if-unmodified-since": "Sat, 01 Jan 2000 00:00:00 GMT" }, 200],
      [{ "if-match": '"stale"', "if-none-match": etag }, 412],
      [{ "if-none-match": '"stale"', "if-modified-since": "Fri, 01 Jan 2100 00:00:00 GMT" }, 200],
      [{ "if-none-match": `W/${etag}` }, 304],
      [{ "if-unmodified-since": modified }, 200],
      [{ "if-none-match": etag, range: "bytes=99-100" }, 304],
    ]) {
      const response = await mediaRequest({
        request: new Request(`https://hugoaviation.com/media/${key}`, { method, headers }),
        env, params: { path: key.split("/") },
      });
      assert.equal(response.status, status, `${method} ${JSON.stringify(headers)}`);
      if (status !== 200 || method === "HEAD") assert.equal(await response.text(), "");
    }
  }
});

test("media detects unsatisfiable ranges even when R2 returns full bytes instead of throwing", async () => {
  const env = await createEnvironment();
  const photo = (await loadManifest(env.HUGO_PHOTOS)).photos[0];
  const originalGet = env.HUGO_PHOTOS.get.bind(env.HUGO_PHOTOS);
  env.HUGO_PHOTOS.get = (key, options = {}) => originalGet(key, { onlyIf: options.onlyIf });
  env.HUGO_PHOTOS.head = () => { throw new Error("Ordinary GET must not need another R2 operation"); };
  for (const [range, expected] of [["bytes=100-110", 416], ["bytes=-0", 416], ["items=0-1", 200], ["bytes=0-1,4-5", 200]]) {
    const response = await mediaRequest({
      request: new Request(`https://hugoaviation.com/media/${photo.storageKey}`, { headers: { range } }),
      env, params: { path: photo.storageKey.split("/") },
    });
    assert.equal(response.status, expected, range);
    assert.equal(await response.text(), expected === 416 ? "" : "original");
    if (expected === 416) assert.equal(response.headers.get("content-range"), "bytes */8");
  }
});

test("orphan cleanup caps each R2 delete batch at 1000 objects", async () => {
  const env = await createEnvironment();
  const bytes = new TextEncoder().encode("orphan");
  for (let index = 0; index < 1001; index += 1) {
    const key = `uploads/2020/orphan-${String(index).padStart(4, "0")}.jpg`;
    env.HUGO_PHOTOS.objects.set(key, {
      bytes,
      uploaded: new Date("2020-01-01T00:00:00.000Z"),
      etag: `orphan-${index}`,
      httpMetadata: { contentType: "image/jpeg" },
    });
  }

  const auditResponse = await callApi(env, "storage", { token: "test-secret" });
  assert.equal(auditResponse.status, 200);
  const audit = await auditResponse.json();
  assert.equal(audit.eligibleCount, 1000);
  assert.equal(audit.remainingEligibleCount, 1);

  const cleanup = await callApi(env, "storage/orphans", {
    method: "DELETE",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify({ auditToken: audit.auditToken }),
  });
  assert.equal(cleanup.status, 200);
  assert.equal((await cleanup.json()).deletedCount, 1000);
  assert.equal([...env.HUGO_PHOTOS.objects.keys()].filter((key) => key.startsWith("uploads/2020/orphan-")).length, 1);
});

test("orphan cleanup lease rejects a concurrent mutation that could add a reference", { timeout: 3000 }, async () => {
  const env = await createEnvironment();
  const key = "uploads/2020/concurrent-orphan.jpg";
  const bytes = new TextEncoder().encode("orphan");
  env.HUGO_PHOTOS.objects.set(key, {
    bytes,
    uploaded: new Date("2020-01-01T00:00:00.000Z"),
    etag: "concurrent-orphan",
    httpMetadata: { contentType: "image/jpeg" },
  });
  const audit = await (await callApi(env, "storage", { token: "test-secret" })).json();

  let signalDeleteStarted;
  let resumeDelete;
  const deleteStarted = new Promise((resolveStarted) => { signalDeleteStarted = resolveStarted; });
  const deletionReleased = new Promise((resolveReleased) => { resumeDelete = resolveReleased; });
  env.HUGO_PHOTOS.beforeDelete = async (keys) => {
    if (!keys.includes(key)) return;
    signalDeleteStarted();
    await deletionReleased;
  };

  const cleanupPromise = callApi(env, "storage/orphans", {
    method: "DELETE",
    token: "test-secret",
    headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
    body: JSON.stringify({ auditToken: audit.auditToken }),
  });
  await deleteStarted;

  let concurrentMutation;
  let cleanup;
  try {
    const site = await (await callApi(env, "site")).json();
    site.home.images[0].src = `/media/${key}`;
    concurrentMutation = await callApi(env, "site", {
      method: "PUT",
      token: "test-secret",
      headers: { "content-type": "application/json", origin: "https://hugoaviation.com" },
      body: JSON.stringify(site),
    });
  } finally {
    resumeDelete();
    cleanup = await cleanupPromise;
    env.HUGO_PHOTOS.beforeDelete = null;
  }
  assert.equal(concurrentMutation.status, 409);
  assert.equal(cleanup.status, 200);
  assert.equal(env.HUGO_PHOTOS.objects.has(key), false);
});
