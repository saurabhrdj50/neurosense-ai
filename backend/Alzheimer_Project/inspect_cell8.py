import json

notebook_path = r"d:\neurosense-ai\backend\Alzheimer_Project\Notebooks\ADNI_MRI_Classifier_Training.ipynb"

with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

code_cells = [c for c in nb.get('cells', []) if c.get('cell_type') == 'code']

print("--- Cell 8 Code ---")
cell_8_src = "".join(code_cells[8].get('source', []))
for line_idx, line in enumerate(cell_8_src.split('\n')):
    print(f"Line {line_idx+1}: {repr(line)}")
