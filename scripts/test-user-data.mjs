import assert from "node:assert/strict";
import test from "node:test";
import { favoritesFirst, mergeUserData, parseUserData, readUserData, USER_DATA_KEY } from "../src/lib/user-data.ts";

test("existing bookmarks migrate without dropping entries", () => {
  const data = readUserData({ getItem: (key) => key === "fangyao-bookmarks" ? '["1","1","8"]' : null });
  assert.deepEqual(data.favorites, ["formula:1", "herb:1", "formula:8", "herb:8"]);
});

test("notes and stars survive serialization with distinct herb/formula IDs", () => {
  const data = parseUserData({ version: 1, favorites: ["formula:1"], notes: { "formula:1": "line one\n第二行", "herb:1": "herb note" } });
  assert.deepEqual(readUserData({ getItem: (key) => key === USER_DATA_KEY ? JSON.stringify(data) : null }), data);
});

test("import merges stars, replaces matching notes and preserves other entries", () => {
  const current = parseUserData({ version: 1, favorites: ["formula:1"], notes: { "formula:1": "old", "herb:1": "keep" } });
  const imported = parseUserData({ version: 1, favorites: ["formula:3", "formula:1"], notes: { "formula:1": "new" } });
  assert.deepEqual(mergeUserData(current, imported), { version: 1, favorites: ["formula:1", "formula:3"], notes: { "formula:1": "new", "herb:1": "keep" } });
  assert.equal(current.notes["formula:1"], "old");
});

test("malformed backups and unreadable storage are rejected", () => {
  for (const invalid of [null, {}, { version: 2, favorites: [], notes: {} },
    { version: 1, favorites: [1], notes: {} }, { version: 1, favorites: ["1"], notes: {} },
    { version: 1, favorites: [], notes: { "formula:1": 10 } }, { version: 1, favorites: [], notes: [] }]) {
    assert.throws(() => parseUserData(invalid));
  }
  assert.throws(() => readUserData({ getItem: () => "{broken" }));
});

test("starred formulas lead while original order and input remain intact", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
  assert.deepEqual(favoritesFirst(items, ["d", "b"]).map((item) => item.id), ["b", "d", "a", "c"]);
  assert.deepEqual(items.map((item) => item.id), ["a", "b", "c", "d"]);
});
