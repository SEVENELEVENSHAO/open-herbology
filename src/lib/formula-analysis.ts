import type { Formula, IngredientChip } from "@/types/reference";

export const MAX_COMPARE_FORMULAS = 4;
// Compositions are read from the reference entries, not an independent recipe list.
export const CORE_FORMULA_NAMES = [
  "四物汤", "四君子汤", "桂枝汤", "四逆散", "二陈汤", "理中丸",
  "六味地黄丸", "小柴胡汤", "麻黄汤", "黄连解毒汤", "平胃散", "五苓散", "苓桂术甘汤",
] as const;

const aliases: Record<string, string> = {
  白芍药: "白芍", 赤芍药: "赤芍", 白茯苓: "茯苓", 云苓: "茯苓",
  川当归: "当归", 炙甘草: "甘草", 生甘草: "甘草",
  熟地: "熟地黄", 生地: "生地黄", 山萸肉: "山茱萸", 干山药: "山药",
};

export function normalizeFormulaName(name: string): string {
  return name.trim().replaceAll("朮", "术");
}

export interface AnalyzedIngredient {
  key: string;
  chip: IngredientChip;
  uncertain: boolean;
  preparation: string;
}

export function analyzeIngredient(chip: IngredientChip, raw: string | null): AnalyzedIngredient {
  let name = normalizeFormulaName(chip.nameZh);
  const token = [`{{${chip.nameZh}}}`, `<<${chip.nameZh}>>`].find((value) => raw?.includes(value));
  const rawAfterName = token ? raw!.slice(raw!.indexOf(token) + token.length).split(/\{\{|<</)[0] : "";
  // Only infer prepared Rehmannia when the source explicitly describes steaming.
  if (name === "地黄" && /酒蒸|蒸熟|熟地/.test(rawAfterName)) name = "熟地黄";
  const uncertain = name === "芍药" || name === "地黄";
  // Unspecified classical 芍药 is grouped visually with 白芍, but every core match
  // involving it is marked for review; 赤芍 is never merged into this group.
  if (name === "芍药") name = "白芍";
  name = aliases[name] ?? name;
  const preparation = chip.nameZh.includes("炙甘草") || /炙/.test(rawAfterName) ? "炙" :
    /酒蒸|蒸熟/.test(rawAfterName) ? "蒸" : chip.processing ?? "";
  return { key: name, chip, uncertain, preparation };
}

export function formulaIngredients(formula: Formula): Map<string, AnalyzedIngredient[]> {
  const ingredients = new Map<string, AnalyzedIngredient[]>();
  for (const chip of formula.ingredients) {
    const item = analyzeIngredient(chip, formula.ingredientsRaw);
    ingredients.set(item.key, [...(ingredients.get(item.key) ?? []), item]);
  }
  return ingredients;
}

export interface IngredientRow {
  key: string;
  cells: AnalyzedIngredient[][];
  count: number;
}

export function buildIngredientMatrix(formulas: Formula[]): IngredientRow[] {
  const sets = formulas.map(formulaIngredients);
  const keys = [...new Set(sets.flatMap((set) => [...set.keys()]))];
  return keys.map((key) => {
    const cells = sets.map((set) => set.get(key) ?? []);
    return { key, cells, count: cells.filter((cell) => cell.length > 0).length };
  }).sort((a, b) => b.count - a.count);
}

export interface CoreFormulaMatch {
  core: Formula;
  matched: string[];
  missing: string[];
  extra: string[];
  uncertain: string[];
  preparationDifferences: string[];
  total: number;
  complete: boolean;
}

export function getCoreFormulas(formulas: Formula[]): Formula[] {
  return CORE_FORMULA_NAMES.map((name) => formulas.find((formula) => normalizeFormulaName(formula.nameZh) === name))
    .filter((formula): formula is Formula => Boolean(formula?.ingredients.length));
}

export function detectCoreFormulas(formula: Formula, cores: Formula[]): CoreFormulaMatch[] {
  const actual = formulaIngredients(formula);
  return cores.map((core) => {
    const expected = formulaIngredients(core);
    const keys = [...expected.keys()];
    const matched = keys.filter((key) => actual.has(key));
    const missing = keys.filter((key) => !actual.has(key));
    const uncertain = matched.filter((key) => actual.get(key)!.some((item) => item.uncertain) || expected.get(key)!.some((item) => item.uncertain));
    const preparationDifferences = matched.filter((key) => {
      const required = [...new Set(expected.get(key)!.map((item) => item.preparation))].sort().join("|");
      const observed = [...new Set(actual.get(key)!.map((item) => item.preparation))].sort().join("|");
      return required !== observed;
    });
    return {
      core, matched, missing, uncertain, preparationDifferences,
      extra: [...actual.keys()].filter((key) => !expected.has(key)),
      total: keys.length, complete: keys.length > 0 && missing.length === 0,
    };
  }).sort((a, b) => Number(b.complete) - Number(a.complete) || b.matched.length / b.total - a.matched.length / a.total || b.matched.length - a.matched.length);
}

export function addComparisonId(current: string[], id: string): string[] {
  return current.includes(id) || current.length >= MAX_COMPARE_FORMULAS ? current : [...current, id];
}
