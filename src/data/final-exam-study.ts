import type { Formula } from "@/types/reference";

export type StudyPrompt = "identify" | "ingredients" | "actions";

export interface FinalExamStudyEntry {
  key: string;
  formulaId: string | null;
  nameZh: string;
  pinyin: string;
  examHerbCount: number;
  sourceIngredients?: string[];
  sourceNote?: string;
  catalogVariant?: string;
}

export interface FinalExamStudyCard {
  id: string;
  prompt: StudyPrompt;
  entry: FinalExamStudyEntry;
  formula: Formula | null;
  ingredients: string[];
  actions: string | null;
  indications: string | null;
}

/**
 * The order and herb-count groups follow "Formulas for Final Exam.docx".
 * Formula-run notes provide only the explicit sourceIngredients/sourceNote values below.
 * Catalog content is joined by stable formula ID and remains separately attributable.
 */
export const FINAL_EXAM_STUDY_ENTRIES: FinalExamStudyEntry[] = [
  { key: "shao-yao-gan-cao-tang", formulaId: null, nameZh: "芍药甘草汤", pinyin: "Shao Yao Gan Cao Tang", examHerbCount: 2, sourceIngredients: ["芍药", "甘草"], sourceNote: "英文课件列为二味方；组成按方名拆分，待复核。" },
  { key: "jie-geng-tang", formulaId: null, nameZh: "桔梗汤", pinyin: "Jie Geng Tang", examHerbCount: 2, sourceIngredients: ["桔梗", "甘草"], sourceNote: "英文课件列为二味方；组成按方名与常用配伍整理，待复核。" },
  { key: "xiao-ban-xia-tang", formulaId: "133", nameZh: "小半夏汤", pinyin: "Xiao Ban Xia Tang", examHerbCount: 2 },
  { key: "gui-zhi-gan-cao-tang", formulaId: null, nameZh: "桂枝甘草汤", pinyin: "Gui Zhi Gan Cao Tang", examHerbCount: 2, sourceIngredients: ["桂枝", "甘草"], sourceNote: "英文课件列为二味方；组成按方名拆分，待复核。" },

  { key: "three-harmonizers", formulaId: null, nameZh: "三味调和药", pinyin: "Three Harmonizers", examHerbCount: 3, sourceIngredients: ["生姜", "大枣", "甘草"], sourceNote: "英文课件明确将生姜、大枣、甘草列为三味调和药；这是学习组合，不作为独立处方条目。" },
  { key: "zeng-ye-tang", formulaId: "295", nameZh: "增液汤", pinyin: "Zeng Ye Tang", examHerbCount: 3, sourceNote: "方剂脉络课件列出：生地黄、玄参、麦门冬。" },

  { key: "si-ni-san", formulaId: "44", nameZh: "四逆散", pinyin: "Si Ni San", examHerbCount: 4 },
  { key: "si-jun-zi-tang", formulaId: "146", nameZh: "四君子汤", pinyin: "Si Jun Zi Tang", examHerbCount: 4, sourceNote: "方剂脉络课件列出：人参、白术、茯苓、炙甘草。" },
  { key: "si-wu-tang", formulaId: "160", nameZh: "四物汤", pinyin: "Si Wu Tang", examHerbCount: 4, sourceNote: "方剂脉络课件以“二动二静”记忆当归、川芎、白芍、熟地黄。" },
  { key: "si-miao-san", formulaId: "351", nameZh: "四妙散", pinyin: "Si Miao San", examHerbCount: 4, catalogVariant: "方药库条目名为四妙丸", sourceNote: "考试名单写作 Si miao san；与方药库四妙丸条目关联，名称与剂型待复核。" },

  { key: "gui-zhi-tang", formulaId: "7", nameZh: "桂枝汤", pinyin: "Gui Zhi Tang", examHerbCount: 5 },
  { key: "huang-qi-gui-zhi-wu-wu-tang", formulaId: "142", nameZh: "黄芪桂枝五物汤", pinyin: "Huang Qi Gui Zhi Wu Wu Tang", examHerbCount: 5, sourceNote: "方剂脉络课件记为桂枝汤去甘草、加黄芪。" },
  { key: "er-chen-tang", formulaId: "300", nameZh: "二陈汤", pinyin: "Er Chen Tang", examHerbCount: 5, sourceNote: "课件按五味复习：制半夏、陈皮、茯苓、生姜、甘草，并另括注乌梅。方药库结构化条目为四味，差异待复核。" },

  { key: "liu-wei-di-huang-wan", formulaId: "170", nameZh: "六味地黄丸", pinyin: "Liu Wei Di Huang Wan", examHerbCount: 6, sourceNote: "方剂脉络课件按三补、三泻整理。" },
  { key: "tao-hong-si-wu-tang", formulaId: "162", nameZh: "桃红四物汤", pinyin: "Tao Hong Si Wu Tang", examHerbCount: 6, sourceNote: "方剂脉络课件记为四物汤加桃仁、红花。" },
  { key: "si-hai-shu-yu-wan", formulaId: null, nameZh: "四海舒郁丸", pinyin: "Si Hai Shu Yu Wan", examHerbCount: 6, sourceNote: "考试名单列为六味方；所附方剂脉络未给出组成、功效或主治，待复核。" },

  { key: "xiao-chai-hu-tang", formulaId: "41", nameZh: "小柴胡汤", pinyin: "Xiao Chai Hu Tang", examHerbCount: 7, sourceNote: "方剂脉络课件列出七味，并用于半夏泻心汤、大柴胡汤演变复习。" },
  { key: "qiang-huo-sheng-shi-tang", formulaId: "11", nameZh: "羌活胜湿汤", pinyin: "Qiang Huo Sheng Shi Tang", examHerbCount: 7 },
  { key: "chai-hu-shu-gan-san", formulaId: "231", nameZh: "柴胡疏肝散", pinyin: "Chai Hu Shu Gan San", examHerbCount: 7 },

  { key: "xiao-yao-san", formulaId: "69", nameZh: "逍遥散", pinyin: "Xiao Yao San", examHerbCount: 8 },
  { key: "xue-fu-zhu-yu-tang", formulaId: "245", nameZh: "血府逐瘀汤", pinyin: "Xue Fu Zhu Yu Tang", examHerbCount: 11, sourceNote: "方剂脉络课件将其联系到桃红四物汤与四逆散。" },
  { key: "hai-zao-yu-hu-tang", formulaId: null, nameZh: "海藻玉壶汤", pinyin: "Hai Zao Yu Hu Tang", examHerbCount: 12, sourceNote: "考试名单列为十二味方；所附方剂脉络未给出组成、功效或主治，待复核。" },
  { key: "du-huo-ji-sheng-tang", formulaId: "279", nameZh: "独活寄生汤", pinyin: "Du Huo Ji Sheng Tang", examHerbCount: 15 },
];

const PROMPTS: StudyPrompt[] = ["identify", "ingredients", "actions"];

export function buildFinalExamStudyCards(formulas: Formula[]): FinalExamStudyCard[] {
  const formulaById = new Map(formulas.map((formula) => [formula.id, formula]));

  return FINAL_EXAM_STUDY_ENTRIES.flatMap((entry) => {
    const formula = entry.formulaId ? formulaById.get(entry.formulaId) ?? null : null;
    const ingredients = entry.sourceIngredients ?? formula?.ingredients.map((ingredient) => ingredient.nameZh) ?? [];

    return PROMPTS.map((prompt) => ({
      id: `${entry.key}-${prompt}`,
      prompt,
      entry,
      formula,
      ingredients,
      actions: formula?.function ?? null,
      indications: formula?.mainTreatment ?? null,
    }));
  });
}

