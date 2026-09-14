import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const runFile = promisify(execFile);
const sources = Object.fromEntries(await Promise.all(["admin", "index", "works"].map(async (page) => [
  page,
  await readFile(join(projectRoot, "src", "scripts", `${page}.js`), "utf8"),
])));

// Execute the actual browser declarations with narrowly scoped browser doubles. Let V8
// find the declaration boundary so strings, regexes and nested template literals do not
// require a second, subtly different JavaScript parser in this regression harness.
function declaration(page, name) {
  const source = sources[page];
  const match = new RegExp(`^    (?:const|let) ${name}\\s*=`, "m").exec(source);
  assert.ok(match, `Missing ${page} declaration: ${name}`);
  let end = source.indexOf("\n", match.index);
  while (end !== -1) {
    const candidate = source.slice(match.index, end);
    if (candidate.trimEnd().endsWith(";")) {
      try {
        new vm.Script(candidate);
        return candidate;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    }
    end = source.indexOf("\n", end + 1);
  }
  throw new Error(`Could not parse ${page}.${name}`);
}

function subject(page, names, bindings = {}, prelude = "", exports = names) {
  const context = vm.createContext({
    URL,
    URLSearchParams,
    AbortSignal,
    structuredClone,
    console: { warn() {} },
    ...bindings,
  });
  const code = `${prelude}\n${names.map((name) => declaration(page, name)).join("\n")}\n`
    + `globalThis.subject = { ${exports.join(", ")} };`;
  new vm.Script(code, { filename: `frontend-unit:${page}` }).runInContext(context);
  return context.subject;
}

const plain = (value) => structuredClone(value);
const input = (value, dataset = {}) => ({ value, dataset });

test("collectHome edits visible fields without resetting hidden content or extension metadata", () => {
  const defaults = plain(subject("admin", ["defaultSite"]).defaultSite);
  const original = structuredClone(defaults);
  original.revision = 42;
  original.customRoot = { retained: true };
  original.home.customSection = { retained: "unexposed" };
  original.home.hero.greeting = "自定义问候";
  original.home.contact.emailHref = "mailto:owner@example.com";
  original.home.story.title = "未暴露的故事标题";
  original.home.metrics[0].unit = "mm";
  original.home.images[0].credit = "摄影版权";
  original.home.images[5].title = "未暴露的图片标题";
  original.home.images[5].description = "未暴露的图片描述";
  original.home.about.stats[0].label = "自定义统计标签";
  original.home.about.stats[0].tooltip = "保留统计说明";
  original.home.airportCovers = {
    CAN: { src: "/old-can.jpg", alt: "旧封面", credit: "CAN credit" },
    HND: { src: "/hidden-hnd.jpg", alt: "未显示机场", credit: "HND credit" },
  };
  const unchanged = structuredClone(original);
  const values = {
    "[data-story-field]": [input(" 更新故事 ", { storyField: "0.title" })],
    "[data-journal-field]": [input(" 更新手记 ", { journalField: "title" })],
    "[data-journal-post]": [input(" 更新日期 ", { journalPost: "0.date" })],
    "[data-about-stat-value]": [input(" 900 ", { aboutStatValue: "0" })],
  };
  const imageCards = original.home.images.map((image, index) => ({
    querySelector(selector) {
      const key = /data-slot-field="([^"]+)"/.exec(selector)?.[1];
      return input(index === 0 && key === "title" ? " 更新照片标题 " : String(image[key] || ""));
    },
  }));
  const airportCard = {
    dataset: { airportCover: "can" },
    querySelector(selector) {
      return input(selector.includes('"src"') ? " /new-can.webp " : " 更新机场封面 ");
    },
  };
  const { collectHome } = subject("admin", [
    "metricLabels", "homeImageDefs", "defaultSite", "cloneDefaultSite", "cloneSiteForEdit", "collectHome",
  ], {
    state: { site: original },
    normalizeAirportCode: (code) => code.trim().toUpperCase(),
    document: {
      querySelector(selector) {
        const index = Number(/data-metric-index="(\d+)"/.exec(selector)?.[1]);
        return input(index === 0 ? " 24-400mm " : original.home.metrics[index].value);
      },
      querySelectorAll: (selector) => values[selector] || [],
    },
    elements: {
      homeImageList: {
        querySelector: (selector) => imageCards[Number(/data-slot-index="(\d+)"/.exec(selector)?.[1])],
      },
      airportCoverList: { querySelectorAll: () => [airportCard] },
    },
  });
  const edited = plain(collectHome());
  assert.deepEqual(original, unchanged, "saving must not mutate the loaded revision before persistence succeeds");
  assert.equal(edited.home.metrics[0].value, "24-400mm");
  assert.equal(edited.home.images[0].title, "更新照片标题");
  assert.equal(edited.home.story.blocks[0].title, "更新故事");
  assert.equal(edited.home.journal.title, "更新手记");
  assert.equal(edited.home.journal.posts[0].date, "更新日期");
  assert.equal(edited.home.about.stats[0].value, "900");
  assert.equal(edited.revision, original.revision);
  assert.deepEqual(edited.customRoot, original.customRoot);
  assert.deepEqual(edited.home.customSection, original.home.customSection);
  assert.deepEqual(edited.home.hero, original.home.hero);
  assert.deepEqual(edited.home.contact, original.home.contact);
  assert.equal(edited.home.story.title, original.home.story.title);
  assert.equal(edited.home.metrics[0].unit, "mm");
  assert.equal(edited.home.images[0].credit, "摄影版权");
  assert.equal(edited.home.images[5].title, "未暴露的图片标题");
  assert.equal(edited.home.images[5].description, "未暴露的图片描述");
  assert.equal(edited.home.about.stats[0].label, "自定义统计标签");
  assert.equal(edited.home.about.stats[0].tooltip, "保留统计说明");
  assert.deepEqual(edited.home.airportCovers.CAN, {
    src: "/new-can.webp", alt: "更新机场封面", credit: "CAN credit",
  });
  assert.deepEqual(edited.home.airportCovers.HND, original.home.airportCovers.HND);
});

test("upload selection only accepts supported browser image formats", () => {
  const { isImageFile, isUnsupportedImageFile } = subject("admin", [
    "SAFE_IMAGE_TYPES", "UNSUPPORTED_IMAGE_TYPES", "UNSUPPORTED_IMAGE_EXTENSIONS",
    "SUPPORTED_IMAGE_EXTENSIONS", "isUnsupportedImageFile", "isImageFile",
  ]);
  for (const file of [
    { name: "photo.JPG", type: "image/jpeg" },
    { name: "photo.png", type: "" },
    { name: "photo.webp", type: "image/webp" },
    { name: "photo.avif", type: "image/avif" },
    { name: "photo.gif", type: "image/gif" },
  ]) assert.equal(isImageFile(file), true, file.name);
  for (const file of [
    { name: "photo.heic", type: "image/heic" },
    { name: "photo.HEIF", type: "" },
    { name: "photo.hif", type: "image/jpeg" },
    { name: "photo.TIF", type: "image/tiff" },
    { name: "photo.tiff", type: "" },
  ]) {
    assert.equal(isUnsupportedImageFile(file), true, file.name);
    assert.equal(isImageFile(file), false, file.name);
  }
  for (const file of [
    null,
    { name: "photo.svg", type: "image/svg+xml" },
    { name: "photo.jpg", type: "text/html" },
    { name: "photo.bmp", type: "image/bmp" },
    { name: "unknown", type: "" },
  ]) assert.equal(isImageFile(file), false, String(file?.name));
});

test("a browser decode failure rejects upload instead of silently publishing the unreadable original", async () => {
  let masterCalls = 0;
  const { preparePhotoAssets } = subject("admin", ["preparePhotoAssets"], {
    loadImage: async () => { throw new Error("decoder failed"); },
    createPhotoMaster: async () => { masterCalls += 1; },
  });
  await assert.rejects(preparePhotoAssets({ name: "corrupt.jpg", size: 200 }), /corrupt\.jpg.*JPEG.*WebP/);
  assert.equal(masterCalls, 0);
});

test("photo preparation returns the optimized pair and releases decoded image resources", async () => {
  const image = { naturalWidth: 6000, naturalHeight: 4000, src: "blob:preview", onload() {}, onerror() {} };
  const original = { name: "photo.jpg", size: 12_000_000 };
  const master = { name: "photo.webp", size: 2_000_000 };
  const thumbnail = { name: "photo-thumb.webp", size: 80_000 };
  const { preparePhotoAssets } = subject("admin", [
    "PHOTO_MAX_UPLOAD_BYTES", "formatBytes", "inferLayout", "preparePhotoAssets",
  ], {
    loadImage: async () => image,
    createPhotoMaster: async (loaded, file) => {
      assert.equal(loaded, image);
      assert.equal(file, original);
      return master;
    },
    createThumbnailFromImage: async (loaded, name) => {
      assert.equal(loaded, image);
      assert.equal(name, original.name);
      return thumbnail;
    },
  });
  const prepared = await preparePhotoAssets(original);
  assert.equal(prepared.file, master);
  assert.equal(prepared.thumbnail, thumbnail);
  assert.equal(prepared.originalSize, original.size);
  assert.equal(prepared.outputSize, master.size);
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  assert.equal(image.src, "data:,");
});

test("oversized optimized images are rejected and released before upload", async () => {
  const image = { naturalWidth: 6000, naturalHeight: 4000, src: "blob:preview" };
  let thumbnailCalls = 0;
  const { preparePhotoAssets } = subject("admin", [
    "PHOTO_MAX_UPLOAD_BYTES", "formatBytes", "inferLayout", "preparePhotoAssets",
  ], {
    loadImage: async () => image,
    createPhotoMaster: async () => ({ size: 33 * 1024 * 1024 }),
    createThumbnailFromImage: async () => { thumbnailCalls += 1; },
  });
  await assert.rejects(preparePhotoAssets({ name: "huge.jpg", size: 40_000_000 }), /超过/);
  assert.equal(thumbnailCalls, 0);
  assert.equal(image.src, "data:,");
});

for (const [page, name, id] of [
  ["index", "readInitialHomepageData", "initialHomepageData"],
  ["works", "readInitialWorksData", "initialWorksData"],
]) {
  test(`${page} reads and removes embedded JSON, and recovers from invalid or absent data`, () => {
    let removed = 0;
    let element = { textContent: '{"photos":[{"title":"<script>literal text</script>"}]}', remove() { removed += 1; } };
    const functions = subject(page, [name], {
      document: { querySelector: (selector) => selector === `#${id}` ? element : null },
    });
    assert.deepEqual(plain(functions[name]()), { photos: [{ title: "<script>literal text</script>" }] });
    assert.equal(removed, 1);
    element.textContent = "{invalid";
    assert.equal(functions[name](), null);
    assert.equal(removed, 2);
    element = null;
    assert.equal(functions[name](), null);
  });
}

test("homepage startup applies seeded content immediately and defers refresh until after load and idle", async () => {
  const initial = {
    manifest: { photos: [{ src: "/media/photo.jpg" }] },
    site: { updatedAt: "2026-09-04T00:00:00.000Z", home: { hero: { greeting: "你好" } } },
    previews: { "/media/thumb.jpg?v=1": "/assets/previews/photo.abc123.webp" },
  };
  const calls = [];
  const staticPreviews = Object.create(null);
  let onLoad;
  let onIdle;
  const context = vm.createContext({
    readInitialHomepageData: () => initial,
    staticPreviews,
    homepagePhotoSlots: [],
    cleanText: (value) => String(value || "").trim(),
    applyHomepagePhotoManifest: (manifest, force, fullManifest) => {
      assert.equal(manifest, initial.manifest);
      assert.equal(force, true);
      assert.equal(fullManifest, false, "homepage first paint must not load the complete map manifest");
      assert.equal(staticPreviews["/media/thumb.jpg?v=1"], initial.previews["/media/thumb.jpg?v=1"]);
      calls.push("manifest");
    },
    applySiteConfig: (site) => { assert.equal(site, initial.site); calls.push("site"); },
    updateScrollEffects: () => { calls.push("effects"); },
    loadHomepageContent: async () => { calls.push("refresh"); },
    document: { readyState: "loading" },
    window: {
      addEventListener: (event, callback, options) => {
        assert.equal(event, "load");
        assert.equal(options.once, true);
        onLoad = callback;
      },
      requestIdleCallback: (callback) => { onIdle = callback; },
    },
  });
  const startup = sources.index.slice(sources.index.indexOf("    const initialHomepageData ="));
  assert.ok(startup.startsWith("    const initialHomepageData ="), "Missing homepage startup sequence");
  new vm.Script(`
    let homepageSiteRevision = '';
    let homepageContentReady = false;
    let homepageRefreshQueued = false;
    ${startup}
    globalThis.inspect = () => ({ homepageSiteRevision, homepageContentReady });
  `).runInContext(context);
  assert.deepEqual(calls, ["manifest", "site", "effects"]);
  assert.equal(context.inspect().homepageSiteRevision, initial.site.updatedAt);
  assert.equal(context.inspect().homepageContentReady, false, "early page events must not duplicate the scheduled initial refresh");
  onLoad();
  assert.deepEqual(calls, ["manifest", "site", "effects"]);
  await onIdle();
  assert.equal(context.inspect().homepageContentReady, true);
  assert.deepEqual(calls, ["manifest", "site", "effects", "refresh"]);
});

test("partial embedded works data is refreshed even when its timestamp matches the complete manifest", async () => {
  const manifest = { updatedAt: "2026-09-04T00:00:00.000Z", photos: Array.from({ length: 35 }, (_, i) => ({ id: String(i), src: `/media/${i}.jpg`, thumbSrc: `/media/thumb-${i}.jpg?v=1` })) };
  let applied = 0;
  let requests = 0;
  let onLoad;
  let onIdle;
  const context = vm.createContext({
    readInitialWorksData: () => ({
      ...manifest,
      photos: manifest.photos.slice(0, 30),
      previews: { [manifest.photos[0].thumbSrc]: "/assets/previews/first.123456.webp" },
      previewIndexUrl: "/assets/generated/previews.abcdef123456.json",
    }),
    loadPhotos: async () => {
      requests += 1;
      return { photos: manifest.photos, revision: manifest.updatedAt };
    },
    loadPreviewIndex: async () => false,
    requestPhotosRefresh: (delay) => { assert.equal(delay, 0); return context.refresh(); },
    firstScreenPhotoCount: () => 2,
    waitForImageReady: async () => true,
    requestAnimationFrame: (callback) => queueMicrotask(callback),
    grid: { querySelectorAll: () => [] },
    readFiltersFromUrl() {},
    setupLoadMore() {},
    lightbox: { classList: { contains: () => false } },
    applyFilters: () => { applied += 1; },
    document: { readyState: "loading" },
    window: {
      addEventListener: (event, callback, options) => {
        assert.equal(event, "load");
        assert.equal(options.once, true);
        onLoad = callback;
      },
      requestIdleCallback: (callback) => { onIdle = callback; },
    },
  });
  const startup = sources.works.slice(sources.works.indexOf("    const initialWorksData ="));
  assert.ok(startup.startsWith("    const initialWorksData ="), "Missing works startup sequence");
  new vm.Script(`
    let photos = [];
    let photosRevision = '';
    let photosReady = false;
    let photosRefreshQueued = false;
    let photosRefreshPromise = null;
    let previewIndexUrl = '';
    const previewSources = new Map();
    ${["hasPhotoManifest", "normalizePhotos", "cleanText", "applyPreviewSources", "photoPreviewSource", "createPhotosRevision", "syncPhotos", "applyLoadedPhotos", "refreshAfterFirstPhotosPaint"].map((name) => declaration("works", name)).join("\n")}
    ${startup}
    globalThis.inspect = () => ({ photos, photosRevision, photosReady, preview: photoPreviewSource(photos[0]), previewIndexUrl });
    globalThis.refresh = syncPhotos;
  `).runInContext(context);
  assert.equal(context.inspect().photos.length, 30, "the initial batch renders before any network request");
  assert.equal(context.inspect().photosReady, true);
  assert.equal(context.inspect().preview, "/assets/previews/first.123456.webp", "embedded preview mapping must be installed before the first render");
  assert.equal(context.inspect().previewIndexUrl, "/assets/generated/previews.abcdef123456.json");
  assert.notEqual(context.inspect().photosRevision, manifest.updatedAt, "partial data must not impersonate the complete revision");
  assert.equal(requests, 0);
  assert.equal(applied, 1);
  await onLoad();
  assert.equal(requests, 0, "refresh waits for idle time after first-page resources finish");
  await onIdle();
  assert.equal(context.inspect().photos.length, manifest.photos.length);
  assert.equal(context.inspect().photosRevision, manifest.updatedAt);
  assert.equal(applied, 2);
  assert.equal(await context.refresh(), false, "the now-complete unchanged manifest should not re-render");
  assert.equal(requests, 2);
});

test("works falls back to the complete static manifest when the API is unavailable", async () => {
  const requests = [];
  const fallback = { updatedAt: "recovered-revision", photos: [{ id: "one", src: "/media/one.jpg" }, null, {}] };
  const { loadPhotos } = subject("works", ["hasPhotoManifest", "normalizePhotos", "cleanText", "createPhotosRevision", "loadPhotos"], {
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (url.startsWith("/api/")) throw new Error("temporary outage");
      return { ok: true, json: async () => fallback };
    },
  });
  const loaded = await loadPhotos();
  assert.deepEqual(plain(loaded.photos), [fallback.photos[0]]);
  assert.equal(loaded.revision, fallback.updatedAt);
  assert.deepEqual(requests.map(({ url }) => url), ["/api/photos", "photos.json"]);
  assert.equal(requests[0].options.cache, "no-cache", "public API requests must permit ETag revalidation");
  assert.equal(requests[0].options.priority, "low");
  assert.equal(requests[1].options.cache, "force-cache");
  assert.ok(requests.every(({ options }) => options.signal instanceof AbortSignal));
});

test("a stalled photo API is aborted and the complete fallback can still load", async () => {
  const requests = [];
  const { loadPhotos } = subject("works", ["hasPhotoManifest", "normalizePhotos", "cleanText", "createPhotosRevision", "loadPhotos"], {
    AbortSignal: { timeout: () => AbortSignal.timeout(5) },
    fetch: async (url, options) => {
      requests.push(url);
      if (url.startsWith("/api/")) return new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      });
      return { ok: true, json: async () => ({ photos: [{ id: "saved", src: "/media/saved.jpg" }] }) };
    },
  });
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    assert.equal((await loadPhotos()).photos[0].id, "saved");
    assert.deepEqual(requests, ["/api/photos", "photos.json"]);
  } finally { clearTimeout(keepAlive); }
});

test("malformed API manifests fall back, but an explicit empty manifest remains authoritative", async () => {
  let payload = {};
  const requests = [];
  const fallback = { photos: [{ id: "saved", src: "/media/saved.jpg" }] };
  const { loadPhotos } = subject("works", ["hasPhotoManifest", "normalizePhotos", "cleanText", "createPhotosRevision", "loadPhotos"], {
    fetch: async (url) => {
      requests.push(url);
      return { ok: true, json: async () => url === "/api/photos" ? payload : fallback };
    },
  });
  assert.deepEqual(plain((await loadPhotos()).photos), fallback.photos);
  assert.deepEqual(requests, ["/api/photos", "photos.json"]);
  requests.length = 0;
  payload = { photos: [] };
  assert.deepEqual(plain((await loadPhotos()).photos), []);
  assert.deepEqual(requests, ["/api/photos"], "an intentionally emptied library must not restore old static photos");
});

test("a complete network outage retains the visible gallery and its revision", async () => {
  let fallbackUnavailable = true;
  const applied = [];
  const previous = [{ id: "visible", src: "/media/visible.jpg" }];
  const { syncPhotos, inspect } = subject("works", [
    "hasPhotoManifest", "normalizePhotos", "cleanText", "createPhotosRevision", "loadPhotos", "syncPhotos",
  ], {
    previous,
    fetch: async () => {
      if (fallbackUnavailable) throw new Error("offline");
      return { ok: true, json: async () => ({ photos: [], updatedAt: "empty-revision" }) };
    },
    loadPreviewIndex: async () => false,
    lightbox: { classList: { contains: () => false } },
    applyFilters: (options) => { applied.push(options); },
  }, "let photos = previous; let photosRevision = 'visible-revision'; const inspect = () => ({ photos, photosRevision });", ["syncPhotos", "inspect"]);
  assert.equal(await syncPhotos(), false);
  assert.equal(inspect().photos, previous);
  assert.equal(inspect().photosRevision, "visible-revision");
  assert.equal(applied.length, 0);
  fallbackUnavailable = false;
  assert.equal(await syncPhotos(), true);
  assert.deepEqual(plain(inspect().photos), []);
  assert.equal(inspect().photosRevision, "empty-revision");
  assert.equal(applied.length, 1);
});

test("optimized previews match the complete versioned thumbnail URL without changing full-size metadata", () => {
  const previewSources = new Map();
  const { applyPreviewSources, photoPreviewSource } = subject("works", ["applyPreviewSources", "photoPreviewSource"], { previewSources });
  const photo = { src: "/media/master.jpg?v=1", thumbSrc: "/media/thumb.jpg?v=1" };
  const original = structuredClone(photo);
  const optimized = "/assets/previews/photo.abcdef123456.webp";
  assert.equal(applyPreviewSources({
    [photo.thumbSrc]: optimized,
    "/media/unsafe.jpg": "javascript:alert(1)",
    "/media/external.jpg": "https://external.example/photo.webp",
  }), true);
  assert.equal(photoPreviewSource(photo), optimized);
  assert.equal(photoPreviewSource({ ...photo, thumbSrc: "/media/thumb.jpg?v=2" }), "/media/thumb.jpg?v=2");
  assert.equal(photoPreviewSource({ ...photo, thumbSrc: "/media/thumb.jpg" }), "/media/thumb.jpg");
  assert.equal(photoPreviewSource({ src: photo.src }), photo.src);
  assert.equal(previewSources.size, 1);
  assert.equal(applyPreviewSources({ [photo.thumbSrc]: optimized }), false);
  assert.equal(applyPreviewSources(null), false);
  assert.equal(applyPreviewSources([]), false);
  assert.deepEqual(photo, original);
});

test("the preview index shares in-flight work, uses immutable caching, and is loaded only once after success", async () => {
  const requests = [];
  let respond;
  const previewSources = new Map();
  const { loadPreviewIndex, photoPreviewSource } = subject("works", [
    "applyPreviewSources", "photoPreviewSource", "loadPreviewIndex",
  ], {
    previewSources,
    fetch: (url, options) => {
      requests.push({ url, options });
      return new Promise((resolve) => { respond = resolve; });
    },
  }, "let previewIndexUrl = '/assets/generated/previews.abcdef123456.json'; let previewIndexPromise = null; let previewIndexLoaded = false;");
  const first = loadPreviewIndex();
  const second = loadPreviewIndex();
  assert.equal(first, second);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.cache, "force-cache");
  assert.equal(requests[0].options.priority, "low");
  respond({ ok: true, json: async () => ({ "/media/thumb.jpg?v=7": "/assets/previews/photo.abcdef123456.webp" }) });
  assert.equal(await first, true);
  assert.equal(photoPreviewSource({ thumbSrc: "/media/thumb.jpg?v=7", src: "/media/master.jpg" }), "/assets/previews/photo.abcdef123456.webp");
  assert.equal(await loadPreviewIndex(), false);
  assert.equal(requests.length, 1);
});

test("failed preview-index downloads keep embedded previews and can be retried", async () => {
  let requests = 0;
  const previewSources = new Map([["/media/first.jpg?v=1", "/assets/previews/first.123456.webp"]]);
  const { loadPreviewIndex, photoPreviewSource } = subject("works", [
    "applyPreviewSources", "photoPreviewSource", "loadPreviewIndex",
  ], {
    previewSources,
    fetch: async () => {
      requests += 1;
      if (requests === 1) throw new Error("offline");
      return { ok: true, json: async () => ({ "/media/second.jpg?v=2": "/assets/previews/second.234567.webp" }) };
    },
  }, "let previewIndexUrl = '/assets/generated/previews.abcdef123456.json'; let previewIndexPromise = null; let previewIndexLoaded = false;");
  assert.equal(await loadPreviewIndex(), false);
  assert.equal(photoPreviewSource({ thumbSrc: "/media/first.jpg?v=1" }), "/assets/previews/first.123456.webp");
  assert.equal(photoPreviewSource({ thumbSrc: "/media/second.jpg?v=2" }), "/media/second.jpg?v=2");
  assert.equal(await loadPreviewIndex(), true);
  assert.equal(photoPreviewSource({ thumbSrc: "/media/second.jpg?v=2" }), "/assets/previews/second.234567.webp");
  assert.equal(requests, 2);
});

test("full-manifest refresh starts the preview index in parallel and redraws same-version photos when previews arrive", async () => {
  const started = [];
  let finishPhotos;
  let finishPreviews;
  let renders = 0;
  const { syncPhotos } = subject("works", ["syncPhotos"], {
    loadPhotos: () => { started.push("photos"); return new Promise((resolve) => { finishPhotos = resolve; }); },
    loadPreviewIndex: () => { started.push("previews"); return new Promise((resolve) => { finishPreviews = resolve; }); },
    lightbox: { classList: { contains: () => false } },
    applyFilters: () => { renders += 1; },
  }, "let photos = []; let photosRevision = 'same-revision';");
  const refresh = syncPhotos();
  assert.deepEqual(started, ["photos", "previews"]);
  finishPhotos({ photos: [{ src: "/media/photo.jpg" }], revision: "same-revision" });
  await Promise.resolve();
  assert.equal(renders, 0);
  finishPreviews(true);
  assert.equal(await refresh, true);
  assert.equal(renders, 1);
});

test("a missing optimized WebP falls back once to its original thumbnail and does not affect the full-size source", () => {
  const original = "/media/thumb.jpg?v=4";
  const optimized = "/assets/previews/photo.abcdef123456.webp";
  const previewSources = new Map([[original, optimized]]);
  const { recoverPhotoPreview, photoPreviewSource } = subject("works", ["recoverPhotoPreview", "photoPreviewSource"], { previewSources });
  const image = { dataset: { src: optimized, fallbackSrc: original }, src: optimized, classList: { remove() {} } };
  recoverPhotoPreview(image);
  assert.equal(image.src, original);
  assert.equal(image.dataset.src, original);
  assert.equal(previewSources.has(original), false);
  assert.equal(photoPreviewSource({ src: "/media/master.jpg", thumbSrc: original }), original);
  recoverPhotoPreview(image);
  assert.equal(image.src, original);
});

test("only bfcache page restores request another works refresh", () => {
  let refreshes = 0;
  const { handlePageShow } = subject("works", ["handlePageShow"], { requestPhotosRefresh: () => { refreshes += 1; } });
  handlePageShow({ persisted: false });
  assert.equal(refreshes, 0);
  handlePageShow({ persisted: true });
  assert.equal(refreshes, 1);
});

test("homepage summary refresh does not request the full photo library before the map is opened", async () => {
  const requests = [];
  const updates = [];
  const summary = { site: { updatedAt: "new", home: { hero: {} } }, manifest: { photos: [{ src: "/media/home.jpg" }] } };
  const { loadHomepageContent } = subject("index", ["cleanText", "loadHomepageContent"], {
    fetch: async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => summary }; },
    applyHomepagePhotoManifest: (manifest, force, fullManifest) => { updates.push({ manifest, force, fullManifest }); },
    applySiteConfig: () => { updates.push("site"); },
    loadHomepagePhotos: async () => { throw new Error("Full library must not be requested before the map"); },
    loadSiteConfig: async () => { throw new Error("Valid compact response must not trigger fallback"); },
  }, "let homepageHasFullManifest = false; let homepageSiteRevision = 'old'; let homepagePhotos = [{ src: '/media/home.jpg' }];");
  await loadHomepageContent();
  assert.deepEqual(requests.map(({ url }) => url), ["/api/home"]);
  assert.equal(requests[0].options.cache, "no-cache");
  assert.equal(requests[0].options.priority, "low");
  assert.equal(updates[0].manifest, summary.manifest);
  assert.equal(updates[0].fullManifest, false);
  assert.equal(updates[1], "site");
});

function mockElement(tagName) {
  return {
    tagName, dataset: {}, style: {}, attributes: {}, children: [],
    classList: { add() {}, remove() {} },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener() {},
    append(child) { this.children.push(child); },
  };
}

test("photo cards are named native buttons and their LCP preview starts without an observer", () => {
  const { createPhotoButton } = subject("works", ["photoPreviewSource", "recoverPhotoPreview", "createPhotoButton"], {
    previewSources: new Map(),
    document: { createElement: mockElement },
    photoPreviewTitle: (photo) => photo.aircraft,
    photoDescription: (photo) => photo.alt,
    photoFocus: () => "50% 50%",
    isCompactViewport: () => true,
    firstScreenPhotoCount: () => 2,
  });
  const photo = { id: "p1", src: "/media/original.jpg", thumbSrc: "/media/thumb.webp", aircraft: "A350", alt: "A350 进近", categories: ["day"] };
  const first = createPhotoButton(photo, 0);
  assert.equal(first.tagName, "button");
  assert.equal(first.type, "button");
  assert.equal(first.attributes["aria-label"], "打开照片：A350");
  assert.equal(first.children[0].src, photo.thumbSrc);
  assert.equal(first.children[0].fetchPriority, "high");
  assert.equal(first.children[0].loading, "eager");
  assert.equal(first.children[0].alt, photo.alt);
  assert.equal(first.className.includes("is-visible"), true);
  assert.equal(first.children[0].style.transition, "none", "first-screen image paint must not wait for an opacity fade");
  const second = createPhotoButton(photo, 1);
  assert.equal(second.children[0].src, photo.thumbSrc, "the second visible mobile card must not depend on an observer callback");
  assert.equal(second.className.includes("is-visible"), true);
  const later = createPhotoButton(photo, 14).children[0];
  assert.equal(later.loading, "lazy");
  assert.equal(later.dataset.src, photo.thumbSrc);
  assert.equal(later.src, undefined, "off-screen cards should not request full image resources eagerly");
});

test("catalog URLs preserve multi-select, Unicode search, unrelated query state and fragments", () => {
  const location = new URL("https://hugoaviation.com/works?multi=1&airline=KLM&airline=ANA&airport=CAN,HND&q=%E5%85%A8%E8%A7%92%EF%BC%A1%EF%BC%93%EF%BC%95%EF%BC%90&utm_source=test#gallery");
  let replaced;
  const searchInput = { value: "" };
  const catalogFilters = { airline: new Set(), airport: new Set() };
  const { readFiltersFromUrl, syncFilterUrl, inspect } = subject("works", [
    "cleanText", "normalizeSearchText", "updateSearchTerms", "readFiltersFromUrl", "syncFilterUrl",
  ], {
    window: { location, history: { replaceState: (_state, _title, url) => { replaced = url; } } },
    searchInput,
    catalogFilters,
    catalogConfig: [{ key: "airline" }, { key: "airport" }],
  }, "let catalogMultiSelectEnabled = false; let searchQuery = ''; let searchTerms = []; const inspect = () => ({ catalogMultiSelectEnabled, searchTerms });", [
    "readFiltersFromUrl", "syncFilterUrl", "inspect",
  ]);
  readFiltersFromUrl();
  assert.deepEqual([...catalogFilters.airline], ["KLM", "ANA"]);
  assert.deepEqual([...catalogFilters.airport], ["CAN", "HND"]);
  assert.equal(searchInput.value, "全角Ａ３５０");
  assert.deepEqual(plain(inspect().searchTerms), ["全角a350"]);
  syncFilterUrl();
  const result = new URL(replaced, location);
  assert.equal(result.searchParams.get("q"), "全角Ａ３５０");
  assert.equal(result.searchParams.get("utm_source"), "test");
  assert.equal(result.hash, "#gallery");
  assert.deepEqual(result.searchParams.getAll("airline"), ["ANA", "KLM"]);
  location.search = "?airline=KLM,ANA";
  readFiltersFromUrl();
  assert.deepEqual([...catalogFilters.airline], ["KLM"]);
  assert.equal(inspect().catalogMultiSelectEnabled, false);
  assert.equal(searchInput.value, "");
});

test("admin initialization gates the heavy library behind successful authentication", async () => {
  const calls = [];
  const state = { token: "" };
  const elements = { token: { value: "" } };
  let rejectAuth = false;
  const { initializeAdmin } = subject("admin", ["initializeAdmin"], {
    state,
    elements,
    setStatus() {},
    api: async (path) => { calls.push(path); if (rejectAuth) throw Object.assign(new Error("unauthorized"), { status: 401 }); },
    loadAdminData: async () => { calls.push("library"); },
    loadBackups: async () => { calls.push("backups"); },
    sessionStorage: { removeItem: (key) => { calls.push(`remove:${key}`); } },
  });
  await initializeAdmin();
  assert.deepEqual(calls, [], "unauthenticated landing must not download thumbnails or manifests");
  state.token = "valid";
  await initializeAdmin();
  assert.deepEqual(calls, ["/api/auth/check", "library", "backups"]);
  calls.length = 0;
  rejectAuth = true;
  state.token = "expired";
  elements.token.value = "expired";
  await initializeAdmin();
  assert.deepEqual(calls, ["/api/auth/check", "remove:hugo-admin-token"]);
  assert.equal(state.token, "");
  assert.equal(elements.token.value, "");
});

test("admin read failures preserve loaded content and prevent saving defaults", async () => {
  const site = { home: { hero: { greeting: "Keep" } } };
  const photos = [{ id: "keep", src: "/media/keep.jpg" }];
  const state = { site, photos, token: "valid" };
  const failing = async () => { throw new Error("Storage unavailable"); };
  const { loadSite, loadPhotos, saveHome } = subject("admin", ["loadSite", "loadPhotos", "saveHome"], {
    state, api: failing, loadAdminData: failing, setStatus() {},
    collectHome() { assert.fail("Must not collect or save defaults after failed loading"); },
  });
  await assert.rejects(loadSite(), /Storage unavailable/);
  await assert.rejects(loadPhotos(), /Storage unavailable/);
  assert.equal(state.site, site);
  assert.equal(state.photos, photos);
  await saveHome();
});

test("temporary admin service failures retain a valid login for retry", async () => {
  const state = { token: "valid" };
  const { initializeAdmin } = subject("admin", ["initializeAdmin"], {
    state, elements: { token: { value: "valid" } }, setStatus() {},
    api: async () => {}, loadAdminData: async () => { throw new Error("offline"); },
    sessionStorage: { removeItem() { assert.fail("Network failure must not clear authentication"); } },
  });
  await initializeAdmin();
  assert.equal(state.token, "valid");
});

function embeddedJson(html, id) {
  const match = new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)<\\/script>`).exec(html);
  assert.ok(match, `Missing embedded data ${id}`);
  assert.equal(match[1].includes("<"), false, "JSON must not be able to close its HTML script element");
  assert.equal(/[\u2028\u2029]/u.test(match[1]), false, "line separators must be escaped for safe embedding");
  return JSON.parse(match[1]);
}

test("production build escapes seed data, preserves complete fallback, and links real content-addressed minified assets", async (context) => {
  const fixture = await mkdtemp(join(tmpdir(), "hugo-frontend-build-test-"));
  context.after(() => rm(fixture, { recursive: true, force: true }));
  await Promise.all([
    mkdir(join(fixture, "scripts"), { recursive: true }),
    mkdir(join(fixture, "data", "seed"), { recursive: true }),
    cp(join(projectRoot, "src"), join(fixture, "src"), { recursive: true }),
    cp(join(projectRoot, "public"), join(fixture, "public"), { recursive: true }),
    symlink(join(projectRoot, "node_modules"), join(fixture, "node_modules"), "dir"),
  ]);
  await cp(join(projectRoot, "scripts", "build.mjs"), join(fixture, "scripts", "build.mjs"));
  const photos = JSON.parse(await readFile(join(projectRoot, "data", "seed", "photos.json"), "utf8"));
  const site = JSON.parse(await readFile(join(projectRoot, "data", "seed", "site.json"), "utf8"));
  const hostile = '</script><script>alert("seed")</script><img src=x onerror="alert(1)"> & \u2028 \u2029';
  photos.photos[0].title = hostile;
  photos.photos[0].alt = hostile;
  photos.photos[0].thumbSrc = '/media/preview.webp?v=" onload="alert(1)&next=<unsafe>';
  site.home.hero.greeting = hostile;
  site.home.images[0].src = photos.photos[0].src;
  site.home.images[1].src = photos.photos[1].src;
  const previews = {
    [photos.photos[1].thumbSrc]: "/assets/previews/second.abcdef123456.webp",
    [photos.photos[30].thumbSrc]: "/assets/previews/later.123456abcdef.webp",
  };
  await mkdir(join(fixture, "public", "assets", "previews"), { recursive: true });
  await writeFile(join(fixture, "public", ".DS_Store"), "private folder metadata");
  await writeFile(join(fixture, "public", "assets", "._preview.jpg"), "resource fork metadata");
  await Promise.all([
    writeFile(join(fixture, "data", "seed", "photos.json"), JSON.stringify(photos)),
    writeFile(join(fixture, "data", "seed", "site.json"), JSON.stringify(site)),
    writeFile(join(fixture, "public", "assets", "previews", "index.json"), JSON.stringify(previews)),
  ]);
  await runFile(process.execPath, [join(fixture, "scripts", "build.mjs")], { cwd: fixture });
  await assert.rejects(readFile(join(fixture, "dist", ".DS_Store")), { code: "ENOENT" });
  await assert.rejects(readFile(join(fixture, "dist", "assets", "._preview.jpg")), { code: "ENOENT" });
  const built = Object.fromEntries(await Promise.all(["index", "works", "admin"].map(async (page) => [
    page, await readFile(join(fixture, "dist", `${page}.html`), "utf8"),
  ])));
  const homeData = embeddedJson(built.index, "initialHomepageData");
  const worksData = embeddedJson(built.works, "initialWorksData");
  assert.equal(homeData.site.home.hero.greeting, hostile);
  const homeReferences = new Set([...site.home.images, ...Object.values(site.home.airportCovers || {})].map((photo) => photo.src));
  assert.deepEqual(homeData.manifest.photos.map((photo) => photo.src), photos.photos.filter((photo) => homeReferences.has(photo.src)).map((photo) => photo.src));
  assert.ok(homeData.manifest.photos.length < photos.photos.length, "the homepage should embed only configured photos, not the complete map manifest");
  assert.equal(homeData.manifest.photos[0].title, hostile);
  assert.equal(worksData.photos.length, Math.min(30, photos.photos.length));
  assert.deepEqual(worksData.photos, photos.photos.slice(0, 30));
  assert.deepEqual(worksData.previews, { [photos.photos[1].thumbSrc]: previews[photos.photos[1].thumbSrc] });
  assert.deepEqual(homeData.previews, Object.fromEntries(homeData.manifest.photos.filter((photo) => previews[photo.thumbSrc]).map((photo) => [photo.thumbSrc, previews[photo.thumbSrc]])));
  const previewIndexMatch = /^\/assets\/generated\/previews\.([a-f0-9]{12})\.json$/.exec(worksData.previewIndexUrl);
  assert.ok(previewIndexMatch, "the complete preview index must use a content-addressed URL");
  const previewIndex = await readFile(join(fixture, "dist", worksData.previewIndexUrl.slice(1)));
  assert.equal(createHash("sha256").update(previewIndex).digest("hex").slice(0, 12), previewIndexMatch[1]);
  assert.deepEqual(JSON.parse(previewIndex), previews);
  assert.deepEqual(JSON.parse(await readFile(join(fixture, "dist", "photos.json"), "utf8")), photos);
  assert.ok(built.index.indexOf('id="initialHomepageData"') < built.index.indexOf('<script src="assets/generated/'));
  assert.ok(built.works.indexOf('id="initialWorksData"') < built.works.indexOf('<script src="assets/generated/'));
  assert.equal(built.works.includes('<script>alert("seed")</script>'), false);
  assert.ok(built.works.includes('href="/media/preview.webp?v=&quot; onload=&quot;alert(1)&amp;next=&lt;unsafe&gt;"'));
  const fallback = /<noscript>([\s\S]*?)<\/noscript>/.exec(built.works)?.[1];
  assert.ok(fallback);
  assert.equal([...fallback.matchAll(/<figure>/g)].length, Math.min(6, photos.photos.length));
  assert.equal(fallback.includes("&lt;/script&gt;"), true);
  assert.equal(fallback.includes(`src="${previews[photos.photos[1].thumbSrc]}"`), true, "no-JavaScript fallback should also use optimized previews");
  for (const [page, html] of Object.entries(built)) {
    assert.equal(/<!-- BUILD:/.test(html), false, `${page}: unresolved build placeholder`);
    const refs = [...html.matchAll(/(?:href|src)="assets\/generated\/([^"\s]+)"/g)].map((match) => match[1]);
    assert.equal(refs.length, 2, `${page} must load one stylesheet and one script`);
    for (const reference of refs) {
      const match = new RegExp(`^${page}\\.([a-f0-9]{12})\\.(css|js)$`).exec(reference);
      assert.ok(match, `unfingerprinted asset ${reference}`);
      const data = await readFile(join(fixture, "dist", "assets", "generated", reference));
      assert.equal(createHash("sha256").update(data).digest("hex").slice(0, 12), match[1]);
      const source = await readFile(join(projectRoot, "src", match[2] === "js" ? "scripts" : "styles", `${page}.${match[2]}`));
      const editorBytes = page === "admin" && match[2] === "js"
        ? (await readFile(join(projectRoot, "src", "scripts", "admin-content.js"))).length : 0;
      assert.ok(data.length < (source.length + editorBytes) * 0.85, `${reference} must be materially minified`);
      if (match[2] === "js") assert.doesNotThrow(() => new vm.Script(data.toString("utf8")));
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${page}: duplicate IDs break labels and dialog controls`);
    for (const match of html.matchAll(/\baria-(?:controls|labelledby)="([^"]+)"/g)) {
      for (const id of match[1].split(/\s+/)) assert.ok(ids.includes(id), `${page}: missing ARIA target ${id}`);
    }
  }
  for (const asset of ["maplibre-gl.mjs", "maplibre-gl-shared.mjs", "maplibre-gl-worker.mjs", "maplibre-gl.css", "LICENSE.txt"]) {
    assert.ok((await readFile(join(fixture, "dist", "assets", "vendor", "maplibre-6.7.0", asset))).length > 0);
  }
});
