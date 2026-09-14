// Isolated local R2 sandbox. Never connects to Cloudflare or writes production data.
import { readFile, mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const wranglerRequire = createRequire(require.resolve("wrangler/package.json"));
const { Miniflare, convertV4MiniflareOptions } = wranglerRequire("miniflare");
const temporary = await mkdtemp(join(tmpdir(), "hugo-admin-sandbox-"));
const bundle = await build({ stdin: { contents: `
import {onRequest} from './functions/api/[[path]].js';
export default {fetch(request,env){return onRequest({request,env,params:{path:new URL(request.url).pathname.slice(5).split('/')}})}};
`, resolveDir: root }, bundle: true, write: false, format: "esm", platform: "browser" });
const options = { host: "127.0.0.1", cf: false, telemetry: { enabled: false },
  resourceTmpPath: join(temporary, "tmp"), isolatedResourcePersistencePath: join(temporary, "storage"), unsafeDevRegistryPath: join(temporary, "registry"),
  workers: [{ name: "admin-sandbox", modules: true, script: bundle.outputFiles[0].text,
    compatibilityDate: "2026-09-03", r2Buckets: { HUGO_PHOTOS: "local-only" },
    bindings: { ADMIN_TOKEN: "local-admin-test", HUGO_READ_ONLY: "false" } }] };
const runtime = new Miniflare(convertV4MiniflareOptions ? convertV4MiniflareOptions(options) : options);
const bucket = await runtime.getR2Bucket("HUGO_PHOTOS", "admin-sandbox");
for (const [key, file] of [["site/config.json", "site.json"], ["photos/manifest.json", "photos.json"]]) {
  await bucket.put(key, await readFile(join(root, "data/seed", file)));
}
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1:4187");
    if (url.pathname.startsWith("/api/")) {
      const chunks = []; for await (const chunk of request) chunks.push(chunk);
      const result = await runtime.dispatchFetch(url, { method: request.method, headers: request.headers,
        ...(!["GET", "HEAD"].includes(request.method) ? { body: Buffer.concat(chunks) } : {}) });
      response.writeHead(result.status, Object.fromEntries(result.headers));
      response.end(Buffer.from(await result.arrayBuffer())); return;
    }
    const base = url.pathname.startsWith("/media/") ? join(root, "recovery/deployment-029151a8/media") : join(root, "dist");
    let path = url.pathname.startsWith("/media/") ? url.pathname.slice(7) : url.pathname.slice(1);
    if (!path) path = "index.html";
    if (["admin", "works"].includes(path)) path += ".html";
    const file = resolve(base, path);
    if (!file.startsWith(`${base}/`)) throw Error("Invalid path");
    const bytes = await readFile(file);
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
    response.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream", "cache-control": "no-store" }); response.end(bytes);
  } catch { response.writeHead(404); response.end("Not found"); }
});
server.listen(4187, "127.0.0.1", () => console.log("Admin sandbox: http://127.0.0.1:4187/admin — token: local-admin-test (local test only)"));
const close = async () => { server.close(); await runtime.dispose(); process.exit(0); };
process.on("SIGINT", close); process.on("SIGTERM", close);
