#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para corrigir problema de repositório Git no diretório errado
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
    # Diretório do projeto
    project_dir = Path(__file__).parent.absolute()
    user_home = Path.home()
    
    print("=" * 60)
    print("CORREÇÃO DE REPOSITÓRIO GIT")
    print("=" * 60)
    print(f"\n📁 Diretório do projeto: {project_dir}")
    print(f"🏠 Diretório do usuário: {user_home}\n")
    
    # 1. Verificar se há .git no diretório do usuário (PROBLEMA!)
    print("1️⃣ Verificando se há repositório Git no diretório do usuário...")
    git_in_home = user_home / ".git"
    if git_in_home.exists():
        print(f"❌ PROBLEMA ENCONTRADO!")
        print(f"   Há um repositório Git em: {git_in_home}")
        print(f"   Isso está causando o aviso que você está vendo!")
        print()
        
        resposta = input("❓ Deseja remover este repositório Git do diretório do usuário? (s/n): ").strip().lower()
        if resposta == 's':
            try:
                # Verificar se está vazio ou tem algo importante
                success, output, _ = run_command("git log --oneline -1", cwd=user_home)
                if success and output.strip():
                    print(f"\n⚠️ ATENÇÃO: Este repositório tem commits!")
                    print(f"   Último commit: {output.strip()}")
                    resposta2 = input("   Tem certeza que deseja remover? (s/n): ").strip().lower()
                    if resposta2 != 's':
                        print("   Operação cancelada.")
                        return 0
                
                # Remover .git do diretório do usuário
                import shutil
                shutil.rmtree(git_in_home)
                print(f"✅ Repositório Git removido de {user_home}")
                print("   O aviso não deve mais aparecer!")
            except Exception as e:
                print(f"❌ Erro ao remover: {e}")
                return 1
        else:
            print("⏭️ Operação cancelada.")
    else:
        print("✅ Não há repositório Git no diretório do usuário\n")
    
    # 2. Verificar repositório no diretório do projeto
    print("2️⃣ Verificando repositório no diretório do projeto...")
    git_in_project = project_dir / ".git"
    if git_in_project.exists():
        print("✅ Repositório Git encontrado no diretório do projeto")
        
        # Verificar se node_modules está no .gitignore
        gitignore_path = project_dir / ".gitignore"
        if gitignore_path.exists():
            content = gitignore_path.read_text(encoding='utf-8', errors='ignore')
            if "node_modules" in content:
                print("✅ node_modules já está no .gitignore")
            else:
                print("⚠️ node_modules NÃO está no .gitignore")
                resposta = input("   Deseja adicionar? (s/n): ").strip().lower()
                if resposta == 's':
                    with open(gitignore_path, 'a', encoding='utf-8') as f:
                        f.write("\n# Dependencies\nnode_modules/\n")
                    print("✅ Adicionado ao .gitignore")
        
        # Limpar cache do Git
        print("\n3️⃣ Limpando cache do Git...")
        success, output, error = run_command("git rm -r --cached .", cwd=project_dir)
        if success:
            print("✅ Cache limpo")
            print("   Agora o Git vai reaplicar o .gitignore")
            
            # Fazer commit das mudanças
            resposta = input("\n❓ Deseja fazer commit dessas mudanças? (s/n): ").strip().lower()
            if resposta == 's':
                success2, output2, error2 = run_command(
                    'git add .gitignore && git commit -m "chore: Atualizar .gitignore"',
                    cwd=project_dir
                )
                if success2:
                    print("✅ Commit realizado")
                else:
                    print(f"⚠️ Erro no commit: {error2}")
    else:
        print("⚠️ Não há repositório Git no diretório do projeto")
        print("   Isso é normal se você ainda não inicializou o Git aqui")
    
    print("\n" + "=" * 60)
    print("DIAGNÓSTICO CONCLUÍDO")
    print("=" * 60)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

