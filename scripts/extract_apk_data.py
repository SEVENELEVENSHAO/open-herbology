import sqlite3, json, os

BASE = r"E:\Documents\Claude\中医数据库"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data")
os.makedirs(OUT, exist_ok=True)


def rows(con, sql):
    con.row_factory = sqlite3.Row
    return [dict(r) for r in con.execute(sql)]


med = sqlite3.connect(os.path.join(BASE, "MedicineCh.db"))
form = sqlite3.connect(os.path.join(BASE, "FormulaCh.db"))

herb_categories = rows(med, "SELECT ID, Category, SubCategory FROM Categories ORDER BY ID")
formula_categories = rows(form, "SELECT ID, Category, SubCategory FROM Categories ORDER BY ID")

herbs = rows(med, """
    SELECT ID, CategoryId, Medicine, Source, GuiJing, Function, Character,
           AppliedTo, Figure, Prescription, Usage, Formula, Digest, Note, Alias
    FROM Medicines ORDER BY ID
""")
herb_aliases = rows(med, "SELECT ID, Alias, Medicine FROM MedicineNameMapping ORDER BY ID")
keyword_mapping = rows(med, "SELECT Keyword, TcmTerm FROM KeywordMapping ORDER BY Keyword")

formulas = rows(form, """
    SELECT ID, CategoryId, Formula, Ingredient, Source, Usage, MainTreatment,
           Function, AppliedTo, Notes, Digest
    FROM Formulas ORDER BY ID
""")

with open(os.path.join(OUT, "raw-herb-categories.json"), "w", encoding="utf-8") as f:
    json.dump(herb_categories, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT, "raw-formula-categories.json"), "w", encoding="utf-8") as f:
    json.dump(formula_categories, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT, "raw-herbs.json"), "w", encoding="utf-8") as f:
    json.dump(herbs, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT, "raw-herb-aliases.json"), "w", encoding="utf-8") as f:
    json.dump(herb_aliases, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT, "raw-keyword-mapping.json"), "w", encoding="utf-8") as f:
    json.dump(keyword_mapping, f, ensure_ascii=False, indent=2)
with open(os.path.join(OUT, "raw-formulas.json"), "w", encoding="utf-8") as f:
    json.dump(formulas, f, ensure_ascii=False, indent=2)

print(f"herb_categories={len(herb_categories)} formula_categories={len(formula_categories)} "
      f"herbs={len(herbs)} herb_aliases={len(herb_aliases)} keyword_mapping={len(keyword_mapping)} "
      f"formulas={len(formulas)}")
