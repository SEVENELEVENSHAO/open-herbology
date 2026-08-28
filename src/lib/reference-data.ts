import { pinyin } from "pinyin-pro";
import rawHerbs from "@/data/raw-herbs.json";
import rawFormulas from "@/data/raw-formulas.json";
import rawHerbCategories from "@/data/raw-herb-categories.json";
import rawFormulaCategories from "@/data/raw-formula-categories.json";
import rawHerbAliases from "@/data/raw-herb-aliases.json";
import rawKeywordMapping from "@/data/raw-keyword-mapping.json";
import type {
  Category,
  Channel,
  Formula,
  Herb,
  IngredientChip,
  ReferenceData,
  ThermalProperty,
} from "@/types/reference";

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
    return (pinyin(value, { toneType: "none", type: "string", nonZh: "consecutive" }) as string)
      .replace(/\s+/g, " ")
      .trim();
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
  const byName = new Map(formulas.map((formula) => [formula.name, formula]));

  for (const formula of formulas) {
    if (!formula.ingredientsRaw) continue;
    const ownNames = new Set(formula.ingredients.map((chip) => chip.name));
    const additions: IngredientChip[] = [];

    for (const [baseName, base] of byName) {
      if (baseName === formula.name) continue;
      if (base.ingredients.length === 0) continue;
      if (formula.ingredients.length >= base.ingredients.length) continue;
      if (!formula.ingredientsRaw.includes(baseName)) continue;
      if (formula.ingredientsRaw.includes(`<<${baseName}>>`)) continue;

      for (const baseChip of base.ingredients) {
        if (ownNames.has(baseChip.name)) continue;
        ownNames.add(baseChip.name);
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

export function getReferenceData(): ReferenceData {
  const herbCategoryRows = rawHerbCategories as RawCategory[];
  const formulaCategoryRows = rawFormulaCategories as RawCategory[];
  const herbRows = rawHerbs as RawHerb[];
  const formulaRows = rawFormulas as RawFormula[];
  const aliasRows = rawHerbAliases as RawAlias[];

  const herbCategories: Category[] = herbCategoryRows.map((row) => ({
    id: String(row.ID),
    category: row.Category,
    subcategory: row.SubCategory || null,
  }));
  const formulaCategories: Category[] = formulaCategoryRows.map((row) => ({
    id: String(row.ID),
    category: row.Category,
    subcategory: row.SubCategory || null,
  }));
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
    return {
      id,
      name: row.Medicine,
      pinyin: toPinyin(row.Medicine),
      aliases: unique([...(aliasesByMedicine.get(row.Medicine) ?? []), ...ownAliases]),
      categoryId,
      category: category?.category ?? "",
      subcategory: category?.subcategory ?? null,
      source: row.Source,
      tasteAndNature: row.GuiJing,
      thermalProperty: parseThermalProperty(row.GuiJing),
      channels: parseChannels(row.GuiJing),
      function: row.Function,
      keyPoint: row.Character,
      appliedTo: row.AppliedTo,
      prescriptionForms: row.Prescription,
      usage: row.Usage,
      classicalFormulas: row.Formula,
      digest: row.Digest,
      note: row.Note,
      image: row.Figure,
      formulaIds: [],
    };
  });
  const herbById = new Map(herbs.map((herb) => [herb.id, herb]));
  const herbThermalById = new Map(herbs.map((herb) => [herb.id, herb.thermalProperty]));

  const formulaIdByName = new Map(formulaRows.map((row) => [row.Formula, String(row.ID)]));

  const formulas: Formula[] = formulaRows.map((row) => {
    const id = String(row.ID);
    const categoryId = String(row.CategoryId);
    const category = formulaCategoryById.get(categoryId);
    const ingredients = parseIngredients(row.Ingredient, herbIdByName).map((chip) => ({
      ...chip,
      thermalProperty: chip.herbId ? herbThermalById.get(chip.herbId) ?? "neutral" : "neutral",
    }));
    const herbIds = unique(ingredients.map((chip) => chip.herbId).filter((v): v is string => Boolean(v)));

    return {
      id,
      name: row.Formula,
      pinyin: toPinyin(row.Formula),
      categoryId,
      category: category?.category ?? "",
      subcategory: category?.subcategory ?? null,
      ingredientsRaw: row.Ingredient,
      ingredients,
      source: row.Source,
      usage: row.Usage,
      mainTreatment: row.MainTreatment,
      function: row.Function,
      appliedTo: row.AppliedTo,
      notes: row.Notes,
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
