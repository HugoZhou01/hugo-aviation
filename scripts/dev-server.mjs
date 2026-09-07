import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(projectRoot, "dist");
const seedRoot = join(projectRoot, "data", "seed");
const recoveredMediaRoot = join(projectRoot, "local-data", "media");
const listenPort = Number.parseInt(process.env.HUGO_DEV_PORT || "4173", 10);
const listenHost = process.env.HUGO_DEV_HOST || "127.0.0.1";

const runBuild = () => new Promise((resolveBuild, rejectBuild) => {
  const child = spawn(process.execPath, [join(projectRoot, "scripts", "build.mjs")], {
    cwd: projectRoot,
    stdio: "inherit",
  });
  child.once("error", rejectBuild);
  child.once("exit", (code) => code === 0
    ? resolveBuild()
    : rejectBuild(new Error(`Build exited with status ${code}`)));
});

await runBuild();

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".avif", "image/avif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

const sendFile = async (response, filePath, method = "GET") => {
  const info = await stat(filePath);
  response.writeHead(200, {
    "content-type": mimeTypes.get(extname(filePath).toLowerCase()) || "application/octet-stream",
    "content-length": info.size,
    "cache-control": "no-cache",
  });
  if (method === "HEAD") return response.end();
  createReadStream(filePath).pipe(response);
};

const safeJoin = (base, pathname) => {
  const relative = normalize(pathname).replace(/^[/\\]+/, "");
  const candidate = resolve(base, relative);
  return candidate === base || candidate.startsWith(`${base}/`) ? candidate : null;
};

const server = createServer(async (request, response) => {
  try {
    const method = request.method || "GET";
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (["/api/photos", "/api/site", "/api/home"].includes(url.pathname)) {
      if (method !== "GET" && method !== "HEAD") {
        response.writeHead(501, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
        return response.end(JSON.stringify({
          error: "Read-only preview",
          detail: "Run `npx wrangler pages dev dist --r2 HUGO_PHOTOS` to test write operations.",
        }));
      }
      let data;
      if (url.pathname === "/api/home") {
        const [site, manifest] = await Promise.all(["site.json", "photos.json"]
          .map((name) => readFile(join(seedRoot, name), "utf8").then(JSON.parse)));
        const references = new Set([...(site.home?.images || []), ...Object.values(site.home?.airportCovers || {})]
          .map((image) => image?.src).filter(Boolean));
        data = { site, manifest: { updatedAt: manifest.updatedAt, revision: manifest.revision,
          photos: manifest.photos.filter((photo) => references.has(photo.src)) } };
      } else {
        const filename = url.pathname.endsWith("photos") ? "photos.json" : "site.json";
        data = JSON.parse(await readFile(join(seedRoot, filename), "utf8"));
      }
      const body = JSON.stringify(data);
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-cache",
        "content-length": Buffer.byteLength(body) });
      return response.end(method === "HEAD" ? undefined : body);
    }

    if (url.pathname.startsWith("/media/")) {
      const mediaPath = safeJoin(recoveredMediaRoot, url.pathname.slice("/media/".length));
      if (!mediaPath) throw Object.assign(new Error("Invalid media path"), { statusCode: 400 });
      return await sendFile(response, join(projectRoot, "public", "assets", "demo.svg"), method);
    }

    const route = url.pathname === "/"
      ? "index.html"
      : url.pathname === "/works"
        ? "works.html"
        : url.pathname === "/admin"
          ? "admin.html"
          : url.pathname.replace(/^\//, "");
    const filePath = safeJoin(outputRoot, route);
    if (!filePath) throw Object.assign(new Error("Invalid path"), { statusCode: 400 });
    await access(filePath);
    return await sendFile(response, filePath, method);
  } catch (error) {
    const statusCode = error.statusCode || (error.code === "ENOENT" ? 404 : 500);
    response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    response.end(statusCode === 404 ? "Not found" : error.message);
  }
});

server.listen(listenPort, listenHost, () => {
  console.log(`Local preview: http://${listenHost}:${listenPort}`);
  console.log("Read-only demo: all media requests use the bundled synthetic SVG placeholder.");
});
