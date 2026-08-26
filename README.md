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
- PWA manifest and offline application shell

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

## Safety and copyright

This app is a private educational reference. It does not diagnose or prescribe.
