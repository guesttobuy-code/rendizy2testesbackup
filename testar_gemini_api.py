#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para testar a API do Google Gemini diretamente
Verifica modelos disponíveis e funcionalidades
"""

import urllib.request
import urllib.parse
import json
import sys

# Cores para output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.RESET}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.RESET}")

def print_header(msg):
    print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{msg}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.RESET}\n")

def test_list_models(api_key):
    """Testa listar modelos disponíveis"""
    print_header("1. TESTANDO LISTAR MODELOS DISPONÍVEIS")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    
    try:
        print_info(f"URL: {url.replace(api_key, 'API_KEY_HIDDEN')}")
        
        req = urllib.request.Request(url)
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            
            if 'models' in data:
                print_success(f"Encontrados {len(data['models'])} modelos!")
                print("\n📋 Modelos disponíveis:")
                print("-" * 60)
                
                for model in data['models']:
                    name = model.get('name', 'N/A')
                    display_name = model.get('displayName', 'N/A')
                    description = model.get('description', 'N/A')
                    supported_methods = model.get('supportedGenerationMethods', [])
                    
                    print(f"\n{Colors.BOLD}Nome: {name}{Colors.RESET}")
                    print(f"  Display: {display_name}")
                    print(f"  Descrição: {description[:80]}...")
                    print(f"  Métodos suportados: {', '.join(supported_methods)}")
                    
                    # Verificar se suporta generateContent
                    if 'generateContent' in supported_methods:
                        print_success("  ✅ Suporta generateContent")
                    else:
                        print_warning("  ⚠️  NÃO suporta generateContent")
                
                return data['models']
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

def test_generate_content(api_key, model_name="gemini-1.5-pro"):
    """Testa gerar conteúdo com um modelo"""
    print_header(f"2. TESTANDO GERAR CONTEÚDO COM {model_name}")
    
    # URL com API key como query parameter (formato Gemini)
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
    
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
        print_info(f"Modelo: {model_name}")
        print_info(f"URL: {url.replace(api_key, 'API_KEY_HIDDEN')}")
        print_info(f"Payload: {json.dumps(payload, indent=2, ensure_ascii=False)}")
        
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(url, data=data, method='POST')
        req.add_header('Content-Type', 'application/json')
        
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode('utf-8'))
            
            print_success("✅ Resposta recebida!")
            print("\n📋 Resposta completa:")
            print("-" * 60)
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            # Extrair texto da resposta
            if 'candidates' in result and len(result['candidates']) > 0:
                candidate = result['candidates'][0]
                if 'content' in candidate and 'parts' in candidate['content']:
                    text_parts = [part.get('text', '') for part in candidate['content']['parts'] if 'text' in part]
                    if text_parts:
                        print_success(f"\n✅ Texto gerado: {''.join(text_parts)}")
                        return True
            
            print_warning("⚠️  Não foi possível extrair texto da resposta")
            return False
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print_error(f"Erro HTTP {e.code}: {e.reason}")
        try:
            error_json = json.loads(error_body)
            print_error(f"Detalhes: {json.dumps(error_json, indent=2, ensure_ascii=False)}")
            
            # Verificar se é erro de modelo não encontrado
            if 'error' in error_json:
                error_msg = error_json['error'].get('message', '')
                if 'not found' in error_msg.lower() or 'not supported' in error_msg.lower():
                    print_warning("\n⚠️  MODELO NÃO ENCONTRADO OU NÃO SUPORTADO!")
                    print_warning("Tente usar um modelo da lista de modelos disponíveis.")
        except:
            print_error(f"Resposta: {error_body}")
        return False
    except Exception as e:
        print_error(f"Erro ao gerar conteúdo: {str(e)}")
        return False

def test_available_models(api_key):
    """Testa modelos comuns do Gemini"""
    print_header("3. TESTANDO MODELOS COMUNS DO GEMINI")
    
    common_models = [
        "gemini-1.5-pro",
        "gemini-1.5-flash",
        "gemini-pro",
        "gemini-1.0-pro",
        "models/gemini-1.5-pro",
        "models/gemini-1.5-flash",
    ]
    
    working_models = []
    
    for model in common_models:
        print(f"\n{Colors.BOLD}Testando: {model}{Colors.RESET}")
        if test_generate_content(api_key, model):
            working_models.append(model)
            print_success(f"✅ {model} FUNCIONA!")
        else:
            print_warning(f"⚠️  {model} não funcionou")
    
    if working_models:
        print_success(f"\n✅ Modelos funcionando: {', '.join(working_models)}")
    else:
        print_error("\n❌ Nenhum modelo funcionou!")
    
    return working_models

def main():
    print_header("🚀 TESTE DA API DO GOOGLE GEMINI")
    
    # Solicitar API key
    print_info("Este script testa a API do Google Gemini diretamente.")
    print_info("Você precisa de uma API key do Google AI Studio.")
    print_info("Obter em: https://aistudio.google.com/app/apikey\n")
    
    api_key = input(f"{Colors.CYAN}Digite sua API key do Gemini (ou pressione Enter para pular): {Colors.RESET}").strip()
    
    if not api_key:
        print_warning("⚠️  Sem API key, pulando testes que requerem autenticação...")
        print_info("Você pode obter uma API key em: https://aistudio.google.com/app/apikey")
        return
    
    # Teste 1: Listar modelos
    models = test_list_models(api_key)
    
    if not models:
        print_error("❌ Não foi possível listar modelos. Verifique sua API key.")
        return
    
    # Teste 2: Gerar conteúdo com modelo padrão
    print("\n" + "="*60)
    model_to_test = "gemini-1.5-pro"
    if models:
        # Tentar usar o primeiro modelo que suporta generateContent
        for model in models:
            if 'generateContent' in model.get('supportedGenerationMethods', []):
                model_name = model['name']
                # Remover prefixo "models/" se existir
                if model_name.startswith('models/'):
                    model_name = model_name.replace('models/', '')
                model_to_test = model_name
                break
    
    test_generate_content(api_key, model_to_test)
    
    # Teste 3: Testar modelos comuns
    test_available_models(api_key)
    
    print_header("✅ TESTES CONCLUÍDOS")
    print_info("Verifique os resultados acima para ver quais modelos funcionam.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}⚠️  Teste interrompido pelo usuário.{Colors.RESET}")
        sys.exit(0)
    except Exception as e:
        print_error(f"\n❌ Erro inesperado: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

