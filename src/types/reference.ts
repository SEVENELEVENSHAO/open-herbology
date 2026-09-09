export type ThermalProperty = "hot" | "warm" | "neutral" | "cool" | "cold";

export interface Channel {
  name: string;
  label: string;
  className: string;
}

export interface IngredientChip {
  position: number;
  /** Localized herb name (English name when translated, otherwise Chinese). */
  name: string;
  /** Chinese herb name as written in the composition. */
  nameZh: string;
  processing: string | null;
  dose: string | null;
  herbId: string | null;
  thermalProperty: ThermalProperty;
}

export interface Category {
  id: string;
  category: string;
  subcategory: string | null;
}

export interface Herb {
  id: string;
  /** Localized display name. Equal to `nameZh` under the "zh" locale. */
  name: string;
  /** Chinese name — always present, used as the stable key for cross-links. */
  nameZh: string;
  pinyin: string;
  aliases: string[];
  categoryId: string;
  category: string;
  subcategory: string | null;
  source: string | null;
  tasteAndNature: string | null;
  thermalProperty: ThermalProperty;
  channels: Channel[];
  function: string | null;
  keyPoint: string | null;
  appliedTo: string | null;
  prescriptionForms: string | null;
  usage: string | null;
  classicalFormulas: string | null;
  digest: string | null;
  note: string | null;
  image: string | null;
  formulaIds: string[];
}

export interface Formula {
  id: string;
  /** Localized display name. Equal to `nameZh` under the "zh" locale. */
  name: string;
  /** Chinese name — always present, used as the stable key for cross-links. */
  nameZh: string;
  pinyin: string;
  categoryId: string;
  category: string;
  subcategory: string | null;
  ingredientsRaw: string | null;
  ingredients: IngredientChip[];
  source: string | null;
  usage: string | null;
  mainTreatment: string | null;
  function: string | null;
  appliedTo: string | null;
  notes: string | null;
  digest: string | null;
  herbIds: string[];
}

export interface ReferenceData {
  herbs: Herb[];
  formulas: Formula[];
  herbCategories: Category[];
  formulaCategories: Category[];
  stats: {
    herbs: number;
    formulas: number;
    herbCategories: number;
    formulaCategories: number;
    links: number;
  };
}
