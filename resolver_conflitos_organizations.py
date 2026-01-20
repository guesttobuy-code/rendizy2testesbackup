#!/usr/bin/env python3
"""
Script para resolver TODOS os conflitos de merge em routes-organizations.ts
Mantém sempre a versão HEAD (SQL direto)
"""

import re
import sys

file_path = r"C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-organizations.ts"

print("=== RESOLVENDO CONFLITOS EM routes-organizations.ts ===")
print()

# Ler arquivo
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

output = []
in_conflict = False
keep_lines = True
conflict_count = 0
i = 0

while i < len(lines):
    line = lines[i]
    
    # Detectar início de conflito
    if re.match(r'^<<<<<<< HEAD', line) or re.match(r'^<<<<<<< ', line):
        in_conflict = True
        keep_lines = True
        conflict_count += 1
        print(f"  Conflito #{conflict_count} encontrado na linha {i+1}")
        i += 1
        continue
    
    # Detectar separador
    if re.match(r'^=======', line):
        keep_lines = False
        i += 1
        continue
    
    # Detectar fim de conflito
    if re.match(r'^>>>>>>>', line):
        in_conflict = False
        keep_lines = True
        i += 1
        continue
    
    # Se está em conflito, manter apenas se for HEAD
    if in_conflict:
        if keep_lines:
            output.append(line)
    else:
        output.append(line)
    
    i += 1

print(f"\nTotal de conflitos encontrados: {conflict_count}")

# Salvar arquivo resolvido
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(output)

print("Arquivo salvo. Fazendo limpeza final...")

# Limpeza final agressiva
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remover TODOS os marcadores restantes
content = re.sub(r'^<<<<<<< HEAD\s*\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^<<<<<<< .+\s*\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^=======\s*\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^>>>>>>> .+\s*\n', '', content, flags=re.MULTILINE)
# Remover linhas vazias múltiplas
content = re.sub(r'\n{3,}', '\n\n', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Verificar se ainda há conflitos
with open(file_path, 'r', encoding='utf-8') as f:
    final_content = f.read()

remaining = len(re.findall(r'<<<<<<< HEAD|<<<<<<< |=======|>>>>>>>', final_content))

if remaining == 0:
    print("✅ SUCESSO! TODOS OS CONFLITOS FORAM RESOLVIDOS!")
else:
    print(f"⚠️  Ainda há {remaining} marcadores de conflito. Verifique manualmente.")
    sys.exit(1)

print("✅ Processo concluído com sucesso!")
