#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para fazer deploy no Netlify como alternativa ao Vercel
"""

import subprocess
import sys
import os

def main():
    print("=" * 70)
    print("DEPLOY NO NETLIFY (ALTERNATIVA AO VERCEL)")
    print("=" * 70)
    print()
    
    # Verificar se netlify CLI está instalado
    try:
        result = subprocess.run(['netlify', '--version'], 
                              capture_output=True, 
                              text=True, 
                              check=True)
        print(f"✅ Netlify CLI encontrado: {result.stdout.strip()}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Netlify CLI não encontrado!")
        print()
        print("Para instalar:")
        print("  npm install -g netlify-cli")
        print()
        print("Ou use o deploy manual:")
        print("  1. Acesse: https://app.netlify.com")
        print("  2. Conecte seu repositório GitHub")
        print("  3. Configure:")
        print("     - Build command: cd RendizyPrincipal && npm run build")
        print("     - Publish directory: RendizyPrincipal/dist")
        return 1
    
    # Navegar para o diretório do projeto
    rendizy_dir = os.path.join(os.getcwd(), 'RendizyPrincipal')
    if not os.path.exists(rendizy_dir):
        print(f"❌ Diretório não encontrado: {rendizy_dir}")
        return 1
    
    print(f"📁 Diretório: {rendizy_dir}")
    print()
    
    # Verificar se está logado
    print("1. Verificando login no Netlify...")
    try:
        result = subprocess.run(['netlify', 'status'], 
                              cwd=rendizy_dir,
                              capture_output=True, 
                              text=True, 
                              check=True)
        print("   ✅ Logado no Netlify")
    except subprocess.CalledProcessError:
        print("   ⚠️  Não está logado. Fazendo login...")
        print("   Abra o navegador para autenticar...")
        subprocess.run(['netlify', 'login'], cwd=rendizy_dir)
    
    print()
    print("2. Fazendo build...")
    try:
        subprocess.run(['npm', 'run', 'build'], 
                      cwd=rendizy_dir,
                      check=True)
        print("   ✅ Build concluído")
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Erro no build: {e}")
        return 1
    
    print()
    print("3. Fazendo deploy...")
    try:
        subprocess.run(['netlify', 'deploy', '--prod', '--dir=dist'], 
                      cwd=rendizy_dir,
                      check=True)
        print("   ✅ Deploy concluído!")
    except subprocess.CalledProcessError as e:
        print(f"   ❌ Erro no deploy: {e}")
        return 1
    
    print()
    print("=" * 70)
    print("✅ DEPLOY NO NETLIFY CONCLUÍDO!")
    print("=" * 70)
    return 0

if __name__ == "__main__":
    sys.exit(main())

