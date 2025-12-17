#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para fazer deploy do backend (Edge Functions) no Supabase
"""

import subprocess
import sys
from pathlib import Path

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
            print(f"ERRO: {result.stderr}")
            return False, result.stdout, result.stderr
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    project_dir = Path(__file__).parent.absolute()
    project_ref = "odcgnzfremrqnvtitpcc"
    function_name = "rendizy-server"
    
    print("=" * 70)
    print("DEPLOY DO BACKEND - SUPABASE EDGE FUNCTIONS")
    print("=" * 70)
    print(f"\nDiretorio: {project_dir}")
    print(f"Projeto: {project_ref}")
    print(f"Funcao: {function_name}\n")
    
    # PASSO 1: Verificar se Supabase CLI está instalado
    print("1. Verificando Supabase CLI...")
    success, output, error = run_command("npx supabase --version", cwd=project_dir)
    if success:
        print(f"OK: Supabase CLI encontrado")
        print(f"   {output.strip()}")
    else:
        print("AVISO: Supabase CLI nao encontrado")
        print("   Tentando instalar...")
        success2, output2, error2 = run_command("npm install -g supabase", cwd=project_dir)
        if success2:
            print("OK: Supabase CLI instalado")
        else:
            print(f"ERRO ao instalar: {error2}")
            print("\nTente instalar manualmente:")
            print("  npm install -g supabase")
            return 1
    print()
    
    # PASSO 2: Verificar login
    print("2. Verificando login no Supabase...")
    success, output, error = run_command("npx supabase projects list", cwd=project_dir)
    if success:
        print("OK: Logado no Supabase")
        if project_ref in output:
            print(f"   Projeto {project_ref} encontrado")
        else:
            print(f"   ATENCAO: Projeto {project_ref} nao encontrado na lista")
    else:
        print("ERRO: Nao esta logado no Supabase")
        print("\nFazendo login...")
        print("   Isso vai abrir o navegador para autenticacao")
        success2, output2, error2 = run_command("npx supabase login", cwd=project_dir)
        if success2:
            print("OK: Login realizado com sucesso")
        else:
            print(f"ERRO no login: {error2}")
            print("\nTente fazer login manualmente:")
            print("  npx supabase login")
            return 1
    print()
    
    # PASSO 3: Linkar projeto (se necessário)
    print("3. Verificando link com projeto...")
    success, output, error = run_command("npx supabase link --project-ref " + project_ref, cwd=project_dir)
    if success:
        print(f"OK: Projeto linkado: {project_ref}")
    else:
        if "already linked" in error.lower() or "already linked" in output.lower():
            print("OK: Projeto ja esta linkado")
        else:
            print(f"AVISO: {error}")
            print("   Continuando mesmo assim...")
    print()
    
    # PASSO 4: Verificar se a pasta da função existe
    print("4. Verificando pasta da Edge Function...")
    function_path = project_dir / "supabase" / "functions" / function_name
    if function_path.exists():
        print(f"OK: Pasta encontrada: {function_path}")
        index_file = function_path / "index.ts"
        if index_file.exists():
            print("OK: Arquivo index.ts encontrado")
        else:
            print("ERRO: Arquivo index.ts nao encontrado!")
            return 1
    else:
        print(f"ERRO: Pasta nao encontrada: {function_path}")
        return 1
    print()
    
    # PASSO 5: Fazer deploy
    print("=" * 70)
    print("5. FAZENDO DEPLOY DA EDGE FUNCTION...")
    print("=" * 70)
    print("Isso pode levar 1-2 minutos...\n")
    
    success, output, error = run_command(
        f"npx supabase functions deploy {function_name} --project-ref {project_ref}",
        cwd=project_dir
    )
    
    if success:
        print("=" * 70)
        print("SUCESSO! DEPLOY REALIZADO COM SUCESSO!")
        print("=" * 70)
        print(f"\nSaida do deploy:")
        print(output)
        
        # Extrair URL se disponível
        if "https://" in output:
            lines = output.split('\n')
            for line in lines:
                if "https://" in line and function_name in line:
                    print(f"\nURL da funcao:")
                    print(f"  {line.strip()}")
        
        print(f"\nURL esperada:")
        print(f"  https://{project_ref}.supabase.co/functions/v1/{function_name}/make-server-67caf26a")
        
        print("\n" + "=" * 70)
        print("PROXIMOS PASSOS")
        print("=" * 70)
        print("\n1. Teste o health check:")
        print(f"   https://{project_ref}.supabase.co/functions/v1/{function_name}/make-server-67caf26a/health")
        print("\n2. Verifique os logs no dashboard:")
        print(f"   https://supabase.com/dashboard/project/{project_ref}/functions/{function_name}/logs")
        print("\n3. Teste o login na aplicacao de producao")
        
        return 0
    else:
        print("=" * 70)
        print("ERRO AO FAZER DEPLOY")
        print("=" * 70)
        print(f"\nErro: {error}")
        print(f"\nSaida: {output}")
        
        # Tentar diagnosticar o problema
        if "not found" in error.lower() or "404" in error.lower():
            print("\nPROBLEMA: Funcao nao encontrada")
            print("   Tente criar a funcao primeiro no dashboard do Supabase")
        elif "authentication" in error.lower() or "permission" in error.lower():
            print("\nPROBLEMA DE AUTENTICACAO")
            print("   Verifique se esta logado com a conta correta")
            print("   Execute: npx supabase login")
        elif "module not found" in error.lower():
            print("\nPROBLEMA: Modulo nao encontrado")
            print("   Verifique se todos os arquivos estao na pasta da funcao")
        
        return 1

if __name__ == "__main__":
    sys.exit(main())

