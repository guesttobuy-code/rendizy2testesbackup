#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script completo para fazer push seguro para o GitHub
Usa tokens do documento "Ligando os motores.md"
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
    print("PUSH COMPLETO PARA GITHUB")
    print("=" * 70)
    print(f"\nDiretorio: {project_dir}\n")
    
    # PASSO 1: Verificar se é repositório Git
    print("1. Verificando repositorio Git...")
    success, output, error = run_command("git rev-parse --git-dir", cwd=project_dir)
    if not success:
        print("ERRO: Nao e um repositorio Git!")
        return 1
    print("OK: Repositorio Git valido\n")
    
    # PASSO 2: Verificar remote
    print("2. Verificando remote configurado...")
    success, remotes, _ = run_command("git remote -v", cwd=project_dir)
    if not success or not remotes.strip():
        print("ERRO: Nenhum remote configurado!")
        print("Execute primeiro: python configurar_remote_github.py")
        return 1
    
    print("Remotes configurados:")
    for line in remotes.strip().split('\n'):
        if line.strip():
            print(f"  {line}")
    print()
    
    # PASSO 3: Verificar status
    print("3. Verificando status do repositorio...")
    success, status, _ = run_command("git status --porcelain", cwd=project_dir)
    if success and status.strip():
        lines = [l for l in status.strip().split('\n') if l.strip()]
        print(f"Arquivos modificados/nao rastreados: {len(lines)}")
        
        # Mostrar alguns exemplos
        for line in lines[:20]:
            print(f"  {line}")
        if len(lines) > 20:
            print(f"  ... e mais {len(lines) - 20} arquivos")
        
        print("\nAdicionando todos os arquivos ao staging...")
        success2, output2, error2 = run_command("git add -A", cwd=project_dir)
        if success2:
            print("OK: Arquivos adicionados ao staging")
        else:
            print(f"ERRO ao adicionar arquivos: {error2}")
            return 1
    else:
        print("OK: Nenhuma mudanca pendente\n")
    
    # PASSO 4: Verificar se há algo para commitar
    print("\n4. Verificando se ha algo para commitar...")
    success, output, _ = run_command("git diff --cached --quiet", cwd=project_dir)
    if success:
        print("Nenhuma mudanca para commitar (ja esta tudo commitado)")
    else:
        # Há mudanças para commitar
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        mensagem = f"Update completo: {timestamp}"
        
        print(f"Fazendo commit: {mensagem}")
        success2, output2, error2 = run_command(
            f'git commit -m "{mensagem}"',
            cwd=project_dir
        )
        if success2:
            print("OK: Commit realizado com sucesso!")
            if output2.strip():
                print(output2)
        else:
            print(f"ERRO ao fazer commit: {error2}")
            return 1
    
    # PASSO 5: Verificar branch atual
    print("\n5. Verificando branch atual...")
    success, branch, _ = run_command("git branch --show-current", cwd=project_dir)
    if success:
        branch_name = branch.strip()
        print(f"Branch atual: {branch_name}")
    else:
        branch_name = "master"
        print(f"Usando branch padrao: {branch_name}")
    
    # PASSO 6: Atualizar referências remotas
    print("\n6. Atualizando referencias remotas...")
    success, output, error = run_command("git fetch origin", cwd=project_dir)
    if success:
        print("OK: Referencias atualizadas")
    else:
        print(f"AVISO ao fazer fetch: {error}")
    
    # PASSO 7: Verificar commits locais não enviados
    print("\n7. Verificando commits locais nao enviados...")
    success, output, _ = run_command(f"git log origin/{branch_name}..HEAD --oneline", cwd=project_dir)
    if success and output.strip():
        commits = output.strip().split('\n')
        print(f"Ha {len(commits)} commit(s) local(is) para enviar:")
        for commit in commits[:5]:
            print(f"  {commit}")
        if len(commits) > 5:
            print(f"  ... e mais {len(commits) - 5} commit(s)")
    else:
        print("Nenhum commit local para enviar")
        print("(Repositorio local ja esta sincronizado com remoto)")
        return 0
    
    # PASSO 8: Verificar se há conflitos potenciais
    print("\n8. Verificando conflitos potenciais...")
    success, output, _ = run_command(f"git log HEAD..origin/{branch_name} --oneline", cwd=project_dir)
    if success and output.strip():
        commits_remotos = output.strip().split('\n')
        print(f"ATENCAO: Ha {len(commits_remotos)} commit(s) remoto(s) nao baixado(s):")
        for commit in commits_remotos[:3]:
            print(f"  {commit}")
        print("\nFazendo pull antes do push...")
        success2, output2, error2 = run_command(
            f"git pull origin {branch_name} --no-edit",
            cwd=project_dir
        )
        if success2:
            print("OK: Pull realizado com sucesso!")
        else:
            print(f"ERRO ao fazer pull: {error2}")
            print("Voce pode ter conflitos que precisam ser resolvidos manualmente")
            return 1
    else:
        print("OK: Nenhum conflito potencial detectado")
    
    # PASSO 9: Fazer push
    print("\n" + "=" * 70)
    print("9. FAZENDO PUSH PARA O GITHUB...")
    print("=" * 70)
    print("Isso pode levar alguns segundos...\n")
    
    success, output, error = run_command(
        f"git push -u origin {branch_name}",
        cwd=project_dir
    )
    
    if success:
        print("=" * 70)
        print("SUCESSO! PUSH REALIZADO COM SUCESSO!")
        print("=" * 70)
        if output.strip():
            print("\nSaida do Git:")
            print(output)
        
        # Verificar status final
        print("\n" + "=" * 70)
        print("VERIFICACAO FINAL")
        print("=" * 70)
        success2, output2, _ = run_command("git status", cwd=project_dir)
        if success2:
            print(output2)
        
        return 0
    else:
        print("=" * 70)
        print("ERRO AO FAZER PUSH")
        print("=" * 70)
        print(f"\nErro: {error}")
        
        # Tentar diagnosticar o problema
        if "authentication" in error.lower() or "permission" in error.lower():
            print("\nPROBLEMA DE AUTENTICACAO DETECTADO")
            print("O token no remote pode estar expirado ou invalido")
            print("Verifique o token em: TOKENS_E_ACESSOS_COMPLETO.md")
        elif "rejected" in error.lower():
            print("\nPUSH REJEITADO")
            print("Pode ser necessario fazer pull primeiro ou usar force push")
            print("ATENCAO: Force push pode sobrescrever commits remotos!")
        elif "not found" in error.lower():
            print("\nREPOSITORIO NAO ENCONTRADO")
            print("Verifique se o repositorio existe e se voce tem permissao")
        
        return 1

if __name__ == "__main__":
    sys.exit(main())


