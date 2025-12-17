#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script ultra-simples para sincronizar Git
"""

import subprocess
import sys
import os

# Encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Desabilitar pager
env = os.environ.copy()
env['GIT_PAGER'] = ''
env['PAGER'] = ''

def git(cmd):
    """Executa comando git"""
    full_cmd = f'git --no-pager {cmd}'
    print(f"> {full_cmd}")
    try:
        result = subprocess.run(
            full_cmd,
            shell=True,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
            timeout=120,
            env=env
        )
        if result.stdout:
            print(result.stdout)
        if result.stderr and result.returncode != 0:
            print(f"ERRO: {result.stderr}")
        return result.returncode == 0
    except Exception as e:
        print(f"EXCEÇÃO: {e}")
        return False

print("=" * 60)
print("SINCRONIZAÇÃO GIT")
print("=" * 60)
print()

# 1. Add
print("1. Adicionando mudanças...")
git("add -A")
print()

# 2. Commit
print("2. Commit...")
if not git("commit -m \"Update local\""):
    print("(Nada para commitar ou já commitado)")
print()

# 3. Fetch
print("3. Atualizando remoto...")
if not git("fetch origin"):
    print("ERRO no fetch!")
    sys.exit(1)
print()

# 4. Merge
print("4. Fazendo merge...")
if not git("merge origin/main --no-edit"):
    print("\nCONFLITOS! Resolva manualmente e depois:")
    print("  git add .")
    print("  git commit")
    print("  git push origin main")
    sys.exit(1)
print()

# 5. Push
print("5. Fazendo push...")
if not git("push origin main"):
    print("ERRO no push!")
    sys.exit(1)
print()

print("=" * 60)
print("SUCESSO!")
print("=" * 60)

