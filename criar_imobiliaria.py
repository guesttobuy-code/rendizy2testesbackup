import requests
import json

url = "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/organizations"

headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ"
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
