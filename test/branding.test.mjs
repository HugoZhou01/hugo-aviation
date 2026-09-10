import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";

test("brand artwork is self-contained and fits favicon and app icon canvases", async () => {
  const svg = await readFile(new URL("../public/favicon.svg", import.meta.url));
  assert.doesNotMatch(svg.toString(), /<script|<image|<text|href=/);
  for (const size of [16, 32, 180, 192, 512]) {
    const png = await sharp(svg).resize(size, size).png().toBuffer();
    const metadata = await sharp(png).metadata();
    assert.equal(metadata.width, size);
    assert.equal(metadata.height, size);
  }
  const manifest = JSON.parse(await readFile(new URL("../public/site.webmanifest", import.meta.url)));
  assert.ok(manifest.icons.some(icon => icon.purpose === "maskable" && icon.sizes === "512x512"));
  assert.ok(manifest.icons.some(icon => icon.purpose === "any" && icon.sizes === "192x192"));
});
