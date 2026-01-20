#!/usr/bin/env python3
"""
Compara código local com o que está no GitHub
Garante que sabemos exatamente o que será enviado
"""

import os
import subprocess
from pathlib import Path
from datetime import datetime

def run_command(cmd, cwd=None):
    """Executa comando e retorna resultado"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def get_local_files(base_path):
    """Obtém lista de arquivos locais importantes"""
    base = Path(base_path)
    rendizy_dir = base / "RendizyPrincipal"
    
    if not rendizy_dir.exists():
        return []
    
    important_files = []
    
    # Arquivos principais
    main_files = [
        "App.tsx",
        "package.json",
        "vite.config.ts",
        "index.html"
    ]
    
    for f in main_files:
        path = rendizy_dir / f
        if path.exists():
            important_files.append(f"RendizyPrincipal/{f}")
    
    # Módulo de automações
    automations_dir = rendizy_dir / "components" / "automations"
    if automations_dir.exists():
        for file in automations_dir.rglob("*.tsx"):
            rel_path = file.relative_to(rendizy_dir)
            important_files.append(f"RendizyPrincipal/{rel_path.as_posix()}")
    
    return important_files

def get_git_files():
    """Obtém arquivos que estão no Git"""
    success, stdout, stderr = run_command("git ls-files")
    if not success:
        return []
    
    return [f.strip() for f in stdout.strip().split('\n') if f.strip()]

def get_remote_files():
    """Tenta obter arquivos do remoto (se possível)"""
    # Primeiro verificar se há remoto
    success, stdout, _ = run_command("git remote get-url origin")
    if not success:
        return None, "Nenhum remote 'origin' configurado"
    
    # Tentar fazer fetch (sem merge)
    success, _, stderr = run_command("git fetch origin --dry-run 2>&1")
    
    # Obter arquivos da branch remota
    success, stdout, stderr = run_command("git ls-tree -r --name-only origin/main 2>&1")
    if success:
        return [f.strip() for f in stdout.strip().split('\n') if f.strip()], None
    else:
        # Tentar master
        success, stdout, stderr = run_command("git ls-tree -r --name-only origin/master 2>&1")
        if success:
            return [f.strip() for f in stdout.strip().split('\n') if f.strip()], None
        else:
            return None, stderr

def compare_files():
    """Compara arquivos locais vs Git vs Remoto"""
    print("=" * 70)
    print("COMPARACAO: LOCAL vs GIT vs GITHUB")
    print("=" * 70)
    print(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    base_dir = Path.cwd()
    
    # 1. Arquivos locais importantes
    print("1. Coletando arquivos locais importantes...")
    local_files = get_local_files(base_dir)
    print(f"   Encontrados: {len(local_files)} arquivos\n")
    
    # 2. Arquivos no Git
    print("2. Coletando arquivos rastreados pelo Git...")
    git_files = get_git_files()
    print(f"   Encontrados: {len(git_files)} arquivos\n")
    
    # 3. Arquivos no remoto
    print("3. Tentando obter arquivos do GitHub...")
    remote_files, error = get_remote_files()
    if remote_files:
        print(f"   Encontrados: {len(remote_files)} arquivos\n")
    else:
        print(f"   AVISO: Nao foi possivel obter arquivos do remoto: {error}\n")
        remote_files = []
    
    # 4. Comparações
    print("=" * 70)
    print("COMPARACOES:")
    print("=" * 70)
    
    # Local vs Git
    local_not_in_git = [f for f in local_files if f not in git_files]
    if local_not_in_git:
        print(f"\nARQUIVOS LOCAIS QUE NAO ESTAO NO GIT ({len(local_not_in_git)}):")
        for f in local_not_in_git[:20]:  # Mostrar até 20
            print(f"  - {f}")
        if len(local_not_in_git) > 20:
            print(f"  ... e mais {len(local_not_in_git) - 20} arquivos")
    else:
        print("\nOK: Todos os arquivos locais importantes estao no Git")
    
    # Git vs Remoto
    if remote_files:
        git_not_in_remote = [f for f in git_files if f not in remote_files]
        remote_not_in_git = [f for f in remote_files if f not in git_files]
        
        if git_not_in_remote:
            print(f"\nARQUIVOS NO GIT QUE NAO ESTAO NO GITHUB ({len(git_not_in_remote)}):")
            important = [f for f in git_not_in_remote if 'RendizyPrincipal' in f or 'automations' in f.lower()]
            for f in important[:20]:
                print(f"  - {f}")
            if len(important) > 20:
                print(f"  ... e mais {len(important) - 20} arquivos")
        
        if remote_not_in_git:
            print(f"\nARQUIVOS NO GITHUB QUE NAO ESTAO NO GIT LOCAL ({len(remote_not_in_git)}):")
            for f in remote_not_in_git[:20]:
                print(f"  - {f}")
            if len(remote_not_in_git) > 20:
                print(f"  ... e mais {len(remote_not_in_git) - 20} arquivos")
    
    # Foco em automações
    print("\n" + "=" * 70)
    print("FOCO: MODULO DE AUTOMACOES")
    print("=" * 70)
    
    automations_local = [f for f in local_files if 'automations' in f.lower()]
    automations_git = [f for f in git_files if 'automations' in f.lower()]
    automations_remote = [f for f in (remote_files or []) if 'automations' in f.lower()]
    
    print(f"\nArquivos de automacoes:")
    print(f"  Local: {len(automations_local)}")
    print(f"  Git: {len(automations_git)}")
    print(f"  GitHub: {len(automations_remote)}")
    
    if automations_local:
        print("\n  Arquivos locais:")
        for f in automations_local:
            in_git = "✓" if f in automations_git else "✗"
            in_remote = "✓" if f in automations_remote else "✗"
            print(f"    {in_git} Git | {in_remote} GitHub | {f}")
    
    # Resumo
    print("\n" + "=" * 70)
    print("RESUMO:")
    print("=" * 70)
    
    if local_not_in_git:
        print(f"\n⚠️  {len(local_not_in_git)} arquivos locais precisam ser adicionados ao Git")
        print("   Execute: git add RendizyPrincipal/")
    
    if remote_files and git_not_in_remote:
        print(f"\n⚠️  {len(git_not_in_remote)} arquivos no Git precisam ser enviados ao GitHub")
        print("   Execute: git push")
    
    if not local_not_in_git and (not remote_files or not git_not_in_remote):
        print("\n✅ Tudo sincronizado!")
    
    print()

if __name__ == "__main__":
    try:
        compare_files()
    except KeyboardInterrupt:
        print("\n\nOperacao cancelada pelo usuario.")
    except Exception as e:
        print(f"\nERRO: {e}")
        import traceback
        traceback.print_exc()










