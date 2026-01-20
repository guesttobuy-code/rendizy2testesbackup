import os
import requests
import json

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL:
    raise SystemExit("Missing env var SUPABASE_URL")

if not SUPABASE_ANON_KEY:
    raise SystemExit("Missing env var SUPABASE_ANON_KEY")

url = f"{SUPABASE_URL.rstrip('/')}/functions/v1/rendizy-server/organizations"

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "apikey": SUPABASE_ANON_KEY,
}

payload = {
    "name": "Sua Casa Mobiliada",
    "email": "suacasamobiliada@gmail.com",
    "phone": "",
    "plan": "enterprise",
    "createdBy": "user_master_rendizy"
}

print("Criando imobiliária...")
print(f"Nome: {payload['name']}")
print(f"Email: {payload['email']}")
print(f"Plano: {payload['plan']}")
print()

try:
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    
    print(f"Status Code: {response.status_code}")
    print()
    
    if response.status_code == 201:
        result = response.json()
        if result.get('success'):
            data = result['data']
            print("✅ IMOBILIÁRIA CRIADA COM SUCESSO!")
            print()
            print(f"ID: {data['id']}")
            print(f"Slug: {data['slug']}")
            print(f"Nome: {data['name']}")
            print(f"Email: {data['email']}")
            print(f"Plano: {data['plan']}")
            print(f"Status: {data['status']}")
        else:
            print(f"❌ Erro: {result.get('error', 'Erro desconhecido')}")
    else:
        print(f"❌ Erro HTTP {response.status_code}")
        print(f"Resposta: {response.text}")
        
except Exception as e:
    print(f"❌ Erro na requisição: {e}")
