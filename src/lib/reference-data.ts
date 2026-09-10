import { pinyin } from "pinyin-pro";
import rawHerbs from "@/data/raw-herbs.json";
import rawFormulas from "@/data/raw-formulas.json";
import rawHerbCategories from "@/data/raw-herb-categories.json";
import rawFormulaCategories from "@/data/raw-formula-categories.json";
import rawHerbAliases from "@/data/raw-herb-aliases.json";
import rawKeywordMapping from "@/data/raw-keyword-mapping.json";
import enHerbs from "@/data/en/herbs.json";
import enFormulas from "@/data/en/formulas.json";
import enCategories from "@/data/en/categories.json";
import type { Locale } from "@/lib/i18n";
import type {
  Category,
  Channel,
  Formula,
  Herb,
  IngredientChip,
  ReferenceData,
  ThermalProperty,
} from "@/types/reference";

interface EnHerbEntry {
  name?: string;
  source?: string | null;
  tasteAndNature?: string | null;
  function?: string | null;
  keyPoint?: string | null;
  appliedTo?: string | null;
  prescriptionForms?: string | null;
  usage?: string | null;
  classicalFormulas?: string | null;
  note?: string | null;
}

interface EnFormulaEntry {
  name?: string;
  usage?: string | null;
  mainTreatment?: string | null;
  function?: string | null;
  appliedTo?: string | null;
  notes?: string | null;
  ingredients?: Record<string, { processing?: string | null }>;
}

const enHerbEntries = (enHerbs as { entries?: Record<string, EnHerbEntry> }).entries ?? {};
const enFormulaEntries = (enFormulas as { entries?: Record<string, EnFormulaEntry> }).entries ?? {};
const enCategoryMaps = enCategories as {
  herbCategories: Record<string, string>;
  herbSubcategories: Record<string, string>;
  formulaCategories: Record<string, string>;
  formulaSubcategories: Record<string, string>;
};

/** Prefer a non-empty translation, otherwise fall back to the source text. */
function pick<T extends string | null>(translated: string | null | undefined, source: T): string | T {
  return translated ? translated : source;
}

interface RawCategory {
  ID: number;
  Category: string;
  SubCategory: string | null;
}

interface RawHerb {
  ID: number;
  CategoryId: number;
  Medicine: string;
  Source: string | null;
  GuiJing: string | null;
  Function: string | null;
  Character: string | null;
  AppliedTo: string | null;
  Figure: string | null;
  Prescription: string | null;
  Usage: string | null;
  Formula: string | null;
  Digest: string | null;
  Note: string | null;
  Alias: string | null;
}

interface RawFormula {
  ID: number;
  CategoryId: number;
  Formula: string;
  Ingredient: string | null;
  Source: string | null;
  Usage: string | null;
  MainTreatment: string | null;
  Function: string | null;
  AppliedTo: string | null;
  Notes: string | null;
  Digest: string | null;
}

interface RawAlias {
  ID: number;
  Alias: string;
  Medicine: string;
}

const channelMeta: Record<string, { label: string; className: string }> = {
  肺: { label: "LU", className: "channel-metal" },
  大肠: { label: "LI", className: "channel-metal" },
  胃: { label: "ST", className: "channel-earth" },
  脾: { label: "SP", className: "channel-earth" },
  心: { label: "HT", className: "channel-fire" },
  小肠: { label: "SI", className: "channel-fire" },
  心包: { label: "PC", className: "channel-fire" },
  三焦: { label: "SJ", className: "channel-fire" },
  膀胱: { label: "BL", className: "channel-water" },
  肾: { label: "KI", className: "channel-water" },
  胆: { label: "GB", className: "channel-wood" },
  肝: { label: "LR", className: "channel-wood" },
};

const thermalKeywords: Array<[string, ThermalProperty]> = [
  ["大热", "hot"],
  ["大寒", "cold"],
  ["微温", "warm"],
  ["微寒", "cool"],
  ["微凉", "cool"],
  ["温", "warm"],
  ["热", "hot"],
  ["寒", "cold"],
  ["凉", "cool"],
  ["平", "neutral"],
];

function parseThermalProperty(tasteAndNature: string | null): ThermalProperty {
  if (!tasteAndNature) return "neutral";
  const natureClause = tasteAndNature.split("归")[0];
  for (const [keyword, value] of thermalKeywords) {
    if (natureClause.includes(keyword)) return value;
  }
  return "neutral";
}

function parseChannels(tasteAndNature: string | null): Channel[] {
  if (!tasteAndNature) return [];
  const match = tasteAndNature.match(/归([^经]+)经/);
  if (!match) return [];
  const names = match[1]
    .split(/[、，,]/)
    .map((name) => name.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const channels: Channel[] = [];
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    const meta = channelMeta[name] ?? { label: name.slice(0, 2).toUpperCase(), className: "channel-extra" };
    channels.push({ name, ...meta });
  }
  return channels;
}

function toPinyin(value: string) {
  try {
    const raw = (pinyin(value, { toneType: "none", type: "string", nonZh: "consecutive" }) as string)
      .replace(/\s+/g, " ")
      .trim();
    // Title-case each syllable: "gui zhi tang" -> "Gui Zhi Tang".
    return raw.replace(/(^|\s)(\p{L})/gu, (_match, sep: string, ch: string) => sep + ch.toUpperCase());
  } catch {
    return "";
  }
}

const bareDosePattern = /^\d+(\.\d+)?\s*(g|mg|ml|克|两|钱|分|斤|升|枚|个|条)?$/i;
const doseUnit = "g|mg|ml|克|两|钱|分|斤|升";
const trailingDosePattern = new RegExp(
  `[，,、]\\s*(\\d+(?:\\.\\d+)?\\s*(?:${doseUnit})(?:\\s*[～~\\-]\\s*\\d+(?:\\.\\d+)?\\s*(?:${doseUnit})?)?)\\s*$`,
  "i"
);

function parseDoseToken(text: string) {
  const isShared = text.includes("各");
  const bracketMatch = text.match(/【([^】]+)】/);
  let dose: string | null = null;

  if (bracketMatch) {
    dose = bracketMatch[1].trim();
  } else if (isShared) {
    const tail = text.split("各")[1] ?? "";
    dose = tail.replace(/[，,、].*$/, "").trim() || null;
  } else if (bareDosePattern.test(text.trim())) {
    dose = text.trim();
  } else {
    // e.g. "炙，6g" or "去心，9g～15g" — processing note followed by a bare trailing dose.
    const trailingMatch = text.match(trailingDosePattern);
    if (trailingMatch) dose = trailingMatch[1].trim();
  }

  let processing = text
    .replace(/【[^】]+】/g, "")
    .replace(/各[^，,、]*/g, "");
  if (dose && !bracketMatch && !isShared) {
    processing = processing.replace(trailingDosePattern, "");
  }
  processing = processing.trim().replace(/^[，,、]+|[，,、]+$/g, "");
  if (dose && processing === text.trim()) processing = "";

  return { dose, processing: processing || null, isShared };
}

function extractDoseAndProcessing(trailingText: string) {
  const groups: string[] = [];
  const parenPattern = /（([^（）]*)）/g;
  let parenMatch: RegExpExecArray | null;
  while ((parenMatch = parenPattern.exec(trailingText))) groups.push(parenMatch[1]);

  let dose: string | null = null;
  let isShared = false;
  const processingParts: string[] = [];

  for (const group of groups) {
    const parsed = parseDoseToken(group);
    if (parsed.dose && dose === null) dose = parsed.dose;
    if (parsed.isShared) isShared = true;
    if (parsed.processing) processingParts.push(parsed.processing);
  }

  return { dose, processing: processingParts.join("，") || null, isShared };
}

function parseIngredients(ingredientText: string | null, herbIdByName: Map<string, string>) {
  if (!ingredientText) return [];

  const namePattern = /\{\{([^{}]+)\}\}|<<([^<>]+)>>/g;
  const nameMatches: { name: string; start: number; end: number }[] = [];
  let nameMatch: RegExpExecArray | null;
  while ((nameMatch = namePattern.exec(ingredientText))) {
    nameMatches.push({
      name: (nameMatch[1] ?? nameMatch[2]).trim(),
      start: nameMatch.index,
      end: nameMatch.index + nameMatch[0].length,
    });
  }

  const result: (IngredientChip & { isShared: boolean })[] = nameMatches.map((current, i) => {
    const boundary = nameMatches[i + 1]?.start ?? ingredientText.length;
    const trailing = ingredientText.slice(current.end, boundary);
    const { dose, processing, isShared } = extractDoseAndProcessing(trailing);

    return {
      position: i,
      name: current.name,
      nameZh: current.name,
      processing,
      dose,
      herbId: herbIdByName.get(current.name) ?? null,
      thermalProperty: "neutral",
      isShared,
    };
  });

  for (let i = 0; i < result.length; i++) {
    if (result[i].isShared && result[i].dose) {
      for (let j = i - 1; j >= 0; j--) {
        if (result[j].dose) break;
        result[j].dose = result[i].dose;
      }
    }
  }

  return result.map((chip) => ({
    position: chip.position,
    name: chip.name,
    nameZh: chip.nameZh,
    processing: chip.processing,
    dose: chip.dose,
    herbId: chip.herbId,
    thermalProperty: chip.thermalProperty,
  }));
}

// Some formula entries only record what was ADDED to a base formula (e.g. "四物汤加桃仁、红花"
// for 桃红四物汤) instead of listing the full composition. When that happens, the entry's own
// parsed ingredient count is far smaller than the referenced base formula's — so we detect the
// base formula's name inside the raw text and splice its ingredients in ahead of the additions.
function resolveBaseFormulaIngredients(formulas: Formula[]) {
  // Keyed on the Chinese name — `ingredientsRaw` is always Chinese, so base-formula
  // detection must match against `nameZh`, not the (possibly localized) `name`.
  const byName = new Map(formulas.map((formula) => [formula.nameZh, formula]));

  for (const formula of formulas) {
    if (!formula.ingredientsRaw) continue;
    const ownNames = new Set(formula.ingredients.map((chip) => chip.nameZh));
    const additions: IngredientChip[] = [];

    for (const [baseName, base] of byName) {
      if (baseName === formula.nameZh) continue;
      if (base.ingredients.length === 0) continue;
      if (formula.ingredients.length >= base.ingredients.length) continue;
      if (!formula.ingredientsRaw.includes(baseName)) continue;
      if (formula.ingredientsRaw.includes(`<<${baseName}>>`)) continue;

      for (const baseChip of base.ingredients) {
        if (ownNames.has(baseChip.nameZh)) continue;
        ownNames.add(baseChip.nameZh);
        additions.push(baseChip);
      }
    }

    if (additions.length > 0) {
      formula.ingredients = [...additions, ...formula.ingredients].map((chip, index) => ({ ...chip, position: index }));
      formula.herbIds = unique([
        ...formula.herbIds,
        ...additions.map((chip) => chip.herbId).filter((v): v is string => Boolean(v)),
      ]);
    }
  }
}

function extractBraceRefs(value: string | null) {
  if (!value) return [];
  const names = new Set<string>();
  const pattern = /\{\{([^{}]+)\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) names.add(match[1].trim());
  return [...names];
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

export function getReferenceData(locale: Locale = "zh"): ReferenceData {
  const isEn = locale === "en";
  const herbCategoryRows = rawHerbCategories as RawCategory[];
  const formulaCategoryRows = rawFormulaCategories as RawCategory[];
  const herbRows = rawHerbs as RawHerb[];
  const formulaRows = rawFormulas as RawFormula[];
  const aliasRows = rawHerbAliases as RawAlias[];

  const localizeCategory = (
    row: RawCategory,
    catMap: Record<string, string>,
    subMap: Record<string, string>,
  ): Category => {
    const sub = row.SubCategory || null;
    return {
      id: String(row.ID),
      category: isEn ? catMap[row.Category] ?? row.Category : row.Category,
      subcategory: sub && isEn ? subMap[sub] ?? sub : sub,
    };
  };

  const herbCategories: Category[] = herbCategoryRows.map((row) =>
    localizeCategory(row, enCategoryMaps.herbCategories, enCategoryMaps.herbSubcategories),
  );
  const formulaCategories: Category[] = formulaCategoryRows.map((row) =>
    localizeCategory(row, enCategoryMaps.formulaCategories, enCategoryMaps.formulaSubcategories),
  );
  const herbCategoryById = new Map(herbCategories.map((category) => [category.id, category]));
  const formulaCategoryById = new Map(formulaCategories.map((category) => [category.id, category]));

  const aliasesByMedicine = new Map<string, string[]>();
  const herbIdByName = new Map<string, string>();
  for (const row of herbRows) {
    herbIdByName.set(row.Medicine, String(row.ID));
  }
  for (const row of aliasRows) {
    aliasesByMedicine.set(row.Medicine, [...(aliasesByMedicine.get(row.Medicine) ?? []), row.Alias]);
    if (!herbIdByName.has(row.Alias)) {
      herbIdByName.set(row.Alias, herbIdByName.get(row.Medicine) ?? "");
    }
  }

  const herbs: Herb[] = herbRows.map((row) => {
    const id = String(row.ID);
    const categoryId = String(row.CategoryId);
    const category = herbCategoryById.get(categoryId);
    const ownAliases = row.Alias ? row.Alias.split(/[、，,\n]/).map((v) => v.trim()).filter(Boolean) : [];
    const en = isEn ? enHerbEntries[id] : undefined;
    return {
      id,
      name: pick(en?.name, row.Medicine),
      nameZh: row.Medicine,
      pinyin: toPinyin(row.Medicine),
      // Herb aliases stay in their original script.
      aliases: unique([...(aliasesByMedicine.get(row.Medicine) ?? []), ...ownAliases]),
      categoryId,
      category: category?.category ?? "",
      subcategory: category?.subcategory ?? null,
      source: pick(en?.source, row.Source),
      // thermalProperty / channels are always parsed from the Chinese 性味归经;
      // only the displayed text is localized.
      tasteAndNature: pick(en?.tasteAndNature, row.GuiJing),
      thermalProperty: parseThermalProperty(row.GuiJing),
      channels: parseChannels(row.GuiJing),
      function: pick(en?.function, row.Function),
      keyPoint: pick(en?.keyPoint, row.Character),
      appliedTo: pick(en?.appliedTo, row.AppliedTo),
      prescriptionForms: pick(en?.prescriptionForms, row.Prescription),
      usage: pick(en?.usage, row.Usage),
      classicalFormulas: pick(en?.classicalFormulas, row.Formula),
      // 古籍摘录 — verbatim classical quotation, never translated.
      digest: row.Digest,
      note: pick(en?.note, row.Note),
      image: row.Figure,
      formulaIds: [],
    };
  });
  const herbById = new Map(herbs.map((herb) => [herb.id, herb]));
  const herbThermalById = new Map(herbs.map((herb) => [herb.id, herb.thermalProperty]));
  const herbNameByZh = new Map(herbs.map((herb) => [herb.nameZh, herb.name]));

  const formulaIdByName = new Map(formulaRows.map((row) => [row.Formula, String(row.ID)]));

  const formulas: Formula[] = formulaRows.map((row) => {
    const id = String(row.ID);
    const categoryId = String(row.CategoryId);
    const category = formulaCategoryById.get(categoryId);
    const en = isEn ? enFormulaEntries[id] : undefined;
    const ingredients = parseIngredients(row.Ingredient, herbIdByName).map((chip) => ({
      ...chip,
      name: isEn ? herbNameByZh.get(chip.nameZh) ?? chip.name : chip.name,
      processing: pick(en?.ingredients?.[chip.nameZh]?.processing, chip.processing),
      thermalProperty: chip.herbId ? herbThermalById.get(chip.herbId) ?? "neutral" : "neutral",
    }));
    const herbIds = unique(ingredients.map((chip) => chip.herbId).filter((v): v is string => Boolean(v)));

    return {
      id,
      name: pick(en?.name, row.Formula),
      nameZh: row.Formula,
      pinyin: toPinyin(row.Formula),
      categoryId,
      category: category?.category ?? "",
      subcategory: category?.subcategory ?? null,
      // 组成原文 — left as written in the source.
      ingredientsRaw: row.Ingredient,
      ingredients,
      // 出处 — classical citation / quotation, never translated.
      source: row.Source,
      usage: pick(en?.usage, row.Usage),
      mainTreatment: pick(en?.mainTreatment, row.MainTreatment),
      function: pick(en?.function, row.Function),
      appliedTo: pick(en?.appliedTo, row.AppliedTo),
      notes: pick(en?.notes, row.Notes),
      // 古籍摘录 / 实验研究 — verbatim, never translated.
      digest: row.Digest,
      herbIds,
    };
  });
  resolveBaseFormulaIngredients(formulas);
  const formulaById = new Map(formulas.map((formula) => [formula.id, formula]));

  for (const formula of formulas) {
    for (const herbId of formula.herbIds) {
      const herb = herbById.get(herbId);
      if (herb && !herb.formulaIds.includes(formula.id)) herb.formulaIds.push(formula.id);
    }
  }
  for (const herbRow of herbRows) {
    const herb = herbById.get(String(herbRow.ID));
    if (!herb) continue;
    for (const formulaName of extractBraceRefs(herbRow.Formula)) {
      const formulaId = formulaIdByName.get(formulaName);
      if (!formulaId) continue;
      if (!herb.formulaIds.includes(formulaId)) herb.formulaIds.push(formulaId);
      const formula = formulaById.get(formulaId);
      if (formula && !formula.herbIds.includes(herb.id)) formula.herbIds.push(herb.id);
    }
  }

  const links = herbs.reduce((sum, herb) => sum + herb.formulaIds.length, 0);

  return {
    herbs,
    formulas,
    herbCategories,
    formulaCategories,
    stats: {
      herbs: herbs.length,
      formulas: formulas.length,
      herbCategories: herbCategories.length,
      formulaCategories: formulaCategories.length,
      links,
    },
  };
}

export function getKeywordMapping(): Array<{ keyword: string; term: string }> {
  return (rawKeywordMapping as Array<{ Keyword: string; TcmTerm: string }>).map((row) => ({
    keyword: row.Keyword,
    term: row.TcmTerm,
  }));
}
