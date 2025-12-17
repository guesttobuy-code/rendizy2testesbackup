# 🏢 Sistema Multi-Tenant - Evolution API

## 📋 Visão Geral

Cada usuário pode ter suas próprias credenciais da Evolution API.
Se não configurar, usa automaticamente as do **superadmin (user_id = 1)**.

## 🔧 Como Usar nos Endpoints

### Exemplo 1: Enviar Mensagem WhatsApp

```typescript
import { getEvolutionCredentials, getEvolutionMessageHeaders } from './evolution-credentials.ts';

// Em qualquer rota que precise da Evolution API:
myRoute.post('/send-whatsapp', async (c) => {
  try {
    const body = await c.req.json();
    const userId = body.user_id; // Obter do JWT ou body
    
    // 1️⃣ Buscar credenciais do usuário (ou superadmin se não tiver)
    const credentials = await getEvolutionCredentials(userId);
    
    console.log(`📱 Usando instância: ${credentials.instanceName} (source: ${credentials.source})`);
    
    // 2️⃣ Fazer requisição à Evolution API
    const response = await fetch(`${credentials.baseUrl}/message/sendText/${credentials.instanceName}`, {
      method: 'POST',
      headers: getEvolutionMessageHeaders(credentials),
      body: JSON.stringify({
        number: body.phone,
        text: body.message
      })
    });
    
    const result = await response.json();
    return c.json({ success: true, data: result });
    
  } catch (error) {
    console.error('Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
```

### Exemplo 2: Obter Status da Conexão

```typescript
import { getEvolutionCredentials, getEvolutionHeaders } from './evolution-credentials.ts';

myRoute.get('/whatsapp/status', async (c) => {
  try {
    const url = new URL(c.req.url);
    const userId = parseInt(url.searchParams.get('user_id') || '1');
    
    // Buscar credenciais
    const credentials = await getEvolutionCredentials(userId);
    
    // Fazer requisição
    const response = await fetch(
      `${credentials.baseUrl}/instance/connectionState/${credentials.instanceName}`,
      {
        method: 'GET',
        headers: getEvolutionHeaders(credentials)
      }
    );
    
    const result = await response.json();
    return c.json({ success: true, data: result });
    
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
```

## 📊 Ordem de Prioridade das Credenciais

```
1️⃣ Credenciais do Usuário
   └─> Busca em: evolution_instances WHERE user_id = <user_id>
   └─> Se encontrar: USA ESTAS ✅

2️⃣ Credenciais do Superadmin  
   └─> Busca em: evolution_instances WHERE user_id = 1
   └─> Se encontrar: USA ESTAS ✅

3️⃣ Variáveis de Ambiente (.env)
   └─> EVOLUTION_INSTANCE_NAME
   └─> EVOLUTION_INSTANCE_API_KEY
   └─> EVOLUTION_GLOBAL_API_KEY
   └─> EVOLUTION_BASE_URL
   └─> Se todas existirem: USA ESTAS ✅
   └─> Se faltar alguma: ❌ ERRO
```

## 🎯 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário faz requisição                                   │
│    POST /send-whatsapp                                      │
│    { user_id: 5, phone: "...", message: "..." }            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Backend chama:                                           │
│    const creds = await getEvolutionCredentials(5)          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Busca no banco:                                          │
│    SELECT * FROM evolution_instances WHERE user_id = 5     │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼ SIM                           ▼ NÃO
┌──────────────────┐          ┌────────────────────┐
│ ENCONTROU!       │          │ Busca superadmin:  │
│ Retorna dados    │          │ user_id = 1        │
│ do user_id 5 ✅  │          └─────────┬──────────┘
└──────────────────┘                    │
                              ┌─────────┴─────────┐
                              │                   │
                              ▼ SIM               ▼ NÃO
                    ┌─────────────────┐  ┌──────────────┐
                    │ ENCONTROU!      │  │ Usa .env     │
                    │ Retorna dados   │  │ (fallback)   │
                    │ do superadmin ✅│  │ final ✅     │
                    └─────────────────┘  └──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Envia para Evolution API                                 │
│    POST https://evo.../message/sendText/INSTANCE_NAME       │
│    Headers: { apikey: "...", ... }                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Retorna resultado para o cliente                         │
│    { success: true, data: {...} }                           │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Segurança (RLS - Row Level Security)

As políticas RLS garantem que:

- ✅ Cada usuário vê **apenas sua própria instância**
- ✅ Cada usuário pode **editar apenas sua própria instância**
- ✅ Superadmin (user_id = 1) vê **todas as instâncias**

## 📝 Exemplo de Dados no Banco

| id | user_id | instance_name | instance_api_key | global_api_key | base_url |
|----|---------|---------------|------------------|----------------|----------|
| uuid-1 | 1 | TESTE | F3DC26A4... | 4de7861e... | https://evo... |
| uuid-2 | 5 | PRODUCAO | A1B2C3D4... | 9z8y7x6w... | https://evo2... |
| uuid-3 | 10 | VENDAS | 9F8E7D6C... | 5v4t3s2r... | https://evo3... |

- **user_id 1** (superadmin) → credenciais globais
- **user_id 5** → credenciais próprias
- **user_id 10** → credenciais próprias
- **user_id 99** (sem registro) → usa credenciais do superadmin (id 1)

## 🚀 Testando

### Testar Busca de Credenciais

```typescript
// No código da função:
const creds1 = await getEvolutionCredentials(1);
console.log('User 1:', creds1.source); // "user"

const creds99 = await getEvolutionCredentials(99);
console.log('User 99:', creds99.source); // "superadmin" (fallback)
```

### Testar via API

```bash
# Buscar instância do usuário 1
curl "https://...supabase.co/functions/v1/rendizy-server/make-server-67caf26a/chat/evolution/instance?user_id=1"

# Criar/atualizar instância do usuário 5
curl -X POST "https://...supabase.co/functions/v1/rendizy-server/make-server-67caf26a/chat/evolution/instance" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 5,
    "instance_name": "PRODUCAO",
    "instance_api_key": "ABC123",
    "global_api_key": "XYZ789",
    "base_url": "https://evo.example.com"
  }'
```

## ✅ Benefícios

- ✅ **Isolamento:** Cada cliente tem sua própria instância WhatsApp
- ✅ **Escalabilidade:** Suporta milhares de usuários
- ✅ **Flexibilidade:** Usuários podem usar diferentes servidores Evolution
- ✅ **Fallback:** Sistema sempre funciona (usa superadmin se necessário)
- ✅ **Segurança:** RLS impede acesso cruzado entre usuários



