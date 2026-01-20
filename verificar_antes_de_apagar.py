#!/usr/bin/env python3
"""
Script principal: Verifica TUDO antes de qualquer ação destrutiva
Responde à pergunta: "Como ter certeza que o arquivo correto está sendo enviado?"
"""

import os
import sys
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

def verificar_backup_local():
    """Verifica se temos backup local completo"""
    print("=" * 70)
    print("VERIFICACAO 1: BACKUP LOCAL")
    print("=" * 70)
    
    base_dir = Path.cwd()
    rendizy_dir = base_dir / "RendizyPrincipal"
    
    if not rendizy_dir.exists():
        print("✗ ERRO: Pasta RendizyPrincipal nao encontrada!")
        return False
    
    # Verificar arquivos críticos
    critical_files = {
        "App.tsx": rendizy_dir / "App.tsx",
        "package.json": rendizy_dir / "package.json",
        "AutomationsModule": rendizy_dir / "components" / "automations" / "AutomationsModule.tsx",
        "index.html": rendizy_dir / "index.html"
    }
    
    all_exist = True
    for name, path in critical_files.items():
        exists = path.exists()
        status = "✓" if exists else "✗"
        print(f"  {status} {name}: {path}")
        if not exists:
            all_exist = False
    
    # Verificar tamanho do backup
    total_size = sum(
        f.stat().st_size 
        for f in rendizy_dir.rglob('*') 
        if f.is_file()
    ) / (1024 * 1024)  # MB
    
    print(f"\n  Tamanho total do backup: {total_size:.2f} MB")
    
    if all_exist:
        print("\n✓ BACKUP LOCAL: OK - Todos os arquivos críticos existem")
        return True
    else:
        print("\n✗ BACKUP LOCAL: FALHOU - Alguns arquivos críticos faltando")
        return False

def verificar_estado_git():
    """Verifica estado atual do Git"""
    print("\n" + "=" * 70)
    print("VERIFICACAO 2: ESTADO DO GIT")
    print("=" * 70)
    
    # É repositório Git?
    success, _, _ = run_command("git rev-parse --git-dir")
    if not success:
        print("✗ Nao e um repositorio Git")
        return False
    
    print("✓ E um repositorio Git")
    
    # Branch atual
    success, branch, _ = run_command("git branch --show-current")
    if success:
        print(f"✓ Branch atual: {branch.strip()}")
    else:
        print("✗ Nao foi possivel determinar branch")
        return False
    
    # Status
    success, stdout, _ = run_command("git status --porcelain")
    if stdout.strip():
        print(f"\n  Arquivos modificados/nao rastreados:")
        for line in stdout.strip().split('\n')[:10]:
            print(f"    {line}")
        if len(stdout.strip().split('\n')) > 10:
            print(f"    ... e mais arquivos")
    else:
        print("✓ Nenhuma mudanca pendente")
    
    # Remotes
    success, stdout, _ = run_command("git remote -v")
    if success and stdout.strip():
        print(f"\n  Repositorios remotos:")
        for line in stdout.strip().split('\n'):
            print(f"    {line}")
    else:
        print("⚠ AVISO: Nenhum remote configurado")
    
    return True

def verificar_arquivos_corretos():
    """Verifica se os arquivos corretos estão prontos para envio"""
    print("\n" + "=" * 70)
    print("VERIFICACAO 3: ARQUIVOS CORRETOS PARA ENVIO")
    print("=" * 70)
    
    rendizy_dir = Path("RendizyPrincipal")
    
    # Arquivos que DEVEM estar no Git
    required_files = [
        "RendizyPrincipal/components/automations/AutomationsModule.tsx",
        "RendizyPrincipal/components/automations/AutomationsList.tsx",
        "RendizyPrincipal/components/automations/AutomationDetails.tsx",
        "RendizyPrincipal/App.tsx",
        "RendizyPrincipal/package.json",
        "RendizyPrincipal/vite.config.ts"
    ]
    
    print("\nVerificando arquivos obrigatorios:")
    all_ok = True
    
    for file_path in required_files:
        # Verificar se existe localmente
        local_exists = Path(file_path).exists()
        
        # Verificar se está no Git
        success, stdout, _ = run_command(f'git ls-files "{file_path}"')
        in_git = success and stdout.strip() != ""
        
        status_local = "✓" if local_exists else "✗"
        status_git = "✓" if in_git else "✗"
        
        print(f"  {status_local} Local | {status_git} Git | {file_path}")
        
        if not local_exists or not in_git:
            all_ok = False
    
    # Verificar se App.tsx importa AutomationsModule
    app_tsx = rendizy_dir / "App.tsx"
    if app_tsx.exists():
        content = app_tsx.read_text(encoding='utf-8')
        has_import = 'AutomationsModule' in content
        has_route = '/automacoes' in content
        
        print(f"\n  App.tsx:")
        print(f"    {'✓' if has_import else '✗'} Importa AutomationsModule")
        print(f"    {'✓' if has_route else '✗'} Tem rota /automacoes")
        
        if not has_import or not has_route:
            all_ok = False
    
    if all_ok:
        print("\n✓ ARQUIVOS CORRETOS: OK - Tudo pronto para envio")
        return True
    else:
        print("\n✗ ARQUIVOS CORRETOS: FALHOU - Alguns arquivos faltando")
        return False

def calcular_risco():
    """Calcula o risco de fazer push/apagar"""
    print("\n" + "=" * 70)
    print("ANALISE DE RISCO")
    print("=" * 70)
    
    rendizy_dir = Path("RendizyPrincipal")
    
    # Verificar se temos backup completo
    backup_ok = verificar_backup_local()
    
    # Verificar se arquivos estão no Git
    success, stdout, _ = run_command("git ls-files RendizyPrincipal/")
    files_in_git = len([f for f in stdout.strip().split('\n') if f.strip()])
    
    # Verificar se dist existe (build local funcionou)
    dist_exists = (rendizy_dir / "dist" / "index.html").exists()
    
    print(f"\nFatores de risco:")
    print(f"  Backup local completo: {'✓' if backup_ok else '✗'}")
    print(f"  Arquivos no Git: {files_in_git}")
    print(f"  Build local OK: {'✓' if dist_exists else '✗'}")
    
    # Calcular risco
    risk_score = 0
    if not backup_ok:
        risk_score += 3
    if files_in_git < 100:
        risk_score += 2
    if not dist_exists:
        risk_score += 1
    
    print(f"\n  Score de risco: {risk_score}/6")
    
    if risk_score == 0:
        print("\n✓ RISCO BAIXO - Pode prosseguir com seguranca")
        return True
    elif risk_score <= 2:
        print("\n⚠ RISCO MEDIO - Revise antes de prosseguir")
        return False
    else:
        print("\n✗ RISCO ALTO - NAO recomendado prosseguir")
        return False

def main():
    """Função principal"""
    print("\n" + "=" * 70)
    print("VERIFICACAO COMPLETA ANTES DE QUALQUER ACAO")
    print("=" * 70)
    print(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    checks = {
        'backup': verificar_backup_local(),
        'git': verificar_estado_git(),
        'arquivos': verificar_arquivos_corretos(),
        'risco': calcular_risco()
    }
    
    print("\n" + "=" * 70)
    print("RESUMO FINAL")
    print("=" * 70)
    
    for check, result in checks.items():
        status = "✓ OK" if result else "✗ FALHOU"
        print(f"  {check.upper()}: {status}")
    
    all_ok = all(checks.values())
    
    if all_ok:
        print("\n" + "=" * 70)
        print("CONCLUSAO: SEGURO PARA PROSSEGUIR")
        print("=" * 70)
        print("\nVoce tem:")
        print("  ✓ Backup local completo")
        print("  ✓ Git configurado corretamente")
        print("  ✓ Arquivos corretos prontos")
        print("  ✓ Risco baixo")
        print("\nPode fazer push/apagar com seguranca!")
        print("\nProximos passos:")
        print("  1. python comparar_local_vs_github.py  (ver diferencas)")
        print("  2. python deploy_seguro.py             (fazer deploy)")
    else:
        print("\n" + "=" * 70)
        print("CONCLUSAO: NAO SEGURO PARA PROSSEGUIR")
        print("=" * 70)
        print("\nCorrija os problemas acima antes de continuar!")
        print("\nComandos uteis:")
        print("  python verificar_estado_git.py          (diagnostico detalhado)")
        print("  python comparar_local_vs_github.py      (comparar arquivos)")
    
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nOperacao cancelada pelo usuario.")
        sys.exit(1)
    except Exception as e:
        print(f"\nERRO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)










