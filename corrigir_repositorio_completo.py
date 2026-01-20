#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corrigir o problema do repositorio Git
1. Remove o repositorio Git do diretorio do usuario (se existir)
2. Inicializa Git no diretorio do projeto (se nao existir)
3. Configura o remote correto
"""

import subprocess
import sys
from pathlib import Path
import shutil

# Configurar encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_command(cmd, cwd=None):
    """Executa comando e retorna resultado"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    project_dir = Path(__file__).parent.absolute()
    user_home = Path.home()
    
    print("=" * 70)
    print("CORRECAO COMPLETA DO REPOSITORIO GIT")
    print("=" * 70)
    print(f"\nDiretorio do projeto: {project_dir}")
    print(f"Diretorio do usuario: {user_home}\n")
    
    # PASSO 1: Remover repositorio Git do diretorio do usuario
    print("=" * 70)
    print("PASSO 1: Removendo repositorio Git do diretorio do usuario")
    print("=" * 70)
    
    git_in_home = user_home / ".git"
    if git_in_home.exists():
        print(f"\nEncontrado: {git_in_home}")
        print("Removendo...")
        try:
            shutil.rmtree(git_in_home)
            print("OK: Repositorio Git removido do diretorio do usuario")
        except Exception as e:
            print(f"ERRO ao remover: {e}")
            return 1
    else:
        print("OK: Nao ha repositorio Git no diretorio do usuario")
    
    # PASSO 2: Verificar/inicializar Git no projeto
    print("\n" + "=" * 70)
    print("PASSO 2: Verificando repositorio Git no projeto")
    print("=" * 70)
    
    git_in_project = project_dir / ".git"
    if not git_in_project.exists():
        print("\nInicializando repositorio Git no projeto...")
        success, output, error = run_command("git init", cwd=project_dir)
        if success:
            print("OK: Repositorio Git inicializado")
        else:
            print(f"ERRO ao inicializar: {error}")
            return 1
    else:
        print("OK: Repositorio Git ja existe no projeto")
    
    # PASSO 3: Verificar remote
    print("\n" + "=" * 70)
    print("PASSO 3: Verificando remote configurado")
    print("=" * 70)
    
    success, remotes, _ = run_command("git remote -v", cwd=project_dir)
    if success and remotes.strip():
        print("Remotes configurados:")
        print(remotes)
    else:
        print("ATENCAO: Nenhum remote configurado")
        print("\nVoce precisa configurar o remote do GitHub:")
        print("  git remote add origin https://github.com/USUARIO/REPOSITORIO.git")
    
    # PASSO 4: Verificar .gitignore
    print("\n" + "=" * 70)
    print("PASSO 4: Verificando .gitignore")
    print("=" * 70)
    
    gitignore_path = project_dir / ".gitignore"
    if gitignore_path.exists():
        content = gitignore_path.read_text(encoding='utf-8', errors='ignore')
        if "node_modules" in content:
            print("OK: node_modules esta no .gitignore")
        else:
            print("ADICIONANDO node_modules ao .gitignore...")
            with open(gitignore_path, 'a', encoding='utf-8') as f:
                f.write("\n# Dependencies\nnode_modules/\n")
            print("OK: Adicionado")
    else:
        print("CRIANDO .gitignore...")
        gitignore_content = """# Dependencies
node_modules/
.pnp
.pnp.js

# Environment variables
.env
.env.local
.env.*.local

# Build
build/
dist/
.vite/

# Logs
*.log
"""
        with open(gitignore_path, 'w', encoding='utf-8') as f:
            f.write(gitignore_content)
        print("OK: .gitignore criado")
    
    print("\n" + "=" * 70)
    print("CORRECAO CONCLUIDA!")
    print("=" * 70)
    print("\nAgora o Git deve funcionar corretamente no diretorio do projeto.")
    print("O aviso nao deve mais aparecer!")
    print("\nProximos passos:")
    print("1. Verifique o status: git status")
    print("2. Adicione os arquivos: git add .")
    print("3. Faca commit: git commit -m 'mensagem'")
    print("4. Configure o remote (se necessario)")
    print("5. Faca push: git push origin main")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())


