#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para fazer deploy completo: Supabase + GitHub
"""

import subprocess
import sys
import os
from pathlib import Path

# Configurar encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_command(cmd, cwd=None):
    """Executa comando e mostra output em tempo real"""
    print(f"\n{'='*70}")
    print(f"EXECUTANDO: {cmd}")
    print(f"{'='*70}\n")
    
    process = subprocess.Popen(
        cmd,
        shell=True,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding='utf-8',
        errors='replace',
        bufsize=1,
        universal_newlines=True
    )
    
    output_lines = []
    for line in process.stdout:
        print(line, end='')
        output_lines.append(line)
    
    process.wait()
    output = ''.join(output_lines)
    
    if process.returncode == 0:
        print(f"\n✅ SUCESSO (código: {process.returncode})")
        return True, output
    else:
        print(f"\n❌ ERRO (código: {process.returncode})")
        return False, output

def main():
    project_dir = Path(__file__).parent.absolute()
    
    print("=" * 70)
    print("DEPLOY COMPLETO - SUPABASE + GITHUB")
    print("=" * 70)
    print(f"\nDiretório: {project_dir}\n")
    
    # 1. DEPLOY SUPABASE
    print("\n" + "="*70)
    print("1. DEPLOY NO SUPABASE")
    print("="*70)
    success, output = run_command(
        "npx supabase functions deploy rendizy-server",
        cwd=project_dir
    )
    
    if not success:
        print("\n⚠️ AVISO: Deploy do Supabase pode ter falhado")
        print("   Verifique o output acima")
    
    # 2. DEPLOY GITHUB
    print("\n" + "="*70)
    print("2. DEPLOY NO GITHUB")
    print("="*70)
    
    # Verificar status
    print("\n2.1. Verificando status do Git...")
    run_command("git status", cwd=project_dir)
    
    # Adicionar arquivos
    print("\n2.2. Adicionando arquivos...")
    run_command("git add -A", cwd=project_dir)
    
    # Commit
    print("\n2.3. Fazendo commit...")
    commit_msg = "fix: Correção do status do WhatsApp para firmar na tela após salvar configurações"
    success, output = run_command(
        f'git commit -m "{commit_msg}"',
        cwd=project_dir
    )
    
    if "nothing to commit" in output.lower():
        print("\n⚠️ Nenhuma alteração para commitar")
    elif not success:
        print("\n⚠️ AVISO: Commit pode ter falhado")
    
    # Push
    print("\n2.4. Fazendo push para GitHub...")
    success, output = run_command("git push origin main", cwd=project_dir)
    
    if success:
        print("\n" + "="*70)
        print("✅ DEPLOY COMPLETO COM SUCESSO!")
        print("="*70)
        print("\n✅ Supabase: Edge Functions deployadas")
        print("✅ GitHub: Código enviado para o repositório")
    else:
        if "already up to date" in output.lower():
            print("\n✅ Repositório já está atualizado")
        else:
            print("\n⚠️ AVISO: Push pode ter falhado")
            print("   Verifique o output acima")
    
    print("\n" + "="*70)
    print("FIM")
    print("="*70)

if __name__ == "__main__":
    main()

