#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para configurar o Gemini no banco de dados
Atualiza ou cria a configuração do provedor de IA Gemini
"""

import os
import sys
import json
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import base64

# Configurações do Supabase
SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIxNzY0MDAsImV4cCI6MjA0NzczNjQwMH0.7qJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq"

# API Key do Gemini (fornecida pelo usuário)
GEMINI_API_KEY = "AIzaSyB7zxTH2Q6nDyYMGEb7AUrwidIiy1W9Qzw"

# Modelo Gemini testado e funcionando
GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

def encrypt_api_key(api_key: str) -> str:
    """
    Simula criptografia da API key
    Em produção, isso deve usar a mesma função de criptografia do backend
    Por enquanto, vamos apenas base64 (não é seguro, mas funciona para teste)
    """
    return base64.b64encode(api_key.encode()).decode()

def get_organization_id():
    """Obtém o organization_id do banco de dados"""
    url = f"{SUPABASE_URL}/rest/v1/organizations?select=id&limit=1"
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    try:
        req = Request(url, headers=headers)
        with urlopen(req) as response:
            data = json.loads(response.read().decode())
            if data and len(data) > 0:
                return data[0]["id"]
            return None
    except Exception as e:
        print(f"❌ Erro ao buscar organization_id: {e}")
        return None

def check_existing_config(organization_id: str):
    """Verifica se já existe configuração de IA para a organização"""
    url = f"{SUPABASE_URL}/rest/v1/ai_provider_configs?organization_id=eq.{organization_id}&select=*"
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
    }
    
    try:
        req = Request(url, headers=headers)
        with urlopen(req) as response:
            data = json.loads(response.read().decode())
            return data[0] if data and len(data) > 0 else None
    except Exception as e:
        print(f"⚠️  Erro ao verificar configuração existente: {e}")
        return None

def create_or_update_config(organization_id: str, existing_config=None):
    """Cria ou atualiza a configuração do Gemini"""
    
    # Criptografar API key (simulado)
    encrypted_key = encrypt_api_key(GEMINI_API_KEY)
    
    config_data = {
        "organization_id": organization_id,
        "provider": "google-gemini",
        "base_url": GEMINI_BASE_URL,
        "default_model": GEMINI_MODEL,
        "enabled": True,
        "is_active": True,
        "temperature": 0.2,
        "max_tokens": 1000,
        "prompt_template": "Você é o copiloto oficial do Rendizy. Responda sempre em português brasileiro.",
        "api_key_encrypted": encrypted_key,
        "notes": "Configurado automaticamente via script - modelo testado: gemini-2.5-flash"
    }
    
    if existing_config:
        # Atualizar configuração existente
        config_id = existing_config["id"]
        url = f"{SUPABASE_URL}/rest/v1/ai_provider_configs?id=eq.{config_id}"
        method = "PATCH"
        print(f"🔄 Atualizando configuração existente (ID: {config_id})...")
    else:
        # Criar nova configuração
        url = f"{SUPABASE_URL}/rest/v1/ai_provider_configs"
        method = "POST"
        print(f"➕ Criando nova configuração...")
    
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    try:
        req = Request(url, data=json.dumps(config_data).encode(), headers=headers, method=method)
        with urlopen(req) as response:
            result = json.loads(response.read().decode())
            if isinstance(result, list) and len(result) > 0:
                result = result[0]
            
            print(f"✅ Configuração {'atualizada' if existing_config else 'criada'} com sucesso!")
            print(f"   Provider: {result.get('provider')}")
            print(f"   Modelo: {result.get('default_model')}")
            print(f"   Base URL: {result.get('base_url')}")
            print(f"   Habilitado: {result.get('enabled')}")
            return result
    except HTTPError as e:
        error_body = e.read().decode() if e.fp else "Sem detalhes"
        print(f"❌ Erro HTTP {e.code}: {error_body}")
        return None
    except Exception as e:
        print(f"❌ Erro ao {'atualizar' if existing_config else 'criar'} configuração: {e}")
        return None

def main():
    print("=" * 60)
    print("🔧 CONFIGURADOR DE GEMINI NO BANCO DE DADOS")
    print("=" * 60)
    print()
    
    # Obter organization_id
    print("📋 Buscando organization_id...")
    organization_id = get_organization_id()
    
    if not organization_id:
        print("❌ Não foi possível obter organization_id")
        print("   Certifique-se de que existe pelo menos uma organização no banco")
        return 1
    
    print(f"✅ Organization ID encontrado: {organization_id}")
    print()
    
    # Verificar se já existe configuração
    print("🔍 Verificando configuração existente...")
    existing_config = check_existing_config(organization_id)
    
    if existing_config:
        print(f"⚠️  Configuração existente encontrada:")
        print(f"   Provider: {existing_config.get('provider')}")
        print(f"   Modelo atual: {existing_config.get('default_model')}")
        print(f"   Habilitado: {existing_config.get('enabled')}")
        print()
        print("🔄 Atualizando para usar gemini-2.5-flash...")
    else:
        print("➕ Nenhuma configuração encontrada. Criando nova...")
    
    print()
    
    # Criar ou atualizar configuração
    result = create_or_update_config(organization_id, existing_config)
    
    if result:
        print()
        print("=" * 60)
        print("✅ CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!")
        print("=" * 60)
        print()
        print("📝 Próximos passos:")
        print("   1. Teste a automação no sistema")
        print("   2. Verifique se o modelo gemini-2.5-flash está funcionando")
        print("   3. Se necessário, ajuste temperatura e max_tokens")
        return 0
    else:
        print()
        print("=" * 60)
        print("❌ FALHA AO CONFIGURAR")
        print("=" * 60)
        print()
        print("⚠️  Verifique:")
        print("   1. Se a tabela ai_provider_configs existe")
        print("   2. Se você tem permissão para inserir/atualizar")
        print("   3. Se a API key do Gemini está correta")
        return 1

if __name__ == "__main__":
    sys.exit(main())

