import assert from "node:assert/strict";
import test from "node:test";
import { addComparisonId, analyzeIngredient, buildIngredientMatrix, detectCoreFormulas, getCoreFormulas, MAX_COMPARE_FORMULAS } from "../src/lib/formula-analysis.ts";

function recipe(id, name, names) {
  return {
    id, nameZh: name, name, pinyin: name, ingredientsRaw: names.map((herb) => `{{${herb}}}`).join("、"),
    ingredients: names.map((herb, position) => ({ nameZh: herb, name: herb, position, processing: null, dose: "9g", herbId: null, thermalProperty: "neutral" })),
  };
}
const siwu = recipe("1", "四物汤", ["熟地黄", "当归", "白芍药", "川芎"]);
const sijunzi = recipe("2", "四君子汤", ["人参", "白朮", "茯苓", "炙甘草"]);
const guizhi = recipe("3", "桂枝汤", ["桂枝", "芍药", "炙甘草", "生姜", "大枣"]);
const sini = recipe("4", "四逆散", ["柴胡", "枳实", "芍药", "炙甘草"]);

test("selection stops at four without silently replacing a selected formula", () => {
  assert.equal(MAX_COMPARE_FORMULAS, 4);
  const selected = ["1", "2", "3", "4"];
  assert.deepEqual(addComparisonId(selected, "5"), selected);
  assert.deepEqual(addComparisonId(["1"], "1"), ["1"]);
  assert.deepEqual(addComparisonId(["1"], "2"), ["1", "2"]);
});

test("matrix distinguishes all-shared, partially-shared and unique ingredients", () => {
  const formulas = [recipe("1", "A", ["甘草", "人参", "生姜"]), recipe("2", "B", ["炙甘草", "人参"]),
    recipe("3", "C", ["甘草", "干姜"]), recipe("4", "D", ["甘草", "白术"])];
  const rows = buildIngredientMatrix(formulas);
  assert.equal(rows.find((row) => row.key === "甘草").count, 4);
  assert.equal(rows.find((row) => row.key === "人参").count, 2);
  assert.equal(rows.find((row) => row.key === "生姜").count, 1);
  assert.equal(rows.find((row) => row.key === "干姜").count, 1);
  assert.ok(rows.every((row) => row.cells.length === 4));
});

test("single 八珍汤 detects 四物汤 and 四君子汤 by ingredients", () => {
  const bazhen = recipe("8", "八珍汤", ["人参", "白朮", "白茯苓", "当归", "川芎", "白芍药", "熟地黄", "炙甘草"]);
  const matches = detectCoreFormulas(bazhen, [siwu, sijunzi, guizhi, sini]);
  assert.deepEqual(matches.filter((match) => match.complete).map((match) => match.core.nameZh), ["四物汤", "四君子汤"]);
  assert.equal(buildIngredientMatrix([bazhen]).length, 8);
});

test("枳壳 does not fulfill the 枳实 requirement in 四逆散", () => {
  const formula = recipe("9", "柴胡疏肝散", ["陈皮", "柴胡", "川芎", "香附", "枳壳", "芍药", "炙甘草"]);
  const match = detectCoreFormulas(formula, [sini])[0];
  assert.equal(match.complete, false);
  assert.deepEqual(match.missing, ["枳实"]);
  assert.ok(match.extra.includes("枳壳"));
});

test("raw/prepared Rehmannia and white/red peony remain distinct", () => {
  const modified = recipe("10", "Modified", ["生地黄", "当归", "赤芍药", "川芎"]);
  const match = detectCoreFormulas(modified, [siwu])[0];
  assert.equal(match.complete, false);
  assert.deepEqual(match.missing, ["熟地黄", "白芍"]);
  const chip = recipe("11", "Example", ["地黄"]).ingredients[0];
  assert.equal(analyzeIngredient(chip, "{{地黄}}（酒蒸）").key, "熟地黄");
  assert.equal(analyzeIngredient(chip, "{{地黄}}（洗）").key, "地黄");
});

test("unspecified 芍药 and processing changes are visibly marked for review", () => {
  const formula = recipe("12", "Variant", ["桂枝", "白芍", "甘草", "生姜", "大枣"]);
  const match = detectCoreFormulas(formula, [guizhi])[0];
  assert.equal(match.complete, true);
  assert.deepEqual(match.uncertain, ["白芍"]);
  assert.ok(match.preparationDifferences.includes("甘草"));
});

test("duplicate herbs count once and empty entries do not falsely match", () => {
  const duplicate = recipe("13", "Duplicate", ["白芍", "白芍药"]);
  const matrix = buildIngredientMatrix([duplicate]);
  assert.equal(matrix.length, 1);
  assert.equal(matrix[0].count, 1);
  assert.equal(matrix[0].cells[0].length, 2);
  assert.ok(detectCoreFormulas(recipe("14", "Empty", []), [siwu]).every((match) => !match.complete));
  assert.equal(getCoreFormulas([siwu, sijunzi, recipe("15", "桂枝汤", [])]).length, 2);
});

test("mentioning a core formula in prose is not evidence of inclusion", () => {
  const formula = { ...recipe("16", "Other", ["甘草"]), ingredientsRaw: "与四物汤比较，只有甘草" };
  assert.equal(detectCoreFormulas(formula, [siwu])[0].complete, false);
});
