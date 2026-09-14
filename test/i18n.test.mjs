import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../src/scripts/i18n.js", import.meta.url), "utf8");
function setup({ url = "https://example.com/", saved = null, languages = ["zh-CN"], blocked = false } = {}) {
  const callbacks = {};
  const nodes = [];
  const writes = [];
  const root = { nodeType: 1, childNodes: nodes, matches: () => false, closest: () => false, hasAttribute: () => false };
  const context = vm.createContext({
    URL, location: new URL(url), navigator: { languages },
    localStorage: { getItem() { if (blocked) throw Error("blocked"); return saved; }, setItem(k, v) { if (blocked) throw Error("blocked"); writes.push([k, v]); } },
    document: { documentElement: root, querySelector: () => null, querySelectorAll: () => [], addEventListener: (k, cb) => { callbacks[k] = cb; } },
    history: { replaceState: () => {} }, window: { dispatchEvent: () => {}, addEventListener: (k, cb) => { callbacks[k] = cb; } },
    CustomEvent: class {}, MutationObserver: class { observe() {} disconnect() {} },
  });
  vm.runInContext(source, context);
  return { api: context.window.HugoI18n, root, writes, nodes, context, callbacks, ready: () => callbacks.DOMContentLoaded() };
}

test("language negotiation respects explicit links, saved choice and browser preferences", () => {
  assert.equal(setup().api.language, "zh-CN");
  assert.equal(setup({ languages: ["zh-Hant-HK", "en-US"] }).api.language, "zh-CN");
  assert.equal(setup({ languages: ["en-GB", "zh-CN"] }).api.language, "en");
  assert.equal(setup({ languages: ["fr", "zh-TW"] }).api.language, "zh-CN");
  assert.equal(setup({ languages: ["fr"] }).api.language, "en");
  assert.equal(setup({ saved: "en" }).api.language, "en");
  assert.equal(setup({ url: "https://example.com/?lang=zh", saved: "en" }).api.language, "zh-CN");
  assert.equal(setup({ url: "https://example.com/?lang=invalid", saved: "en" }).api.language, "en");
});

test("blocked browser storage does not prevent initialization or manual switching", () => {
  const { api, root } = setup({ blocked: true });
  api.setLanguage("en");
  assert.equal(root.lang, "en");
  api.setLanguage("zh");
  assert.equal(root.lang, "zh-CN");
});

test("editorial Chinese and English remain independent through refresh and language changes", () => {
  const { api, nodes, ready } = setup();
  const node = { nodeType: 3, nodeValue: "你好", parentElement: { closest: () => false } };
  nodes.push(node); ready();
  api.setLocalization({ entries: { entry_0: { source: "你好", zh: "欢迎", en: "Welcome $& aboard" } } });
  assert.equal(node.nodeValue, "欢迎");
  api.setLanguage("en"); assert.equal(node.nodeValue, "Welcome $& aboard");
  api.setLanguage("zh"); assert.equal(node.nodeValue, "欢迎");
  api.setLocalization({ entries: {} }); assert.equal(node.nodeValue, "你好");
});

test("history navigation restores the URL language without overwriting stored preference", () => {
  const { root, nodes, ready, context, callbacks, writes } = setup();
  const node = { nodeType: 3, nodeValue: "你好", parentElement: { closest: () => false } };
  nodes.push(node);
  ready();
  context.location = new URL("https://example.com/works?lang=en&q=A321");
  callbacks.popstate();
  assert.equal(root.lang, "en");
  assert.equal(node.nodeValue, "Hello");
  context.location = new URL("https://example.com/works?lang=zh&q=A321");
  callbacks.popstate();
  assert.equal(node.nodeValue, "你好");
  assert.equal(writes.length, 0);
});

test("malformed links do not abort translation of the rest of the page", () => {
  const { nodes, ready } = setup({ saved: "en" });
  nodes.push({ nodeType: 1, closest: () => false, matches: selector => selector === 'a[href]',
    getAttribute: () => "https://[", hasAttribute: () => false, childNodes: [] });
  const text = { nodeType: 3, nodeValue: "你好", parentElement: { closest: () => false } };
  nodes.push(text);
  assert.doesNotThrow(ready);
  assert.equal(text.nodeValue, "Hello");
});

test("switching is reversible and newly edited source text does not reuse a stale translation", () => {
  const { api, nodes, ready } = setup();
  const node = { nodeType: 3, nodeValue: "你好", parentElement: { closest: () => false } };
  nodes.push(node);
  ready();
  api.setLanguage("en");
  assert.equal(node.nodeValue, "Hello");
  api.setLanguage("zh-CN");
  assert.equal(node.nodeValue, "你好");
  node.nodeValue = "查看全部作品";
  api.setLanguage("en");
  assert.equal(node.nodeValue, "View all photographs");
  api.setLanguage("zh-CN");
  assert.equal(node.nodeValue, "查看全部作品");
});

test("all current site and photo seed text has English coverage, without changing records", async () => {
  const { api } = setup();
  for (const name of ["site", "photos"]) {
    const data = JSON.parse(await readFile(new URL(`../data/seed/${name}.json`, import.meta.url), "utf8"));
    const original = JSON.stringify(data);
    const visit = value => {
      if (typeof value === "string" && /\p{Script=Han}/u.test(value)) {
        assert.doesNotMatch(api.english(value), /\p{Script=Han}/u, value);
      } else if (value && typeof value === "object") Object.values(value).forEach(visit);
    };
    visit(data);
    assert.equal(JSON.stringify(data), original);
  }
});

test("all public static labels and metadata have English coverage", async () => {
  const { api } = setup();
  for (const page of ["index", "works", "404"]) {
    const html = await readFile(new URL(`../src/pages/${page}.html`, import.meta.url), "utf8");
    const labels = [...html.matchAll(/>([^<>]+)</g)].map(match => match[1]);
    labels.push(...[...html.matchAll(/(?:alt|aria-label|placeholder|content)="([^"]+)"/g)].map(match => match[1]));
    for (const label of labels.filter(value => /\p{Script=Han}/u.test(value) && !["中文", "Language / 语言"].includes(value))) {
      assert.doesNotMatch(api.english(label), /\p{Script=Han}/u, label);
    }
  }
});

test("dynamic photo labels retain exact numbers, aircraft codes and camera settings", () => {
  const { api } = setup();
  assert.equal(api.english("433 张作品"), "433 photographs");
  assert.equal(api.english("1 张作品"), "1 photograph");
  assert.equal(api.english("12 个拍摄城市 · 270 张已定位作品"), "12 photographed cities · 270 geolocated photographs");
  assert.equal(api.english("打开照片：B777-300"), "Open photograph: B777-300");
  assert.equal(api.english("机位 / 参数 400mm · f/8 · 1/1000s · ISO 100"), "Location / settings: 400mm · f/8 · 1/1000s · ISO 100");
  assert.equal(api.english("清除拍摄时间"), "Clear Time of day");
  assert.equal(api.english("未知的新文案"), "未知的新文案");
});
