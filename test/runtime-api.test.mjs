import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";

// Resolve from Wrangler, rather than assuming its runtime dependency is hoisted.
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve("wrangler/package.json"));
const { Miniflare, convertV4MiniflareOptions } = wranglerRequire("miniflare");
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const origin = "https://runtime-test.example";
const adminHeaders = { authorization: "Bearer runtime-test-secret" };

const workerEntry = `
  import { onRequest as mediaRequest } from './functions/media/[[path]].js';
  import { onRequest as apiRequest } from './functions/api/[[path]].js';
  export default {
    async fetch(request, env) {
      const pathname = new URL(request.url).pathname;
      if (pathname === '/__test/cas') {
        const first = await env.HUGO_PHOTOS.put('test/create-only', 'first', {
          onlyIf: new Headers({'if-none-match': '*'}),
        });
        const duplicate = await env.HUGO_PHOTOS.put('test/create-only', 'duplicate', {
          onlyIf: new Headers({'if-none-match': '*'}),
        });
        const replaced = await env.HUGO_PHOTOS.put('test/create-only', 'replacement', {
          onlyIf: {etagMatches: first.etag},
        });
        const stale = await env.HUGO_PHOTOS.put('test/create-only', 'stale', {
          onlyIf: {etagMatches: first.etag},
        });
        return Response.json({first: Boolean(first), duplicate, replaced: Boolean(replaced), stale});
      }
      const isApi = pathname.startsWith('/api/');
      const path = pathname.slice(isApi ? 5 : 7).split('/');
      return (isApi ? apiRequest : mediaRequest)({request, env, params: {path}});
    },
  };
`;

test("Cloudflare workerd integration: R2, HTTP semantics, uploads, and preview safety", { timeout: 30_000 }, async (t) => {
  const runtimeDirectory = await mkdtemp(join(tmpdir(), "hugo-runtime-test-"));
  let runtime;
  t.after(async () => {
    try {
      await runtime?.dispose();
    } finally {
      await rm(runtimeDirectory, { recursive: true, force: true });
    }
  });
  const bundled = await build({
    stdin: { contents: workerEntry, resolveDir: projectRoot },
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    target: "es2022",
  });
  const shared = {
    modules: true,
    script: bundled.outputFiles[0].text,
    compatibilityDate: "2026-09-03",
    compatibilityFlags: ["nodejs_compat"],
    r2Buckets: { HUGO_PHOTOS: "isolated-test-photos" },
  };
  const options = {
    host: "127.0.0.1",
    cf: false,
    telemetry: { enabled: false },
    resourceTmpPath: join(runtimeDirectory, "tmp"),
    isolatedResourcePersistencePath: join(runtimeDirectory, "storage"),
    unsafeDevRegistryPath: join(runtimeDirectory, "registry"),
    workers: [
      { ...shared, name: "production", bindings: { ADMIN_TOKEN: "runtime-test-secret", HUGO_READ_ONLY: "false", CF_PAGES_BRANCH: "feature/local" } },
      { ...shared, name: "preview", bindings: { ADMIN_TOKEN: "runtime-test-secret", HUGO_READ_ONLY: "true", CF_PAGES_BRANCH: "main" } },
    ],
  };
  // Wrangler currently bundles Miniflare 5, whose adapter accepts the stable V4
  // configuration shape; retain compatibility if Wrangler uses V4 directly.
  runtime = new Miniflare(typeof convertV4MiniflareOptions === "function" ? convertV4MiniflareOptions(options) : options);
  const bucket = await runtime.getR2Bucket("HUGO_PHOTOS", "production");
  const mediaUrl = `${origin}/media/uploads/runtime.jpg`;
  await bucket.put("uploads/runtime.jpg", "original", { httpMetadata: { contentType: "image/jpeg" } });

  await t.test("ordinary GET/HEAD and conditional byte ranges use real R2 metadata", async () => {
    const initial = await runtime.dispatchFetch(mediaUrl);
    assert.equal(initial.status, 200, "R2 full-range metadata must not turn a normal GET into 206");
    assert.equal(await initial.text(), "original");
    assert.equal(initial.headers.get("content-length"), "8");
    const etag = initial.headers.get("etag");
    const modified = initial.headers.get("last-modified");
    assert.ok(etag);
    assert.ok(modified);
    const cases = [
      ["date validator", { "if-modified-since": modified }, 304, ""],
      ["ETag list", { "if-none-match": `"unrelated", ${etag}` }, 304, ""],
      ["weak ETag", { "if-none-match": `W/${etag}` }, 304, ""],
      ["If-Match precedence", { "if-match": etag, "if-unmodified-since": "Sat, 01 Jan 2000 00:00:00 GMT" }, 200, "original"],
      ["If-None-Match precedence", { "if-none-match": '"stale"', "if-modified-since": "Fri, 01 Jan 2100 00:00:00 GMT" }, 200, "original"],
      ["failed write-style precondition", { "if-match": '"stale"' }, 412, ""],
      ["byte range", { range: "bytes=1-3" }, 206, "rig"],
      ["matching date If-Range", { range: "bytes=1-3", "if-range": modified }, 206, "rig"],
      ["stale If-Range", { range: "bytes=1-3", "if-range": '"stale"' }, 200, "original"],
      ["precondition before unsatisfiable range", { range: "bytes=100-110", "if-none-match": etag }, 304, ""],
      ["unsatisfiable range", { range: "bytes=100-110" }, 416, ""],
      ["zero-byte suffix", { range: "bytes=-0" }, 416, ""],
      ["unsupported range unit is ignored", { range: "items=0-1" }, 200, "original"],
      ["multiple ranges are ignored", { range: "bytes=0-1,4-5" }, 200, "original"],
    ];
    for (const [name, headers, status, body] of cases) {
      const response = await runtime.dispatchFetch(mediaUrl, { headers });
      const actualBody = await response.text();
      assert.equal(response.status, status, `${name}: ${response.headers.get("content-range")}, ${actualBody.length} body bytes`);
      assert.equal(actualBody, body, name);
      if (status === 206) assert.equal(response.headers.get("content-range"), "bytes 1-3/8", name);
      if (status === 416) assert.equal(response.headers.get("content-range"), "bytes */8", name);
    }
    const head = await runtime.dispatchFetch(mediaUrl, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("content-length"), "8");
    assert.equal(await head.text(), "");
    const headConditional = await runtime.dispatchFetch(mediaUrl, { method: "HEAD", headers: { "if-none-match": etag } });
    assert.equal(headConditional.status, 304);
  });

  await t.test("R2 creation conditions and optimistic concurrency reject stale writes", async () => {
    const response = await runtime.dispatchFetch(`${origin}/__test/cas`);
    assert.deepEqual(await response.json(), { first: true, duplicate: null, replaced: true, stale: null });
    assert.equal(await (await bucket.get("test/create-only")).text(), "replacement");
  });

  let uploadedPhoto;
  await t.test("multipart upload validates and persists files through the mutation lease", async () => {
    const upload = async (file) => {
      const form = new FormData();
      form.append("file", file, "runtime.html");
      form.append("title", "Runtime upload");
      // Encode using Node's native multipart implementation, then pass wire bytes
      // across Miniflare's own Request/Headers realm just as a browser would.
      const request = new Request(`${origin}/api/photos`, { method: "POST", headers: adminHeaders, body: form });
      return runtime.dispatchFetch(request.url, {
        method: "POST", headers: Object.fromEntries(request.headers), body: await request.arrayBuffer(),
      });
    };
    const rejected = await upload(new Blob(["<html>not an image</html>"], { type: "image/jpeg" }));
    assert.equal(rejected.status, 415);
    await rejected.text();
    const response = await upload(new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "runtime"], { type: "image/jpeg" }));
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(result.manifest.photos.length, 1);
    uploadedPhoto = result.photo;
    assert.match(uploadedPhoto.storageKey, /runtime\.jpg$/);
    assert.equal((await bucket.head(uploadedPhoto.storageKey)).httpMetadata.contentType, "image/jpeg");
    const lock = JSON.parse(await (await bucket.get("maintenance/mutation-lock.json")).text());
    assert.equal(lock.owner, "", "lease is released after an upload");
  });

  await t.test("homepage contract selects only referenced photos and supports cache validation", async () => {
    assert.ok(uploadedPhoto, "the preceding real upload must succeed");
    const site = JSON.parse(await readFile(new URL("../data/seed/site.json", import.meta.url), "utf8"));
    const emptyHome = await runtime.dispatchFetch(`${origin}/api/home`);
    assert.deepEqual((await emptyHome.json()).manifest.photos, []);
    site.home.images = [{ ...site.home.images[0], src: uploadedPhoto.src }];
    site.home.airportCovers = {};
    await bucket.put("site/config.json", JSON.stringify(site));
    const response = await runtime.dispatchFetch(`${origin}/api/home`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload.site, site);
    assert.deepEqual(payload.manifest.photos, [uploadedPhoto]);
    const etag = response.headers.get("etag");
    const head = await runtime.dispatchFetch(`${origin}/api/home`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get("etag"), etag);
    assert.equal(await head.text(), "");
    const conditional = await runtime.dispatchFetch(`${origin}/api/home`, { headers: { "if-none-match": etag } });
    assert.equal(conditional.status, 304);
    site.home.hero.greeting = "Runtime changed";
    await bucket.put("site/config.json", JSON.stringify(site));
    const changed = await runtime.dispatchFetch(`${origin}/api/home`, { headers: { "if-none-match": etag } });
    assert.equal(changed.status, 200);
    assert.notEqual(changed.headers.get("etag"), etag);
    await changed.text();
  });

  await t.test("preview runtime rejects mutation while allowing authenticated reads", async () => {
    const preview = await runtime.getWorker("preview");
    const before = await (await bucket.get("photos/manifest.json")).text();
    const auth = await preview.fetch(`${origin}/api/auth/check`, { method: "POST", headers: adminHeaders });
    assert.equal(auth.status, 200);
    await auth.text();
    const denied = await preview.fetch(`${origin}/api/photos`, { method: "DELETE", headers: adminHeaders });
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).error, "Preview Is Read-Only");
    assert.equal(await (await bucket.get("photos/manifest.json")).text(), before);
    const publicRead = await preview.fetch(`${origin}/api/home`);
    assert.equal(publicRead.status, 200);
    await publicRead.text();
  });
});
