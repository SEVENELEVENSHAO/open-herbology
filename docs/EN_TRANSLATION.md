# Open Herbology — English edition

The app ships bilingual. `zh` is the source language (always complete); `en` is
built up in batches. A viewer toggles with the language button in the top bar
(persisted to `localStorage` under `fangyao-locale`).

## How it fits together

| Piece | File | What it holds |
| --- | --- | --- |
| UI strings | `src/lib/i18n.ts` | Every fixed label, heading, button, placeholder. Complete in both locales. |
| Controlled vocab | `src/lib/i18n.ts` | `CHANNEL_EN` (the 12 channels). Thermal-nature labels live in `UIStrings.thermal`. |
| Category names | `src/data/en/categories.json` | Herb + formula category / subcategory taxonomy. **Complete.** |
| Herb prose | `src/data/en/herbs.json` | Per-herb translated fields, keyed by herb id. Filled in batches. |
| Formula prose | `src/data/en/formulas.json` | Per-formula translated fields, keyed by formula id. Filled in batches. |
| Merge | `src/lib/reference-data.ts` | `getReferenceData(locale)` overlays the `en/*` files onto the raw data; any missing field falls back to Chinese. |

Nothing is deleted from the raw APK data — the English layer is purely additive,
so a half-translated entry renders as English where it can and Chinese elsewhere.

## What gets translated, what stays Chinese

Translate every prose / label field **except** the verbatim classical-text
quotations, which always stay in Chinese:

- `herb.digest` — 古籍摘录
- `formula.digest` — 古籍摘录 / 实验研究
- `formula.source` — 出处 (classical citation, usually a direct quote)
- `formula.ingredientsRaw` — 组成原文

Also left in their original script: **pinyin** and **herb aliases** (别名).

`thermalProperty` and `channels` are parsed from the Chinese 性味归经 string and
are locale-independent — only the displayed `tasteAndNature` text is translated.

### Herb fields (`src/data/en/herbs.json` → `entries[id]`)

| key | source (raw-herbs.json) | 中文标签 |
| --- | --- | --- |
| `name` | `Medicine` | standard English common name, e.g. `"Ephedra"` |
| `source` | `Source` | 来源 (botanical origin) |
| `tasteAndNature` | `GuiJing` | 性味归经 |
| `function` | `Function` | 功效 |
| `keyPoint` | `Character` | 要点 |
| `appliedTo` | `AppliedTo` | 应用 |
| `prescriptionForms` | `Prescription` | 处方用名 |
| `usage` | `Usage` | 用法用量 |
| `classicalFormulas` | `Formula` | 配伍典方 |
| `note` | `Note` | 使用注意 |

### Formula fields (`src/data/en/formulas.json` → `entries[id]`)

| key | source (raw-formulas.json) | 中文标签 |
| --- | --- | --- |
| `name` | `Formula` | standard English formula name, e.g. `"Ephedra Decoction"` |
| `usage` | `Usage` | 用法 |
| `mainTreatment` | `MainTreatment` | 主治 |
| `function` | `Function` | 功效 |
| `appliedTo` | `AppliedTo` | 方解与应用 |
| `notes` | `Notes` | 附注 |
| `ingredients` | — | optional `{ "中文药名": { "processing": "…" } }` to translate the prep note on an ingredient tile (去节 → "nodes removed"). Doses stay as written; the herb name localizes itself from `herbs.json`. |

## Batch workflow

1. `npm run i18n:progress` — see overall completion.
2. `npm run i18n:progress -- herbs 20` (or `formulas 20`) — prints a JSON
   skeleton for the next N untranslated entries, each field prefilled with
   `【译】<Chinese source>`.
3. Translate into a patch file `{ "<id>": { <field>: "<English>" }, ... }` and
   merge it: `node scripts/i18n_merge.mjs herbs <patch.json>` (or `formulas`).
   The merge is additive — it only touches the fields you supply, re-sorts
   `entries` by id, and skips empty values. (You can also hand-edit
   `src/data/en/*.json` directly.)
4. Work in category order (the skeleton already comes in id order, which follows
   the source's category grouping) so terminology stays consistent within a class.
5. `npm run i18n:progress` again; `npm run build` to typecheck; spot-check in the
   app with the language toggle.
6. Keep `E:` as the source of truth and re-sync to `C:\Users\ASUS\projects\tcm-fangyao-app`
   to run (see README — `E:` is exFAT and the build tooling fails there).

### Translation conventions

- **Terminology**: Bensky et al. — *Chinese Herbal Medicine: Materia Medica* (3e)
  for herbs, *Formulas & Strategies* (2e) for formulas. `src/data/en/categories.json`
  is the anchor for category wording.
- Preserve the source's paragraph structure: numbered points (`1.` `2.`), circled
  numbers (`①`), and blank lines between paragraphs.
- Preserve `{{方名}}` cross-reference markers **verbatim and in Chinese** inside the
  braces — they resolve to formula links. Translate the surrounding prose.
- Preserve `《书名》` book titles in Chinese; a short gloss in parentheses on first
  use is fine (e.g. `《伤寒论》` → "Discussion of Cold Damage").
- Keep pharmacological / biomedical passages (found in some `note` / `appliedTo`
  fields) — translate them like any other prose.
- Doses: leave numbers and Chinese units as written unless a whole sentence is
  being rendered (e.g. `三两【9g】` stays; "nine sheng of water" is fine in a
  translated usage sentence).

## Status

- **Done:** all 508 herb names; all 384 formula names; formula `function` (功效)
  and `mainTreatment` (主治) for every formula that has them.
- **To do:** all herb prose fields (only herb `1` done); formula `appliedTo`,
  `usage`, `notes` (only formula `1` done); formula ingredient `processing` notes.

## Reference example

Herb `1` (麻黄) and formula `1` (麻黄汤) are fully translated in the `en/*` files —
use them as the model for tone, structure, and terminology.
