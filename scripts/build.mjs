import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = join(projectRoot, "src");
const publicRoot = join(projectRoot, "public");
const outputRoot = join(projectRoot, "dist");
const generatedRoot = join(outputRoot, "assets", "generated");
const seedRoot = join(projectRoot, "data", "seed");
const mapLibreSourceRoot = join(projectRoot, "node_modules", "maplibre-gl");
const mapLibreOutputRoot = join(outputRoot, "assets", "vendor", "maplibre-6.7.0");
const pages = ["index", "works", "admin"];

const digest = (value) => createHash("sha256").update(value).digest("hex").slice(0, 12);
const inlineJson = (value) => JSON.stringify(value)
  .replaceAll("<", "\\u003c")
  .replaceAll("\u2028", "\\u2028")
  .replaceAll("\u2029", "\\u2029");
const escapeAttribute = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll('"', "&quot;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;");

const [photoSeed, siteSeed, previews] = await Promise.all([
  readFile(join(seedRoot, "photos.json"), "utf8").then(JSON.parse),
  readFile(join(seedRoot, "site.json"), "utf8").then(JSON.parse),
  readFile(join(publicRoot, "assets", "previews", "index.json"), "utf8").then(JSON.parse)
    .catch((error) => { if (error.code === "ENOENT") return {}; throw error; }),
]);
const seededPhotos = Array.isArray(photoSeed?.photos) ? photoSeed.photos : [];
const homeReferences = new Set([
  ...(siteSeed.home?.images || []),
  ...Object.values(siteSeed.home?.airportCovers || {}),
].map((image) => image?.src).filter(Boolean));
const homePhotos = seededPhotos.filter((photo) => homeReferences.has(photo.src));
const previewsFor = (photos) => Object.fromEntries(photos
  .filter((photo) => previews[photo.thumbSrc])
  .map((photo) => [photo.thumbSrc, previews[photo.thumbSrc]]));
const previewIndexJson = JSON.stringify(previews);
const previewIndexName = `previews.${digest(previewIndexJson)}.json`;
const photoPreview = (photo) => previews[photo?.thumbSrc] || photo?.thumbSrc || photo?.src || "";
const homepagePhotoFields = [
  "id", "src", "thumbSrc", "title", "alt", "airline", "aircraft", "registration",
  "airport", "capturedAt", "phase", "spot", "notes", "categories", "layout", "createdAt",
];
const compactPhoto = (photo) => Object.fromEntries(homepagePhotoFields
  .filter((key) => photo?.[key] !== undefined && photo?.[key] !== null && photo?.[key] !== "")
  .map((key) => [key, photo[key]]));
const homepageSeed = {
  site: siteSeed,
  manifest: {
    updatedAt: photoSeed.updatedAt,
    revision: photoSeed.revision,
    photos: homePhotos.map(compactPhoto),
  },
  previews: previewsFor(homePhotos),
};
const worksSeed = {
  updatedAt: photoSeed.updatedAt,
  revision: photoSeed.revision,
  photos: seededPhotos.slice(0, 30),
  previews: previewsFor(seededPhotos.slice(0, 30)),
  previewIndexUrl: `/assets/generated/${previewIndexName}`,
};

const firstWorksPhoto = seededPhotos[0];
const firstWorksPreview = photoPreview(firstWorksPhoto);
const worksPreload = firstWorksPreview
  ? `<link rel="preload" href="${escapeAttribute(firstWorksPreview)}" as="image" fetchpriority="high">`
  : "";
const worksFallback = seededPhotos.slice(0, 6).map((photo) => {
  const source = photoPreview(photo);
  const alt = photo.alt || photo.title || "航空摄影作品";
  return `<figure><img src="${escapeAttribute(source)}" alt="${escapeAttribute(alt)}" loading="lazy" decoding="async"><figcaption>${escapeAttribute(photo.title || alt)}</figcaption></figure>`;
}).join("");

await rm(outputRoot, { recursive: true, force: true });
if (process.argv.includes("--clean-only")) {
  console.log("Removed dist/");
  process.exit(0);
}

await mkdir(outputRoot, { recursive: true });
await cp(publicRoot, outputRoot, { recursive: true });
await mkdir(generatedRoot, { recursive: true });
await writeFile(join(generatedRoot, previewIndexName), previewIndexJson);
await rm(join(outputRoot, "assets", "previews", "index.json"), { force: true });
await rm(join(outputRoot, "assets", "vendor", "maplibre-5.24.0"), { recursive: true, force: true });
await mkdir(mapLibreOutputRoot, { recursive: true });
await Promise.all([
  ["dist/maplibre-gl.mjs", "maplibre-gl.mjs"],
  ["dist/maplibre-gl-shared.mjs", "maplibre-gl-shared.mjs"],
  ["dist/maplibre-gl-worker.mjs", "maplibre-gl-worker.mjs"],
  ["dist/maplibre-gl.css", "maplibre-gl.css"],
  ["LICENSE.txt", "LICENSE.txt"],
].map(([source, destination]) => cp(
  join(mapLibreSourceRoot, source),
  join(mapLibreOutputRoot, destination),
)));

// Keep a complete static fallback so a temporary Functions/R2 outage never produces an empty site.
await writeFile(join(outputRoot, "photos.json"), `${JSON.stringify(photoSeed)}\n`);

const outputs = [];
for (const page of pages) {
  const [sourceStyle, sourceScript] = await Promise.all([
    readFile(join(sourceRoot, "styles", `${page}.css`), "utf8"),
    readFile(join(sourceRoot, "scripts", `${page}.js`), "utf8"),
  ]);
  const [{ code: style }, { code: script }] = await Promise.all([
    transform(sourceStyle, { loader: "css", minify: true, target: "es2022", legalComments: "none" }),
    transform(sourceScript, { loader: "js", minify: true, target: "es2022", legalComments: "none" }),
  ]);
  const styleName = `${page}.${digest(style)}.css`;
  const scriptName = `${page}.${digest(script)}.js`;

  await writeFile(join(generatedRoot, styleName), style);
  await writeFile(join(generatedRoot, scriptName), script);

  const sourceHtml = await readFile(join(sourceRoot, "pages", `${page}.html`), "utf8");
  let html = sourceHtml
    .replace("<!-- BUILD:PREVIEW_INDEX -->", `<meta name="photo-preview-index" content="/assets/generated/${previewIndexName}">`)
    .replaceAll(`assets/generated/${page}.css`, `assets/generated/${styleName}`)
    .replaceAll(`assets/generated/${page}.js`, `assets/generated/${scriptName}`);

  if (page === "index") {
    // Replace only markup sources; keep embedded metadata's original URLs for exact version matching.
    for (const [source, preview] of Object.entries(previews)) {
      html = html.replaceAll(`src="${escapeAttribute(source)}"`, `src="${escapeAttribute(preview)}"`);
    }
    html = html.replace(
      "<!-- BUILD:INITIAL_HOMEPAGE_DATA -->",
      `<script type="application/json" id="initialHomepageData">${inlineJson(homepageSeed)}</script>`,
    );
  }
  if (page === "works") {
    html = html
      .replace("<!-- BUILD:WORKS_PRELOAD -->", worksPreload)
      .replace(
        "<!-- BUILD:INITIAL_WORKS_DATA -->",
        `<script type="application/json" id="initialWorksData">${inlineJson(worksSeed)}</script>`,
      )
      .replace(
        "<!-- BUILD:WORKS_FALLBACK -->",
        `<noscript><section class="noscript-gallery" aria-label="精选航空作品">${worksFallback}</section></noscript>`,
      );
  }

  if (html === sourceHtml) {
    throw new Error(`No editable asset references were found in src/pages/${page}.html`);
  }
  await writeFile(join(outputRoot, `${page}.html`), html);
  outputs.push(`${page}.html -> ${styleName}, ${scriptName}`);
}

console.log(`Built ${outputs.length} pages into dist/`);
outputs.forEach((entry) => console.log(`  ${entry}`));
