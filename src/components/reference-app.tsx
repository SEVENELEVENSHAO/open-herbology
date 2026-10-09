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
  Languages,
  Leaf,
  Menu,
  Search,
  Shuffle,
  Star,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getKeywordMapping } from "@/lib/reference-data";
import { channelName, type Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { buildFinalExamStudyCards, type StudyPrompt } from "@/data/final-exam-study";
import type { Formula, Herb, IngredientChip, ReferenceData } from "@/types/reference";
import { favoritesFirst } from "@/lib/user-data";
import { useUserData } from "@/lib/use-user-data";
import { PersonalNotes } from "@/components/personal-notes";
import { FormulaComparison } from "@/components/formula-comparison";
import { addComparisonId, MAX_COMPARE_FORMULAS } from "@/lib/formula-analysis";

// Which string leads and which follows in a name/pinyin pair. In the English
// edition the romanized name reads as the primary label with the English
// translation beneath it; in Chinese the character name leads.
function displayNames(
  item: { name: string; nameZh: string; pinyin: string },
  locale: Locale,
): { primary: string; secondary: string } {
  if (locale === "en") {
    return { primary: item.pinyin || item.name, secondary: item.name };
  }
  return { primary: item.name, secondary: item.pinyin };
}

type Section = "home" | "herbs" | "compare" | "study";
type Detail = { type: "formula"; item: Formula } | { type: "herb"; item: Herb };
type ThermalFilter = "all" | "hot" | "warm" | "neutral" | "cool" | "cold";

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

function useGroupByCategory<T extends { category: string; subcategory: string | null }>(items: T[]): CategoryGroup<T>[] {
  const { t } = useLocale();
  return useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, Map<string, T[]>>();
    for (const item of items) {
      const cat = item.category || t.fallbackCategory;
      const sub = item.subcategory || t.fallbackSubcategory;
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
  }, [items, t]);
}

export function ReferenceApp({ data }: { data: ReferenceData }) {
  const { t, locale, toggleLocale } = useLocale();
  const [section, setSection] = useState<Section>("home");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [thermal, setThermal] = useState<ThermalFilter>("all");
  const userData = useUserData();
  const bookmarks = useMemo(() => userData.data.favorites.filter((id) => id.startsWith("formula:")).map((id) => id.slice("formula:".length)), [userData.data.favorites]);
  const [transferStatus, setTransferStatus] = useState<"imported" | "invalid" | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [brandIcon, setBrandIcon] = useState("🌿");

  const herbById = useMemo(() => new Map(data.herbs.map((herb) => [herb.id, herb])), [data.herbs]);
  const formulaById = useMemo(() => new Map(data.formulas.map((formula) => [formula.id, formula])), [data.formulas]);
  const formulaByName = useMemo(
    () => new Map(data.formulas.map((formula) => [formula.nameZh, formula])),
    [data.formulas],
  );

  useEffect(() => {
    // In the Capacitor build the assets are already local; a service worker there
    // only risks pinning stale content across app updates.
    const inCapacitor = typeof window !== "undefined" && "Capacitor" in window;
    if (process.env.NODE_ENV === "production" && !inCapacitor && "serviceWorker" in navigator) {
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
    formula.nameZh,
    formula.pinyin,
    formula.function,
    formula.mainTreatment,
    formula.appliedTo,
    formula.category,
    formula.subcategory,
    ...formula.ingredients.flatMap((item) => [item.name, item.nameZh]),
  ], queryTerms)), [data.formulas, queryTerms]);

  const herbs = useMemo(() => data.herbs.filter((herb) =>
    (thermal === "all" || herb.thermalProperty === thermal) &&
    matchesAny([
      herb.name,
      herb.nameZh,
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
    userData.toggleFavorite(`formula:${id}`);
  }

  function exportUserData() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(userData.data, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "open-herbology-user-data.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function toggleCompare(id: string) {
    setCompareIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : addComparisonId(current, id)
    );
  }

  function addToCompare(id: string) {
    setCompareIds((current) => addComparisonId(current, id));
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
    home: [FlaskConical, t.nav.home],
    herbs: [Leaf, t.nav.herbs],
    compare: [Columns2, t.nav.compare],
    study: [GraduationCap, t.nav.study],
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label={t.closeMenu}><X size={18} /></button>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">{brandIcon}</div>
          <div>
            <strong>Open Herbology</strong>
            <span>{t.brandTagline}</span>
          </div>
        </div>
        <nav className="main-nav" aria-label="Primary navigation">
          {navSections.map((key) => {
            const [Icon, label] = navMeta[key];
            return (
              <button key={key} className={section === key ? "active" : ""} onClick={() => navigate(key)}>
                <Icon size={19} />
                <span>{label}{key === "compare" && compareIds.length > 0 && <small>{compareIds.length} / {MAX_COMPARE_FORMULAS}</small>}</span>
              </button>
            );
          })}
        </nav>
        <div className="user-data-controls">
          <strong>{locale === "zh" ? "用户数据" : "User data"}</strong>
          <button disabled={!userData.ready} onClick={exportUserData}>{locale === "zh" ? "导出笔记与收藏" : "Export notes & stars"}</button>
          <label className={!userData.ready ? "is-disabled" : ""}>
            {locale === "zh" ? "导入用户数据" : "Import user data"}
            <input type="file" accept=".json,application/json" disabled={!userData.ready} onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const imported = JSON.parse(await file.text());
                if (userData.importData(imported)) setTransferStatus("imported");
              } catch {
                setTransferStatus("invalid");
              }
            }} />
          </label>
          <small>{locale === "zh" ? "导入将合并收藏，同名条目的笔记将被替换。" : "Import merges stars and replaces notes for matching entries."}</small>
          {transferStatus && <p role="status">{transferStatus === "imported" ? (locale === "zh" ? "用户数据已导入" : "User data imported") : (locale === "zh" ? "文件无效；数据未更改" : "Invalid file; data unchanged")}</p>}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileNav(true)} aria-label={t.openMenu}><Menu size={21} /></button>
          <div className="global-search">
            <Search size={19} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.searchPlaceholder}
              lang={locale === "en" ? "en" : "zh-CN"}
            />
            {query && <button onClick={() => setQuery("")} aria-label={t.clearSearch}><X size={17} /></button>}
          </div>
          <button className="language-switch" onClick={toggleLocale} title={t.languageSwitchTitle} aria-label={t.languageSwitchTitle}>
            <Languages size={15} />
            <span>{t.languageSwitchLabel}</span>
          </button>
        </header>

        <div className="content">
          {userData.error && <p className="user-data-error" role="alert">{locale === "zh" ? "无法读取或保存用户数据。请检查此设备的存储权限后重试；未覆盖原有数据。" : "Could not read or save user data. Check storage access on this device and retry. Existing data has been preserved."}</p>}
          {section === "home" && (
            <HomePage
              formulas={formulas}
              query={query}
              onOpenFormula={openFormula}
              bookmarks={bookmarks}
              onBookmark={toggleBookmark}
              userDataReady={userData.ready}
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
            <FormulaComparison
              formulas={data.formulas}
              compareIds={compareIds}
              onRemove={toggleCompare}
              onAdd={addToCompare}
              onOpen={openFormula}
            />
          )}
          {section === "study" && (
            <StudyView formulas={data.formulas} onOpen={openFormula} />
          )}
        </div>
      </main>

      {detail && (
        <DetailDrawer
          detail={detail}
          bookmarked={userData.data.favorites.includes(`${detail.type}:${detail.item.id}`)}
          onBookmark={(id) => userData.toggleFavorite(`${detail.type}:${id}`)}
          compareIds={compareIds}
          onAddCompare={(id) => { addToCompare(id); navigate("compare"); setDetail(null); }}
          onClose={() => setDetail(null)}
          onOpenFormula={openFormula}
          onOpenHerb={openHerb}
          onOpenFormulaByName={openFormulaByName}
          herbById={herbById}
          formulaById={formulaById}
          note={userData.data.notes[`${detail.type}:${detail.item.id}`] ?? ""}
          onSaveNote={(note) => userData.saveNote(`${detail.type}:${detail.item.id}`, note)}
          userDataReady={userData.ready}
          storageError={userData.error}
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

function HomePage({ formulas, query, onOpenFormula, bookmarks, onBookmark, userDataReady }: {
  formulas: Formula[];
  query: string;
  onOpenFormula: (formula: Formula) => void;
  bookmarks: string[];
  onBookmark: (id: string) => void;
  userDataReady: boolean;
}) {
  const { t, locale } = useLocale();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const grouped = useGroupByCategory(formulas);

  if (query) {
    return (
      <section className="category-browser">
        <NavigatorHeading kicker={t.home.resultsKicker} title={t.home.resultsTitle(formulas.length)} description={t.home.resultsDescription} />
        <div className="navigator-formula-grid">
          {grouped.flatMap(({ category, subcategories }) =>
            subcategories.flatMap(({ subcategory, items }) =>
              items.map((formula) => (
                <article className="formula-star-card" key={formula.id}>
                <button className="navigator-formula-card" onClick={() => onOpenFormula(formula)}>
                  <span className="navigator-path">{category} / {subcategory}</span>
                  <strong>{displayNames(formula, locale).primary}</strong>
                  <span className="formula-pinyin">{displayNames(formula, locale).secondary}</span>
                  <ArrowRight size={16} />
                </button>
                <FormulaStar formula={formula} starred={bookmarks.includes(formula.id)} onToggle={onBookmark} ready={userDataReady} />
                </article>
              ))
            )
          )}
        </div>
        {!formulas.length && <EmptyState label={t.home.empty} />}
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
                    {openGroup.subcategories.some(({ items }) => items.some((formula) => bookmarks.includes(formula.id))) && (
                      <div className="category-favorites">
                        <h3><Star size={17} fill="currentColor" />{locale === "zh" ? "收藏方剂" : "Starred formulas"}</h3>
                        <div className="strip-formula-grid">
                          {openGroup.subcategories.flatMap(({ items }) => items).filter((formula) => bookmarks.includes(formula.id)).map((formula) => (
                            <CategoryFormulaCard key={formula.id} formula={formula} starred onOpen={onOpenFormula} onToggle={onBookmark} ready={userDataReady} />
                          ))}
                        </div>
                      </div>
                    )}
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
                                {favoritesFirst(items, bookmarks).map((formula) => (
                                  <CategoryFormulaCard key={formula.id} formula={formula} starred={bookmarks.includes(formula.id)} onOpen={onOpenFormula} onToggle={onBookmark} ready={userDataReady} />
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

function FormulaStar({ formula, starred, onToggle, ready }: {
  formula: Formula; starred: boolean; onToggle: (id: string) => void; ready: boolean;
}) {
  const { locale } = useLocale();
  const label = locale === "zh" ? `${starred ? "取消收藏" : "收藏"}${formula.nameZh}` : `${starred ? "Unstar" : "Star"} ${displayNames(formula, locale).primary}`;
  return <button className={`formula-star ${starred ? "is-starred" : ""}`} disabled={!ready}
    aria-label={label} title={label} aria-pressed={starred} onClick={() => onToggle(formula.id)}>
    <Star size={19} fill={starred ? "currentColor" : "none"} />
  </button>;
}

function CategoryFormulaCard({ formula, starred, onOpen, onToggle, ready }: {
  formula: Formula; starred: boolean; onOpen: (formula: Formula) => void; onToggle: (id: string) => void; ready: boolean;
}) {
  const { locale } = useLocale();
  return <article className="formula-star-card">
    <button className="strip-formula-card" onClick={() => onOpen(formula)}>
      <strong>{displayNames(formula, locale).primary}</strong>
      <span className="formula-pinyin">{displayNames(formula, locale).secondary}</span>
    </button>
    <FormulaStar formula={formula} starred={starred} onToggle={onToggle} ready={ready} />
  </article>;
}

function HerbCard({ herb, onOpen }: { herb: Herb; onOpen: (herb: Herb) => void }) {
  const { t, locale } = useLocale();
  const { primary, secondary } = displayNames(herb, locale);
  return (
    <button className="herb-card" key={herb.id} onClick={() => onOpen(herb)}>
      <div className={`herb-color thermal-${herb.thermalProperty}`}><Leaf size={19} /></div>
      <h3>{primary}</h3>
      <div className="herb-card-bottom">
        <span>{secondary}</span>
      </div>
      <div><span>{t.herbs.formulaCount(herb.formulaIds.length)}</span><ArrowRight size={15} /></div>
    </button>
  );
}

function HerbLibrary({ herbs, thermal, setThermal, onOpen }: {
  herbs: Herb[]; thermal: ThermalFilter; setThermal: (value: ThermalFilter) => void; onOpen: (herb: Herb) => void;
}) {
  const { t } = useLocale();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const grouped = useGroupByCategory(herbs);

  return (
    <section>
      <div className="thermal-filters">
        {(["all", "hot", "warm", "neutral", "cool", "cold"] as const).map((item) => (
          <button key={item} className={`${thermal === item ? "active" : ""} filter-${item}`} onClick={() => setThermal(item)}>
            {t.thermal[item]}
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
        {!herbs.length && <EmptyState label={t.herbs.empty} />}
      </div>
    </section>
  );
}

type StudyFilter = "mixed" | StudyPrompt;

function StudyView({ formulas, onOpen }: { formulas: Formula[]; onOpen: (formula: Formula) => void }) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<StudyFilter>("mixed");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const allCards = useMemo(() => buildFinalExamStudyCards(formulas), [formulas]);
  const pool = useMemo(
    () => filter === "mixed" ? allCards : allCards.filter((card) => card.prompt === filter),
    [allCards, filter],
  );
  const card = pool[index % Math.max(pool.length, 1)];

  useEffect(() => {
    setIndex(0);
    setRevealed(false);
  }, [filter]);

  function next(random = false) {
    if (!pool.length) return;
    setIndex(random ? Math.floor(Math.random() * pool.length) : (index + 1) % pool.length);
    setRevealed(false);
  }

  const promptLabels: Record<StudyPrompt, string> = {
    identify: t.study.identifyPrompt,
    ingredients: t.study.ingredientsPrompt,
    actions: t.study.actionsPrompt,
  };

  const filters: Array<[StudyFilter, string]> = [
    ["mixed", t.study.mixed],
    ["identify", t.study.identify],
    ["ingredients", t.study.ingredients],
    ["actions", t.study.actions],
  ];

  const pending = <span className="study-pending"><span>{t.study.pending}</span>{t.study.pendingDetail}</span>;

  return (
    <section>
      <PageHeading kicker={t.study.kicker} title={t.study.title} description={t.study.description(pool.length)} />
      <div className="study-filter" role="group" aria-label={t.study.deckName}>
        {filters.map(([value, label]) => (
          <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>
        ))}
      </div>
      {card && <div className="study-layout">
        <div className={`study-card ${revealed ? "revealed" : ""}`}>
          <div className="study-card-label">{promptLabels[card.prompt]}</div>

          {card.prompt === "identify" ? (
            <>
              <div className="study-herb-count">{card.entry.examHerbCount} 味</div>
              {card.ingredients.length > 0 ? (
                <div className="study-clues" lang="zh-CN">{card.ingredients.map((ingredient) => <span key={ingredient}>{ingredient}</span>)}</div>
              ) : pending}
            </>
          ) : (
            <div className="study-formula-prompt" lang="zh-CN">
              <h2>{card.entry.nameZh}</h2>
              <span>{card.entry.pinyin}</span>
              <small>{card.entry.examHerbCount} 味</small>
            </div>
          )}

          {!revealed ? <button className="primary-button" onClick={() => setRevealed(true)}>{t.study.reveal}</button> : (
            <div className="study-answer" aria-live="polite">
              <Check size={23} />
              {card.prompt === "identify" && (
                <div lang="zh-CN"><strong>{card.entry.nameZh}</strong><span>{card.entry.pinyin}</span>{card.entry.catalogVariant && <small>{card.entry.catalogVariant}</small>}</div>
              )}
              {card.prompt === "ingredients" && (
                <div className="study-answer-copy"><b>{t.study.composition}</b>{card.ingredients.length > 0 ? <p lang="zh-CN">{card.ingredients.join("、")}</p> : pending}</div>
              )}
              {card.prompt === "actions" && (
                <div className="study-answer-grid" lang="zh-CN">
                  <section><b>{t.study.actions}</b>{card.actions ? <ProseBlock value={card.actions} /> : pending}</section>
                  <section><b>{t.study.indications}</b>{card.indications ? <ProseBlock value={card.indications} /> : pending}</section>
                </div>
              )}
            </div>
          )}
          {card.entry.sourceNote && <p className="study-source-note" lang="zh-CN">{card.entry.sourceNote}</p>}
        </div>
        <div className="study-controls">
          <div><span>{t.study.deckProgress}</span><strong>{index + 1} / {pool.length}</strong></div><progress value={index + 1} max={pool.length} />
          <button onClick={() => next(false)}>{t.study.next} <ArrowRight size={16} /></button>
          <button onClick={() => next(true)}><Shuffle size={16} /> {t.study.shuffle}</button>
          {card.formula && <button onClick={() => onOpen(card.formula!)}><BookOpen size={16} /> {t.study.viewEntry}</button>}
          <div className="study-provenance">
            <strong>{t.study.sourceLabel}</strong>
            <span>Formulas for Final Exam.docx</span>
            <span>formula runs 2026.docx</span>
            <span>formula runs 2026 中文版.docx</span>
            <small>{t.study.pending}</small>
          </div>
        </div>
      </div>}
    </section>
  );
}

function DetailDrawer({ detail, bookmarked, compareIds, onBookmark, onAddCompare, onClose, onOpenFormula, onOpenHerb, onOpenFormulaByName, herbById, formulaById, note, onSaveNote, userDataReady, storageError }: {
  detail: Detail; bookmarked: boolean; compareIds: string[];
  onBookmark: (id: string) => void; onAddCompare: (id: string) => void; onClose: () => void;
  onOpenFormula: (formula: Formula) => void; onOpenHerb: (herb: Herb) => void;
  onOpenFormulaByName: (name: string) => void;
  herbById: Map<string, Herb>; formulaById: Map<string, Formula>;
  note: string; onSaveNote: (note: string) => boolean; userDataReady: boolean; storageError: boolean;
}) {
  const { t, locale } = useLocale();
  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="detail-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="drawer-toolbar">
          <button onClick={onClose}><ArrowLeft size={18} /> {t.drawer.back}</button>
          <span>{detail.type === "formula" ? t.drawer.formulaEntry : t.drawer.herbEntry}</span>
          {detail.type === "formula" ? <FormulaStar formula={detail.item} starred={bookmarked} onToggle={onBookmark} ready={userDataReady} /> :
            <button disabled={!userDataReady} aria-label={locale === "zh" ? "收藏中药" : "Bookmark herb"} aria-pressed={bookmarked} onClick={() => onBookmark(detail.item.id)}><Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} /></button>}
        </div>
        {detail.type === "formula" ? (
          <FormulaDetail
            formula={detail.item}
            isCompared={compareIds.includes(detail.item.id)}
            compareFull={compareIds.length >= MAX_COMPARE_FORMULAS}
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
        <div className="detail-content personal-notes-container">
          <PersonalNotes key={`${detail.type}:${detail.item.id}:${userDataReady}`} note={note} onSave={onSaveNote} ready={userDataReady} />
          {storageError && <p className="user-data-error" role="alert">{locale === "zh" ? "无法保存用户数据；请重试。" : "Could not save user data. Please retry."}</p>}
        </div>
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
  const { locale } = useLocale();
  const herb = ingredient.herbId ? herbById.get(ingredient.herbId) : undefined;
  const pinyin = herb?.pinyin || "";
  // English edition: lead with the romanized name, English name beneath.
  const enLead = locale === "en" && Boolean(pinyin);
  const primaryName = enLead ? pinyin : ingredient.name;
  const secondaryName = enLead ? ingredient.name : pinyin;
  // A Latin primary name must not use the vertical Chinese layout.
  const latinName = /[A-Za-z]/.test(primaryName);
  const tileClass = `ingredient-tile ingredient-${ingredient.thermalProperty}${locale === "en" && latinName ? " ingredient-tile--latin" : ""}`;
  const content = (
    <>
      <div className="ingredient-color-panel">
        <div className="ingredient-identity">
          <div className="ingredient-western-names">
            {ingredient.processing && <span>{ingredient.processing}</span>}
            {secondaryName && <small>{secondaryName}</small>}
          </div>
          <strong>{primaryName}</strong>
        </div>
      </div>
      <div className="ingredient-dose">
        <strong>{ingredient.dose || "—"}</strong>
      </div>
    </>
  );

  if (herb) {
    return (
      <button className={tileClass} onClick={() => onOpenHerb(herb)}>
        {content}
      </button>
    );
  }
  return <article className={tileClass}>{content}</article>;
}

function FormulaDetail({ formula, isCompared, compareFull, onAddCompare, onOpenHerb, herbById }: {
  formula: Formula; isCompared: boolean; compareFull: boolean; onAddCompare: (id: string) => void;
  onOpenHerb: (herb: Herb) => void; herbById: Map<string, Herb>;
}) {
  const { t, locale } = useLocale();
  const hasStructuredIngredients = formula.ingredients.length > 0;
  const fname = displayNames(formula, locale);
  return (
    <div className="detail-content">
      <button className={`formula-detail-compare-button ${isCompared ? "is-selected" : ""}`} disabled={compareFull && !isCompared} onClick={() => onAddCompare(formula.id)}>
        <Columns2 size={16} />
        <span>{isCompared ? (locale === "zh" ? "查看对照分析" : "View comparison") : compareFull ? (locale === "zh" ? "对照已满（4 / 4）" : "Comparison full (4 / 4)") : (locale === "zh" ? "加入对照／分析" : "Compare / analyze")}</span>
      </button>
      <div className="detail-title formula-detail-title">
        <div>
          <span>{t.formula.breadcrumb} · {formula.category}{formula.subcategory ? ` · ${formula.subcategory}` : ""}</span>
          <h1>{fname.primary}</h1>
          <p>{fname.secondary}{locale === "en" && formula.nameZh !== fname.secondary ? ` · ${formula.nameZh}` : ""}</p>
        </div>
      </div>

      {hasStructuredIngredients && (
        <DetailSection title={t.formula.composition}>
          <div className="ingredient-grid">
            {formula.ingredients.map((ingredient) => (
              <IngredientTile key={ingredient.position} ingredient={ingredient} onOpenHerb={onOpenHerb} herbById={herbById} />
            ))}
          </div>
        </DetailSection>
      )}
      {formula.ingredientsRaw && (
        <DetailSection title={t.formula.compositionRaw}>
          <p lang="zh-CN">{formula.ingredientsRaw}</p>
        </DetailSection>
      )}

      {(formula.function || formula.mainTreatment) && (
        <div className="two-column-detail">
          {formula.function && (
            <DetailSection title={t.formula.actions}><ProseBlock value={formula.function} /></DetailSection>
          )}
          {formula.mainTreatment && (
            <DetailSection title={t.formula.indications}><ProseBlock value={formula.mainTreatment} /></DetailSection>
          )}
        </div>
      )}

      {formula.appliedTo && (
        <DetailSection title={t.formula.analysis}>
          <ProseBlock value={formula.appliedTo} />
        </DetailSection>
      )}

      {formula.usage && (
        <DetailSection title={t.formula.usage}>
          <ProseBlock value={formula.usage} />
        </DetailSection>
      )}

      {formula.notes && (
        <DetailSection title={t.formula.notes}>
          <ProseBlock value={formula.notes} />
        </DetailSection>
      )}

      {formula.digest && (
        <details className="english-details textbook-extracts">
          <summary>{t.formula.classicalExcerpts}<span>{t.formula.expand}</span></summary>
          <div lang="zh-CN"><ProseBlock value={formula.digest} /></div>
        </details>
      )}

      {formula.source && (
        <div className="source-note">
          <BookOpen size={18} />
          <strong>{t.formula.source}</strong>
          <p lang="zh-CN">{formula.source}</p>
        </div>
      )}
    </div>
  );
}

function HerbDetail({ herb, onOpenFormula, onOpenFormulaByName, formulaById }: {
  herb: Herb; onOpenFormula: (formula: Formula) => void; onOpenFormulaByName: (name: string) => void; formulaById: Map<string, Formula>;
}) {
  const { t, locale } = useLocale();
  const related = herb.formulaIds.map((id) => formulaById.get(id)).filter(Boolean) as Formula[];
  const imageSrc = herb.image ? `${basePath}/images/herbs/${herb.image}` : null;

  return (
    <div className="detail-content">
      <div className={`detail-title herb-detail-title thermal-${herb.thermalProperty}`}>
        <div>
          <span>{t.herb.breadcrumb} · {herb.category}{herb.subcategory ? ` · ${herb.subcategory}` : ""}</span>
          <h1>{displayNames(herb, locale).primary}</h1>
          <p>{displayNames(herb, locale).secondary}{locale === "en" && herb.nameZh !== herb.name ? ` · ${herb.nameZh}` : ""}</p>
          {herb.aliases.length > 0 && <small>{t.herb.aliases}{locale === "en" ? ": " : "："}{herb.aliases.join(" / ")}</small>}
        </div>
      </div>

      {imageSrc && (
        <div className="detail-section" style={{ padding: 0, overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} alt={herb.name} style={{ display: "block", width: "100%", height: "auto" }} />
        </div>
      )}

      {herb.channels.length > 0 && (
        <div className="channel-row" aria-label={t.herb.channels}>
          <span className="channel-row-label">{t.herb.channels}</span>
          <div className="channel-chip-list">
            {herb.channels.map((channel) => (
              <span className={`channel-chip ${channel.className}`} title={channelName(locale, channel.name)} key={channel.name}>{channel.label}</span>
            ))}
          </div>
        </div>
      )}

      <div className="herb-facts herb-detail-facts">
        {herb.tasteAndNature && <article><span>{t.herb.tasteAndNature}</span><strong>{herb.tasteAndNature}</strong></article>}
        {herb.keyPoint && <article><span>{t.herb.keyPoint}</span><strong>{herb.keyPoint}</strong></article>}
        {herb.usage && <article><span>{t.herb.dosage}</span><strong>{herb.usage}</strong></article>}
      </div>

      {herb.function && (
        <DetailSection title={t.herb.actions}>
          <ProseBlock value={herb.function} />
        </DetailSection>
      )}

      {herb.appliedTo && (
        <DetailSection title={t.herb.applications}>
          <ProseBlock value={herb.appliedTo} />
        </DetailSection>
      )}

      {herb.prescriptionForms && (
        <DetailSection title={t.herb.prescriptionForms}>
          <ProseBlock value={herb.prescriptionForms} />
        </DetailSection>
      )}

      {herb.classicalFormulas && (
        <DetailSection title={t.herb.classicalFormulas}>
          <div className="textbook-extracts">
            {splitProse(herb.classicalFormulas).map((line, index) => (
              <p key={index}>{renderWithFormulaRefs(line, onOpenFormulaByName)}</p>
            ))}
          </div>
        </DetailSection>
      )}

      {herb.note && (
        <DetailSection title={t.herb.cautions}>
          <ProseBlock value={herb.note} />
        </DetailSection>
      )}

      {herb.digest && (
        <details className="english-details textbook-extracts">
          <summary>{t.herb.classicalExcerpts}<span>{t.herb.expand}</span></summary>
          <div lang="zh-CN"><ProseBlock value={herb.digest} /></div>
        </details>
      )}

      {related.length > 0 && (
        <DetailSection title={t.herb.relatedFormulas}>
          <div className="related-list">
            {related.map((formula) => (
              <button key={formula.id} onClick={() => onOpenFormula(formula)}>
                <div><strong>{displayNames(formula, locale).primary}</strong><span>{displayNames(formula, locale).secondary}</span></div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </DetailSection>
      )}

      {herb.source && (
        <div className="source-note">
          <BookOpen size={18} />
          <strong>{t.herb.origin}</strong>
          <p>{herb.source}</p>
        </div>
      )}
    </div>
  );
}
