#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para verificar qual deployment está ativo em produção
"""

import urllib.request
import urllib.parse
import json
import sys

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

def main():
    print("=" * 70)
    print("VERIFICANDO DEPLOYMENT EM PRODUÇÃO")
    print("=" * 70)
    print()
    
    project_id = 'prj_61N7bqdjsoNkQm27p4NtsiOKUkra'
    
    # Buscar deployments de produção
    print("1. Buscando deployments de produção...")
    status, data = make_request(
        'https://api.vercel.com/v6/deployments',
        params={'projectId': project_id, 'limit': 10, 'target': 'production'}
    )
    
    if status == 200:
        deployments = data.get('deployments', [])
        print(f"   ✅ Encontrados {len(deployments)} deployments de produção")
        print()
        
        if deployments:
            latest_prod = deployments[0]
            deployment_id = latest_prod.get('uid')
            state = latest_prod.get('readyState')
            commit = latest_prod.get('meta', {}).get('githubCommitMessage', 'N/A')[:60]
            commit_sha = latest_prod.get('meta', {}).get('githubCommitSha', 'N/A')[:8]
            created = latest_prod.get('createdAt', 'N/A')
            
            print("   DEPLOYMENT ATIVO EM PRODUÇÃO:")
            print(f"   ID: {deployment_id}")
            print(f"   Status: {state}")
            print(f"   Commit: {commit_sha} - {commit}")
            print(f"   Criado em: {created}")
            print()
            
            # Verificar se é o deployment mais recente
            print("2. Comparando com último commit do GitHub...")
            status2, data2 = make_request(
                'https://api.vercel.com/v6/deployments',
                params={'projectId': project_id, 'limit': 1}
            )
            
            if status2 == 200:
                all_deployments = data2.get('deployments', [])
                if all_deployments:
                    latest_all = all_deployments[0]
                    latest_id = latest_all.get('uid')
                    latest_state = latest_all.get('readyState')
                    latest_commit = latest_all.get('meta', {}).get('githubCommitSha', 'N/A')[:8]
                    
                    print(f"   Último deployment (qualquer status): {latest_id[:8]}... | {latest_state} | {latest_commit}")
                    print()
                    
                    if deployment_id == latest_id:
                        print("   ✅ Produção está usando o deployment mais recente!")
                    else:
                        print("   ⚠️  Produção NÃO está usando o deployment mais recente")
                        print(f"   Produção: {deployment_id[:8]}...")
                        print(f"   Mais recente: {latest_id[:8]}...")
        else:
            print("   ⚠️  Nenhum deployment de produção encontrado")
    else:
        print(f"   ❌ Erro: {status}")
        print(f"   {data}")

if __name__ == "__main__":
    main()

