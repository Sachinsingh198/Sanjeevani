import os
import re

directory = 'd:/Sanjeevani/fontend/src'

replacements = {
    r'bg-\[\#F7F5EE\]': 'bg-mist text-primary',
    r'text-\[\#1A263D\]': 'text-primary',
    r'bg-\[\#1A263D\]': 'bg-warm-indigo',
    r'text-\[\#5A7855\]': 'text-sage',
    r'bg-\[\#5A7855\]': 'bg-sage',
    r'border-\[\#5A7855\]': 'border-sage',
    r'text-\[\#D4A359\]': 'text-gold-warm',
    r'bg-\[\#D4A359\]': 'bg-gold-warm',
    r'border-\[\#D4A359\]': 'border-gold-warm',
    r'text-\[\#B85042\]': 'text-rose-soft',
    r'bg-\[\#B85042\]': 'bg-rose-soft',
    r'bg-\[\#EBF1EA\]': 'bg-sage-light',
    r'bg-white/80': 'bg-card',
    r'bg-white': 'bg-card',
    r'text-gray-500': 'text-muted',
    r'text-gray-600': 'text-muted',
    r'text-gray-700': 'text-primary',
    r'border-black/5': 'border-border-subtle',
    r'border-black/10': 'border-border-subtle',
}

for root_dir, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            filepath = os.path.join(root_dir, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content
            for old, new in replacements.items():
                new_content = re.sub(old, new, new_content)

            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

print("Done replacing hard-coded hexes.")
