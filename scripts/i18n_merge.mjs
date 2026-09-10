// Merge a batch of English translations into src/data/en/{herbs,formulas}.json.
//
//   node scripts/i18n_merge.mjs herbs <patch.json>
//   node scripts/i18n_merge.mjs formulas <patch.json>
//
// <patch.json> is { "<id>": { <field>: <value>, ... }, ... }. Fields are merged
// into entries[id] (existing fields are overwritten only if the patch supplies
// them); entries not mentioned in the patch are left untouched. Empty-string and
// null values in the patch are skipped so a stray blank never clobbers real text.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const [, , kind, patchPath] = process.argv;

if (!["herbs", "formulas"].includes(kind) || !patchPath) {
  console.error("usage: node scripts/i18n_merge.mjs herbs|formulas <patch.json>");
  process.exit(1);
}

const target = join(root, "src/data/en", `${kind}.json`);
const doc = JSON.parse(readFileSync(target, "utf8"));
doc.entries ??= {};

const patch = JSON.parse(readFileSync(resolve(patchPath), "utf8"));

let touchedEntries = 0;
let touchedFields = 0;
for (const [id, fields] of Object.entries(patch)) {
  const entry = (doc.entries[id] ??= {});
  let touched = false;
  for (const [key, value] of Object.entries(fields)) {
    if (value == null || (typeof value === "string" && value.trim() === "")) continue;
    entry[key] = value;
    touchedFields += 1;
    touched = true;
  }
  if (touched) touchedEntries += 1;
}

// Keep entries in numeric id order for stable diffs.
const ordered = { ...doc };
ordered.entries = Object.fromEntries(
  Object.entries(doc.entries).sort(([a], [b]) => Number(a) - Number(b)),
);

writeFileSync(target, JSON.stringify(ordered, null, 2) + "\n");
console.log(`${kind}: merged ${touchedFields} field(s) across ${touchedEntries} entr${touchedEntries === 1 ? "y" : "ies"} into src/data/en/${kind}.json`);
