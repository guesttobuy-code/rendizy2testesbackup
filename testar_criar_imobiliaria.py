"""
Script de teste para criar imobiliária via API

Uso: python testar_criar_imobiliaria.py
"""

import requests
import json
import sys

PROJECT_ID = 'odcgnzfremrqnvtitpcc'
PUBLIC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

BASE_URL = f'https://{PROJECT_ID}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a'

def criar_imobiliaria():
    nome = 'Teste Imobiliária'
    email = 'teste@imobiliaria.com'
    telefone = '(11) 99999-9999'
    plano = 'free'

    print('🚀 Iniciando teste de criação de imobiliária...\n')
    print('📋 Dados:')
    print(f'   Nome: {nome}')
    print(f'   Email: {email}')
    print(f'   Telefone: {telefone}')
    print(f'   Plano: {plano}\n')

    try:
        # 1. Criar organização
        print('📤 Enviando requisição POST /organizations...')
        response = requests.post(
            f'{BASE_URL}/organizations',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {PUBLIC_ANON_KEY}',
                'apikey': PUBLIC_ANON_KEY
            },
            json={
                'name': nome,
                'email': email,
                'phone': telefone,
                'plan': plano,
                'createdBy': 'user_master_rendizy'
            },
            timeout=30
        )

        print(f'📥 Status: {response.status_code} {response.reason}')

        if not response.ok:
            error_text = response.text
            print(f'❌ Erro HTTP: {error_text}')
            raise Exception(f'HTTP {response.status_code}: {error_text}')

        result = response.json()
        print('✅ Resposta recebida:', json.dumps(result, indent=2, ensure_ascii=False))

        if not result.get('success'):
            raise Exception(result.get('error', 'Erro ao criar imobiliária'))

        org = result['data']
        print('\n✅ IMOBILIÁRIA CRIADA COM SUCESSO!')
        print(f'   ID: {org["id"]}')
        print(f'   Slug: {org["slug"]}')
        print(f'   Nome: {org["name"]}')
        print(f'   Email: {org["email"]}')
        print(f'   Plano: {org["plan"]}')
        print(f'   Status: {org["status"]}')

        # 2. Verificar se foi criada no banco (buscar por ID)
        print('\n🔍 Verificando se foi criada no banco...')
        verify_response = requests.get(
            f'{BASE_URL}/organizations/{org["id"]}',
            headers={
                'Authorization': f'Bearer {PUBLIC_ANON_KEY}',
                'apikey': PUBLIC_ANON_KEY
            },
            timeout=30
        )

        if verify_response.ok:
            verify_result = verify_response.json()
            if verify_result.get('success'):
                print('✅ Verificação: Imobiliária encontrada no banco!')
                print(f'   Slug verificado: {verify_result["data"]["slug"]}')
            else:
                print('⚠️ Verificação: Imobiliária criada mas não encontrada no banco')
        else:
            print('⚠️ Verificação: Erro ao buscar imobiliária criada')

        # 3. Verificar se slug é único (buscar por slug)
        print('\n🔍 Verificando se slug é único...')
        slug_response = requests.get(
            f'{BASE_URL}/organizations/slug/{org["slug"]}',
            headers={
                'Authorization': f'Bearer {PUBLIC_ANON_KEY}',
                'apikey': PUBLIC_ANON_KEY
            },
            timeout=30
        )

        if slug_response.ok:
            slug_result = slug_response.json()
            if slug_result.get('success') and slug_result['data']['id'] == org['id']:
                print('✅ Verificação: Slug é único e corresponde à imobiliária criada!')
            else:
                print('⚠️ Verificação: Slug pode não ser único')
        else:
            print('⚠️ Verificação: Erro ao buscar por slug')

        print('\n✅ TESTE CONCLUÍDO COM SUCESSO!')
        return org

    except requests.exceptions.RequestException as e:
        print(f'\n❌ ERRO DE REDE:')
        print(f'   {str(e)}')
        raise
    except Exception as e:
        print(f'\n❌ ERRO NO TESTE:')
        print(f'   {str(e)}')
        raise

if __name__ == '__main__':
    try:
        org = criar_imobiliaria()
        print('\n🎉 Imobiliária criada com sucesso!')
        print(f'   Use este ID para testes: {org["id"]}')
        sys.exit(0)
    except Exception as e:
        print('\n💥 Falha no teste')
        sys.exit(1)
