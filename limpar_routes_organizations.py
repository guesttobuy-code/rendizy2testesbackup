#!/usr/bin/env python3
"""
Script para limpar routes-organizations.ts
Remove TODAS as rotas app.get/app.post duplicadas
Mantém apenas funções exportadas (versão HEAD correta)
"""

import re

file_path = r"C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-organizations.ts"

print("=== LIMPANDO routes-organizations.ts ===")

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remover TODAS as rotas app.get/app.post/app.patch/app.delete/app.put duplicadas
# Essas rotas são a versão antiga (KV Store) e não devem existir
# Mantemos apenas as funções exportadas (versão HEAD - SQL direto)

# Padrão para remover blocos de rotas app.* que estão duplicados
# Remover desde "app.get(" ou "app.post(" até o "});" correspondente

# Primeiro, vamos remover blocos específicos conhecidos
patterns_to_remove = [
    r'app\.get\('/:id', async \(c\) => \{[\s\S]*?\}\);',
    r'app\.get\('/slug/:slug', async \(c\) => \{[\s\S]*?\}\);',
    r'app\.post\('/', async \(c\) => \{[\s\S]*?\}\);',
    r'app\.patch\('/:id', async \(c\) => \{[\s\S]*?\}\);',
    r'app\.delete\('/:id', async \(c\) => \{[\s\S]*?\}\);',
    r'app\.get\('/:id/stats', async \(c\) => \{[\s\S]*?\}\);',
    r'app\.get\("/:id/settings/global", async \(c\) => \{[\s\S]*?\}\);',
    r'app\.put\("/:id/settings/global", async \(c\) => \{[\s\S]*?\}\);',
]

for pattern in patterns_to_remove:
    content = re.sub(pattern, '', content)

# Remover linhas vazias múltiplas
content = re.sub(r'\n{3,}', '\n\n', content)

# Remover qualquer código quebrado ou duplicado restante
# Remover linhas que são apenas "});" soltas (sem função correspondente)
lines = content.split('\n')
output_lines = []
skip_next_close = False

for i, line in enumerate(lines):
    # Se encontrar um "});" solto após remoção, pular
    if line.strip() == '});' and i > 0 and lines[i-1].strip() == '':
        continue
    
    # Remover código quebrado como "if (!organization) {" sem contexto
    if 'if (!organization) {' in line and 'const organization' not in '\n'.join(output_lines[-10:]):
        # Verificar se há contexto antes
        has_context = any('organization' in l for l in output_lines[-5:])
        if not has_context:
            continue
    
    output_lines.append(line)

content = '\n'.join(output_lines)

# Limpeza final
content = re.sub(r'\n{3,}', '\n\n', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Limpeza concluída!")
print("⚠️  Verifique o arquivo manualmente para garantir que está correto.")
