#!/usr/bin/env python3
"""
Script para remover TODAS as rotas app.* duplicadas de routes-organizations.ts
Mantém apenas funções exportadas (versão HEAD correta)
"""

import re

file_path = r"C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-organizations.ts"

print("=== REMOVENDO ROTAS DUPLICADAS ===")

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remover TODAS as rotas app.get/app.post/app.patch/app.delete/app.put
# Essas são duplicadas - as funções exportadas são usadas no index.ts

# Padrão para remover blocos completos de rotas
patterns = [
    # app.get('/:id', ...)
    (r"app\.get\('/:id',\s*async\s*\(c\)\s*=>\s*\{[^}]*?\}\}\);", ""),
    # app.get('/slug/:slug', ...)
    (r"app\.get\('/slug/:slug',\s*async\s*\(c\)\s*=>\s*\{[^}]*?\}\}\);", ""),
    # app.post('/', ...)
    (r"app\.post\('/',\s*async\s*\(c\)\s*=>\s*\{[^}]*?\}\}\);", ""),
    # app.patch('/:id', ...)
    (r"app\.patch\('/:id',\s*async\s*\(c\)\s*=>\s*\{[^}]*?\}\}\);", ""),
    # app.delete('/:id', ...)
    (r"app\.delete\('/:id',\s*async\s*\(c\)\s*=>\s*\{[^}]*?\}\}\);", ""),
    # app.get('/:id/stats', ...)
    (r"app\.get\('/:id/stats',\s*async\s*\(c\)\s*=>\s*\{[^}]*?\}\}\);", ""),
    # app.get("/:id/settings/global", ...)
    (r'app\.get\("/:id/settings/global",\s*async\s*\(c\)\s*=>\s*\{[^}]*?\}\}\);', ""),
    # app.put("/:id/settings/global", ...)
    (r'app\.put\("/:id/settings/global",\s*async\s*\(c\)\s*=>\s*\{[^}]*?\}\}\);', ""),
]

# Tentar remover padrões simples primeiro
for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# Remover linhas que são apenas "});" soltas (sem função correspondente)
lines = content.split('\n')
output_lines = []
i = 0

while i < len(lines):
    line = lines[i]
    
    # Se encontrar uma linha "});" solta após uma linha vazia, pular
    if line.strip() == '});' and i > 0 and lines[i-1].strip() == '':
        # Verificar se há uma função correspondente antes
        has_function = False
        for j in range(max(0, i-20), i):
            if 'export async function' in lines[j] or 'function' in lines[j]:
                has_function = True
                break
        
        if not has_function:
            i += 1
            continue
    
    # Se encontrar "app.get(" ou "app.post(" etc, remover todo o bloco até "});"
    if re.match(r'^\s*app\.(get|post|patch|delete|put)\(', line):
        # Pular até encontrar "});"
        while i < len(lines) and '});' not in lines[i]:
            i += 1
        if i < len(lines):
            i += 1  # Pular a linha "});"
        continue
    
    output_lines.append(line)
    i += 1

content = '\n'.join(output_lines)

# Limpeza final: remover linhas vazias múltiplas
content = re.sub(r'\n{3,}', '\n\n', content)

# Remover qualquer código quebrado restante
# Remover linhas que são apenas "});" sem contexto
content = re.sub(r'\n\s*\}\);\s*\n', '\n', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Rotas duplicadas removidas!")
print("⚠️  Verifique o arquivo manualmente para garantir que está correto.")
