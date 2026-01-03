# 📁 ESTRUTURA DO BACKEND - RENDIZY

## 🎯 Localização do Backend

O backend está localizado em:

```
supabase/functions/rendizy-server/
```

## 📂 Caminho Completo (Absoluto)

```
C:\Users\rafae\Downloads\Rendizy2producao-main github 15 11 2025\Rendizy2producao-main\supabase\functions\rendizy-server
```

## 📋 Estrutura de Pastas

```
projeto-raiz/
└── supabase/
    ├── config.toml                    # Configuração do Supabase
    ├── functions/                     # Edge Functions
    │   └── rendizy-server/            # ✅ BACKEND PRINCIPAL (AQUI!)
    │       ├── index.ts               # 🎯 Ponto de entrada principal
    │       ├── routes-whatsapp-evolution.ts
    │       ├── routes-chat.ts
    │       ├── evolution-credentials.ts
    │       ├── kv_store.tsx
    │       ├── types.ts
    │       ├── utils.ts
    │       ├── routes-auth.ts
    │       ├── routes-properties.ts
    │       ├── routes-reservations.ts
    │       ├── routes-chat.ts
    │       └── ... (outros arquivos)
    └── migrations/                    # Migrações SQL
        ├── 0001_setup_completo.sql
        ├── 20241112_create_channel_config.sql
        ├── 20241116_remove_updated_at_evolution_instances.sql
        └── ... (outras migrações)
```

## 🔍 Arquivo Principal

**Arquivo de entrada:** `supabase/functions/rendizy-server/index.ts`

Este é o arquivo principal que:
- Importa todas as rotas
- Configura CORS
- Configura middleware
- Registra todas as rotas
- Inicia o servidor com `Deno.serve(app.fetch)`

## 📦 Estrutura de Deploy

Quando você faz deploy para Supabase:

1. **ZIP criado:** `rendizy-server-deploy-*.zip`
2. **Conteúdo do ZIP:** Todos os arquivos de `supabase/functions/rendizy-server/`
3. **Upload:** Via Supabase Dashboard → Edge Functions → `rendizy-server`

## ✅ Como Verificar

### No Windows (PowerShell):

```powershell
# Verificar se o backend existe
Test-Path "supabase\functions\rendizy-server\index.ts"

# Ver caminho completo
Resolve-Path "supabase\functions\rendizy-server"

# Listar arquivos principais
Get-ChildItem "supabase\functions\rendizy-server" -Filter "*.ts" | Select-Object Name
```

### No Cursor/VS Code:

1. Abra o Explorer (Ctrl+Shift+E)
2. Navegue até: `supabase` → `functions` → `rendizy-server`
3. Procure pelo arquivo `index.ts` - este é o ponto de entrada

## 🚀 Comandos Úteis

### Para criar ZIP do backend:

```powershell
# Via script PowerShell
powershell -ExecutionPolicy Bypass -File criar-zip-deploy.ps1

# Manualmente (PowerShell)
Compress-Archive -Path "supabase\functions\rendizy-server\*" -DestinationPath "backend.zip" -Force
```

### Para verificar estrutura:

```powershell
# Ver estrutura de pastas
tree /F supabase\functions\rendizy-server

# Contar arquivos TypeScript
(Get-ChildItem -Path "supabase\functions\rendizy-server" -Filter "*.ts" -Recurse).Count
```

## 📝 Notas Importantes

1. **Nome da função:** `rendizy-server` (como aparece no Supabase Dashboard)
2. **Pasta de origem:** `supabase/functions/rendizy-server/`
3. **Arquivo principal:** `index.ts`
4. **Runtime:** Deno (via Supabase Edge Functions)
5. **Framework:** Hono

## 🔗 URLs de Produção

Após deploy, o backend fica disponível em:

```
https://[seu-project-id].supabase.co/functions/v1/rendizy-server
```

Exemplo:
```
https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server
```

---

**Última atualização:** 17/11/2025  
**Status:** ✅ Backend localizado e funcionando


