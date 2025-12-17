#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para ver logs de um deployment específico
"""

import urllib.request
import urllib.parse
import json
import sys

TOKEN = 'k2UmB1MFlrIhEXUB3mInJgxR'

def get_deployment_logs(deployment_id):
    """Obtém logs de um deployment"""
    url = f'https://api.vercel.com/v2/deployments/{deployment_id}/events'
    
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data
    except urllib.error.HTTPError as e:
        try:
            error_data = json.loads(e.read().decode()) if e.read() else {}
        except:
            error_data = {'error': str(e)}
        return error_data
    except Exception as e:
        return {'error': str(e)}

def get_build_logs(deployment_id):
    """Obtém build logs de um deployment"""
    # Tentar obter logs de build via API
    url = f'https://api.vercel.com/v6/deployments/{deployment_id}/events'
    
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data
    except Exception as e:
        return {'error': str(e)}

def main():
    print("=" * 70)
    print("VERIFICANDO LOGS DO ÚLTIMO DEPLOYMENT")
    print("=" * 70)
    print()
    
    # Obter último deployment
    url = 'https://api.vercel.com/v6/deployments?projectId=prj_61N7bqdjsoNkQm27p4NtsiOKUkra&limit=1'
    req = urllib.request.Request(url)
    req.add_header('Authorization', f'Bearer {TOKEN}')
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            deployments = data.get('deployments', [])
            
            if deployments:
                latest = deployments[0]
                deployment_id = latest.get('uid')
                state = latest.get('readyState')
                commit = latest.get('meta', {}).get('githubCommitMessage', 'N/A')
                
                print(f"Deployment ID: {deployment_id}")
                print(f"Status: {state}")
                print(f"Commit: {commit[:60]}")
                print()
                
                # Tentar obter logs
                print("Buscando logs de build...")
                logs = get_build_logs(deployment_id)
                
                if 'error' not in logs:
                    events = logs.get('events', [])
                    if events:
                        print(f"Encontrados {len(events)} eventos de log")
                        print()
                        print("ÚLTIMOS LOGS:")
                        print("-" * 70)
                        for event in events[-20:]:  # Últimos 20 eventos
                            payload = event.get('payload', {})
                            text = payload.get('text', '')
                            if text:
                                print(text)
                    else:
                        print("Nenhum log encontrado via API")
                        print()
                        print("Acesse manualmente:")
                        print(f"https://vercel.com/rendizy-oficial/rendizyoficial/{deployment_id}")
                else:
                    print(f"Erro ao obter logs: {logs.get('error')}")
                    print()
                    print("Acesse manualmente:")
                    print(f"https://vercel.com/rendizy-oficial/rendizyoficial/{deployment_id}")
            else:
                print("Nenhum deployment encontrado")
                
    except Exception as e:
        print(f"Erro: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

