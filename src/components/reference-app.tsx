"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  Columns2,
  FlaskConical,
  GraduationCap,
  Leaf,
  Menu,
  Search,
  Shuffle,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getKeywordMapping } from "@/lib/reference-data";
import type { Formula, Herb, IngredientChip, ReferenceData } from "@/types/reference";

type Section = "home" | "herbs" | "compare" | "study";
type Detail = { type: "formula"; item: Formula } | { type: "herb"; item: Herb };
type ThermalFilter = "all" | "hot" | "warm" | "neutral" | "cool" | "cold";

const thermalLabels: Record<Exclude<ThermalFilter, "all">, string> = {
  hot: "热",
  warm: "温",
  neutral: "平",
  cool: "凉",
  cold: "寒",
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const keywordMapping = getKeywordMapping();

function expandQueryTerms(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const terms = new Set([trimmed]);
  for (const { keyword, term } of keywordMapping) {
    if (trimmed.includes(keyword)) terms.add(term);
  }
  return [...terms];
}

function matchesAny(values: Array<string | null | undefined>, terms: string[]) {
  if (!terms.length) return true;
  const haystack = normalize(values.filter(Boolean).join(" "));
  return terms.some((term) => haystack.includes(normalize(term)));
}

function splitProse(value: string) {
  return value
    .split(/\n{1,}/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function renderWithFormulaRefs(value: string, onOpenFormulaByName: (name: string) => void) {
  const parts = value.split(/(\{\{[^{}]+\}\})/g);
  return parts.map((part, index) => {
    const match = part.match(/^\{\{([^{}]+)\}\}$/);
    if (!match) return <span key={index}>{part}</span>;
    return (
      <button
        key={index}
        className="inline-ref-link"
        onClick={() => onOpenFormulaByName(match[1].trim())}
      >
        {match[1].trim()}
      </button>
    );
  });
}

type CategoryGroup<T> = {
  category: string;
  subcategories: { subcategory: string; items: T[] }[];
  count: number;
};

function groupByCategory<T extends { category: string; subcategory: string | null }>(items: T[]): CategoryGroup<T>[] {
  const order: string[] = [];
  const map = new Map<string, Map<string, T[]>>();
  for (const item of items) {
    const cat = item.category || "其他";
    const sub = item.subcategory || "综合";
    if (!map.has(cat)) {
      map.set(cat, new Map());
      order.push(cat);
    }
    const subMap = map.get(cat)!;
    subMap.set(sub, [...(subMap.get(sub) ?? []), item]);
  }
  return order.map((category) => {
    const subMap = map.get(category)!;
    const subcategories = [...subMap.entries()].map(([subcategory, items]) => ({ subcategory, items }));
    return { category, subcategories, count: subcategories.reduce((sum, group) => sum + group.items.length, 0) };
  });
}

export function ReferenceApp({ data }: { data: ReferenceData }) {
  const [section, setSection] = useState<Section>("home");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [thermal, setThermal] = useState<ThermalFilter>("all");
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [brandIcon, setBrandIcon] = useState("🌿");

  const herbById = useMemo(() => new Map(data.herbs.map((herb) => [herb.id, herb])), [data.herbs]);
  const formulaById = useMemo(() => new Map(data.formulas.map((formula) => [formula.id, formula])), [data.formulas]);
  const formulaByName = useMemo(() => new Map(data.formulas.map((formula) => [formula.name, formula])), [data.formulas]);

  useEffect(() => {
    const saved = localStorage.getItem("fangyao-bookmarks");
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved) as string[]);
      } catch {
        // ignore malformed storage
      }
    }
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${basePath}/sw.js`);
    }
  }, []);

  useEffect(() => {
    const syncIcon = (event?: Event) => {
      const customEvent = event as CustomEvent<string> | undefined;
      setBrandIcon(customEvent?.detail || document.documentElement.dataset.fangyaoIcon || "🌿");
    };
    syncIcon();
    window.addEventListener("fangyao-icon-change", syncIcon);
    return () => window.removeEventListener("fangyao-icon-change", syncIcon);
  }, []);

  const queryTerms = useMemo(() => expandQueryTerms(query), [query]);

  const formulas = useMemo(() => data.formulas.filter((formula) => matchesAny([
    formula.name,
    formula.pinyin,
    formula.function,
    formula.mainTreatment,
    formula.appliedTo,
    formula.category,
    formula.subcategory,
    ...formula.ingredients.map((item) => item.name),
  ], queryTerms)), [data.formulas, queryTerms]);

  const herbs = useMemo(() => data.herbs.filter((herb) =>
    (thermal === "all" || herb.thermalProperty === thermal) &&
    matchesAny([
      herb.name,
      herb.pinyin,
      ...herb.aliases,
      herb.function,
      herb.keyPoint,
      herb.appliedTo,
      herb.category,
      herb.subcategory,
      herb.tasteAndNature,
    ], queryTerms)
  ), [data.herbs, queryTerms, thermal]);

  function toggleBookmark(id: string) {
    setBookmarks((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      localStorage.setItem("fangyao-bookmarks", JSON.stringify(next));
      return next;
    });
  }

  function toggleCompare(id: string) {
    setCompareIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 3 ? [...current, id] : [current[1], current[2], id]
    );
  }

  function addToCompare(id: string) {
    setCompareIds((current) =>
      current.includes(id) ? current : current.length < 3 ? [...current, id] : [current[1], current[2], id]
    );
  }

  function navigate(next: Section) {
    setSection(next);
    setMobileNav(false);
    if (next === "home" || next === "herbs") setQuery("");
  }

  function openFormula(formula: Formula) {
    setDetail({ type: "formula", item: formula });
  }

  function openHerb(herb: Herb) {
    setDetail({ type: "herb", item: herb });
  }

  function openFormulaByName(name: string) {
    const formula = formulaByName.get(name);
    if (formula) openFormula(formula);
  }

  const navSections: Section[] = ["home", "herbs", "compare", "study"];
  const navMeta: Record<Section, [typeof FlaskConical, string]> = {
    home: [FlaskConical, "方剂"],
    herbs: [Leaf, "中药"],
    compare: [Columns2, "对照"],
    study: [GraduationCap, "研习"],
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">{brandIcon}</div>
          <div>
            <strong>Open Herbology</strong>
            <span>方药库</span>
          </div>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="关闭菜单"><X size={18} /></button>
        </div>
        <nav className="main-nav" aria-label="Primary navigation">
          {navSections.map((key) => {
            const [Icon, label] = navMeta[key];
            return (
              <button key={key} className={section === key ? "active" : ""} onClick={() => navigate(key)}>
                <Icon size={19} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileNav(true)}><Menu size={21} /></button>
          <div className="global-search">
            <Search size={19} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索方名、中药、功效、主治或症状…"
            />
            {query && <button onClick={() => setQuery("")} aria-label="清除搜索"><X size={17} /></button>}
          </div>
        </header>

        <div className="content">
          {section === "home" && (
            <HomePage
              formulas={formulas}
              query={query}
              onOpenFormula={openFormula}
            />
          )}
          {section === "herbs" && (
            <HerbLibrary
              herbs={herbs}
              thermal={thermal}
              setThermal={setThermal}
              onOpen={openHerb}
            />
          )}
          {section === "compare" && (
            <CompareView
              formulas={data.formulas}
              compareIds={compareIds}
              onRemove={toggleCompare}
              onBrowse={() => navigate("home")}
            />
          )}
          {section === "study" && (
            <StudyView formulas={data.formulas} bookmarks={bookmarks} onOpen={openFormula} />
          )}
        </div>
      </main>

      {detail && (
        <DetailDrawer
          detail={detail}
          bookmarked={bookmarks.includes(detail.item.id)}
          onBookmark={toggleBookmark}
          compareIds={compareIds}
          onAddCompare={addToCompare}
          onClose={() => setDetail(null)}
          onOpenFormula={openFormula}
          onOpenHerb={openHerb}
          onOpenFormulaByName={openFormulaByName}
          herbById={herbById}
          formulaById={formulaById}
        />
      )}
    </div>
  );
}

function NavigatorHeading({ kicker, title, description, children }: {
  kicker: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="navigator-heading">
      <span>{kicker}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  );
}

function PageHeading({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return (
    <div className="page-heading">
      <span>{kicker}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="empty-state"><p>{label}</p></div>;
}

function HomePage({ formulas, query, onOpenFormula }: {
  formulas: Formula[];
  query: string;
  onOpenFormula: (formula: Formula) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const grouped = useMemo(() => groupByCategory(formulas), [formulas]);

  if (query) {
    return (
      <section className="category-browser">
        <NavigatorHeading kicker="搜索结果" title={`${formulas.length} 个匹配方剂`} description="选择方剂以查看完整资料。" />
        <div className="navigator-formula-grid">
          {grouped.flatMap(({ category, subcategories }) =>
            subcategories.flatMap(({ subcategory, items }) =>
              items.map((formula) => (
                <button className="navigator-formula-card" key={formula.id} onClick={() => onOpenFormula(formula)}>
                  <span className="navigator-path">{category} / {subcategory}</span>
                  <strong>{formula.name}</strong>
                  <span className="formula-pinyin">{formula.pinyin}</span>
                  <ArrowRight size={16} />
                </button>
              ))
            )
          )}
        </div>
        {!formulas.length && <EmptyState label="没有找到匹配的方剂" />}
      </section>
    );
  }

  return (
    <section className="category-browser">
      <div className="category-strip-list formula-category-strip-list">
          {Array.from({ length: Math.ceil(grouped.length / 3) }, (_, rowIndex) => {
            const rowGroups = grouped.slice(rowIndex * 3, rowIndex * 3 + 3);
            const openGroup = rowGroups.find(({ category }) => selectedCategory === category);
            const openIndex = openGroup ? grouped.findIndex(({ category }) => category === openGroup.category) : -1;

            return (
              <div className="category-strip-row" key={`row-${rowIndex}`}>
                <div className="category-strip-row-cards">
                  {rowGroups.map(({ category, count }, groupIndex) => {
                    const index = rowIndex * 3 + groupIndex;
                    const categoryOpen = selectedCategory === category;
                    return (
                      <section className={`category-strip-group category-tone-${index % 5} ${categoryOpen ? "is-open" : ""}`} key={category}>
                        <button
                          className="category-strip"
                          onClick={() => { setSelectedCategory(categoryOpen ? null : category); setSelectedSubcategory(null); }}
                          aria-expanded={categoryOpen}
                        >
                          <span>{category}</span>
                          <span><strong>{count}</strong><ChevronDown size={18} /></span>
                        </button>
                      </section>
                    );
                  })}
                </div>
                {openGroup && (
                  <div className={`category-expansion-panel category-tone-${openIndex % 5}`}>
                    <div className="subcategory-strip-list">
                      {openGroup.subcategories.map(({ subcategory, items }) => {
                        const subcategoryOpen = selectedSubcategory === subcategory;
                        return (
                          <section className={`subcategory-strip-group ${subcategoryOpen ? "is-open" : ""}`} key={subcategory}>
                            <button className="subcategory-strip" onClick={() => setSelectedSubcategory(subcategoryOpen ? null : subcategory)} aria-expanded={subcategoryOpen}>
                              <span>{subcategory}</span>
                              <span><strong>{items.length}</strong><ChevronDown size={16} /></span>
                            </button>
                            {subcategoryOpen && (
                              <div className="strip-formula-grid">
                                {items.map((formula) => (
                                  <button className="strip-formula-card" key={formula.id} onClick={() => onOpenFormula(formula)}>
                                    <strong>{formula.name}</strong>
                                    <span className="formula-pinyin">{formula.pinyin}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </section>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </section>
  );
}

function HerbCard({ herb, onOpen }: { herb: Herb; onOpen: (herb: Herb) => void }) {
  return (
    <button className="herb-card" key={herb.id} onClick={() => onOpen(herb)}>
      <div className={`herb-color thermal-${herb.thermalProperty}`}><Leaf size={19} /></div>
      <h3>{herb.name}</h3>
      <div className="herb-card-bottom">
        <span>{herb.pinyin}</span>
      </div>
      <div><span>{herb.formulaIds.length} 方</span><ArrowRight size={15} /></div>
    </button>
  );
}

function HerbLibrary({ herbs, thermal, setThermal, onOpen }: {
  herbs: Herb[]; thermal: ThermalFilter; setThermal: (value: ThermalFilter) => void; onOpen: (herb: Herb) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const grouped = useMemo(() => groupByCategory(herbs), [herbs]);

  return (
    <section>
      <div className="thermal-filters">
        {(["all", "hot", "warm", "neutral", "cool", "cold"] as const).map((item) => (
          <button key={item} className={`${thermal === item ? "active" : ""} filter-${item}`} onClick={() => setThermal(item)}>
            {item === "all" ? "全部" : thermalLabels[item]}
          </button>
        ))}
      </div>
      <div className="category-strip-list tight-category-grid herb-category-strip-list">
        {grouped.map(({ category, subcategories, count }, index) => {
          const categoryOpen = selectedCategory === category;
          return (
            <section className={`category-strip-group category-tone-${index % 5} ${categoryOpen ? "is-open" : ""}`} key={category}>
              <button className="category-strip" onClick={() => { setSelectedCategory(categoryOpen ? null : category); setSelectedSubcategory(null); }} aria-expanded={categoryOpen}>
                <span>{category}</span>
                <span><strong>{count}</strong><ChevronDown size={18} /></span>
              </button>
              {categoryOpen && (
                <div className="subcategory-strip-list">
                  {subcategories.map(({ subcategory, items }) => {
                    const subcategoryOpen = selectedSubcategory === subcategory;
                    return (
                      <section className={`subcategory-strip-group ${subcategoryOpen ? "is-open" : ""}`} key={subcategory}>
                        <button className="subcategory-strip" onClick={() => setSelectedSubcategory(subcategoryOpen ? null : subcategory)} aria-expanded={subcategoryOpen}>
                          <span>{subcategory}</span>
                          <span><strong>{items.length}</strong><ChevronDown size={16} /></span>
                        </button>
                        {subcategoryOpen && (
                          <div className="herb-grid herb-strip-grid">
                            {items.map((herb) => <HerbCard key={herb.id} herb={herb} onOpen={onOpen} />)}
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {!herbs.length && <EmptyState label="没有找到匹配的中药" />}
      </div>
    </section>
  );
}

function CompareView({ formulas, compareIds, onRemove, onBrowse }: {
  formulas: Formula[]; compareIds: string[]; onRemove: (id: string) => void; onBrowse: () => void;
}) {
  const selected = compareIds.map((id) => formulas.find((formula) => formula.id === id)).filter(Boolean) as Formula[];
  return (
    <section>
      <PageHeading kicker="并列比较" title="方剂对照" description="最多选择三个方剂进行比较。" />
      {selected.length < 2 ? (
        <div className="empty-panel"><Columns2 size={34} /><h3>选择至少两个方剂</h3><button className="primary-button" onClick={onBrowse}>浏览方剂</button></div>
      ) : (
        <div className="comparison-grid" style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}>
          {selected.map((formula) => (
            <article className="comparison-card" key={formula.id}>
              <button className="comparison-remove" onClick={() => onRemove(formula.id)}><X size={16} /></button>
              <h2>{formula.name}</h2><span className="formula-pinyin">{formula.pinyin}</span>
              <section className="compare-section">
                <h4>组成</h4>
                <div className="compare-ingredients">{formula.ingredients.map((item) => <span className={`ingredient-${item.thermalProperty}`} key={item.position}>{item.name}<small>{item.dose ?? ""}</small></span>)}</div>
              </section>
              <section className="compare-section"><h4>功效</h4><p>{formula.function ?? "—"}</p></section>
              <section className="compare-section"><h4>主治</h4><p>{formula.mainTreatment ?? "—"}</p></section>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function StudyView({ formulas, bookmarks, onOpen }: { formulas: Formula[]; bookmarks: string[]; onOpen: (formula: Formula) => void }) {
  const pool = bookmarks.length ? formulas.filter((formula) => bookmarks.includes(formula.id)) : formulas;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const formula = pool[index % Math.max(pool.length, 1)];

  function next(random = false) {
    if (!pool.length) return;
    setIndex(random ? Math.floor(Math.random() * pool.length) : (index + 1) % pool.length);
    setRevealed(false);
  }

  return (
    <section>
      <PageHeading kicker="研习模式" title="方剂研习" description={`当前卡组含 ${pool.length} 个方剂。`} />
      {formula && <div className="study-layout">
        <div className={`study-card ${revealed ? "revealed" : ""}`}>
          <div className="study-card-label">辨认方剂</div>
          <div className="study-clues">{formula.ingredients.slice(0, 6).map((item) => <span className={`ingredient-${item.thermalProperty}`} key={item.position}>{item.name}</span>)}</div>
          {!revealed ? <button className="primary-button" onClick={() => setRevealed(true)}>显示答案</button> : (
            <div className="study-answer"><Check size={23} /><div><strong>{formula.name}</strong><span>{formula.pinyin}</span><small>{formula.mainTreatment ?? ""}</small></div></div>
          )}
        </div>
        <div className="study-controls">
          <div><span>卡组进度</span><strong>{index + 1} / {pool.length}</strong></div><progress value={index + 1} max={pool.length} />
          <button onClick={() => next(false)}>下一张 <ArrowRight size={16} /></button>
          <button onClick={() => next(true)}><Shuffle size={16} /> 随机抽取</button>
          <button onClick={() => onOpen(formula)}><BookOpen size={16} /> 查看完整条目</button>
        </div>
      </div>}
    </section>
  );
}

function DetailDrawer({ detail, bookmarked, compareIds, onBookmark, onAddCompare, onClose, onOpenFormula, onOpenHerb, onOpenFormulaByName, herbById, formulaById }: {
  detail: Detail; bookmarked: boolean; compareIds: string[];
  onBookmark: (id: string) => void; onAddCompare: (id: string) => void; onClose: () => void;
  onOpenFormula: (formula: Formula) => void; onOpenHerb: (herb: Herb) => void;
  onOpenFormulaByName: (name: string) => void;
  herbById: Map<string, Herb>; formulaById: Map<string, Formula>;
}) {
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="detail-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-toolbar">
          <button onClick={onClose}><ArrowLeft size={18} /> 返回</button>
          <span>{detail.type === "formula" ? "方剂条目" : "中药条目"}</span>
          <button onClick={() => onBookmark(detail.item.id)}><Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} /></button>
        </div>
        {detail.type === "formula" ? (
          <FormulaDetail
            formula={detail.item}
            isCompared={compareIds.includes(detail.item.id)}
            onAddCompare={onAddCompare}
            onOpenHerb={onOpenHerb}
            herbById={herbById}
          />
        ) : (
          <HerbDetail
            herb={detail.item}
            onOpenFormula={onOpenFormula}
            onOpenFormulaByName={onOpenFormulaByName}
            formulaById={formulaById}
          />
        )}
      </aside>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section">
      <div className="detail-section-title"><h3>{title}</h3></div>
      {children}
    </section>
  );
}

function ProseBlock({ value }: { value: string | null }) {
  if (!value) return null;
  const lines = splitProse(value);
  return <>{lines.map((line, index) => <p key={index}>{line}</p>)}</>;
}

function IngredientTile({ ingredient, onOpenHerb, herbById }: { ingredient: IngredientChip; onOpenHerb: (herb: Herb) => void; herbById: Map<string, Herb> }) {
  const herb = ingredient.herbId ? herbById.get(ingredient.herbId) : undefined;
  const content = (
    <>
      <div className="ingredient-color-panel">
        <div className="ingredient-identity">
          <div className="ingredient-western-names">
            {ingredient.processing && <span>{ingredient.processing}</span>}
            {herb?.pinyin && <small>{herb.pinyin}</small>}
          </div>
          <strong>{ingredient.name}</strong>
        </div>
      </div>
      <div className="ingredient-dose">
        <strong>{ingredient.dose || "—"}</strong>
      </div>
    </>
  );

  if (herb) {
    return (
      <button className={`ingredient-tile ingredient-${ingredient.thermalProperty}`} onClick={() => onOpenHerb(herb)}>
        {content}
      </button>
    );
  }
  return <article className={`ingredient-tile ingredient-${ingredient.thermalProperty}`}>{content}</article>;
}

function FormulaDetail({ formula, isCompared, onAddCompare, onOpenHerb, herbById }: {
  formula: Formula; isCompared: boolean; onAddCompare: (id: string) => void;
  onOpenHerb: (herb: Herb) => void; herbById: Map<string, Herb>;
}) {
  const hasStructuredIngredients = formula.ingredients.length > 0;
  return (
    <div className="detail-content">
      <button className={`formula-detail-compare-button ${isCompared ? "is-selected" : ""}`} onClick={() => onAddCompare(formula.id)}>
        <Columns2 size={16} />
        <span>{isCompared ? "已加入" : "加入对照"}</span>
      </button>
      <div className="detail-title formula-detail-title">
        <div>
          <span>方剂 · {formula.category}{formula.subcategory ? ` · ${formula.subcategory}` : ""}</span>
          <h1>{formula.name}</h1>
          <p>{formula.pinyin}</p>
        </div>
      </div>

      {hasStructuredIngredients && (
        <DetailSection title="组成">
          <div className="ingredient-grid">
            {formula.ingredients.map((ingredient) => (
              <IngredientTile key={ingredient.position} ingredient={ingredient} onOpenHerb={onOpenHerb} herbById={herbById} />
            ))}
          </div>
        </DetailSection>
      )}
      {formula.ingredientsRaw && (
        <DetailSection title="组成原文">
          <p>{formula.ingredientsRaw}</p>
        </DetailSection>
      )}

      {(formula.function || formula.mainTreatment) && (
        <div className="two-column-detail">
          {formula.function && (
            <DetailSection title="功效"><ProseBlock value={formula.function} /></DetailSection>
          )}
          {formula.mainTreatment && (
            <DetailSection title="主治"><ProseBlock value={formula.mainTreatment} /></DetailSection>
          )}
        </div>
      )}

      {formula.appliedTo && (
        <DetailSection title="方解与应用">
          <ProseBlock value={formula.appliedTo} />
        </DetailSection>
      )}

      {formula.usage && (
        <DetailSection title="用法">
          <ProseBlock value={formula.usage} />
        </DetailSection>
      )}

      {formula.notes && (
        <DetailSection title="附注">
          <ProseBlock value={formula.notes} />
        </DetailSection>
      )}

      {formula.digest && (
        <details className="english-details textbook-extracts">
          <summary>古籍摘录<span>展开阅读</span></summary>
          <ProseBlock value={formula.digest} />
        </details>
      )}

      {formula.source && (
        <div className="source-note">
          <BookOpen size={18} />
          <strong>出处</strong>
          <p>{formula.source}</p>
        </div>
      )}
    </div>
  );
}

function HerbDetail({ herb, onOpenFormula, onOpenFormulaByName, formulaById }: {
  herb: Herb; onOpenFormula: (formula: Formula) => void; onOpenFormulaByName: (name: string) => void; formulaById: Map<string, Formula>;
}) {
  const related = herb.formulaIds.map((id) => formulaById.get(id)).filter(Boolean) as Formula[];
  const imageSrc = herb.image ? `${basePath}/images/herbs/${herb.image}` : null;

  return (
    <div className="detail-content">
      <div className={`detail-title herb-detail-title thermal-${herb.thermalProperty}`}>
        <div>
          <span>中药 · {herb.category}{herb.subcategory ? ` · ${herb.subcategory}` : ""}</span>
          <h1>{herb.name}</h1>
          <p>{herb.pinyin}</p>
          {herb.aliases.length > 0 && <small>别名：{herb.aliases.join(" / ")}</small>}
        </div>
      </div>

      {imageSrc && (
        <div className="detail-section" style={{ padding: 0, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt={herb.name} style={{ display: "block", width: "100%", height: "auto" }} />
        </div>
      )}

      {herb.channels.length > 0 && (
        <div className="channel-row" aria-label="归经">
          <span className="channel-row-label">归经</span>
          <div className="channel-chip-list">
            {herb.channels.map((channel) => (
              <span className={`channel-chip ${channel.className}`} title={channel.name} key={channel.name}>{channel.label}</span>
            ))}
          </div>
        </div>
      )}

      <div className="herb-facts herb-detail-facts">
        {herb.tasteAndNature && <article><span>性味归经</span><strong>{herb.tasteAndNature}</strong></article>}
        {herb.keyPoint && <article><span>要点</span><strong>{herb.keyPoint}</strong></article>}
        {herb.usage && <article><span>用法用量</span><strong>{herb.usage}</strong></article>}
      </div>

      {herb.function && (
        <DetailSection title="功效">
          <ProseBlock value={herb.function} />
        </DetailSection>
      )}

      {herb.appliedTo && (
        <DetailSection title="应用">
          <ProseBlock value={herb.appliedTo} />
        </DetailSection>
      )}

      {herb.prescriptionForms && (
        <DetailSection title="处方用名">
          <ProseBlock value={herb.prescriptionForms} />
        </DetailSection>
      )}

      {herb.classicalFormulas && (
        <DetailSection title="配伍典方">
          <div className="textbook-extracts">
            {splitProse(herb.classicalFormulas).map((line, index) => (
              <p key={index}>{renderWithFormulaRefs(line, onOpenFormulaByName)}</p>
            ))}
          </div>
        </DetailSection>
      )}

      {herb.note && (
        <DetailSection title="使用注意">
          <ProseBlock value={herb.note} />
        </DetailSection>
      )}

      {herb.digest && (
        <details className="english-details textbook-extracts">
          <summary>古籍摘录<span>展开阅读</span></summary>
          <ProseBlock value={herb.digest} />
        </details>
      )}

      {related.length > 0 && (
        <DetailSection title="相关方剂">
          <div className="related-list">
            {related.map((formula) => (
              <button key={formula.id} onClick={() => onOpenFormula(formula)}>
                <div><strong>{formula.name}</strong><span>{formula.pinyin}</span></div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </DetailSection>
      )}

      {herb.source && (
        <div className="source-note">
          <BookOpen size={18} />
          <strong>来源</strong>
          <p>{herb.source}</p>
        </div>
      )}
    </div>
  );
}
