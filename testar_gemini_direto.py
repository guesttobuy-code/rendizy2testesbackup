#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para testar a API do Google Gemini diretamente
"""

import urllib.request
import urllib.parse
import json
import sys

# API Key fornecida
API_KEY = "AIzaSyB7zxTH2Q6nDyYMGEb7AUrwidIiy1W9Qzw"

def print_success(msg):
    print(f"✅ {msg}")

def print_error(msg):
    print(f"❌ {msg}")

def print_info(msg):
    print(f"ℹ️  {msg}")

def print_header(msg):
    print(f"\n{'='*60}")
    print(f"{msg}")
    print(f"{'='*60}\n")

def test_list_models():
    """Testa listar modelos disponíveis"""
    print_header("1. LISTANDO MODELOS DISPONÍVEIS")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"
    
    try:
        req = urllib.request.Request(url)
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if 'models' in data:
                print_success(f"Encontrados {len(data['models'])} modelos!")
                print("\n📋 Modelos disponíveis:")
                print("-" * 60)
                
                working_models = []
                for model in data['models']:
                    name = model.get('name', 'N/A')
                    display_name = model.get('displayName', 'N/A')
                    supported_methods = model.get('supportedGenerationMethods', [])
                    
                    # Remover prefixo "models/" se existir
                    clean_name = name.replace('models/', '')
                    
                    if 'generateContent' in supported_methods:
                        print(f"✅ {clean_name} - {display_name}")
                        working_models.append(clean_name)
                    else:
                        print(f"⚠️  {clean_name} - {display_name} (sem generateContent)")
                
                return working_models
            else:
                print_error("Resposta não contém 'models'")
                print(f"Resposta: {json.dumps(data, indent=2)}")
                return []
                
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print_error(f"Erro HTTP {e.code}: {e.reason}")
        try:
            error_json = json.loads(error_body)
            print_error(f"Detalhes: {json.dumps(error_json, indent=2)}")
        except:
            print_error(f"Resposta: {error_body}")
        return []
    except Exception as e:
        print_error(f"Erro ao listar modelos: {str(e)}")
        return []

def test_generate_content(model_name):
    """Testa gerar conteúdo com um modelo"""
    print_header(f"2. TESTANDO GERAR CONTEÚDO COM {model_name}")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={API_KEY}"
    
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": "Olá! Você está funcionando? Responda apenas 'Sim, estou funcionando!'"
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 100
        }
    }
    
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            print_success("✅ Resposta recebida!")
            
            # Extrair texto da resposta
            if 'candidates' in result and len(result['candidates']) > 0:
                candidate = result['candidates'][0]
                if 'content' in candidate and 'parts' in candidate['content']:
                    text_parts = [part.get('text', '') for part in candidate['content']['parts'] if 'text' in part]
                    if text_parts:
                        response_text = ''.join(text_parts)
                        print_success(f"✅ Texto gerado: {response_text}")
                        return True
            
            print_error("Não foi possível extrair texto da resposta")
            print(f"Resposta completa: {json.dumps(result, indent=2, ensure_ascii=False)}")
            return False
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print_error(f"Erro HTTP {e.code}: {e.reason}")
        try:
            error_json = json.loads(error_body)
            error_msg = error_json.get('error', {}).get('message', '')
            print_error(f"Mensagem: {error_msg}")
            
            if 'not found' in error_msg.lower() or 'not supported' in error_msg.lower():
                print_error("⚠️  MODELO NÃO ENCONTRADO OU NÃO SUPORTADO PARA generateContent!")
        except:
            print_error(f"Resposta: {error_body}")
        return False
    except Exception as e:
        print_error(f"Erro ao gerar conteúdo: {str(e)}")
        return False

def test_automation_generation(model_name):
    """Testa geração de automação (caso de uso real)"""
    print_header(f"3. TESTANDO GERAÇÃO DE AUTOMAÇÃO COM {model_name}")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={API_KEY}"
    
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": """Converta esta descrição em uma automação estruturada:

"Todo dia às 18h envie resumo das reservas e pendências"

Retorne um JSON com:
- name: nome da automação
- description: descrição
- trigger: objeto com type e configuração
- actions: array de ações

Formato esperado:
{
  "name": "...",
  "description": "...",
  "trigger": {"type": "cron", "schedule": "0 18 * * *"},
  "actions": [{"type": "send_message", "channel": "chat", "message": "..."}]
}"""
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1000
        }
    }
    
    try:
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            if 'candidates' in result and len(result['candidates']) > 0:
                candidate = result['candidates'][0]
                if 'content' in candidate and 'parts' in candidate['content']:
                    text_parts = [part.get('text', '') for part in candidate['content']['parts'] if 'text' in part]
                    if text_parts:
                        response_text = ''.join(text_parts)
                        print_success("✅ Resposta recebida!")
                        print("\n📋 Resposta da IA:")
                        print("-" * 60)
                        print(response_text)
                        print("-" * 60)
                        
                        # Tentar parsear como JSON
                        try:
                            # Limpar markdown se houver
                            cleaned = response_text.strip()
                            if cleaned.startswith('```json'):
                                cleaned = cleaned.replace('```json', '').replace('```', '').strip()
                            elif cleaned.startswith('```'):
                                cleaned = cleaned.replace('```', '').strip()
                            
                            automation_json = json.loads(cleaned)
                            print_success("\n✅ JSON válido parseado!")
                            print(f"Automação: {automation_json.get('name', 'N/A')}")
                            return True
                        except json.JSONDecodeError:
                            print_error("⚠️  Resposta não é um JSON válido")
                            return False
            
            print_error("Não foi possível extrair resposta")
            return False
            
    except Exception as e:
        print_error(f"Erro: {str(e)}")
        return False

def main():
    print_header("🚀 TESTE DA API DO GOOGLE GEMINI")
    print_info(f"API Key: {API_KEY[:10]}...{API_KEY[-4:]}")
    
    # Teste 1: Listar modelos
    working_models = test_list_models()
    
    if not working_models:
        print_error("❌ Nenhum modelo disponível. Verifique sua API key.")
        return
    
    # Teste 2: Testar o primeiro modelo que funciona
    if working_models:
        model_to_test = working_models[0]
        print_info(f"\nUsando modelo: {model_to_test}")
        
        if test_generate_content(model_to_test):
            # Teste 3: Testar geração de automação
            test_automation_generation(model_to_test)
        else:
            print_error("❌ Não foi possível gerar conteúdo. Testando outros modelos...")
            for model in working_models[1:]:
                print_info(f"\nTentando modelo: {model}")
                if test_generate_content(model):
                    test_automation_generation(model)
                    break
    
    print_header("✅ TESTES CONCLUÍDOS")
    print_info("Verifique os resultados acima.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Teste interrompido pelo usuário.")
        sys.exit(0)
    except Exception as e:
        print_error(f"\n❌ Erro inesperado: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

