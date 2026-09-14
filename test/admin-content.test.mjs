import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";
const source = await readFile(new URL("../src/scripts/admin-content.js", import.meta.url), "utf8");
const setup = () => {
  const handlers = {};
  const context = vm.createContext({ window: { addEventListener: (name, fn) => { handlers[name] = fn; } }, document: { addEventListener() {} } });
  vm.runInContext(source, context);
  return { model: context.window.HugoContentModel, editor: context.window.HugoContentEditor, handlers };
};
test("catalog includes both editorial and UI text, deduplicates sources, excludes media and links", () => {
  const { model } = setup();
  const rows = model.catalog({ home: { hero: { greeting: "你好" }, images: [{ src: "/media/private.jpg", alt: "飞机" }], contact: { emailHref: "mailto:example@example.com" } } },
    [{ title: "飞机", notes: "备注" }], { entries: { "你好": "Hello", "查看作品": "View work" } });
  assert.deepEqual(Array.from(rows, row => row.source), ["你好", "飞机", "查看作品", "备注"]);
});
test("serialization preserves independent locales and source text without storing blank records", () => {
  const { model } = setup();
  const value = model.serialize(new Map([["a", { source: "a", en: "A" }], ["b", { source: "b", zh: "乙" }], ["c", { source: "c" }]]));
  assert.deepEqual(JSON.parse(JSON.stringify(value)), { version: 1, entries: { entry_0: { source: "a", en: "A" }, entry_1: { source: "b", zh: "乙" } } });
});
test("unsaved content warns before leaving but a clean editor does not", () => {
  const { editor, handlers } = setup();
  let prevented = 0;
  const event = { preventDefault() { prevented++; } };
  handlers.beforeunload(event); assert.equal(prevented, 0);
  editor.markDirty(); handlers.beforeunload(event); assert.equal(prevented, 1);
});
