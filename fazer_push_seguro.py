#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para fazer push seguro para o GitHub
Verifica tudo antes de fazer push e tenta resolver problemas
"""

import subprocess
import sys
import os
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
            print(f"❌ Erro ao executar: {cmd}")
            print(f"   Erro: {result.stderr}")
            return False, result.stdout, result.stderr
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        print(f"❌ Exceção ao executar comando: {e}")
        return False, "", str(e)

def main():
    project_dir = Path(__file__).parent.absolute()
    
    print("=" * 60)
    print("PUSH SEGURO PARA GITHUB")
    print("=" * 60)
    print(f"\n📁 Diretório: {project_dir}\n")
    
    # 1. Verificar se há mudanças não commitadas
    print("1️⃣ Verificando mudanças não commitadas...")
    success, status, _ = run_command("git status --porcelain", cwd=project_dir)
    if success and status.strip():
        print("⚠️ Há mudanças não commitadas!")
        print("\nArquivos modificados:")
        for line in status.strip().split('\n'):
            if line.strip():
                print(f"   {line}")
        
        resposta = input("\n❓ Deseja fazer commit dessas mudanças? (s/n): ").strip().lower()
        if resposta == 's':
            mensagem = input("Digite a mensagem do commit: ").strip()
            if not mensagem:
                timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                mensagem = f"Update: {timestamp}"
            
            print(f"\n📝 Fazendo commit: {mensagem}")
            success, output, error = run_command(
                f'git add -A && git commit -m "{mensagem}"',
                cwd=project_dir
            )
            if success:
                print("✅ Commit realizado com sucesso!")
            else:
                print(f"❌ Erro ao fazer commit: {error}")
                return 1
        else:
            print("⏭️ Pulando commit...")
    else:
        print("✅ Nenhuma mudança não commitada\n")
    
    # 2. Verificar se há commits para enviar
    print("\n2️⃣ Verificando commits para enviar...")
    success, output, _ = run_command("git log origin/main..HEAD --oneline", cwd=project_dir)
    if not success or not output.strip():
        print("ℹ️ Nenhum commit para enviar")
        print("   O repositório local já está sincronizado com o remoto")
        return 0
    
    commits = output.strip().split('\n')
    print(f"✅ Há {len(commits)} commit(s) para enviar:")
    for commit in commits[:5]:  # Mostrar apenas os 5 primeiros
        print(f"   {commit}")
    if len(commits) > 5:
        print(f"   ... e mais {len(commits) - 5} commit(s)")
    
    # 3. Atualizar referências remotas
    print("\n3️⃣ Atualizando referências remotas...")
    success, output, error = run_command("git fetch origin", cwd=project_dir)
    if success:
        print("✅ Referências atualizadas")
    else:
        print(f"⚠️ Aviso ao fazer fetch: {error}")
    
    # 4. Verificar se há conflitos potenciais
    print("\n4️⃣ Verificando conflitos potenciais...")
    success, output, _ = run_command("git log HEAD..origin/main --oneline", cwd=project_dir)
    if success and output.strip():
        print("⚠️ ATENÇÃO: Há commits no remoto que não estão no local!")
        commits_remotos = output.strip().split('\n')
        print(f"   {len(commits_remotos)} commit(s) remoto(s):")
        for commit in commits_remotos[:3]:
            print(f"   {commit}")
        
        resposta = input("\n❓ Deseja fazer pull antes do push? (s/n): ").strip().lower()
        if resposta == 's':
            print("\n📥 Fazendo pull...")
            success, output, error = run_command("git pull origin main --no-edit", cwd=project_dir)
            if success:
                print("✅ Pull realizado com sucesso!")
            else:
                print(f"❌ Erro ao fazer pull: {error}")
                print("   Você pode ter conflitos que precisam ser resolvidos manualmente")
                return 1
    
    # 5. Fazer push
    print("\n5️⃣ Fazendo push para o GitHub...")
    print("   Isso pode levar alguns segundos...\n")
    
    success, output, error = run_command("git push origin main", cwd=project_dir)
    
    if success:
        print("=" * 60)
        print("✅ PUSH REALIZADO COM SUCESSO!")
        print("=" * 60)
        if output.strip():
            print("\nSaída:")
            print(output)
        return 0
    else:
        print("=" * 60)
        print("❌ ERRO AO FAZER PUSH")
        print("=" * 60)
        print(f"\nErro: {error}")
        
        # Tentar diagnosticar o problema
        if "authentication" in error.lower() or "permission" in error.lower():
            print("\n💡 PROBLEMA DE AUTENTICAÇÃO DETECTADO")
            print("   O token no remote pode estar expirado ou inválido")
            print("   Verifique o arquivo de configuração do remote")
        elif "rejected" in error.lower():
            print("\n💡 PUSH REJEITADO")
            print("   Pode ser necessário fazer pull primeiro ou usar force push")
            print("   ⚠️ CUIDADO: Force push pode sobrescrever commits remotos!")
        
        return 1

if __name__ == "__main__":
    sys.exit(main())

