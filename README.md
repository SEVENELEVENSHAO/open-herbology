# 方药库 (FANGYAO)

A private Chinese medicine formula and herb reference, combining the data from
two source APKs (中医中药 — Medicines, and 中医方剂 — Formulas) into a single
app. Built with the same visual design and UI system as `herbz-app`.

## Included

- 508 herb entries (性味归经, 功效, 应用, 处方用名, 用法用量, 配伍典方, 摘要, 图片)
- 384 formula entries (组成, 功效, 主治, 方解与应用, 用法, 附注, 摘要)
- Native source-app category taxonomy (43 herb subcategories, 58 formula subcategories)
- Formula ↔ herb cross-linking, both from parsed ingredient composition and from
  in-text `{{name}}` references in each source
- Thermal property (寒/凉/平/温/热) and channel (归经) parsing from each herb's
  taste-and-nature text, driving the color coding and channel chips
- Colloquial-symptom → TCM-term search expansion (e.g. "怕冷" also matches "恶寒")
- Formula/herb detail views, comparison (up to 3 formulas), bookmarks, and a
  flashcard study mode
- Bilingual UI (中文 / English) with a top-bar language toggle; English content
  is translated in batches — see `docs/EN_TRANSLATION.md`
- PWA manifest and offline application shell

## Personal notes and stars

Each formula and herb has a **My notes** editor at the bottom of its entry.
Use **Save notes** to persist changes; saving an empty note removes it.
Formula cards and the formula drawer have a star button. Starred formulas
appear first within each subcategory and in a **Starred formulas** section
at the top of the category. Existing bookmarks are preserved.

Notes and stars are stored separately from reference content as versioned
user data (`fangyao-user-data`), using stable formula/herb IDs. They survive
reloads, language changes, and app updates on the same browser or installed
app. Clearing browser/app data or uninstalling the app removes local data.
There is no automatic account or cross-device synchronization.

Use **Export notes & stars** in the sidebar to download a JSON backup.
**Import user data** transfers that backup to another device. Import merges
stars, preserves unrelated notes, and replaces notes for matching entries.
Invalid files are rejected without changing existing data.

## Formula comparison and core structure

The comparison screen supports one to four formulas. Add formulas directly
with its search picker or from an entry's **Compare / analyze** button.
At four selections, adding another is disabled rather than replacing a formula.

The ingredient matrix uses a consistent color for each formula and shows doses,
processing, shared ingredients (two or more formulas), and unique ingredients.
Single-formula selection shows the full composition and core-formula analysis.

Core compositions come from 13 existing library entries, including 四物汤,
四君子汤, 桂枝汤 and 四逆散. The analysis shows complete ingredient coverage,
partial overlap, missing ingredients, and extra ingredients. Coverage checks
ingredient identity, not dose ratios or clinical equivalence. Processing changes
and unspecified classical names are flagged. In particular, 芍药 is grouped with
白芍 for visual comparison but marked for review; 赤芍 remains separate. 生地 and
熟地, 生姜 and 干姜, 枳实 and 枳壳, and 人参 and 党参 are not interchangeable.
地黄 only matches 熟地黄 when the composition explicitly specifies steaming.

Run `npm run test:formula-analysis` to verify selection limits and ingredient
matching, and `npm run test:user-data` to verify notes/bookmark persistence.

## Data pipeline

The two source `.db` files (`MedicineCh.db`, `FormulaCh.db`) were SQLCipher
databases extracted from the APKs and decrypted. `scripts/extract_apk_data.py`
reads them and writes the raw tables to `src/data/raw-*.json`. All parsing —
pinyin generation, thermal-property/channel extraction from taste-and-nature
text, ingredient markup parsing, and formula↔herb cross-linking — happens at
runtime in `src/lib/reference-data.ts`, the same architecture pattern as
`herbz-app`.

To re-run the extraction after updating the source databases:

```powershell
python scripts/extract_apk_data.py
```

## Run

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

**Note:** this project must be run from an NTFS-formatted drive. Node's build
tooling (webpack's symlink resolution) fails with `EISDIR` errors on exFAT —
which is what an external drive at `E:` in this environment turned out to be.
The working copy lives at `C:\Users\ASUS\projects\tcm-fangyao-app`; this `E:`
copy is the source-of-truth for editing, kept in sync manually.

## English edition

The app is bilingual. Chinese is the source language and is always complete;
the English layer is additive and filled in batches. Fixed UI strings live in
`src/lib/i18n.ts`; translated herb/formula prose lives in `src/data/en/` and is
overlaid on the raw data by `getReferenceData(locale)`, falling back to Chinese
for any field not yet translated. Verbatim classical-text quotations (古籍摘录,
出处, 组成原文) are never translated.

```powershell
npm run i18n:progress                 # completion by field
npm run i18n:progress -- herbs 20      # skeleton for the next 20 untranslated herbs
```

Full workflow and translation conventions: `docs/EN_TRANSLATION.md`.

## Safety and copyright

This app is a private educational reference. It does not diagnose or prescribe.
