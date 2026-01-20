#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para fazer deploy no Cloudflare Pages como alternativa ao Vercel
"""

import subprocess
import sys
import os

def main():
    print("=" * 70)
    print("DEPLOY NO CLOUDFLARE PAGES (ALTERNATIVA AO VERCEL)")
    print("=" * 70)
    print()
    
    print("📋 INSTRUÇÕES PARA DEPLOY NO CLOUDFLARE PAGES:")
    print()
    print("1. Acesse: https://dash.cloudflare.com")
    print("2. Vá em: Pages → Create a project")
    print("3. Conecte seu repositório GitHub: guesttobuy-code/Rendizyoficial")
    print("4. Configure:")
    print("   - Framework preset: Vite")
    print("   - Build command: cd RendizyPrincipal && npm run build")
    print("   - Build output directory: RendizyPrincipal/dist")
    print("   - Root directory: (deixe vazio ou /)")
    print()
    print("5. Clique em 'Save and Deploy'")
    print()
    print("✅ Vantagens do Cloudflare Pages:")
    print("   - CDN global mais rápido")
    print("   - Cache mais inteligente")
    print("   - Gratuito com limites generosos")
    print("   - Sem problemas de cache como no Vercel")
    print()
    
    rendizy_dir = os.path.join(os.getcwd(), 'RendizyPrincipal')
    
    # Verificar se wrangler está instalado (CLI do Cloudflare)
    try:
        result = subprocess.run(['wrangler', '--version'], 
                              capture_output=True, 
                              text=True, 
                              check=True)
        print(f"✅ Wrangler CLI encontrado: {result.stdout.strip()}")
        print()
        print("Para deploy via CLI:")
        print(f"  cd {rendizy_dir}")
        print("  npm run build")
        print("  wrangler pages deploy dist --project-name=rendizyoficial")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("⚠️  Wrangler CLI não encontrado.")
        print("   Use o método via dashboard (mais fácil)")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

