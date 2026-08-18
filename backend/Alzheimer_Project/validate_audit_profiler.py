import json
import ast

for name, path in [
    ("ADNI_Project_Audit.ipynb", "Notebooks/ADNI_Project_Audit.ipynb"),
    ("ADNI_Model_Profiler.ipynb", "Notebooks/ADNI_Model_Profiler.ipynb")
]:
    with open(path, "r", encoding="utf-8") as f:
        nb = json.load(f)
    assert nb.get("nbformat") == 4, f"Invalid nbformat in {name}"
    code_cells = [c for c in nb['cells'] if c.get('cell_type') == 'code']
    for idx, c in enumerate(code_cells):
        src = "".join(c.get('source', []))
        ast.parse(src)
    print(f"✓ {name}: Passed JSON schema & AST syntax validation ({len(code_cells)} code cells)")
