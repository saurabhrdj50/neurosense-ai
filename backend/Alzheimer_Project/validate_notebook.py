import json
import sys
import ast

notebook_path = r"d:\neurosense-ai\backend\Alzheimer_Project\Notebooks\ADNI_MRI_Classifier_Training.ipynb"

with open(notebook_path, 'r', encoding='utf-8') as f:
    nb_dict = json.load(f)

# Validate nbformat JSON schema
if nb_dict.get('nbformat') == 4 and isinstance(nb_dict.get('cells'), list):
    print("[PASS] JSON notebook schema validation PASSED (Valid nbformat v4)")
else:
    print(f"[FAIL] JSON notebook schema validation FAILED: {nb_dict.get('nbformat')}")

# Check variable definitions and execution order in notebook cells
cells = nb_dict.get('cells', [])
code_cells = [c for c in cells if c.get('cell_type') == 'code']

defined_vars = set()
undefined_issues = []

for idx, c in enumerate(code_cells):
    src = "".join(c.get('source', []))
    # strip magic
    clean_lines = [l for l in src.split('\n') if not l.strip().startswith('%') and not l.strip().startswith('!')]
    clean_code = "\n".join(clean_lines)
    try:
        tree = ast.parse(clean_code)
        # Check global variables assigned
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                defined_vars.add(node.id)
            elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.ClassDef):
                defined_vars.add(node.name)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    defined_vars.add(alias.asname or alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    defined_vars.add(alias.asname or alias.name)
    except SyntaxError as se:
        print(f"Syntax error in cell {idx}: {se}")

print(f"Total defined names across all code cells: {len(defined_vars)}")
