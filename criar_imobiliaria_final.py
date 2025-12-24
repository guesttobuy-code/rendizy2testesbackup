import os
import requests
import json
import sys

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

result_text = []
result_text.append("=" * 60)
result_text.append("CRIANDO IMOBILIÁRIA")
result_text.append("=" * 60)
result_text.append(f"Nome: {payload['name']}")
result_text.append(f"Email: {payload['email']}")
result_text.append(f"Plano: {payload['plan']}")
result_text.append("")

try:
    response = requests.post(url, headers=headers, json=payload, timeout=30)
    
    result_text.append(f"Status Code: {response.status_code}")
    result_text.append("")
    
    if response.status_code == 201:
        result = response.json()
        if result.get('success'):
            data = result['data']
            result_text.append("✅ IMOBILIÁRIA CRIADA COM SUCESSO!")
            result_text.append("")
            result_text.append(f"ID: {data['id']}")
            result_text.append(f"Slug: {data['slug']}")
            result_text.append(f"Nome: {data['name']}")
            result_text.append(f"Email: {data['email']}")
            result_text.append(f"Plano: {data['plan']}")
            result_text.append(f"Status: {data['status']}")
        else:
            result_text.append(f"❌ Erro: {result.get('error', 'Erro desconhecido')}")
    else:
        result_text.append(f"❌ Erro HTTP {response.status_code}")
        result_text.append(f"Resposta: {response.text}")
        
except Exception as e:
    result_text.append(f"❌ Erro na requisição: {e}")

result_text.append("")
result_text.append("=" * 60)

output = "\n".join(result_text)
print(output)

# Salvar em arquivo também
with open("resultado_criacao_imobiliaria.txt", "w", encoding="utf-8") as f:
    f.write(output)
