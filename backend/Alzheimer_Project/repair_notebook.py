import json
import re

notebook_path = r"d:\neurosense-ai\backend\Alzheimer_Project\Notebooks\ADNI_MRI_Classifier_Training.ipynb"

with open(notebook_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")
for i in range(max(0, 500), min(len(lines), 515)):
    print(f"Line {i+1}: {repr(lines[i])}")

# Let's inspect invalid escapes in raw content
with open(notebook_path, 'r', encoding='utf-8') as f:
    raw_text = f.read()

# Replace invalid JSON escapes like \' with ' or \\'
# In JSON, \' is invalid. ' should just be ' or escaped as \' if double-escaped.
# Let's check regex for invalid escapes in JSON
invalid_escapes = re.findall(r'\\[^"\\/bfnrtu]', raw_text)
print("Found invalid JSON escapes:", set(invalid_escapes))

fixed_text = raw_text.replace(r"\'", "'")

try:
    data = json.loads(fixed_text)
    print("SUCCESSFULLY parsed JSON after replacing \\' with '!")
    with open(notebook_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=1)
    print("Saved repaired notebook JSON!")
except Exception as e:
    print("Error parsing fixed text:", e)
