#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para ajudar a adicionar variáveis de ambiente no Netlify
Gera um arquivo com todas as variáveis encontradas no código
"""

import os
import re
import subprocess
import sys

def find_env_variables():
    """Encontra todas as variáveis de ambiente usadas no código"""
    rendizy_dir = os.path.join(os.getcwd(), 'RendizyPrincipal')
    if not os.path.exists(rendizy_dir):
        print(f"❌ Diretório não encontrado: {rendizy_dir}")
        return []
    
    env_vars = set()
    
    # Padrões para encontrar variáveis de ambiente
    patterns = [
        r'VITE_\w+',
        r'import\.meta\.env\.(\w+)',
        r'process\.env\.(\w+)',
    ]
    
    # Extensões de arquivo para procurar
    extensions = ['.ts', '.tsx', '.js', '.jsx', '.vue']
    
    print("🔍 Procurando variáveis de ambiente no código...")
    
    for root, dirs, files in os.walk(rendizy_dir):
        # Ignorar node_modules e outros diretórios
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build']]
        
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        for pattern in patterns:
                            matches = re.findall(pattern, content)
                            for match in matches:
                                if isinstance(match, tuple):
                                    env_vars.add(match[0])
                                else:
                                    env_vars.add(match)
                except Exception as e:
                    pass
    
    return sorted(list(env_vars))

def generate_netlify_env_file(env_vars):
    """Gera um arquivo com as variáveis para facilitar a cópia"""
    output = []
    output.append("# Variáveis de Ambiente para Netlify")
    output.append("# Copie e cole no Dashboard do Netlify: Site configuration → Environment variables")
    output.append("")
    output.append("# ========================================")
    output.append("# INSTRUÇÕES:")
    output.append("# 1. Acesse: https://app.netlify.com")
    output.append("# 2. Selecione seu projeto")
    output.append("# 3. Vá em: Site configuration → Environment variables")
    output.append("# 4. Adicione cada variável abaixo (uma por uma)")
    output.append("# 5. Após adicionar, faça um novo deploy!")
    output.append("# ========================================")
    output.append("")
    
    for var in env_vars:
        output.append(f"# {var}")
        output.append(f"# Key: {var}")
        output.append(f"# Value: [COLOQUE O VALOR AQUI]")
        output.append(f"# Scope: Production")
        output.append("")
    
    return "\n".join(output)

def main():
    print("=" * 70)
    print("GERADOR DE VARIÁVEIS DE AMBIENTE PARA NETLIFY")
    print("=" * 70)
    print()
    
    env_vars = find_env_variables()
    
    if not env_vars:
        print("⚠️  Nenhuma variável de ambiente encontrada.")
        print("   Isso pode significar que o projeto não usa variáveis de ambiente.")
        return 0
    
    print(f"✅ Encontradas {len(env_vars)} variáveis de ambiente:")
    for var in env_vars:
        print(f"   - {var}")
    
    print()
    print("📝 Gerando arquivo de referência...")
    
    content = generate_netlify_env_file(env_vars)
    output_file = "VARIAVEIS_NETLIFY.txt"
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Arquivo criado: {output_file}")
    print()
    print("=" * 70)
    print("PRÓXIMOS PASSOS:")
    print("=" * 70)
    print()
    print("1. Abra o arquivo: VARIAVEIS_NETLIFY.txt")
    print("2. Siga as instruções para adicionar no Netlify")
    print("3. Ou use o método rápido:")
    print()
    print("   a) Acesse: https://app.netlify.com")
    print("   b) Seu projeto → Site configuration → Environment variables")
    print("   c) Adicione cada variável listada acima")
    print("   d) Faça um novo deploy após adicionar")
    print()
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

