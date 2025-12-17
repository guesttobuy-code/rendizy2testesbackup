#!/usr/bin/env python3
"""
Script para criar ZIP do código RendizyPrincipal (código mais atualizado que funcionou no localhost)
"""

import zipfile
from datetime import datetime
from pathlib import Path

# Caminho base
base_dir = Path(r"c:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP")
rendizy_dir = base_dir / "RendizyPrincipal"

# Nome do ZIP (fixo como solicitado)
zip_name = "rendizy 2483.zip"
downloads_dir = Path(r"c:\Users\rafae\Downloads")
zip_path = downloads_dir / zip_name

print("=" * 60)
print("Criando ZIP do código RendizyPrincipal")
print("=" * 60)
print(f"\nDiretório fonte: {rendizy_dir}")
print(f"Arquivo ZIP: {zip_name}")
print(f"Destino: {zip_path}\n")

# Pastas e arquivos a excluir
exclude_dirs = {
    'node_modules', 'dist', 'build', '.git', '.vite', '.supabase',
    '.cache', '.parcel-cache', 'coverage', 'logs', '.next', 'out',
    '.tmp', '.temp', '.local', '.localhost', '.vscode', '.idea'
}

exclude_exts = {'.log', '.tmp', '.temp', '.backup', '.zip', '.map'}
exclude_files = {'package-lock.json'}

files_added = 0
total_size = 0

try:
    # Criar pasta Downloads se não existir
    downloads_dir.mkdir(parents=True, exist_ok=True)
    
    # Remover ZIP anterior se existir
    if zip_path.exists():
        print(f"Removendo ZIP anterior: {zip_name}")
        zip_path.unlink()
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Verificar se a pasta existe
        if not rendizy_dir.exists():
            print(f"ERRO: Pasta {rendizy_dir} nao encontrada!")
            exit(1)
        
        print("Processando arquivos...")
        
        # Percorrer todos os arquivos em RendizyPrincipal
        for item in rendizy_dir.rglob('*'):
            # Pular o próprio ZIP se estiver dentro
            if item == zip_path:
                continue
            
            # Verificar se deve ser excluído
            rel_path = item.relative_to(rendizy_dir)
            
            # Verificar se está em pasta excluída
            should_exclude = False
            for part in rel_path.parts:
                if part in exclude_dirs:
                    should_exclude = True
                    break
            
            # Verificar extensão
            if not should_exclude and item.suffix.lower() in exclude_exts:
                should_exclude = True
            
            # Verificar nome do arquivo
            if not should_exclude and item.name in exclude_files:
                should_exclude = True
            
            # Processar apenas arquivos (não pastas)
            if not should_exclude and item.is_file():
                try:
                    # Manter estrutura: RendizyPrincipal/arquivo...
                    zip_path_in_archive = f"RendizyPrincipal/{rel_path.as_posix()}"
                    zipf.write(item, zip_path_in_archive)
                    files_added += 1
                    total_size += item.stat().st_size
                    
                    if files_added % 50 == 0:
                        print(f"  Processados {files_added} arquivos...", end='\r')
                except Exception as e:
                    print(f"\nAviso ao adicionar {rel_path}: {e}")
        
        print()  # Nova linha após o progresso
        
        # Adicionar arquivos importantes da raiz
        print("\nAdicionando arquivos de configuração da raiz...")
        root_files = [
            'package.json',
            'vite.config.ts',
            'index.html',
            'README.md',
            '.gitignore',
            'tsconfig.json'
        ]
        
        for root_file in root_files:
            root_file_path = base_dir / root_file
            if root_file_path.exists() and root_file_path.is_file():
                zipf.write(root_file_path, root_file)
                files_added += 1
                print(f"  + {root_file}")
        
        # Adicionar pasta supabase se existir (backend)
        supabase_dir = base_dir / "supabase"
        if supabase_dir.exists():
            print("\nAdicionando pasta supabase (backend)...")
            for item in supabase_dir.rglob('*'):
                if item.is_file():
                    # Excluir .temp e outras pastas temporárias
                    rel_path = item.relative_to(base_dir)
                    if '.temp' not in str(rel_path) and '.supabase' not in str(rel_path):
                        try:
                            zipf.write(item, rel_path.as_posix())
                            files_added += 1
                            if files_added % 50 == 0:
                                print(f"  Processados {files_added} arquivos...", end='\r')
                        except Exception as e:
                            print(f"\nAviso ao adicionar {rel_path}: {e}")
    
    # Estatísticas finais
    zip_size_mb = zip_path.stat().st_size / (1024 * 1024)
    total_size_mb = total_size / (1024 * 1024)
    
    print("\n" + "=" * 60)
    print("ZIP criado com sucesso!")
    print("=" * 60)
    print(f"\nArquivo: {zip_name}")
    print(f"Tamanho do ZIP: {zip_size_mb:.2f} MB")
    print(f"Arquivos incluidos: {files_added}")
    print(f"Tamanho total dos arquivos: {total_size_mb:.2f} MB")
    print(f"Localizacao: {zip_path}")
    print(f"\nPronto para push forcado no GitHub!")
    
except Exception as e:
    print(f"\nERRO ao criar ZIP: {e}")
    import traceback
    traceback.print_exc()
    if zip_path.exists():
        zip_path.unlink()
    exit(1)

