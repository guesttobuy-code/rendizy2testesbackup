#!/usr/bin/env python3
"""
Script DEFINITIVO para resolver TODOS os conflitos de merge
Remove código entre ======= e >>>>>>> (versão antiga)
Mantém apenas código HEAD (versão correta)
"""

import re
import os

def resolve_conflicts_in_file(file_path):
    """Resolve todos os conflitos em um arquivo"""
    print(f"\nProcessando: {os.path.basename(file_path)}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    output = []
    in_conflict = False
    keep_lines = True
    conflict_count = 0
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Detectar início de conflito (HEAD)
        if re.match(r'^<<<<<<< HEAD', line) or re.match(r'^<<<<<<< ', line):
            in_conflict = True
            keep_lines = True
            conflict_count += 1
            i += 1
            continue
        
        # Detectar separador (descartar tudo daqui até >>>>>>>)
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
    
    if conflict_count > 0:
        print(f"  ✅ Resolvidos {conflict_count} conflitos")
    
    # Salvar arquivo resolvido
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(output)
    
    # Limpeza final: remover qualquer marcador restante
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remover TODOS os marcadores restantes (caso algum tenha escapado)
    content = re.sub(r'^<<<<<<< HEAD\s*\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^<<<<<<< .+\s*\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^=======\s*\n', '', content, flags=re.MULTILINE)
    content = re.sub(r'^>>>>>>> .+\s*\n', '', content, flags=re.MULTILINE)
    # Remover linhas vazias múltiplas (mais de 2)
    content = re.sub(r'\n{3,}', '\n\n', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return conflict_count

# Arquivos com conflitos encontrados
files_with_conflicts = [
    r"C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-organizations.ts",
    r"C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-whatsapp-evolution.ts",
    r"C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-reservations.ts",
    r"C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-properties.ts",
    r"C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-chat.ts",
    r"C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-auth.ts",
    r"C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\repositories\channel-config-repository.ts",
]

print("=== RESOLVENDO TODOS OS CONFLITOS DEFINITIVAMENTE ===")

total_conflicts = 0
for file_path in files_with_conflicts:
    if os.path.exists(file_path):
        conflicts = resolve_conflicts_in_file(file_path)
        total_conflicts += conflicts
    else:
        print(f"  ⚠️  Arquivo não encontrado: {os.path.basename(file_path)}")

print(f"\n=== RESUMO ===")
print(f"Total de conflitos resolvidos: {total_conflicts}")

# Verificação final
print("\n=== VERIFICAÇÃO FINAL ===")
all_clean = True
for file_path in files_with_conflicts:
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        remaining = len(re.findall(r'<<<<<<< HEAD|<<<<<<< |=======|>>>>>>>', content))
        if remaining > 0:
            print(f"  ❌ {os.path.basename(file_path)}: ainda há {remaining} marcadores")
            all_clean = False
        else:
            print(f"  ✅ {os.path.basename(file_path)}: limpo")

if all_clean:
    print("\n✅ SUCESSO! TODOS OS CONFLITOS FORAM RESOLVIDOS!")
else:
    print("\n⚠️  Ainda há conflitos. Execute novamente ou resolva manualmente.")
    exit(1)
