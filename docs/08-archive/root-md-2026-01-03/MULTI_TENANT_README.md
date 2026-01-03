# 🏢 Sistema Multi-Tenant - Evolution API

## 🎯 Resumo

Cada **usuário** (imobiliária/cliente) pode ter suas **próprias credenciais** da Evolution API, permitindo:

- ✅ WhatsApp isolado por cliente
- ✅ Múltiplos servidores Evolution
- ✅ Escalabilidade infinita
- ✅ Segurança (RLS)

---

## 📊 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📋 Tabela: evolution_instances                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ id | user_id | instance_name | api_key | base_url        │ │
│  ├────┼─────────┼───────────────┼─────────┼─────────────────┤ │
│  │ 1  │    1    │ TESTE         │ F3DC... │ evo.bora...     │ │ ← SUPERADMIN
│  │ 2  │    5    │ PRODUCAO      │ A1B2... │ evo2.com...     │ │ ← Cliente 1
│  │ 3  │   10    │ VENDAS        │ 9F8E... │ evo3.com...     │ │ ← Cliente 2
│  └────┴─────────┴───────────────┴─────────┴─────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND (Edge Function)                            │
│                                                                 │
│  📦 Função: getEvolutionCredentials(user_id)                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │  1️⃣ SELECT * FROM evolution_instances                    │ │
│  │     WHERE user_id = ?                                     │ │
│  │                                                           │ │
│  │  ✅ ENCONTROU?                                            │ │
│  │     └─> USA credenciais do usuário                       │ │
│  │                                                           │ │
│  │  ❌ NÃO ENCONTROU?                                        │ │
│  │     └─> Busca superadmin (user_id = 1)                   │ │
│  │        └─> Se não achar: usa .env                        │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  EVOLUTION API SERVERS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🌐 evo.boravendermuito.com.br    (Superadmin)                 │
│  🌐 evo2.example.com              (Cliente 1)                   │
│  🌐 evo3.example.com              (Cliente 2)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Requisição

### Exemplo: Usuário 5 envia mensagem WhatsApp

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND                                                    │
│ POST /send-whatsapp                                         │
│ { user_id: 5, phone: "...", message: "Olá!" }              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ BACKEND                                                     │
│ const creds = await getEvolutionCredentials(5)             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ DATABASE - Busca user_id = 5                                │
│ SELECT * FROM evolution_instances WHERE user_id = 5         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                    ✅ ENCONTROU
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Credenciais do Usuário 5:                                  │
│ - instance_name: "PRODUCAO"                                 │
│ - instance_api_key: "A1B2..."                               │
│ - base_url: "https://evo2.example.com"                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ EVOLUTION API (servidor do cliente 1)                      │
│ POST https://evo2.example.com/message/send                  │
│ Headers: { apikey: "A1B2..." }                              │
│ Body: { phone: "...", message: "Olá!" }                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ ✅ MENSAGEM ENVIADA                                         │
│ WhatsApp do Cliente 1 → Destinatário                        │
└─────────────────────────────────────────────────────────────┘
```

### Se Usuário 99 (sem credenciais) enviar:

```
USER 99 → Backend → Busca user_id = 99 → ❌ Não encontrou
                  ↓
          Busca superadmin (user_id = 1) → ✅ Encontrou
                  ↓
          Usa credenciais do superadmin
                  ↓
          Evolution API (servidor superadmin)
                  ↓
          ✅ Mensagem enviada via WhatsApp do Superadmin
```

---

## 📋 Estrutura de Dados

### Tabela: `evolution_instances`

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `id` | UUID | ID único | `550e8400-e29b-41d4-a716-...` |
| `user_id` | INTEGER | ID do usuário dono | `5` |
| `instance_name` | TEXT | Nome da instância | `PRODUCAO` |
| `instance_api_key` | TEXT | Token da instância | `A1B2C3D4...` |
| `global_api_key` | TEXT | API Key global | `XYZ789...` |
| `base_url` | TEXT | URL da Evolution API | `https://evo.example.com` |
| `created_at` | TIMESTAMP | Data de criação | `2024-11-12 10:30:00` |
| `updated_at` | TIMESTAMP | Última atualização | `2024-11-12 15:45:00` |

---

## 🔐 Segurança (RLS)

**Row Level Security** garante isolamento entre usuários:

```sql
-- Usuário vê APENAS sua instância
CREATE POLICY "Users can view their own instance" 
ON evolution_instances 
FOR SELECT 
USING (user_id = current_user_id());

-- Superadmin (user_id = 1) vê TODAS
CREATE POLICY "Admin can view all instances" 
ON evolution_instances 
FOR ALL 
USING (current_user_id() = 1);
```

---

## 🛠️ Como Configurar

### 1️⃣ Criar Instância para Usuário

**Via Dashboard Supabase:**
1. Acesse: Table Editor → `evolution_instances`
2. Clique em **Insert row**
3. Preencha:
   ```
   user_id: 5
   instance_name: PRODUCAO
   instance_api_key: ABC123...
   global_api_key: XYZ789...
   base_url: https://evo.example.com
   ```
4. Salvar

**Via SQL:**
```sql
INSERT INTO evolution_instances 
  (user_id, instance_name, instance_api_key, global_api_key, base_url)
VALUES 
  (5, 'PRODUCAO', 'ABC123...', 'XYZ789...', 'https://evo.example.com');
```

**Via API:**
```bash
curl -X POST "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/chat/evolution/instance" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 5,
    "instance_name": "PRODUCAO",
    "instance_api_key": "ABC123...",
    "global_api_key": "XYZ789...",
    "base_url": "https://evo.example.com"
  }'
```

### 2️⃣ Verificar Configuração

```bash
# Buscar instância do usuário 5
curl "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/chat/evolution/instance?user_id=5"
```

---

## 📚 Arquivos Criados

```
📁 Projeto/
├── 📄 supabase/migrations/
│   └── 20241112_create_evolution_instances.sql  ← SQL tabela
│
├── 📄 supabase/functions/rendizy-server/
│   ├── evolution-credentials.ts                 ← Helper credenciais
│   ├── routes-chat.ts                           ← Endpoints API
│   └── MULTI_TENANT_EXAMPLE.md                  ← Exemplos código
│
├── 📄 DEPLOY_SUPABASE.md                        ← Guia deploy
└── 📄 MULTI_TENANT_README.md                    ← Este arquivo
```

---

## ✅ Checklist Deploy

- [ ] Executar SQL: `20241112_create_evolution_instances.sql`
- [ ] Verificar tabela criada no Table Editor
- [ ] Verificar linha do superadmin (user_id = 1)
- [ ] Fazer deploy da Edge Function
- [ ] Testar endpoint: GET `/evolution/instance?user_id=1`
- [ ] (Opcional) Criar instâncias para outros usuários

---

## 🎯 Próximos Passos

1. **Deploy:** Execute os SQLs no Supabase
2. **Deploy:** Suba a Edge Function
3. **Teste:** Verifique se superadmin está configurado
4. **Use:** Configure credenciais por cliente conforme necessário

---

**Sistema:** Multi-Tenant Evolution API ✅  
**Banco:** PostgreSQL (Supabase)  
**Escalabilidade:** Ilimitada  
**Segurança:** Row Level Security (RLS)



