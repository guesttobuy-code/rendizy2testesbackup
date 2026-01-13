# Changelog - 13 de Janeiro de 2026

## 🌐 Sistema de Hospedagem Multi-Provedor

### Resumo
Implementação de suporte a múltiplos provedores de hospedagem (Vercel, Netlify, Cloudflare Pages) com tokens individuais por cliente, permitindo que cada site use credenciais próprias ou o token global do Rendizy.

---

## Commits

### 1. `135673f` - fix(client-sites): improve ZIP root detection for package.json
**Problema:** ZIP do Bolt.new tem arquivos em subpasta (ex: `medhomeCelso-main/package.json`), causando erro "package.json não encontrado".

**Solução:**
- Auto-detecta pasta raiz procurando onde está o `package.json`
- Remove prefixo corretamente de todos os arquivos
- Adiciona debug info quando falha (lista arquivos de exemplo)

**Arquivo alterado:**
- `supabase/functions/rendizy-server/routes-client-sites.ts`

---

### 2. `6e5da8c` - feat(hosting): add multi-provider hosting support with individual tokens

#### 2.1 Migration SQL
**Arquivo:** `supabase/migrations/20260113_add_hosting_providers.sql`

```sql
-- Nova coluna JSONB para configurações de hospedagem
ALTER TABLE client_sites 
ADD COLUMN IF NOT EXISTS hosting_providers JSONB NOT NULL DEFAULT '{}';
```

**Estrutura do JSONB:**
```json
{
  "active_provider": "vercel",
  "vercel": {
    "use_global_token": false,
    "access_token": "xxxxx",
    "team_id": "team_xxx",
    "last_deployment_id": "dpl_xxx",
    "last_deployment_url": "https://...",
    "last_deployment_status": "READY"
  },
  "netlify": { ... },
  "cloudflare_pages": { ... }
}
```

---

#### 2.2 Frontend - Nova Aba "Hospedagem"
**Arquivo:** `components/ClientSitesManager.tsx`

**Mudanças:**
1. **Novas interfaces TypeScript:**
   - `HostingProviderConfig` - Configuração de um provedor
   - `HostingProviders` - Todos os provedores

2. **Nova aba no modal de edição:**
   - Aba "Hospedagem" com ícone 🌐
   - Grid de 5 colunas: Geral | Contato | Design | Recursos | Hospedagem

3. **Sub-abas para provedores:**
   - ▲ Vercel (funcional)
   - ◆ Netlify (em breve)
   - ☁️ Cloudflare Pages (em breve)

4. **Opções por provedor:**
   - Toggle "Usar Token Global do Rendizy"
   - Campos para token de acesso próprio
   - Campo para Team ID (Vercel)
   - Links para obter tokens

5. **Novos campos no formData:**
   ```typescript
   hostingActiveProvider: 'vercel' | 'netlify' | 'cloudflare_pages' | 'none'
   vercelUseGlobalToken: boolean
   vercelAccessToken: string
   vercelTeamId: string
   netlifyUseGlobalToken: boolean
   netlifyAccessToken: string
   netlifySiteId: string
   cloudflareApiToken: string
   cloudflareAccountId: string
   ```

---

#### 2.3 Backend - Suporte a Token Individual
**Arquivo:** `supabase/functions/rendizy-server/routes-client-sites.ts`

**Mudanças:**

1. **Interface `ClientSiteConfig` atualizada:**
   ```typescript
   hostingProviders?: {
     active_provider?: 'vercel' | 'netlify' | 'cloudflare_pages' | 'none';
     vercel?: { use_global_token, access_token, team_id, ... };
     netlify?: { ... };
     cloudflare_pages?: { ... };
   };
   ```

2. **Funções de conversão atualizadas:**
   - `sqlToClientSiteConfig()` - Lê `hosting_providers`
   - `clientSiteConfigToSql()` - Salva `hosting_providers`

3. **Endpoint `/vercel/build-from-zip` atualizado:**
   ```typescript
   // Busca config do site
   const { data: siteData } = await supabase
     .from("client_sites")
     .select("hosting_providers")
     .eq("subdomain", subdomain)
     .single();

   // Determina qual token usar
   const useGlobalToken = hostingConfig.use_global_token !== false;
   const vercelToken = useGlobalToken ? VERCEL_ACCESS_TOKEN : clientToken;
   ```

4. **Atualiza JSONB após deploy:**
   ```typescript
   hosting_providers: {
     ...siteData?.hosting_providers,
     active_provider: 'vercel',
     vercel: {
       ...hostingConfig,
       last_deployment_id: vercelData.id,
       last_deployment_url: `https://${vercelData.url}`,
       last_deployment_status: "BUILDING"
     }
   }
   ```

---

## Arquitetura

### Fluxo de Deploy

```
┌─────────────────────────────────────────────────────────────┐
│                    UPLOAD ZIP DO BOLT                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              ENDPOINT /vercel/build-from-zip                 │
│                                                              │
│  1. Busca hosting_providers do site no banco                │
│  2. Verifica: use_global_token = true?                      │
│     ├── SIM → Usa VERCEL_ACCESS_TOKEN (env)                 │
│     └── NÃO → Usa hosting_providers.vercel.access_token     │
│  3. Faz deploy na API Vercel                                │
│  4. Atualiza hosting_providers com resultado                │
└─────────────────────────────────────────────────────────────┘
```

### Cenários de Uso

| Cenário | Token | Conta Vercel |
|---------|-------|--------------|
| **Padrão** | Global (Rendizy) | Rendizy paga |
| **Cliente Premium** | Cliente | Cliente paga |
| **Teste** | Global | Rendizy paga |

---

## Como Usar

### Para Admin (Token Global)
1. Deixe "Usar Token Global do Rendizy" **ativado**
2. Deploy vai para conta Vercel do Rendizy

### Para Cliente com Conta Própria
1. Cliente cria conta em [vercel.com](https://vercel.com)
2. Cliente gera token em [vercel.com/account/tokens](https://vercel.com/account/tokens)
3. Admin desativa "Usar Token Global"
4. Admin insere token do cliente
5. Deploy vai para conta Vercel do cliente

---

## Próximos Passos (Roadmap)

- [ ] Implementar integração Netlify
- [ ] Implementar integração Cloudflare Pages
- [ ] Adicionar validação de token antes do deploy
- [ ] Mostrar saldo/quota da conta no painel
- [ ] Webhook para atualizar status do deploy automaticamente

---

## Arquivos Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `supabase/migrations/20260113_add_hosting_providers.sql` | Novo | Migration para coluna JSONB |
| `components/ClientSitesManager.tsx` | Alterado | Nova aba Hospedagem com sub-tabs |
| `supabase/functions/rendizy-server/routes-client-sites.ts` | Alterado | Backend com suporte a token individual |

---

## Notas Técnicas

### Segurança dos Tokens
- Tokens são armazenados em JSONB no banco
- RLS protege acesso (service_role only)
- Tokens não são retornados em GETs públicos
- Campo de input usa `type="password"`

### Compatibilidade
- Colunas antigas (`vercel_deployment_id`, etc.) mantidas
- Migration migra dados existentes para novo formato
- Sites sem config usam token global automaticamente

### Performance
- Índice GIN em `hosting_providers->'active_provider'`
- Função helper `get_hosting_provider_token()` para queries diretas
