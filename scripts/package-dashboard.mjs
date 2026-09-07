import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const preview = process.argv.includes("--preview");
if (process.argv.slice(2).some((arg) => arg !== "--preview")) throw new Error("Only --preview is supported");
const target = join(root, ".wrangler", preview ? "dashboard-preview" : "dashboard-production");
await readFile(join(root, "dist", "index.html"));
await readFile(join(root, ".wrangler", "check", "index.js"));
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(join(root, "dist"), target, { recursive: true });
await build({
  stdin: {
    contents: `import worker from './.wrangler/check/index.js';
      export default { fetch(request, env, ctx) {
        return worker.fetch(request, { ...env, HUGO_READ_ONLY: ${JSON.stringify(String(preview))} }, ctx);
      }};`,
    resolveDir: root,
  },
  bundle: true, format: "esm", platform: "browser", target: "es2022", minify: true,
  outfile: join(target, "_worker.js"),
});
await writeFile(join(target, "_routes.json"), await readFile(join(root, ".wrangler", "check", "routes.json")));
console.log(`Dashboard ${preview ? "read-only preview" : "production"} package: ${target}`);
