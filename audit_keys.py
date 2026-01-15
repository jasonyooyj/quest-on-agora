import json
import re
import os

def flatten_json(y):
    out = {}
    def flatten(x, name=''):
        if type(x) is dict:
            for a in x:
                flatten(x[a], name + a + '.')
        else:
            out[name[:-1]] = x
    flatten(y)
    return out

def load_keys(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return set(flatten_json(data).keys())

def find_usages(root_dir):
    usages = []
    # simplistic regex: matches t('key') or t("key") or t.rich('key')
    pattern = re.compile(r"\bt(?:\.rich)?\(['\"]([a-zA-Z0-9_.]+)['\"]")
    
    for root, dirs, files in os.walk(root_dir):
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if '.next' in dirs: dirs.remove('.next')
        if '.git' in dirs: dirs.remove('.git')
        
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = pattern.findall(content)
                    for match in matches:
                        usages.append((match, path))
    return usages

def main():
    root = os.getcwd() # Assumes running from project root
    json_path = os.path.join(root, 'messages/ko.json')
    
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found")
        return

    valid_keys = load_keys(json_path)
    usages = find_usages(root)
    
    # We might have namespaced usages like useTranslations('Namespace'). t('key') -> Namespace.key
    # This script is simple and might verify absolute keys, or we might need to be smarter.
    # For now, let's just list keys that DEFINITELY don't exist as absolute keys, 
    # but realize many are relative.
    
    # Actually, most usages in this codebase seem to use useTranslations('Namespace'), 
    # so t('subKey') resolves to Namespace.subKey.
    # To properly check this, we'd need to parse the useTranslations call in each file.
    
    print("--- Translation Key Audit ---")
    print(f"Loaded {len(valid_keys)} keys from ko.json")
    print(f"Found {len(usages)} t() calls")
    
    # HEURISTIC: Check if the key exists as a suffix of ANY valid key.
    # If t('btn') is used, and 'Common.btn' exists, we assume it *might* be valid (false negative is better than false positive hell).
    # Better yet, let's just print usages that don't match ANY known key suffix, or key itself.
    
    pass_count = 0
    suspicious = []
    
    for key, file in usages:
        # 1. Exact match
        if key in valid_keys:
            pass_count += 1
            continue
            
        # 2. Suffix match (Namespace handling heuristic)
        # If 'key' is 'buttons.submit', we look for '*.buttons.submit'
        suffix_match = False
        for valid in valid_keys:
            if valid.endswith('.' + key) or valid == key:
                suffix_match = True
                break
        
        if suffix_match:
            pass_count += 1
        else:
            suspicious.append((key, file))
            
    print(f"Verified {pass_count} usages.")
    if suspicious:
        print(f"\n{len(suspicious)} Suspicious Usages (Potentially Missing or Dynamic):")
        for key, file in suspicious:
            print(f"  - '{key}' in {os.path.basename(file)}")
            
if __name__ == "__main__":
    main()
