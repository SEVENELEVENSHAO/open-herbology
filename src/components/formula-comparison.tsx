"use client";

import { useMemo, useState } from "react";
import { Check, Columns2, Plus, Search, X } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import { buildIngredientMatrix, detectCoreFormulas, getCoreFormulas, MAX_COMPARE_FORMULAS, type CoreFormulaMatch } from "@/lib/formula-analysis";
import type { Formula } from "@/types/reference";

type IngredientFilter = "all" | "shared" | "unique";

function formulaName(formula: Formula, en: boolean) {
  return en ? formula.pinyin || formula.name : formula.nameZh;
}

export function FormulaComparison({ formulas, compareIds, onRemove, onAdd, onOpen }: {
  formulas: Formula[];
  compareIds: string[];
  onRemove: (id: string) => void;
  onAdd: (id: string) => void;
  onOpen: (formula: Formula) => void;
}) {
  const { locale, t } = useLocale();
  const en = locale === "en";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<IngredientFilter>("all");
  const selected = useMemo(() => compareIds.map((id) => formulas.find((formula) => formula.id === id))
    .filter((formula): formula is Formula => Boolean(formula)).slice(0, MAX_COMPARE_FORMULAS), [compareIds, formulas]);
  const cores = useMemo(() => getCoreFormulas(formulas), [formulas]);
  const rows = useMemo(() => buildIngredientMatrix(selected), [selected]);
  const analyses = useMemo(() => selected.map((formula) => detectCoreFormulas(formula, cores)), [selected, cores]);
  const single = selected.length === 1;
  const activeFilter = single ? "all" : filter;
  const visibleRows = rows.filter((row) => activeFilter === "all" || (activeFilter === "shared" ? row.count > 1 : row.count === 1));
  const full = selected.length >= MAX_COMPARE_FORMULAS;
  const candidates = formulas.filter((formula) => !selected.some((item) => item.id === formula.id) &&
    `${formula.nameZh} ${formula.name} ${formula.pinyin}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0, 30);
  const sharedCount = single ? 0 : rows.filter((row) => row.count > 1).length;
  const allSharedCount = single ? 0 : rows.filter((row) => row.count === selected.length).length;
  const uniqueCount = single ? 0 : rows.filter((row) => row.count === 1).length;

  return <section className="formula-analysis">
    <header className="analysis-heading">
      <div><span>{t.compare.kicker}</span><h1>{en ? "Compare & analyze" : "方剂对照与拆解"}</h1><p>{t.compare.description}</p></div>
      <button className="analysis-add" disabled={full} onClick={() => setPickerOpen(!pickerOpen)} aria-expanded={pickerOpen}>
        <Plus size={18} />{full ? (en ? "4 / 4 selected" : "已选 4 / 4 方") : (en ? "Add formula" : "添加方剂")}
      </button>
    </header>

    {pickerOpen && !full && <section className="analysis-picker" aria-label={en ? "Choose formula" : "选择方剂"}>
      <div className="analysis-picker-search"><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)}
        aria-label={en ? "Search formulas to compare" : "搜索要对照的方剂"} placeholder={en ? "Formula name or pinyin" : "输入方名或拼音"} />
        <button onClick={() => setPickerOpen(false)} aria-label={en ? "Close formula picker" : "关闭选择"}><X size={18} /></button></div>
      <div className="analysis-picker-results">{candidates.map((formula) => <button key={formula.id} onClick={() => {
        onAdd(formula.id);
        setQuery("");
        if (selected.length === MAX_COMPARE_FORMULAS - 1) setPickerOpen(false);
      }}><strong>{formulaName(formula, en)}</strong><span>{en ? formula.name : formula.pinyin}</span><Plus size={17} /></button>)}</div>
      {!candidates.length && <p>{en ? "No unselected formulas match." : "没有匹配的未选方剂。"}</p>}
    </section>}

    <div className="analysis-slots" aria-label={en ? "Selected formulas" : "已选方剂"}>
      {Array.from({ length: MAX_COMPARE_FORMULAS }, (_, index) => {
        const formula = selected[index];
        return formula ? <article className={`analysis-slot analysis-tone-${index}`} key={formula.id}>
          <span className="analysis-slot-index">{index + 1}</span>
          <button className="analysis-slot-remove" onClick={() => onRemove(formula.id)} aria-label={`${en ? "Remove" : "移除"} ${formulaName(formula, en)}`}><X size={18} /></button>
          <button className="analysis-slot-name" onClick={() => onOpen(formula)}><strong>{formulaName(formula, en)}</strong><span>{en ? formula.name : formula.pinyin}</span></button>
          <small>{new Set(formula.ingredients.map((item) => item.nameZh)).size} {en ? "ingredients" : "味药"}</small>
        </article> : <button key={`empty-${index}`} className="analysis-slot analysis-slot-empty" onClick={() => { setPickerOpen(true); setQuery(""); }}>
          <Plus size={22} /><span>{en ? "Add formula" : "添加方剂"}</span><small>{index + 1} / 4</small>
        </button>;
      })}
    </div>

    {selected.length === 0 ? <div className="analysis-empty"><Columns2 size={30} /><h2>{t.compare.emptyTitle}</h2>
      <p>{en ? "Analyze core formulas with one selection, or compare ingredients across two to four." : "选一个方剂即可拆解核心方；选二至四方，可对照共同药与独有药。"}</p>
      <button className="primary-button" onClick={() => setPickerOpen(true)}>{en ? "Choose formula" : "选择方剂"}</button></div> : <>
      <div className="analysis-summary" aria-label={en ? "Composition summary" : "组成概览"}>
        <div><strong>{rows.length}</strong><span>{en ? "Distinct ingredients" : "药味总数"}</span></div>
        {!single && <><div><strong>{allSharedCount}</strong><span>{en ? "In every formula" : "所有方共有"}</span></div><div><strong>{sharedCount}</strong><span>{en ? "In two or more" : "两方以上共有"}</span></div><div><strong>{uniqueCount}</strong><span>{en ? "In just one" : "单方独有"}</span></div></>}
      </div>

      <section className="analysis-panel">
        <div className="analysis-section-heading"><h2>{single ? (en ? "Ingredients" : "本方组成") : (en ? "Ingredient comparison" : "共同药与不同药")}</h2>
          {!single && <div className="analysis-filters" role="group" aria-label={en ? "Filter ingredients" : "筛选药味"}>
            {(["all", "shared", "unique"] as const).map((value) => <button key={value} aria-pressed={activeFilter === value} className={activeFilter === value ? "active" : ""} onClick={() => setFilter(value)}>
              {value === "all" ? (en ? "All" : "全部") : value === "shared" ? (en ? "Shared" : "共同药") : (en ? "Unique" : "独有药")}</button>)}
          </div>}
        </div>
        <p className="analysis-note">{en ? "Names are grouped by ingredient; doses and processing remain visible. Unspecified peony is flagged. Fresh/dried ginger, raw/prepared Rehmannia, and bitter orange fruit/peel stay separate." : "按药名归组，保留剂量和炮制；“芍药”未分赤白时单独提示。生姜与干姜、生地与熟地、枳实与枳壳不合并。"}</p>
        {selected.some((formula) => formula.ingredients.length === 0) && <p className="analysis-note">{en ? "Some entries have no structured composition; missing ingredients cannot be confirmed for them." : "部分条目没有可解析的组成，无法判断其共同药或核心方。"}</p>}
        <div className="ingredient-matrix-scroll" tabIndex={0} role="region" aria-label={en ? "Scrollable ingredient table" : "可横向滚动的药味对照表"}>
          <table className="ingredient-matrix">
            <caption className="sr-only">{single ? (en ? "Formula composition" : "方剂组成") : (en ? "Presence, dose and processing in each formula" : "各方药味、剂量与炮制对照")}</caption>
            <thead><tr><th scope="col">{en ? "Ingredient" : "药味"}</th>{selected.map((formula, index) => <th scope="col" className={`analysis-tone-${index}`} key={formula.id}><span>{index + 1}</span>{formulaName(formula, en)}</th>)}</tr></thead>
            <tbody>{visibleRows.map((row) => <tr key={row.key} className={single ? "" : row.count === selected.length ? "ingredient-row-all" : row.count > 1 ? "ingredient-row-shared" : "ingredient-row-unique"}>
              <th scope="row"><strong>{en ? row.cells.flat().find((item) => item.chip)?.chip.name ?? row.key : row.key}</strong>
                {!single && <span className="ingredient-presence">{row.count === selected.length ? (en ? "All" : "全部共有") : `${row.count} / ${selected.length}`}</span>}
                {row.cells.flat().some((item) => item.uncertain) && <small>{en ? "Source name unspecified" : "原药名未细分"}</small>}</th>
              {row.cells.map((cell, index) => <td key={selected[index].id}>{cell.length ? cell.map((item) => <div className={`matrix-present analysis-tone-${index}`} key={item.chip.position}>
                <span className="matrix-dose"><Check size={16} aria-label={en ? "Present" : "含有"} />{item.chip.dose || (en ? "Dose not recorded" : "未录剂量")}</span>
                <span>{item.chip.name}{item.chip.processing ? ` · ${item.chip.processing}` : ""}</span>
                {item.uncertain && <small>{en ? "Verify the source name" : "需核对药名"}</small>}
              </div>) : <span className="matrix-absent" aria-label={en ? "Not present" : "未含此药"}>—</span>}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        {!visibleRows.length && <p className="analysis-note">{en ? "No ingredients in this group." : "此分组没有药味。"}</p>}
      </section>

      <section className="analysis-panel">
        <div className="analysis-section-heading"><h2>{en ? "Core formula structure" : "核心方拆解"}</h2><span>{en ? `${cores.length} core formulas` : `${cores.length} 个核心方`}</span></div>
        <p className="analysis-note">{en ? "Compared with the library’s core compositions. Complete ingredient coverage does not compare dose ratios; processing differences and unspecified names are flagged." : "按资料库中的核心方组成核对。“药味齐全”只指药味覆盖，不代表剂量比例相同；炮制或药名未细分会另作提示。"}</p>
        <div className="core-analysis-grid" style={{ "--formula-count": selected.length } as React.CSSProperties}>
          {selected.map((formula, index) => <CoreAnalysis key={formula.id} formula={formula} matches={analyses[index]} index={index} onOpen={onOpen} en={en} />)}
        </div>
      </section>

      <section className="analysis-panel">
        <h2>{en ? "Actions & indications" : "功效与主治"}</h2>
        <div className="analysis-details-grid" style={{ "--formula-count": selected.length } as React.CSSProperties}>
          {selected.map((formula, index) => <article className="analysis-detail" key={formula.id}>
            <h3><span className={`analysis-number analysis-tone-${index}`}>{index + 1}</span>{formulaName(formula, en)}</h3>
            <h4>{t.compare.actions}</h4><p>{formula.function ?? t.dash}</p><h4>{t.compare.indications}</h4><p>{formula.mainTreatment ?? t.dash}</p>
          </article>)}
        </div>
      </section>
    </>}
  </section>;
}

function CoreAnalysis({ formula, matches, index, en, onOpen }: {
  formula: Formula; matches: CoreFormulaMatch[]; index: number; en: boolean; onOpen: (formula: Formula) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const meaningful = matches.filter((match) => match.complete || (match.matched.length >= 2 && match.matched.length / match.total >= .5));
  const visible = showAll ? matches : meaningful;
  const completeCount = matches.filter((match) => match.complete).length;
  const completeMatches = matches.filter((match) => match.complete);
  const covered = new Set(completeMatches.flatMap((match) => match.matched));
  const remaining = completeMatches[0]?.extra.filter((key) => !covered.has(key)) ?? [];
  return <article className="core-analysis-column">
    <h3><span className={`analysis-number analysis-tone-${index}`}>{index + 1}</span>{formulaName(formula, en)}</h3>
    <p className="core-result-summary">{en ? `${completeCount} complete ingredient ${completeCount === 1 ? "match" : "matches"}` : `${completeCount} 个核心方药味齐全`}</p>
    {completeCount > 0 && <div className="core-decomposition">
      <span>{en ? "Ingredient groups present" : "包含的药味组合"}</span>
      <strong>{completeMatches.map((match) => formulaName(match.core, en)).join(" + ")}</strong>
      {remaining.length > 0 && <p>{en ? "Remaining ingredients: " : "其余药味："}{remaining.join("、")}</p>}
    </div>}
    {!formula.ingredients.length ? <p className="analysis-note">{en ? "No structured ingredients to analyze." : "无可解析的组成，暂无法分析。"}</p> : <>
      {visible.map((match) => <section className={`core-match ${match.complete ? "core-match-complete" : ""}`} key={match.core.id}>
        <div className="core-match-heading"><button onClick={() => onOpen(match.core)}>{formulaName(match.core, en)}</button><strong>{match.matched.length} / {match.total}</strong></div>
        <div className="core-coverage" aria-hidden="true">{[...match.matched, ...match.missing].map((key) => <span key={key} className={match.matched.includes(key) ? "is-present" : ""} />)}</div>
        <span className="core-match-status">{match.complete ? (en ? "All ingredients present" : "药味齐全") : (en ? "Partial overlap" : "部分重合")}{match.complete && match.uncertain.length > 0 ? (en ? " · verify names" : " · 需核对药名") : ""}{match.core.id === formula.id ? (en ? " · same formula" : " · 本方") : ""}</span>
        <div className="core-herb-chips">{match.matched.map((key) => <span className="is-present" key={key}><Check size={12} />{key}</span>)}{match.missing.map((key) => <span className="is-missing" key={key}>{en ? "Missing" : "缺"}：{key}</span>)}</div>
        {match.extra.length > 0 && <p className="core-extra">{en ? "Additional ingredients: " : "另含："}{match.extra.join("、")}</p>}
        {match.uncertain.length > 0 && <p className="core-caution">{en ? "Unspecified source name; verify: " : "原文未细分药名，需核对："}{match.uncertain.join("、")}</p>}
        {match.preparationDifferences.length > 0 && <p className="core-caution">{en ? "Processing/handling differs: " : "炮制／处理不同："}{match.preparationDifferences.join("、")}</p>}
      </section>)}
      {!meaningful.length && !showAll && <p className="analysis-note">{en ? "No complete core formula or substantial partial overlap found." : "未发现药味齐全或明显部分重合的核心方。"}</p>}
      <button className="core-show-all" onClick={() => setShowAll(!showAll)} aria-expanded={showAll}>{showAll ? (en ? "Show main matches" : "只看主要匹配") : (en ? `Check all ${matches.length} cores` : `查看全部 ${matches.length} 个核心方`)}</button>
    </>}
  </article>;
}
