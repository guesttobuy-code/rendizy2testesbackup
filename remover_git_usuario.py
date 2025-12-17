#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para remover o repositorio Git do diretorio do usuario
e inicializar Git no diretorio do projeto
"""

import subprocess
import sys
from pathlib import Path
import os
import shutil

# Configurar encoding para Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_command(cmd, cwd=None):
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
        return result.returncode == 0, result.stdout, result.stderr
    except Exception as e:
        return False, "", str(e)

def main():
    project_dir = Path(__file__).parent.absolute()
    user_home = Path.home()
    git_in_home = user_home / ".git"
    
    print("=" * 70)
    print("REMOCAO DO REPOSITORIO GIT DO DIRETORIO DO USUARIO")
    print("=" * 70)
    print(f"\nDiretorio do usuario: {user_home}")
    print(f"Repositorio a remover: {git_in_home}\n")
    
    if not git_in_home.exists():
        print("OK: Nao ha repositorio Git no diretorio do usuario")
        print("Nada a fazer!")
        return 0
    
    # Tentar remover usando diferentes metodos
    print("Tentando remover o repositorio Git...")
    print("(Isso pode requerer permissoes de administrador)\n")
    
    # Metodo 1: Tentar remover diretamente
    try:
        shutil.rmtree(git_in_home)
        print("OK: Repositorio Git removido com sucesso!")
    except PermissionError:
        print("ERRO: Permissao negada ao tentar remover diretamente")
        print("\nTentando metodo alternativo (renomear)...")
        
        # Metodo 2: Renomear ao inves de remover
        try:
            backup_name = user_home / ".git_backup_old"
            if backup_name.exists():
                shutil.rmtree(backup_name)
            git_in_home.rename(backup_name)
            print(f"OK: Repositorio Git renomeado para: {backup_name}")
            print("Voce pode removê-lo manualmente depois com permissoes de admin")
        except Exception as e:
            print(f"ERRO ao renomear: {e}")
            print("\n" + "=" * 70)
            print("NAO FOI POSSIVEL REMOVER AUTOMATICAMENTE")
            print("=" * 70)
            print("\nVoce precisa remover manualmente:")
            print(f"   {git_in_home}")
            print("\nOpcoes:")
            print("1. Abra PowerShell como Administrador e execute:")
            print(f'   Remove-Item -Path "{git_in_home}" -Recurse -Force')
            print("\n2. Ou use o Explorador de Arquivos:")
            print("   - Vá para:", user_home)
            print("   - Mostre arquivos ocultos (View > Hidden items)")
            print("   - Delete a pasta .git")
            return 1
    except Exception as e:
        print(f"ERRO inesperado: {e}")
        return 1
    
    # Verificar se o projeto tem Git
    print("\n" + "=" * 70)
    print("VERIFICANDO REPOSITORIO NO PROJETO")
    print("=" * 70)
    
    git_in_project = project_dir / ".git"
    if not git_in_project.exists():
        print("\nInicializando repositorio Git no projeto...")
        success, output, error = run_command("git init", cwd=project_dir)
        if success:
            print("OK: Repositorio Git inicializado no projeto")
        else:
            print(f"AVISO: Nao foi possivel inicializar: {error}")
    else:
        print("OK: Repositorio Git ja existe no projeto")
    
    # Verificar remote
    print("\nVerificando remote configurado...")
    success, remotes, _ = run_command("git remote -v", cwd=project_dir)
    if success and remotes.strip():
        print("Remotes configurados:")
        for line in remotes.strip().split('\n'):
            if line.strip():
                print(f"  {line}")
    else:
        print("ATENCAO: Nenhum remote configurado")
        print("Voce precisara configurar o remote do GitHub depois")
    
    print("\n" + "=" * 70)
    print("CONCLUIDO!")
    print("=" * 70)
    print("\nO aviso do Git nao deve mais aparecer!")
    print("\nProximos passos:")
    print("1. Feche e reabra o Cursor/VS Code")
    print("2. Execute: python diagnosticar_git.py")
    print("3. Se necessario, configure o remote:")
    print("   git remote add origin https://github.com/USUARIO/REPO.git")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())


