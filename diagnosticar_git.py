#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para diagnosticar problemas com Git push
Verifica status, diferenças e tenta identificar o problema
"""

import subprocess
import sys
import os
from pathlib import Path

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
    
    print("=" * 60)
    print("DIAGNÓSTICO GIT - Verificando status do repositório")
    print("=" * 60)
    print(f"\n📁 Diretório: {project_dir}\n")
    
    # 1. Verificar se é repositório Git
    print("1️⃣ Verificando se é repositório Git...")
    success, output, error = run_command("git rev-parse --git-dir", cwd=project_dir)
    if not success:
        print("❌ ERRO: Não é um repositório Git!")
        print(f"   Erro: {error}")
        return 1
    print("✅ É um repositório Git válido\n")
    
    # 2. Verificar branch atual
    print("2️⃣ Verificando branch atual...")
    success, branch, _ = run_command("git branch --show-current", cwd=project_dir)
    if success:
        print(f"✅ Branch atual: {branch.strip()}\n")
    else:
        print("⚠️ Não foi possível determinar a branch\n")
    
    # 3. Verificar remote
    print("3️⃣ Verificando remotes configurados...")
    success, remotes, _ = run_command("git remote -v", cwd=project_dir)
    if success:
        print("✅ Remotes:")
        for line in remotes.strip().split('\n'):
            if line.strip():
                print(f"   {line}")
    else:
        print("❌ Não há remotes configurados!")
    print()
    
    # 4. Verificar status
    print("4️⃣ Verificando status do repositório...")
    success, status, _ = run_command("git status --short", cwd=project_dir)
    if success:
        if status.strip():
            print("⚠️ Há mudanças não commitadas:")
            for line in status.strip().split('\n'):
                if line.strip():
                    print(f"   {line}")
        else:
            print("✅ Nenhuma mudança pendente")
    print()
    
    # 5. Verificar commits locais não enviados
    print("5️⃣ Verificando commits locais não enviados...")
    success, output, _ = run_command("git log origin/main..HEAD --oneline", cwd=project_dir)
    if success and output.strip():
        print(f"✅ Há {len(output.strip().split(chr(10)))} commit(s) local(is) não enviado(s):")
        for line in output.strip().split('\n'):
            if line.strip():
                print(f"   {line}")
    else:
        print("ℹ️ Nenhum commit local não enviado (ou não há diferença)")
    print()
    
    # 6. Verificar commits remotos não baixados
    print("6️⃣ Verificando commits remotos não baixados...")
    success, output, _ = run_command("git fetch origin", cwd=project_dir)
    if success:
        success2, output2, _ = run_command("git log HEAD..origin/main --oneline", cwd=project_dir)
        if success2 and output2.strip():
            print(f"⚠️ Há {len(output2.strip().split(chr(10)))} commit(s) remoto(s) não baixado(s):")
            for line in output2.strip().split('\n'):
                if line.strip():
                    print(f"   {line}")
        else:
            print("✅ Repositório local está atualizado com remoto")
    print()
    
    # 7. Verificar diferenças de arquivos
    print("7️⃣ Verificando diferenças de arquivos...")
    success, output, _ = run_command("git diff --stat origin/main..HEAD", cwd=project_dir)
    if success and output.strip():
        print("📊 Estatísticas de diferenças:")
        print(output)
    else:
        print("ℹ️ Nenhuma diferença significativa detectada")
    print()
    
    # 8. Verificar autenticação
    print("8️⃣ Verificando autenticação...")
    success, output, error = run_command("git ls-remote --heads origin", cwd=project_dir)
    if success:
        print("✅ Autenticação OK - Consegue acessar o repositório remoto")
        if output.strip():
            print("   Branches disponíveis no remoto:")
            for line in output.strip().split('\n'):
                if line.strip():
                    branch_name = line.split()[1].replace('refs/heads/', '')
                    print(f"   - {branch_name}")
    else:
        print("❌ ERRO de autenticação!")
        print(f"   Erro: {error}")
        print("\n💡 SOLUÇÃO: Verifique se o token no remote está correto")
    print()
    
    print("=" * 60)
    print("DIAGNÓSTICO CONCLUÍDO")
    print("=" * 60)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

