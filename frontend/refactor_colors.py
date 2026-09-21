import os
import re

# Refactor color tokens across specified Sanjeevani frontend pages
directory = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src', 'pages')

TARGET_FILES = {
    'AdminDashboard.jsx',
    'AshaDashboard.jsx',
    'Screening.jsx',
    'MeditationTeacher.jsx',
    'YogaTeacher.jsx',
    'Companion.jsx',
}

# Ordered list of replacements (regex -> replacement)
replacements = [
    # Backgrounds with opacity
    (r'bg-\[\#5A7855\]/([0-9]+)', r'bg-sage/\1'),
    (r'bg-\[\#D4A359\]/([0-9]+)', r'bg-gold-warm/\1'),
    (r'bg-\[\#2E4057\]/([0-9]+)', r'bg-warm-indigo/\1'),
    (r'bg-\[\#B85042\]/([0-9]+)', r'bg-rose-soft/\1'),
    (r'bg-\[\#A23B33\]/([0-9]+)', r'bg-rose-soft/\1'),
    (r'bg-\[\#F4F6F0\]/([0-9]+)', r'bg-mist/\1'),
    (r'bg-\[\#F7F2E8\]/([0-9]+)', r'bg-sand/\1'),

    # Dark backgrounds with opacity
    (r'dark:bg-\[\#5A7855\]/([0-9]+)', r'dark:bg-sage/\1'),
    (r'dark:bg-\[\#151D28\]/([0-9]+)', r'dark:bg-mist/\1'),
    (r'dark:bg-\[\#1E2A43\]/([0-9]+)', r'dark:bg-card'),
    (r'dark:bg-\[\#1A2538\]/([0-9]+)', r'dark:bg-card'),
    (r'dark:bg-\[\#B85042\]/([0-9]+)', r'dark:bg-rose-soft/\1'),

    # Dark gradients
    (r'dark:via-\[\#1E2A43\]/([0-9]+)', r'dark:via-card'),
    (r'dark:via-\[\#1E2A43\]', r'dark:via-card'),
    (r'dark:to-\[\#151D28\]', r'dark:to-mist'),

    # Solid backgrounds
    (r'bg-\[\#5A7855\]', 'bg-sage'),
    (r'bg-\[\#2B4A30\]', 'bg-sage'),
    (r'bg-\[\#D4A359\]', 'bg-gold-warm'),
    (r'bg-\[\#2E4057\]', 'bg-warm-indigo'),
    (r'bg-\[\#1E2A43\]', 'bg-warm-indigo'),
    (r'bg-\[\#B85042\]', 'bg-rose-soft'),
    (r'bg-\[\#A23B33\]', 'bg-rose-soft'),
    (r'bg-\[\#F4F6F0\]', 'bg-mist'),
    (r'bg-\[\#F7F2E8\]', 'bg-sand'),
    (r'bg-\[\#EBF1EA\]', 'bg-sage-light'),

    # Dark solid backgrounds
    (r'dark:bg-\[\#111722\]', 'dark:bg-warm-indigo'),
    (r'dark:bg-\[\#151D28\]', 'dark:bg-mist'),
    (r'dark:bg-\[\#182332\]', 'dark:bg-card'),
    (r'dark:bg-\[\#1E2A43\]', 'dark:bg-card'),
    (r'dark:bg-\[\#253247\]', 'dark:bg-sand'),

    # Borders with opacity
    (r'border-\[\#5A7855\]/([0-9]+)', r'border-sage/\1'),
    (r'border-\[\#D4A359\]/([0-9]+)', r'border-gold-warm/\1'),
    (r'border-\[\#2E4057\]/([0-9]+)', r'border-warm-indigo/\1'),
    (r'border-\[\#B85042\]/([0-9]+)', r'border-rose-soft/\1'),

    # Solid borders
    (r'border-\[\#5A7855\]', 'border-sage'),
    (r'border-\[\#D4A359\]', 'border-gold-warm'),
    (r'border-\[\#2E4057\]', 'border-warm-indigo'),
    (r'border-\[\#B85042\]', 'border-rose-soft'),

    # Hover / Focus / Ring / Shadow
    (r'hover:bg-\[\#4A6346\]', 'hover:bg-sage/90'),
    (r'hover:bg-\[\#4A6847\]', 'hover:bg-sage/90'),
    (r'hover:bg-\[\#5A7855\]/([0-9]+)', r'hover:bg-sage/\1'),
    (r'hover:bg-\[\#C29148\]', 'hover:bg-gold-warm/90'),
    (r'hover:bg-\[\#C4933A\]', 'hover:bg-gold-warm/90'),
    (r'hover:bg-\[\#C49247\]', 'hover:bg-gold-warm/90'),
    (r'hover:bg-\[\#D4A359\]/([0-9]+)', r'hover:bg-gold-warm/\1'),
    (r'hover:bg-\[\#9A4035\]', 'hover:bg-rose-soft/90'),
    (r'hover:bg-\[\#A14336\]', 'hover:bg-rose-soft/90'),
    (r'hover:bg-\[\#A23B33\]', 'hover:bg-rose-soft/90'),
    (r'hover:bg-\[\#1E2A43\]', 'hover:bg-warm-indigo/90'),
    (r'hover:bg-\[\#243347\]', 'hover:bg-warm-indigo/90'),

    (r'hover:border-\[\#5A7855\]/([0-9]+)', r'hover:border-sage/\1'),
    (r'hover:border-\[\#D4A359\]/([0-9]+)', r'hover:border-gold-warm/\1'),
    (r'hover:border-\[\#2E4057\]/([0-9]+)', r'hover:border-warm-indigo/\1'),

    (r'hover:text-\[\#5A7855\]', 'hover:text-sage'),
    (r'hover:text-\[\#D4A359\]', 'hover:text-gold-warm'),
    (r'hover:text-\[\#B85042\]', 'hover:text-rose-soft'),
    (r'hover:text-\[\#2E4057\]', 'hover:text-primary'),
    (r'hover:text-\[\#1E2A43\]', 'hover:text-primary'),
    (r'dark:hover:text-\[\#F4F6F0\]', 'dark:hover:text-mist'),

    (r'focus:ring-\[\#5A7855\]', 'focus:ring-sage'),
    (r'focus:ring-\[\#D4A359\]', 'focus:ring-gold-warm'),
    (r'ring-\[\#5A7855\]/([0-9]+)', r'ring-sage/\1'),
    (r'ring-\[\#D4A359\]/([0-9]+)', r'ring-gold-warm/\1'),

    (r'shadow-\[\#5A7855\]/([0-9]+)', r'shadow-sage/\1'),
    (r'shadow-\[\#D4A359\]/([0-9]+)', r'shadow-gold-warm/\1'),
    (r'shadow-\[\#2E4057\]/([0-9]+)', r'shadow-warm-indigo/\1'),

    # Gradients
    (r'from-\[\#5A7855\]/([0-9]+)', r'from-sage/\1'),
    (r'from-\[\#5A7855\]', 'from-sage'),
    (r'from-\[\#D4A359\]/([0-9]+)', r'from-gold-warm/\1'),
    (r'from-\[\#D4A359\]', 'from-gold-warm'),
    (r'from-\[\#2E4057\]', 'from-warm-indigo'),
    (r'from-\[\#1A2319\]', 'from-gray-950'),
    (r'via-\[\#0F1412\]', 'via-black'),
    (r'to-\[\#5A7855\]/([0-9]+)', r'to-sage/\1'),
    (r'to-\[\#5A7855\]', 'to-sage'),
    (r'to-\[\#D4A359\]/([0-9]+)', r'to-gold-warm/\1'),
    (r'to-\[\#8ED14C\]', 'to-booti-glow'),
    (r'to-\[\#F4F6F0\]', 'to-mist'),

    # Fills
    (r'fill-\[\#2E4057\]', 'fill-warm-indigo'),

    # Text colors
    (r'text-\[\#5A7855\]', 'text-sage'),
    (r'text-\[\#2B4A30\]', 'text-sage'),
    (r'text-\[\#D4A359\]', 'text-gold-warm'),
    (r'text-\[\#8C5E24\]', 'text-gold-warm'),
    (r'text-\[\#B85042\]', 'text-rose-soft'),
    (r'text-\[\#A23B33\]', 'text-rose-soft'),
    (r'text-\[\#8ED14C\]', 'text-booti-glow'),
    (r'text-\[\#2E4057\]', 'text-primary'),
    (r'text-\[\#1E2A43\]', 'text-primary'),
    (r'text-\[\#556376\]', 'text-muted'),
    (r'text-\[\#F4F6F0\]', 'text-mist'),

    # Dark text colors
    (r'dark:text-\[\#8ED14C\]', 'dark:text-booti-glow'),
    (r'dark:text-\[\#D4A359\]', 'dark:text-gold-warm'),
    (r'dark:text-\[\#FF7878\]', 'dark:text-rose-soft'),
    (r'dark:text-\[\#F08080\]', 'dark:text-rose-soft'),
    (r'dark:text-\[\#A8B4C2\]', 'dark:text-muted'),
    (r'dark:text-\[\#F4F6F0\]', 'dark:text-mist'),
    (r'dark:text-\[\#EAEFEA\]', 'dark:text-mist'),

    # Additional generic cleanups
    (r'bg-white/80', 'bg-card'),
    (r'bg-white/90', 'bg-card'),
    (r'border-black/5', 'border-border-subtle'),
    (r'border-black/10', 'border-border-subtle'),
]

# Process target files
for root_dir, dirs, files in os.walk(directory):
    for filename in files:
        if filename in TARGET_FILES:
            filepath = os.path.join(root_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content
            for old, new in replacements:
                new_content = re.sub(old, new, new_content, flags=re.IGNORECASE)

            # File-specific manual cleanups:
            if filename == 'AdminDashboard.jsx':
                # StatCard color prop migration
                new_content = re.sub(r'color="#5A7855"', 'colorClass="bg-sage/15 text-sage"', new_content)
                new_content = re.sub(r'color="#D4A359"', 'colorClass="bg-gold-warm/15 text-gold-warm"', new_content)
                new_content = re.sub(r'color="#2E4057"', 'colorClass="bg-warm-indigo/15 text-warm-indigo"', new_content)
                new_content = re.sub(
                    r'function StatCard\(\{ icon: Icon, label, value, color \}\) \{[\s\S]*?style=\{\{ backgroundColor: `\$\{color\}15`, color \}\}[\s\S]*?\}',
                    'function StatCard({ icon: Icon, label, value, colorClass = "bg-sage/15 text-sage" }) {\n  return (\n    <div className="bg-card rounded-3xl p-5 border border-border-subtle shadow-xs">\n      <div className="flex items-center gap-3.5">\n        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${colorClass}`}>\n          <Icon className="w-6 h-6" />\n        </div>\n        <div>\n          <p className="text-2xl sm:text-3xl font-bold text-primary">{value}</p>\n          <p className="text-[10px] text-muted font-bold uppercase tracking-wider mt-0.5">{label}</p>\n        </div>\n      </div>\n    </div>\n  );\n}',
                    new_content
                )

            if filename == 'Screening.jsx':
                # Convert SCREENINGS raw hex colors
                new_content = re.sub(r"color:\s*'#B85042'", "color: 'var(--rose-soft)'", new_content)
                new_content = re.sub(r"color:\s*'#D4A359'", "color: 'var(--gold-warm)'", new_content)
                new_content = re.sub(r"color:\s*'#8C5E24'", "color: 'var(--gold-warm)'", new_content)
                new_content = re.sub(r"color:\s*'#5A7855'", "color: 'var(--sage)'", new_content)

                # Convert canvas ctx.fillStyle hex colors to rgb()
                new_content = re.sub(r"ctx\.fillStyle = '#C89680'", "ctx.fillStyle = 'rgb(200, 150, 128)'", new_content)
                new_content = re.sub(r"ctx\.fillStyle = '#E8EBEF'", "ctx.fillStyle = 'rgb(232, 235, 239)'", new_content)
                new_content = re.sub(r"ctx\.fillStyle = '#3E2A1D'", "ctx.fillStyle = 'rgb(62, 42, 29)'", new_content)
                new_content = re.sub(r"ctx\.fillStyle = '#9C4E4E'", "ctx.fillStyle = 'rgb(156, 78, 78)'", new_content)
                new_content = re.sub(r"ctx\.fillStyle = '#D6CE65'", "ctx.fillStyle = 'rgb(214, 206, 101)'", new_content)
                new_content = re.sub(r"ctx\.fillStyle = '#2A1F18'", "ctx.fillStyle = 'rgb(42, 31, 24)'", new_content)
                new_content = re.sub(r"ctx\.fillStyle = '#B34A5B'", "ctx.fillStyle = 'rgb(179, 74, 91)'", new_content)
                new_content = re.sub(r"ctx\.fillStyle = '#EDE8EE'", "ctx.fillStyle = 'rgb(237, 232, 238)'", new_content)
                new_content = re.sub(r"ctx\.fillStyle = '#D4A587'", "ctx.fillStyle = 'rgb(212, 165, 135)'", new_content)
                new_content = re.sub(r"ctx\.fillStyle = '#C23B38'", "ctx.fillStyle = 'rgb(194, 59, 56)'", new_content)

            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")

print("Done migrating hex colors to design tokens.")
