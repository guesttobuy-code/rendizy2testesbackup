#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar problema de repositório Git
"""

import subprocess
import sys
from pathlib import Path
import os

# Configurar encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def main():
    project_dir = Path(__file__).parent.absolute()
    user_home = Path.home()
    
    print("=" * 70)
    print("DIAGNOSTICO DO PROBLEMA GIT")
    print("=" * 70)
    print(f"\nDiretorio do projeto: {project_dir}")
    print(f"Diretorio do usuario: {user_home}\n")
    
    # Verificar se há .git no diretório do usuário
    git_in_home = user_home / ".git"
    if git_in_home.exists():
        print("=" * 70)
        print("PROBLEMA ENCONTRADO!")
        print("=" * 70)
        print(f"\nHá um repositorio Git em: {git_in_home}")
        print("Isso esta causando o aviso que voce esta vendo!")
        print("\nO Git esta tentando rastrear TODOS os arquivos do seu")
        print("diretorio de usuario, incluindo Downloads, Documents, etc.")
        print("\nSOLUCAO:")
        print("=" * 70)
        print("\nOpcao 1 - REMOVER o repositorio Git do diretorio do usuario:")
        print(f"   rmdir /s /q \"{git_in_home}\"")
        print("\nOpcao 2 - Se voce criou esse repositorio por engano,")
        print("   pode remover com seguranca.")
        print("\n" + "=" * 70)
    else:
        print("OK: Nao ha repositorio Git no diretorio do usuario")
    
    # Verificar repositório no projeto
    print("\n" + "=" * 70)
    print("VERIFICANDO REPOSITORIO DO PROJETO")
    print("=" * 70)
    
    git_in_project = project_dir / ".git"
    if git_in_project.exists():
        print(f"\nOK: Repositorio Git encontrado no projeto")
        
        # Verificar .gitignore
        gitignore_path = project_dir / ".gitignore"
        if gitignore_path.exists():
            content = gitignore_path.read_text(encoding='utf-8', errors='ignore')
            if "node_modules" in content:
                print("OK: node_modules ja esta no .gitignore")
            else:
                print("ATENCAO: node_modules NAO esta no .gitignore")
        
        # Verificar status
        print("\nVerificando status do repositorio...")
        result = subprocess.run(
            "git status --porcelain",
            shell=True,
            cwd=project_dir,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore'
        )
        
        if result.returncode == 0:
            lines = [l for l in result.stdout.strip().split('\n') if l.strip()]
            if lines:
                print(f"Arquivos modificados/nao rastreados: {len(lines)}")
                if len(lines) <= 10:
                    for line in lines:
                        print(f"  {line}")
                else:
                    for line in lines[:10]:
                        print(f"  {line}")
                    print(f"  ... e mais {len(lines) - 10} arquivos")
            else:
                print("OK: Nenhuma mudanca pendente")
    else:
        print("ATENCAO: Nao ha repositorio Git no diretorio do projeto")
    
    print("\n" + "=" * 70)
    print("RESPOSTA PARA O AVISO DO GIT:")
    print("=" * 70)
    print("\nSe o aviso perguntar sobre adicionar node_modules ao .gitignore:")
    print("  -> Responda: NO (nao)")
    print("\nPorque:")
    print("  1. O node_modules ja esta no .gitignore do projeto")
    print("  2. O problema real e o repositorio Git no diretorio do usuario")
    print("  3. Adicionar node_modules la nao vai resolver o problema")
    print("\n" + "=" * 70)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())


