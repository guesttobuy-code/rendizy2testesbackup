#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para diagnosticar a divergência entre local e remoto
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
        # Desabilitar pager do Git
        env = dict(os.environ) if 'os' in dir() else {}
        env['GIT_PAGER'] = 'cat'
        env['PAGER'] = 'cat'
        
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
            timeout=30,
            env=env
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Timeout"
    except Exception as e:
        return False, "", str(e)

def main():
    project_dir = Path(__file__).parent.absolute()
    
    print("=" * 70)
    print("DIAGNÓSTICO DE DIVERGÊNCIA GIT")
    print("=" * 70)
    print()
    
    # 1. Status básico
    print("1. STATUS BÁSICO:")
    print("-" * 70)
    success, output, _ = run_command("git status --porcelain", cwd=project_dir)
    if success:
        if output.strip():
            print("Arquivos modificados/não rastreados:")
            print(output)
        else:
            print("Nenhuma mudança pendente")
    print()
    
    # 2. Commits locais não enviados
    print("2. COMMITS LOCAIS NÃO ENVIADOS:")
    print("-" * 70)
    success, output, _ = run_command("git log --oneline origin/main..HEAD", cwd=project_dir)
    if success:
        commits = [l for l in output.strip().split('\n') if l.strip()]
        print(f"Total: {len(commits)} commits")
        for commit in commits[:15]:
            print(f"  {commit}")
        if len(commits) > 15:
            print(f"  ... e mais {len(commits) - 15} commits")
    print()
    
    # 3. Commits remotos não baixados (primeiros 20)
    print("3. COMMITS REMOTOS NÃO BAIXADOS (primeiros 20):")
    print("-" * 70)
    success, output, _ = run_command("git log --oneline HEAD..origin/main", cwd=project_dir)
    if success:
        commits = [l for l in output.strip().split('\n') if l.strip()]
        print(f"Total: {len(commits)} commits")
        for commit in commits[:20]:
            print(f"  {commit}")
        if len(commits) > 20:
            print(f"  ... e mais {len(commits) - 20} commits")
    print()
    
    # 4. Último commit local
    print("4. ÚLTIMO COMMIT LOCAL:")
    print("-" * 70)
    success, output, _ = run_command("git log -1 --oneline HEAD", cwd=project_dir)
    if success:
        print(output.strip())
    print()
    
    # 5. Último commit remoto
    print("5. ÚLTIMO COMMIT REMOTO:")
    print("-" * 70)
    success, output, _ = run_command("git log -1 --oneline origin/main", cwd=project_dir)
    if success:
        print(output.strip())
    print()
    
    # 6. Ancestor comum
    print("6. ANCESTOR COMUM (último commit compartilhado):")
    print("-" * 70)
    success, output, _ = run_command("git merge-base HEAD origin/main", cwd=project_dir)
    if success:
        commit_hash = output.strip()
        success2, output2, _ = run_command(f"git log -1 --oneline {commit_hash}", cwd=project_dir)
        if success2:
            print(f"{commit_hash[:8]}: {output2.strip()}")
        else:
            print(commit_hash)
    print()
    
    # 7. Arquivos diferentes
    print("7. ARQUIVOS DIFERENTES ENTRE LOCAL E REMOTO:")
    print("-" * 70)
    success, output, _ = run_command("git diff --name-status HEAD origin/main", cwd=project_dir)
    if success:
        files = [l for l in output.strip().split('\n') if l.strip()]
        print(f"Total: {len(files)} arquivos diferentes")
        for file in files[:30]:
            print(f"  {file}")
        if len(files) > 30:
            print(f"  ... e mais {len(files) - 30} arquivos")
    print()
    
    # 8. Branches
    print("8. BRANCHES:")
    print("-" * 70)
    success, output, _ = run_command("git branch -a", cwd=project_dir)
    if success:
        print(output)
    print()
    
    print("=" * 70)
    print("DIAGNÓSTICO COMPLETO")
    print("=" * 70)

if __name__ == "__main__":
    main()

