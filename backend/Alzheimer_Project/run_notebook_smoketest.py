import json
import ast
import os
import sys
import traceback

# Ensure UTF-8 output encoding for Windows compatibility
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

notebook_path = "d:/neurosense-ai/backend/Alzheimer_Project/Notebooks/ADNI_MRI_Classifier_Training.ipynb"

print("="*50)
print("   EXECUTING FULL NOTEBOOK SMOKE TEST SUITE   ")
print("="*50)

# 1. JSON & Schema Validation
try:
    with open(notebook_path, "r", encoding="utf-8") as f:
        nb = json.load(f)
    print("[OK] 1. JSON notebook schema validation PASSED.")
except Exception as e:
    print(f"[FAIL] 1. JSON validation FAILED: {e}")
    sys.exit(1)

code_cells = [cell for cell in nb['cells'] if cell['cell_type'] == 'code']
print(f"[OK] 2. Found {len(code_cells)} code cells out of {len(nb['cells'])} total cells.")

global_namespace = {}

for idx, cell in enumerate(code_cells):
    source = cell['source']
    if isinstance(source, list):
        source = "".join(source)
    cell_num = idx + 1
    
    # AST Check
    try:
        ast.parse(source)
    except SyntaxError as se:
        print(f"[FAIL] Syntax error in Code Cell {cell_num:02d}: {se}")
        sys.exit(1)
        
    # Execution Check
    try:
        exec(source, global_namespace)
        print(f"  [Cell {cell_num:02d}/{len(code_cells):02d}] Executed successfully.")
    except Exception as exec_err:
        print(f"[FAIL] Execution error in Code Cell {cell_num:02d}: {exec_err}")
        traceback.print_exc()
        sys.exit(1)

print("\n" + "="*50)
print("ALL CODE CELLS EXECUTED SUCCESSFULLY WITHOUT ERRORS!")
print("="*50)
