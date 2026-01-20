#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para sincronizar repositório local com GitHub de forma segura
Preserva mudanças locais e resolve divergências
"""

import subprocess
import sys
from pathlib import Path
from datetime import datetime

# Configurar encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_command(cmd, cwd=None, check=False):
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
        if check and result.returncode != 0:
            print(f"ERRO: {result.stderr}")
            return False, result.stdout, result.stderr
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    project_dir = Path(__file__).parent.absolute()
    
    print("=" * 70)
    print("SINCRONIZAÇÃO SEGURA COM GITHUB")
    print("=" * 70)
    print(f"\nDiretório: {project_dir}\n")
    
    # PASSO 1: Verificar status atual
    print("1. Verificando status atual...")
    success, status, _ = run_command("git status", cwd=project_dir)
    if success:
        print(status)
    print()
    
    # PASSO 2: Salvar mudanças locais não commitadas
    print("2. Salvando mudanças locais não commitadas...")
    success, output, _ = run_command("git status --porcelain", cwd=project_dir)
    if success and output.strip():
        print("Há arquivos modificados. Adicionando ao staging...")
        success2, output2, error2 = run_command("git add -A", cwd=project_dir)
        if success2:
            print("OK: Arquivos adicionados")
            
            # Fazer commit das mudanças
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            mensagem = f"Update local: {timestamp}"
            print(f"Fazendo commit: {mensagem}")
            success3, output3, error3 = run_command(
                f'git commit -m "{mensagem}"',
                cwd=project_dir
            )
            if success3:
                print("OK: Commit realizado")
            else:
                print(f"AVISO: {error3}")
        else:
            print(f"AVISO: {error2}")
    else:
        print("OK: Nenhuma mudança pendente")
    print()
    
    # PASSO 3: Atualizar referências remotas
    print("3. Atualizando referências remotas...")
    success, output, error = run_command("git fetch origin", cwd=project_dir)
    if success:
        print("OK: Referências atualizadas")
    else:
        print(f"ERRO ao fazer fetch: {error}")
        return 1
    print()
    
    # PASSO 4: Verificar divergências
    print("4. Verificando divergências...")
    success, output, _ = run_command("git log --oneline --graph --all -10", cwd=project_dir)
    if success:
        print("Últimos commits:")
        print(output)
    print()
    
    # PASSO 5: Verificar commits locais vs remotos
    success, local_commits, _ = run_command("git log origin/main..HEAD --oneline", cwd=project_dir)
    success2, remote_commits, _ = run_command("git log HEAD..origin/main --oneline", cwd=project_dir)
    
    local_count = len([l for l in local_commits.strip().split('\n') if l.strip()]) if local_commits.strip() else 0
    remote_count = len([l for l in remote_commits.strip().split('\n') if l.strip()]) if remote_commits.strip() else 0
    
    print(f"Commits locais não enviados: {local_count}")
    print(f"Commits remotos não baixados: {remote_count}")
    print()
    
    # PASSO 6: Estratégia de sincronização
    if remote_count > 0:
        print("5. Há commits remotos. Fazendo pull com rebase para preservar commits locais...")
        print("   (Isso vai aplicar seus commits locais sobre os commits remotos)")
        print()
        
        resposta = input("Deseja continuar? (s/n): ").strip().lower()
        if resposta != 's':
            print("Operação cancelada.")
            return 0
        
        success, output, error = run_command(
            "git pull --rebase origin main",
            cwd=project_dir
        )
        
        if success:
            print("OK: Pull com rebase realizado com sucesso!")
            print(output)
        else:
            print(f"ERRO ao fazer pull com rebase: {error}")
            print("\nPode haver conflitos. Verifique manualmente com:")
            print("  git status")
            print("  git rebase --continue  (após resolver conflitos)")
            return 1
    else:
        print("5. Nenhum commit remoto novo. Pronto para push.")
    
    print()
    
    # PASSO 7: Fazer push
    if local_count > 0 or not remote_count:
        print("6. Fazendo push para GitHub...")
        success, output, error = run_command(
            "git push -u origin main",
            cwd=project_dir
        )
        
        if success:
            print("=" * 70)
            print("SUCESSO! SINCRONIZAÇÃO COMPLETA!")
            print("=" * 70)
            if output.strip():
                print("\nSaída do Git:")
                print(output)
        else:
            print("=" * 70)
            print("ERRO AO FAZER PUSH")
            print("=" * 70)
            print(f"\nErro: {error}")
            return 1
    
    # PASSO 8: Status final
    print("\n" + "=" * 70)
    print("STATUS FINAL")
    print("=" * 70)
    success, output, _ = run_command("git status", cwd=project_dir)
    if success:
        print(output)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

