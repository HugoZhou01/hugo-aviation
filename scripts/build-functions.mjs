import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(projectRoot, ".wrangler", "check");
const wranglerEntry = join(projectRoot, "node_modules", "wrangler", "bin", "wrangler.js");

await mkdir(outputRoot, { recursive: true });

const child = spawn(process.execPath, [
  wranglerEntry,
  "pages",
  "functions",
  "build",
  "functions",
  `--outdir=${outputRoot}`,
  `--output-routes-path=${join(outputRoot, "routes.json")}`,
], {
  cwd: projectRoot,
  env: {
    ...process.env,
    WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || join(outputRoot, "wrangler.log"),
  },
  stdio: "inherit",
});

const exitCode = await new Promise((resolveExit, rejectExit) => {
  child.once("error", rejectExit);
  child.once("exit", (code) => resolveExit(code ?? 1));
});

if (exitCode !== 0) process.exit(exitCode);
