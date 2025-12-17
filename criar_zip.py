#!/usr/bin/env python3
"""
Script simples para criar ZIP do código para GitHub
Exclui node_modules, build, .git e outros arquivos desnecessários
"""

import os
import zipfile
import shutil
from datetime import datetime
from pathlib import Path

def should_exclude(path, root_dir):
    """Verifica se um arquivo/pasta deve ser excluído"""
    rel_path = str(path.relative_to(root_dir))
    name = path.name
    
    # Pastas a excluir
    exclude_dirs = {
        'node_modules', '.git', 'build', 'dist', '.vite', '.supabase',
        'Rendizy2producao', 'RendizyPrincipal', '.cache', '.parcel-cache',
        'coverage', 'logs', '.next', 'out', '.tmp', '.temp', '.local',
        '.localhost', '.vscode', '.idea'
    }
    
    # Extensões a excluir
    exclude_exts = {'.log', '.tmp', '.temp', '.backup', '.zip'}
    
    # Arquivos específicos a excluir
    exclude_files = {
        'package-lock.json', 'rendizy-token.txt'
    }
    
    # Verificar se é uma pasta excluída
    if name in exclude_dirs:
        return True
    
    # Verificar se está dentro de uma pasta excluída
    for exclude_dir in exclude_dirs:
        if exclude_dir in rel_path:
            return True
    
    # Verificar extensão
    if path.suffix.lower() in exclude_exts:
        return True
    
    # Verificar nome do arquivo
    if name in exclude_files:
        return True
    
    # Excluir scripts PowerShell de backup/deploy
    if name.startswith(('criar-', 'deploy-', 'configurar-', 'executar-', 
                       'fazer-', 'git-', 'login-', 'buscar-', 'abrir-',
                       'atualizar-', 'exportar-', 'instalar-', 'migrar-',
                       'renomear-', 'limpar-')) and name.endswith('.ps1'):
        return True
    
    return False

def create_zip():
    """Cria o arquivo ZIP"""
    root_dir = Path.cwd()
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    zip_name = f"rendizy-codigo-github-{timestamp}.zip"
    zip_path = root_dir / zip_name
    
    print("=" * 50)
    print("Criando ZIP do código para GitHub")
    print("=" * 50)
    print(f"\nDiretório: {root_dir}")
    print(f"Arquivo: {zip_name}\n")
    
    files_added = 0
    total_size = 0
    
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Percorrer todos os arquivos
            for item in root_dir.rglob('*'):
                # Pular o próprio arquivo ZIP que estamos criando
                if item == zip_path:
                    continue
                
                # Verificar se deve ser excluído
                if should_exclude(item, root_dir):
                    continue
                
                # Processar apenas arquivos (não pastas)
                if item.is_file():
                    try:
                        rel_path = item.relative_to(root_dir)
                        zipf.write(item, rel_path)
                        files_added += 1
                        total_size += item.stat().st_size
                        
                        if files_added % 100 == 0:
                            print(f"Processados {files_added} arquivos...", end='\r')
                    except Exception as e:
                        print(f"\nAviso: Erro ao adicionar {item}: {e}")
        
        zip_size = zip_path.stat().st_size / (1024 * 1024)  # MB
        
        print("\n" + "=" * 50)
        print("ZIP criado com sucesso!")
        print("=" * 50)
        print(f"\nArquivo: {zip_name}")
        print(f"Tamanho: {zip_size:.2f} MB")
        print(f"Arquivos: {files_added}")
        print(f"Local: {zip_path}")
        print("\nPronto para push no GitHub!")
        
    except Exception as e:
        print(f"\nERRO ao criar ZIP: {e}")
        if zip_path.exists():
            zip_path.unlink()
        return 1
    
    return 0

if __name__ == "__main__":
    exit(create_zip())










