#!/usr/bin/env python3
"""
Script para verificar o estado atual do Git e comparar com código local
Garante que sabemos exatamente o que será enviado antes de qualquer ação
"""

import os
import subprocess
import json
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

def get_git_status():
    """Obtém status do Git"""
    success, stdout, stderr = run_command("git status --porcelain")
    if not success:
        return None, stderr
    
    files = {
        'modified': [],
        'added': [],
        'deleted': [],
        'untracked': []
    }
    
    for line in stdout.strip().split('\n'):
        if not line:
            continue
        
        status = line[:2]
        filename = line[3:]
        
        if status.startswith('M'):
            files['modified'].append(filename)
        elif status.startswith('A'):
            files['added'].append(filename)
        elif status.startswith('D'):
            files['deleted'].append(filename)
        elif status.startswith('??'):
            files['untracked'].append(filename)
    
    return files, None

def get_tracked_files():
    """Obtém lista de arquivos rastreados pelo Git"""
    success, stdout, stderr = run_command("git ls-files")
    if not success:
        return [], stderr
    
    return [f.strip() for f in stdout.strip().split('\n') if f.strip()], None

def check_automations_module():
    """Verifica se módulo de automações existe localmente"""
    base_dir = Path.cwd()
    rendizy_dir = base_dir / "RendizyPrincipal"
    
    automations_files = [
        "components/automations/AutomationsModule.tsx",
        "components/automations/AutomationsList.tsx",
        "components/automations/AutomationDetails.tsx",
        "components/automations/AutomationsNaturalLanguageLab.tsx",
        "components/automations/AutomationsChatLab.tsx"
    ]
    
    results = {}
    for file_path in automations_files:
        full_path = rendizy_dir / file_path
        exists = full_path.exists()
        results[file_path] = {
            'exists': exists,
            'path': str(full_path)
        }
        
        if exists:
            # Verificar se está no Git
            git_path = f"RendizyPrincipal/{file_path}"
            success, stdout, _ = run_command(f'git ls-files "{git_path}"')
            results[file_path]['in_git'] = success and stdout.strip() != ""
    
    return results

def check_app_tsx_imports():
    """Verifica se App.tsx importa AutomationsModule"""
    rendizy_dir = Path.cwd() / "RendizyPrincipal"
    app_tsx = rendizy_dir / "App.tsx"
    
    if not app_tsx.exists():
        return None, "App.tsx não encontrado"
    
    content = app_tsx.read_text(encoding='utf-8')
    
    checks = {
        'imports_automations_module': 'AutomationsModule' in content,
        'has_automations_route': '/automacoes/*' in content or '/automacoes' in content,
        'has_protected_route': 'ProtectedRoute' in content and 'AutomationsModule' in content
    }
    
    # Buscar linha específica do import
    import_line = None
    for line in content.split('\n'):
        if 'AutomationsModule' in line and 'import' in line:
            import_line = line.strip()
            break
    
    checks['import_line'] = import_line
    
    return checks, None

def get_remote_info():
    """Obtém informações do repositório remoto"""
    success, stdout, stderr = run_command("git remote -v")
    if not success:
        return None, stderr
    
    remotes = {}
    for line in stdout.strip().split('\n'):
        if not line:
            continue
        parts = line.split()
        if len(parts) >= 2:
            name = parts[0]
            url = parts[1]
            remotes[name] = url
    
    return remotes, None

def get_current_branch():
    """Obtém branch atual"""
    success, stdout, stderr = run_command("git branch --show-current")
    if not success:
        return None, stderr
    
    return stdout.strip(), None

def generate_report():
    """Gera relatório completo"""
    print("=" * 70)
    print("RELATORIO DE VERIFICACAO GIT - RENDIZY")
    print("=" * 70)
    print(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    # 1. Verificar se é repositório Git
    success, _, stderr = run_command("git rev-parse --git-dir")
    if not success:
        print("ERRO: Nao e um repositorio Git!")
        print(f"Detalhes: {stderr}")
        return
    
    print("OK: Repositorio Git encontrado\n")
    
    # 2. Branch atual
    branch, error = get_current_branch()
    if branch:
        print(f"Branch atual: {branch}")
    else:
        print(f"AVISO: Nao foi possivel determinar branch: {error}")
    print()
    
    # 3. Remotes
    remotes, error = get_remote_info()
    if remotes:
        print("Repositorios remotos:")
        for name, url in remotes.items():
            print(f"  {name}: {url}")
    else:
        print(f"AVISO: Nao foi possivel obter remotes: {error}")
    print()
    
    # 4. Status do Git
    print("Status do Git:")
    files, error = get_git_status()
    if files:
        print(f"  Modificados: {len(files['modified'])}")
        print(f"  Adicionados: {len(files['added'])}")
        print(f"  Deletados: {len(files['deleted'])}")
        print(f"  Nao rastreados: {len(files['untracked'])}")
        
        if files['modified']:
            print("\n  Arquivos modificados:")
            for f in files['modified'][:10]:  # Mostrar apenas 10 primeiros
                print(f"    - {f}")
            if len(files['modified']) > 10:
                print(f"    ... e mais {len(files['modified']) - 10} arquivos")
        
        if files['untracked']:
            print("\n  Arquivos nao rastreados (importantes):")
            important_untracked = [f for f in files['untracked'] 
                                  if 'automations' in f.lower() or 'RendizyPrincipal' in f]
            for f in important_untracked[:10]:
                print(f"    - {f}")
    else:
        print(f"  ERRO: {error}")
    print()
    
    # 5. Verificar módulo de automações
    print("Verificando modulo de automacoes:")
    automations = check_automations_module()
    all_exist = all(f['exists'] for f in automations.values())
    all_in_git = all(f.get('in_git', False) for f in automations.values())
    
    if all_exist:
        print("  OK: Todos os arquivos do modulo existem localmente")
    else:
        print("  AVISO: Alguns arquivos do modulo nao existem:")
        for path, info in automations.items():
            if not info['exists']:
                print(f"    - {path}")
    
    if all_in_git:
        print("  OK: Todos os arquivos estao rastreados pelo Git")
    else:
        print("  AVISO: Alguns arquivos NAO estao no Git:")
        for path, info in automations.items():
            if info['exists'] and not info.get('in_git', False):
                print(f"    - {path}")
    print()
    
    # 6. Verificar App.tsx
    print("Verificando App.tsx:")
    app_checks, error = check_app_tsx_imports()
    if app_checks:
        if app_checks['imports_automations_module']:
            print("  OK: AutomationsModule importado")
            if app_checks['import_line']:
                print(f"    Linha: {app_checks['import_line']}")
        else:
            print("  ERRO: AutomationsModule NAO importado!")
        
        if app_checks['has_automations_route']:
            print("  OK: Rota /automacoes encontrada")
        else:
            print("  ERRO: Rota /automacoes NAO encontrada!")
        
        if app_checks['has_protected_route']:
            print("  OK: Rota protegida configurada")
        else:
            print("  AVISO: Rota pode nao estar protegida")
    else:
        print(f"  ERRO: {error}")
    print()
    
    # 7. Arquivos rastreados
    print("Estatisticas:")
    tracked, error = get_tracked_files()
    if tracked:
        rendizy_files = [f for f in tracked if f.startswith('RendizyPrincipal/')]
        automations_files = [f for f in tracked if 'automations' in f.lower()]
        
        print(f"  Total de arquivos rastreados: {len(tracked)}")
        print(f"  Arquivos em RendizyPrincipal: {len(rendizy_files)}")
        print(f"  Arquivos de automacoes: {len(automations_files)}")
    print()
    
    # 8. Resumo e recomendações
    print("=" * 70)
    print("RESUMO E RECOMENDACOES:")
    print("=" * 70)
    
    issues = []
    if files and (files['modified'] or files['untracked']):
        issues.append(f"- {len(files['modified']) + len(files['untracked'])} arquivos precisam ser commitados")
    
    if automations and not all_in_git:
        issues.append("- Arquivos do modulo de automacoes nao estao no Git")
    
    if app_checks and not app_checks['imports_automations_module']:
        issues.append("- AutomationsModule nao esta importado no App.tsx")
    
    if issues:
        print("\nATENCAO - Problemas encontrados:")
        for issue in issues:
            print(issue)
        print("\nAcoes recomendadas:")
        print("1. Adicionar arquivos ao Git: git add RendizyPrincipal/")
        print("2. Fazer commit: git commit -m 'feat: Adicionar modulo automacoes'")
        print("3. Verificar novamente antes de fazer push")
    else:
        print("\nOK: Tudo parece estar correto!")
        print("Voce pode fazer push com seguranca.")
    
    print()

if __name__ == "__main__":
    try:
        generate_report()
    except KeyboardInterrupt:
        print("\n\nOperacao cancelada pelo usuario.")
    except Exception as e:
        print(f"\nERRO: {e}")
        import traceback
        traceback.print_exc()










