#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para diagnosticar diferenças entre GitHub e Vercel
"""

import subprocess
import sys
import os
from pathlib import Path

# Encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

os.environ['GIT_PAGER'] = ''
os.environ['PAGER'] = ''

def run(cmd, cwd=None):
    """Executa comando"""
    try:
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
    print("DIAGNÓSTICO: GITHUB vs VERCEL")
    print("=" * 70)
    print()
    
    # 1. Commit atual no GitHub
    print("1. COMMIT ATUAL NO GITHUB (origin/main):")
    print("-" * 70)
    ok, out, err = run("git log -1 --oneline origin/main", cwd=project_dir)
    if ok:
        print(out.strip())
    print()
    
    # 2. Commit atual local
    print("2. COMMIT ATUAL LOCAL:")
    print("-" * 70)
    ok, out, err = run("git log -1 --oneline HEAD", cwd=project_dir)
    if ok:
        print(out.strip())
    print()
    
    # 3. Verificar se estão sincronizados
    print("3. SINCRONIZAÇÃO:")
    print("-" * 70)
    ok, out, err = run("git rev-parse HEAD", cwd=project_dir)
    local_hash = out.strip() if ok else ""
    ok2, out2, err2 = run("git rev-parse origin/main", cwd=project_dir)
    remote_hash = out2.strip() if ok2 else ""
    
    if local_hash == remote_hash:
        print("✅ Local e GitHub estão sincronizados")
        print(f"   Hash: {local_hash[:8]}")
    else:
        print("❌ Local e GitHub estão DIFERENTES!")
        print(f"   Local:  {local_hash[:8]}")
        print(f"   GitHub: {remote_hash[:8]}")
    print()
    
    # 4. Verificar MainSidebar.tsx no GitHub
    print("4. MÓDULO AUTOMAÇÕES NO GITHUB:")
    print("-" * 70)
    ok, out, err = run("git show origin/main:RendizyPrincipal/components/MainSidebar.tsx | grep -A 10 'modulo-automacoes'", cwd=project_dir)
    if ok and out.strip():
        lines = out.strip().split('\n')[:15]
        for line in lines:
            print(f"   {line}")
    else:
        print("   ❌ NÃO ENCONTRADO no GitHub!")
    print()
    
    # 5. Verificar MainSidebar.tsx local
    print("5. MÓDULO AUTOMAÇÕES LOCAL:")
    print("-" * 70)
    sidebar_path = project_dir / "RendizyPrincipal" / "components" / "MainSidebar.tsx"
    if sidebar_path.exists():
        with open(sidebar_path, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'modulo-automacoes' in content:
                # Encontrar a seção
                idx = content.find('modulo-automacoes')
                start = max(0, idx - 200)
                end = min(len(content), idx + 500)
                section = content[start:end]
                lines = section.split('\n')
                for i, line in enumerate(lines):
                    if 'modulo-automacoes' in line or (i > 0 and 'modulo-automacoes' in lines[i-1]):
                        print(f"   {line}")
            else:
                print("   ❌ NÃO ENCONTRADO localmente!")
    print()
    
    # 6. Verificar diferenças entre local e GitHub
    print("6. DIFERENÇAS NO MainSidebar.tsx:")
    print("-" * 70)
    ok, out, err = run("git diff origin/main HEAD -- RendizyPrincipal/components/MainSidebar.tsx", cwd=project_dir)
    if ok and out.strip():
        print("   Há diferenças:")
        lines = out.strip().split('\n')[:30]
        for line in lines:
            print(f"   {line}")
    else:
        print("   ✅ Nenhuma diferença (arquivos idênticos)")
    print()
    
    # 7. Verificar arquivos modificados não commitados
    print("7. ARQUIVOS MODIFICADOS NÃO COMMITADOS:")
    print("-" * 70)
    ok, out, err = run("git status --porcelain", cwd=project_dir)
    if ok and out.strip():
        files = [l for l in out.strip().split('\n') if l.strip()]
        print(f"   Total: {len(files)} arquivos")
        for file in files[:10]:
            print(f"   {file}")
        if len(files) > 10:
            print(f"   ... e mais {len(files) - 10} arquivos")
    else:
        print("   ✅ Nenhum arquivo modificado")
    print()
    
    # 8. Verificar se o arquivo está no último commit
    print("8. VERIFICANDO SE MainSidebar.tsx ESTÁ NO ÚLTIMO COMMIT:")
    print("-" * 70)
    ok, out, err = run("git log -1 --name-only --oneline HEAD", cwd=project_dir)
    if ok:
        if 'MainSidebar.tsx' in out:
            print("   ✅ MainSidebar.tsx está no último commit")
        else:
            print("   ⚠️  MainSidebar.tsx NÃO está no último commit")
            print("   Arquivos no último commit:")
            lines = out.strip().split('\n')[1:15]
            for line in lines:
                if line.strip():
                    print(f"      {line}")
    print()
    
    # 9. Verificar histórico do arquivo
    print("9. ÚLTIMAS ALTERAÇÕES NO MainSidebar.tsx:")
    print("-" * 70)
    ok, out, err = run("git log -5 --oneline -- RendizyPrincipal/components/MainSidebar.tsx", cwd=project_dir)
    if ok and out.strip():
        for line in out.strip().split('\n'):
            print(f"   {line}")
    print()
    
    print("=" * 70)
    print("DIAGNÓSTICO COMPLETO")
    print("=" * 70)
    print()
    print("PRÓXIMOS PASSOS:")
    print("1. Se há diferenças, fazer push novamente")
    print("2. Verificar no Vercel qual commit está sendo usado")
    print("3. Aguardar deploy do Vercel (2-5 minutos)")
    print("4. Limpar cache do navegador (Ctrl+F5)")

if __name__ == "__main__":
    main()

