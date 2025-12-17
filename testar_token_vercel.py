#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para testar token do Vercel e verificar deployments
"""

import urllib.request
import urllib.parse
import json
import sys

# Token do Vercel
TOKEN = 'k2UmB1MFlrIhEXUB3mInJgxR'

def make_request(url, method='GET', params=None):
    """Faz requisição HTTP"""
    if params:
        url += '?' + urllib.parse.urlencode(params)
    
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Content-Type', 'application/json')
    
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            data = json.loads(response.read().decode())
            return status, data
    except urllib.error.HTTPError as e:
        try:
            error_data = json.loads(e.read().decode()) if e.read() else {}
        except:
            error_data = {'error': str(e)}
        return e.code, error_data
    except Exception as e:
        return None, {'error': str(e)}

def test_token():
    """Testa se o token é válido"""
    print("=" * 70)
    print("TESTANDO TOKEN DO VERCEL")
    print("=" * 70)
    print()
    
    try:
        # Testar autenticação
        print("1. Verificando autenticação...")
        status, data = make_request('https://api.vercel.com/v2/user')
        
        if status == 200:
            user = data.get('user', {})
            print(f"   ✅ Token válido!")
            print(f"   Usuário: {user.get('username', 'N/A')}")
            print(f"   Email: {user.get('email', 'N/A')}")
        else:
            print(f"   ❌ Erro: {status}")
            print(f"   Resposta: {data}")
            return False
        print()
        
        # Listar projetos
        print("2. Listando projetos...")
        status, data = make_request('https://api.vercel.com/v9/projects')
        
        if status == 200:
            projects = data.get('projects', [])
            print(f"   ✅ Encontrados {len(projects)} projetos")
            for project in projects[:5]:
                print(f"      - {project.get('name')} ({project.get('id')})")
        else:
            print(f"   ❌ Erro: {status}")
        print()
        
        # Buscar projeto Rendizyoficial
        print("3. Buscando projeto Rendizyoficial...")
        status, data = make_request('https://api.vercel.com/v9/projects')
        
        if status == 200:
            projects = data.get('projects', [])
            rendizy_project = None
            for project in projects:
                if 'rendizy' in project.get('name', '').lower():
                    rendizy_project = project
                    break
            
            if rendizy_project:
                print(f"   ✅ Projeto encontrado: {rendizy_project.get('name')}")
                project_id = rendizy_project.get('id')
                
                # Listar deployments
                print()
                print("4. Listando últimos deployments...")
                status, data = make_request(
                    'https://api.vercel.com/v6/deployments',
                    params={'projectId': project_id, 'limit': 5}
                )
                
                if status == 200:
                    deployments = data.get('deployments', [])
                    print(f"   ✅ Encontrados {len(deployments)} deployments")
                    for dep in deployments[:5]:
                        state = dep.get('readyState', 'UNKNOWN')
                        commit = dep.get('meta', {}).get('githubCommitMessage', 'N/A')[:50]
                        print(f"      - {dep.get('uid', 'N/A')[:8]}... | {state} | {commit}")
                else:
                    print(f"   ❌ Erro ao listar deployments: {status}")
            else:
                print("   ⚠️  Projeto Rendizyoficial não encontrado")
        print()
        
        print("=" * 70)
        print("TOKEN FUNCIONANDO! ✅")
        print("=" * 70)
        return True
        
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_token()
    sys.exit(0 if success else 1)

