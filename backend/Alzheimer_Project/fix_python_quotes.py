import json
import re
import ast

notebook_path = r"d:\neurosense-ai\backend\Alzheimer_Project\Notebooks\ADNI_MRI_Classifier_Training.ipynb"

with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

cells = nb.get('cells', [])
fixed_count = 0

for cell_idx, cell in enumerate(cells):
    if cell.get('cell_type') == 'code':
        source = cell.get('source', [])
        new_source = []
        changed = False
        for line in source:
            # Fix 'AD (Alzheimer's)' -> "AD (Alzheimer's)" or 'AD (Alzheimers)'
            if "'AD (Alzheimer's)'" in line or "'AD (Alzheimer\\'s)'" in line:
                line = line.replace("'AD (Alzheimer's)'", '"AD (Alzheimer\'s)"')
                line = line.replace("'AD (Alzheimer\\'s)'", '"AD (Alzheimer\'s)"')
                changed = True
            new_source.append(line)
        if changed:
            cell['source'] = new_source
            fixed_count += 1
            print(f"Fixed cell {cell_idx}")

with open(notebook_path, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1)

print(f"Saved notebook with {fixed_count} cells fixed.")
