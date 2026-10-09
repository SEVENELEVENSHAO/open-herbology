// Bilingual UI layer for Open Herbology.
//
// Two locales are supported: "zh" (the source language, always complete) and
// "en". The English *data* (herb / formula prose) is translated in batches and
// lives under `src/data/en/`; this file only carries the fixed UI chrome plus
// the controlled vocabularies (channels, thermal nature) that never change.
//
// Rule for the whole English edition: everything is translated EXCEPT the
// verbatim classical-text quotations. Those fields stay in Chinese always:
//   - herb.digest            (古籍摘录)
//   - formula.digest         (古籍摘录 / 实验研究 appended by the source)
//   - formula.source         (出处 — classical citation, usually a direct quote)
//   - formula.ingredientsRaw (组成原文)
// Herb aliases and pinyin also stay in their original script.

export type Locale = "zh" | "en";

export const LOCALES: Locale[] = ["zh", "en"];
export const DEFAULT_LOCALE: Locale = "zh";
export const LOCALE_STORAGE_KEY = "fangyao-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "zh" || value === "en";
}

export interface UIStrings {
  brandTagline: string;
  languageSwitchLabel: string;
  languageSwitchTitle: string;

  nav: { home: string; herbs: string; compare: string; study: string };

  searchPlaceholder: string;
  clearSearch: string;
  openMenu: string;
  closeMenu: string;

  loading: string;
  fallbackCategory: string;
  fallbackSubcategory: string;
  dash: string;

  thermal: Record<"all" | "hot" | "warm" | "neutral" | "cool" | "cold", string>;

  home: {
    resultsKicker: string;
    resultsTitle: (count: number) => string;
    resultsDescription: string;
    empty: string;
  };

  herbs: {
    empty: string;
    formulaCount: (count: number) => string;
  };

  compare: {
    kicker: string;
    title: string;
    description: string;
    emptyTitle: string;
    browse: string;
    composition: string;
    actions: string;
    indications: string;
  };

  study: {
    kicker: string;
    title: string;
    description: (count: number) => string;
    deckName: string;
    mixed: string;
    identify: string;
    ingredients: string;
    actions: string;
    identifyPrompt: string;
    ingredientsPrompt: string;
    actionsPrompt: string;
    formula: string;
    composition: string;
    indications: string;
    pending: string;
    pendingDetail: string;
    sourceLabel: string;
    reveal: string;
    deckProgress: string;
    next: string;
    shuffle: string;
    viewEntry: string;
  };

  drawer: {
    back: string;
    formulaEntry: string;
    herbEntry: string;
    addCompare: string;
    added: string;
  };

  formula: {
    breadcrumb: string;
    composition: string;
    compositionRaw: string;
    actions: string;
    indications: string;
    analysis: string;
    usage: string;
    notes: string;
    classicalExcerpts: string;
    expand: string;
    source: string;
  };

  herb: {
    breadcrumb: string;
    aliases: string;
    channels: string;
    tasteAndNature: string;
    keyPoint: string;
    dosage: string;
    actions: string;
    applications: string;
    prescriptionForms: string;
    classicalFormulas: string;
    cautions: string;
    classicalExcerpts: string;
    expand: string;
    relatedFormulas: string;
    origin: string;
  };
}

const zh: UIStrings = {
  brandTagline: "方药库",
  languageSwitchLabel: "EN",
  languageSwitchTitle: "Switch to English",

  nav: { home: "方剂", herbs: "中药", compare: "对照", study: "研习" },

  searchPlaceholder: "搜索方名、中药、功效、主治或症状…",
  clearSearch: "清除搜索",
  openMenu: "打开菜单",
  closeMenu: "关闭菜单",

  loading: "正在加载资料库…",
  fallbackCategory: "其他",
  fallbackSubcategory: "综合",
  dash: "—",

  thermal: { all: "全部", hot: "热", warm: "温", neutral: "平", cool: "凉", cold: "寒" },

  home: {
    resultsKicker: "搜索结果",
    resultsTitle: (count) => `${count} 个匹配方剂`,
    resultsDescription: "选择方剂以查看完整资料。",
    empty: "没有找到匹配的方剂",
  },

  herbs: {
    empty: "没有找到匹配的中药",
    formulaCount: (count) => `${count} 方`,
  },

  compare: {
    kicker: "并列比较",
    title: "方剂对照",
    description: "可分析单方，也可同时对照最多四个方剂。",
    emptyTitle: "选择一个至四个方剂",
    browse: "浏览方剂",
    composition: "组成",
    actions: "功效",
    indications: "主治",
  },

  study: {
    kicker: "研习模式",
    title: "2026 期末方剂题库",
    description: (count) => `中文优先 · ${count} 张卡 · 方名、组成、功效与主治。`,
    deckName: "期末考试方剂",
    mixed: "综合",
    identify: "辨方",
    ingredients: "组成",
    actions: "功效主治",
    identifyPrompt: "根据组成辨认方剂",
    ingredientsPrompt: "回忆方剂组成",
    actionsPrompt: "回忆功效与主治",
    formula: "方名",
    composition: "组成",
    indications: "主治",
    pending: "待复核",
    pendingDetail: "所附课件未提供完整内容",
    sourceLabel: "资料来源",
    reveal: "显示答案",
    deckProgress: "卡组进度",
    next: "下一张",
    shuffle: "随机抽取",
    viewEntry: "查看完整条目",
  },

  drawer: {
    back: "返回",
    formulaEntry: "方剂条目",
    herbEntry: "中药条目",
    addCompare: "加入对照",
    added: "已加入",
  },

  formula: {
    breadcrumb: "方剂",
    composition: "组成",
    compositionRaw: "组成原文",
    actions: "功效",
    indications: "主治",
    analysis: "方解与应用",
    usage: "用法",
    notes: "附注",
    classicalExcerpts: "古籍摘录",
    expand: "展开阅读",
    source: "出处",
  },

  herb: {
    breadcrumb: "中药",
    aliases: "别名",
    channels: "归经",
    tasteAndNature: "性味归经",
    keyPoint: "要点",
    dosage: "用法用量",
    actions: "功效",
    applications: "应用",
    prescriptionForms: "处方用名",
    classicalFormulas: "配伍典方",
    cautions: "使用注意",
    classicalExcerpts: "古籍摘录",
    expand: "展开阅读",
    relatedFormulas: "相关方剂",
    origin: "来源",
  },
};

const en: UIStrings = {
  brandTagline: "Formula & Herb Reference",
  languageSwitchLabel: "中",
  languageSwitchTitle: "切换为中文",

  nav: { home: "Formulas", herbs: "Materia Medica", compare: "Compare", study: "Study" },

  searchPlaceholder: "Search formulas, herbs, actions, indications, or symptoms…",
  clearSearch: "Clear search",
  openMenu: "Open menu",
  closeMenu: "Close menu",

  loading: "Loading the library…",
  fallbackCategory: "Other",
  fallbackSubcategory: "General",
  dash: "—",

  thermal: { all: "All", hot: "Hot", warm: "Warm", neutral: "Neutral", cool: "Cool", cold: "Cold" },

  home: {
    resultsKicker: "Search results",
    resultsTitle: (count) => `${count} matching ${count === 1 ? "formula" : "formulas"}`,
    resultsDescription: "Select a formula to see the full entry.",
    empty: "No matching formulas",
  },

  herbs: {
    empty: "No matching herbs",
    formulaCount: (count) => `${count} ${count === 1 ? "formula" : "formulas"}`,
  },

  compare: {
    kicker: "Side by side",
    title: "Formula Comparison",
    description: "Analyze one formula or compare up to four.",
    emptyTitle: "Select one to four formulas",
    browse: "Browse formulas",
    composition: "Composition",
    actions: "Actions",
    indications: "Indications",
  },

  study: {
    kicker: "Study mode",
    title: "2026 Final Formula Deck",
    description: (count) => `Chinese first · ${count} cards · names, ingredients, actions, and indications.`,
    deckName: "Final exam formulas",
    mixed: "Mixed",
    identify: "Identify",
    ingredients: "Ingredients",
    actions: "Actions & indications",
    identifyPrompt: "Identify the formula from its ingredients",
    ingredientsPrompt: "Recall the ingredients",
    actionsPrompt: "Recall the actions and indications",
    formula: "Formula",
    composition: "Composition",
    indications: "Indications",
    pending: "Pending review",
    pendingDetail: "The supplied notes do not provide the complete field",
    sourceLabel: "Sources",
    reveal: "Show answer",
    deckProgress: "Deck progress",
    next: "Next",
    shuffle: "Shuffle",
    viewEntry: "View full entry",
  },

  drawer: {
    back: "Back",
    formulaEntry: "Formula entry",
    herbEntry: "Herb entry",
    addCompare: "Add to compare",
    added: "Added",
  },

  formula: {
    breadcrumb: "Formula",
    composition: "Composition",
    compositionRaw: "Composition (original text)",
    actions: "Actions",
    indications: "Indications",
    analysis: "Analysis & Application",
    usage: "Usage",
    notes: "Notes",
    classicalExcerpts: "Classical Excerpts",
    expand: "Expand",
    source: "Source",
  },

  herb: {
    breadcrumb: "Herb",
    aliases: "Also known as",
    channels: "Channels Entered",
    tasteAndNature: "Taste, Nature & Channels",
    keyPoint: "Key Point",
    dosage: "Dosage",
    actions: "Actions",
    applications: "Applications",
    prescriptionForms: "Prescription Names",
    classicalFormulas: "Classic Combinations",
    cautions: "Cautions",
    classicalExcerpts: "Classical Excerpts",
    expand: "Expand",
    relatedFormulas: "Related Formulas",
    origin: "Origin",
  },
};

const STRINGS: Record<Locale, UIStrings> = { zh, en };

export function getUI(locale: Locale): UIStrings {
  return STRINGS[locale] ?? zh;
}

// Controlled vocabulary — the twelve regular channels. `channelMeta` in
// reference-data.ts already carries the two-letter chip label (LU, SP, …);
// this map supplies the spelled-out name shown in English.
export const CHANNEL_EN: Record<string, string> = {
  肺: "Lung",
  大肠: "Large Intestine",
  胃: "Stomach",
  脾: "Spleen",
  心: "Heart",
  小肠: "Small Intestine",
  心包: "Pericardium",
  三焦: "Triple Burner",
  膀胱: "Bladder",
  肾: "Kidney",
  胆: "Gallbladder",
  肝: "Liver",
};

export function channelName(locale: Locale, name: string): string {
  if (locale === "en") return CHANNEL_EN[name] ?? name;
  return name;
}
