#!/usr/bin/env python3
"""
Script RÁPIDO para criar ZIP - apenas arquivos essenciais
"""

import zipfile
from datetime import datetime
from pathlib import Path

root_dir = Path(r"c:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP")
timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
zip_name = f"rendizy-codigo-github-{timestamp}.zip"
zip_path = root_dir / zip_name

print("Criando ZIP rapido...")

# Pastas essenciais para incluir
folders = ['src', 'public', 'supabase', 'components', 'pages', 'hooks', 'utils', 'types', 'styles', 'scripts']

# Arquivos de config essenciais
config_files = ['package.json', 'vite.config.ts', 'vite.config.js', 'tsconfig.json', 
                'tailwind.config.js', 'index.html', 'README.md', '.gitignore']

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Adicionar pastas
    for folder in folders:
        folder_path = root_dir / folder
        if folder_path.exists():
            for file in folder_path.rglob('*'):
                if file.is_file() and 'node_modules' not in str(file):
                    rel_path = file.relative_to(root_dir)
                    zipf.write(file, rel_path)
                    print(f"+ {rel_path}")
    
    # Adicionar arquivos de config
    for config in config_files:
        config_path = root_dir / config
        if config_path.exists():
            zipf.write(config_path, config_path.name)
            print(f"+ {config_path.name}")

size_mb = zip_path.stat().st_size / (1024 * 1024)
print(f"\nZIP criado: {zip_name} ({size_mb:.2f} MB)")










