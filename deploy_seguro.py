#!/usr/bin/env python3
"""
Script para fazer deploy seguro - verifica tudo antes de enviar
"""

import os
import subprocess
import sys
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

def verificar_pre_requisitos():
    """Verifica se tudo está pronto para deploy"""
    print("Verificando pre-requisitos...")
    
    checks = {
        'git_repo': False,
        'rendizy_dir': False,
        'automations_module': False,
        'app_imports': False,
        'build_success': False
    }
    
    # 1. É repositório Git?
    success, _, _ = run_command("git rev-parse --git-dir")
    checks['git_repo'] = success
    if not success:
        print("  ✗ Nao e um repositorio Git")
        return False, checks
    
    print("  ✓ Repositorio Git OK")
    
    # 2. Pasta RendizyPrincipal existe?
    rendizy_dir = Path("RendizyPrincipal")
    checks['rendizy_dir'] = rendizy_dir.exists()
    if not checks['rendizy_dir']:
        print("  ✗ Pasta RendizyPrincipal nao encontrada")
        return False, checks
    
    print("  ✓ Pasta RendizyPrincipal encontrada")
    
    # 3. Módulo de automações existe?
    automations_module = rendizy_dir / "components" / "automations" / "AutomationsModule.tsx"
    checks['automations_module'] = automations_module.exists()
    if not checks['automations_module']:
        print("  ✗ AutomationsModule.tsx nao encontrado")
        return False, checks
    
    print("  ✓ AutomationsModule.tsx encontrado")
    
    # 4. App.tsx importa AutomationsModule?
    app_tsx = rendizy_dir / "App.tsx"
    if app_tsx.exists():
        content = app_tsx.read_text(encoding='utf-8')
        checks['app_imports'] = 'AutomationsModule' in content and '/automacoes' in content
        if checks['app_imports']:
            print("  ✓ App.tsx importa AutomationsModule")
        else:
            print("  ✗ App.tsx nao importa AutomationsModule corretamente")
            return False, checks
    
    # 5. Build funciona?
    print("\nTestando build local...")
    success, stdout, stderr = run_command("npm run build", cwd=str(rendizy_dir))
    checks['build_success'] = success
    if success:
        print("  ✓ Build local OK")
    else:
        print("  ✗ Build local falhou!")
        print(f"  Erro: {stderr[:200]}")
        return False, checks
    
    return True, checks

def preparar_deploy():
    """Prepara arquivos para deploy"""
    print("\nPreparando arquivos para deploy...")
    
    # Adicionar arquivos importantes
    files_to_add = [
        "RendizyPrincipal/components/automations/",
        "RendizyPrincipal/App.tsx",
        "RendizyPrincipal/utils/api.ts",
        "RendizyPrincipal/package.json",
        "RendizyPrincipal/vite.config.ts"
    ]
    
    for file_path in files_to_add:
        if Path(file_path).exists() or Path(file_path).is_dir():
            success, stdout, stderr = run_command(f'git add "{file_path}"')
            if success:
                print(f"  ✓ Adicionado: {file_path}")
            else:
                print(f"  ✗ Erro ao adicionar {file_path}: {stderr}")
    
    # Verificar status
    success, stdout, stderr = run_command("git status --porcelain")
    if stdout.strip():
        print("\nArquivos prontos para commit:")
        print(stdout)
        return True
    else:
        print("\nNenhum arquivo para adicionar (tudo ja esta commitado)")
        return False

def fazer_deploy(force=False):
    """Faz o deploy"""
    print("\n" + "=" * 70)
    print("DEPLOY SEGURO - RENDIZY")
    print("=" * 70)
    print(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # 1. Verificar pré-requisitos
    print("[1/4] Verificando pre-requisitos...")
    ok, checks = verificar_pre_requisitos()
    if not ok:
        print("\nERRO: Pre-requisitos nao atendidos!")
        print("\nChecks:")
        for check, status in checks.items():
            print(f"  {check}: {'OK' if status else 'FALHOU'}")
        return False
    
    # 2. Preparar arquivos
    print("\n[2/4] Preparando arquivos...")
    has_changes = preparar_deploy()
    
    if has_changes:
        # 3. Fazer commit
        print("\n[3/4] Fazendo commit...")
        commit_message = f"feat: Deploy modulo automacoes - {datetime.now().strftime('%Y%m%d-%H%M%S')}"
        success, stdout, stderr = run_command(f'git commit -m "{commit_message}"')
        if success:
            print(f"  ✓ Commit criado: {commit_message}")
        else:
            print(f"  ✗ Erro ao fazer commit: {stderr}")
            return False
    else:
        print("\n[3/4] Nenhum commit necessario")
    
    # 4. Fazer push
    print("\n[4/4] Fazendo push para GitHub...")
    
    # Perguntar confirmação
    if not force:
        resposta = input("\nDeseja fazer push agora? (s/N): ").strip().lower()
        if resposta != 's':
            print("Push cancelado pelo usuario.")
            return False
    
    push_cmd = "git push"
    if force:
        push_cmd = "git push --force"
        print("  AVISO: Usando --force (sobrescreve historico remoto)")
    
    success, stdout, stderr = run_command(push_cmd)
    if success:
        print("  ✓ Push realizado com sucesso!")
        print("\n" + "=" * 70)
        print("DEPLOY CONCLUIDO!")
        print("=" * 70)
        print("\nProximos passos:")
        print("1. Verifique o dashboard do Vercel")
        print("2. Aguarde o build automatico")
        print("3. Teste a aplicacao em producao")
        return True
    else:
        print(f"  ✗ Erro ao fazer push: {stderr}")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Deploy seguro do Rendizy')
    parser.add_argument('--force', action='store_true', help='Usar push --force')
    parser.add_argument('--check-only', action='store_true', help='Apenas verificar, nao fazer deploy')
    
    args = parser.parse_args()
    
    try:
        if args.check_only:
            ok, checks = verificar_pre_requisitos()
            sys.exit(0 if ok else 1)
        else:
            success = fazer_deploy(force=args.force)
            sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nOperacao cancelada pelo usuario.")
        sys.exit(1)
    except Exception as e:
        print(f"\nERRO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)










