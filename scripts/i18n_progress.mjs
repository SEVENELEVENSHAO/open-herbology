// English-translation progress report for Open Herbology.
//
//   node scripts/i18n_progress.mjs                 # summary
//   node scripts/i18n_progress.mjs herbs 20        # + skeleton for the next 20 untranslated herbs
//   node scripts/i18n_progress.mjs formulas 20     # + skeleton for the next 20 untranslated formulas
//
// A field counts as "translated" when the key is present and non-empty in
// src/data/en/{herbs,formulas}.json. Classical-quotation fields (herb.digest,
// formula.digest, formula.source, formula.ingredientsRaw) are never translated
// and are not counted.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const rawHerbs = read("src/data/raw-herbs.json");
const rawFormulas = read("src/data/raw-formulas.json");
const enHerbs = read("src/data/en/herbs.json").entries ?? {};
const enFormulas = read("src/data/en/formulas.json").entries ?? {};

// [enKey, rawKey] — enKey absent/empty => still to translate. `name` is always required.
const HERB_FIELDS = [
  ["name", "Medicine"],
  ["source", "Source"],
  ["tasteAndNature", "GuiJing"],
  ["function", "Function"],
  ["keyPoint", "Character"],
  ["appliedTo", "AppliedTo"],
  ["prescriptionForms", "Prescription"],
  ["usage", "Usage"],
  ["classicalFormulas", "Formula"],
  ["note", "Note"],
];
const FORMULA_FIELDS = [
  ["name", "Formula"],
  ["usage", "Usage"],
  ["mainTreatment", "MainTreatment"],
  ["function", "Function"],
  ["appliedTo", "AppliedTo"],
  ["notes", "Notes"],
];

function analyse(rows, enMap, fields) {
  let need = 0;
  let done = 0;
  const entries = rows.map((row) => {
    const id = String(row.ID);
    const en = enMap[id] ?? {};
    const missing = [];
    for (const [enKey, rawKey] of fields) {
      const hasSource = enKey === "name" || (row[rawKey] != null && String(row[rawKey]).trim() !== "");
      if (!hasSource) continue;
      const translated = en[enKey] != null && String(en[enKey]).trim() !== "";
      if (translated) done += 1;
      else {
        need += 1;
        missing.push(enKey);
      }
    }
    return { id, name: row.Medicine ?? row.Formula, missing };
  });
  return { need, done, total: need + done, entries };
}

function bar(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 100;
  const filled = Math.round(pct / 4);
  return `[${"█".repeat(filled)}${"░".repeat(25 - filled)}] ${pct}%  (${done}/${total} fields)`;
}

const herbReport = analyse(rawHerbs, enHerbs, HERB_FIELDS);
const formulaReport = analyse(rawFormulas, enFormulas, FORMULA_FIELDS);

const herbEntriesDone = herbReport.entries.filter((e) => e.missing.length === 0).length;
const formulaEntriesDone = formulaReport.entries.filter((e) => e.missing.length === 0).length;

console.log("\nOpen Herbology — English translation progress\n");
console.log(`  Herbs     ${bar(herbReport.done, herbReport.total)}`);
console.log(`            ${herbEntriesDone}/${rawHerbs.length} entries fully translated`);
console.log(`  Formulas  ${bar(formulaReport.done, formulaReport.total)}`);
console.log(`            ${formulaEntriesDone}/${rawFormulas.length} entries fully translated`);
console.log(
  `  Overall   ${bar(herbReport.done + formulaReport.done, herbReport.total + formulaReport.total)}\n`,
);

const [, , kind, countArg] = process.argv;
if (kind === "herbs" || kind === "formulas") {
  const n = Number(countArg) || 15;
  const rows = kind === "herbs" ? rawHerbs : rawFormulas;
  const report = kind === "herbs" ? herbReport : formulaReport;
  const rawById = new Map(rows.map((r) => [String(r.ID), r]));
  const fields = kind === "herbs" ? HERB_FIELDS : FORMULA_FIELDS;
  const todo = report.entries.filter((e) => e.missing.length > 0).slice(0, n);

  console.log(`Next ${todo.length} untranslated ${kind} — paste into src/data/en/${kind}.json "entries":\n`);
  const skeleton = {};
  for (const entry of todo) {
    const row = rawById.get(entry.id);
    const obj = {};
    for (const [enKey, rawKey] of fields) {
      if (!entry.missing.includes(enKey)) continue;
      obj[enKey] = enKey === "name" ? "" : `【译】${row[rawKey] ?? ""}`;
    }
    skeleton[entry.id] = obj;
  }
  console.log(JSON.stringify(skeleton, null, 2));
  console.log(
    `\n(Each 【译】… value carries the Chinese source to translate. Replace the whole string with the English.)`,
  );
}
