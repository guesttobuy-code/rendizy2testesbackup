#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script simples para resolver divergência Git
Estratégia: Merge simples (não rebase) para preservar histórico
"""

import subprocess
import sys
import os
from pathlib import Path

# Configurar encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Desabilitar pager do Git completamente
os.environ['GIT_PAGER'] = ''
os.environ['PAGER'] = ''
os.environ['GIT_CONFIG_NOSYSTEM'] = '1'

def run(cmd, cwd=None):
    """Executa comando simples"""
    try:
        # Adicionar --no-pager aos comandos git
        if cmd.startswith('git '):
            cmd = cmd.replace('git ', 'git --no-pager ', 1)
        
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
            timeout=60,
            env=os.environ
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    project_dir = Path(__file__).parent.absolute()
    
    print("=" * 70)
    print("RESOLVENDO DIVERGÊNCIA GIT")
    print("=" * 70)
    print()
    
    # 1. Salvar mudanças locais
    print("1. Salvando mudanças locais...")
    ok, out, err = run("git add -A", cwd=project_dir)
    if ok:
        ok2, out2, err2 = run('git commit -m "Salvando mudanças locais antes de merge"', cwd=project_dir)
        if ok2:
            print("   OK: Mudanças salvas")
        else:
            if "nothing to commit" in err2.lower() or "nothing to commit" in out2.lower():
                print("   OK: Nada para commitar")
            else:
                print(f"   AVISO: {err2}")
    print()
    
    # 2. Atualizar remoto
    print("2. Atualizando referências remotas...")
    ok, out, err = run("git fetch origin", cwd=project_dir)
    if ok:
        print("   OK: Remoto atualizado")
    else:
        print(f"   ERRO: {err}")
        return 1
    print()
    
    # 3. Fazer merge (não rebase - mais simples)
    print("3. Fazendo merge com origin/main...")
    print("   (Isso vai criar um commit de merge)")
    print()
    
    ok, out, err = run("git merge origin/main --no-edit", cwd=project_dir)
    
    if ok:
        print("   OK: Merge realizado com sucesso!")
        print(out)
    else:
        if "CONFLICT" in err.upper() or "CONFLICT" in out.upper():
            print("   CONFLITOS DETECTADOS!")
            print("   Você precisa resolver os conflitos manualmente.")
            print()
            print("   Arquivos em conflito:")
            ok2, out2, _ = run("git diff --name-only --diff-filter=U", cwd=project_dir)
            if ok2:
                print(out2)
            print()
            print("   Após resolver, execute:")
            print("   git add .")
            print("   git commit")
            return 1
        else:
            print(f"   ERRO: {err}")
            return 1
    print()
    
    # 4. Push
    print("4. Fazendo push para GitHub...")
    ok, out, err = run("git push origin main", cwd=project_dir)
    
    if ok:
        print("=" * 70)
        print("SUCESSO! TUDO SINCRONIZADO!")
        print("=" * 70)
        print(out)
        return 0
    else:
        print("=" * 70)
        print("ERRO NO PUSH")
        print("=" * 70)
        print(f"Erro: {err}")
        return 1

if __name__ == "__main__":
    sys.exit(main())

