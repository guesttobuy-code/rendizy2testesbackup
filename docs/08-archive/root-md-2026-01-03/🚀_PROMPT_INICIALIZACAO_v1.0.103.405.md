# 🚀 PROMPT DE INICIALIZAÇÃO - Rendizy PMS v1.0.103.405

**Data da última sessão**: 20/12/2024  
**Status**: ✅ Sistema operacional com correções críticas aplicadas

---

## 📋 CONTEXTO DO PROJETO

**Projeto**: Rendizy PMS - Sistema de Gestão de Propriedades para Aluguel por Temporada  
**Stack**: React + TypeScript + Supabase + Edge Functions (Deno/Hono)  
**Estrutura**:
- **Frontend**: Vite dev server (porta 3001)
- **Backend**: Supabase Edge Functions (`/rendizy-server`)
- **Database**: PostgreSQL com RLS (Row Level Security)
- **Tables principais**:
  - `anuncios_drafts` - Sistema oficial (Anúncios Ultimate)
  - `properties` - Wizard antigo (DEPRECADO, não usar mais)
  - `reservations` - Reservas
  - `blocks` - Bloqueios de calendário

---

## 🎯 SITUAÇÃO ATUAL (20/12/2024)

### ✅ **Correções Aplicadas Nesta Sessão**

#### **Issue #47: StaysNet exportava para tabela errada** ✅ RESOLVIDO
- **Arquivo**: `supabase/functions/rendizy-server/staysnet-full-sync.ts` (linhas 323-379)
- **Problema**: Importação do Stays.net salvava em `properties` (wizard antigo)
- **Correção**: Agora salva em `anuncios_drafts` (estrutura JSONB)
- **Verificado**: Código revisado e confirmado correto

#### **Issue #48: Lista retornava apenas 2 registros** ✅ RESOLVIDO
- **Arquivo**: `components/anuncio-ultimate/ListaAnuncios.tsx` (linha 69)
- **Problema**: REST API direta sem org context → RLS bloqueava
- **Correção**: Usa Edge Function `/properties/lista` com X-Auth-Token
- **Documento**: `⚡_FIX_LISTA_ANUNCIOS_VIA_BACKEND_v1.0.103.404.md`

#### **Issue #49: URL incorreta + 157 anúncios invisíveis** ✅ RESOLVIDO
- **Arquivo**: `components/anuncio-ultimate/ListaAnuncios.tsx` (linha 73)
- **Problema 1**: URL tinha prefixo incorreto `/make-server-67caf26a/`
- **Correção 1**: URL correta: `/functions/v1/rendizy-server/properties/lista`
- **Problema 2**: 157 anúncios em `properties` (invisíveis no sistema novo)
- **Correção 2**: Script `migrar-properties-para-anuncios.ps1` executado com sucesso
- **Resultado**: 159 anúncios migrados (0 erros)
- **Documento**: `⚡_FIX_MIGRACAO_PROPERTIES_v1.0.103.405.md`

#### **Validação de Script** ✅ RESOLVIDO
- **Arquivo**: `validar-regras.ps1`
- **Problema**: Parser errors (emojis, encoding, pipelines)
- **Correção**: ASCII encoding, loops explícitos, sem caracteres especiais

---

## 🔴 **Problema Identificado (Pendente de Resolução)**

### **Duplicatas de Anúncios de Teste**
- **Total atual**: 161 anúncios (deveria ser 159)
- **Causa**: 2 anúncios de TESTE foram migrados, criando duplicatas:
  - `3cabf06d-51c6-4e2b-b73e-520e018f1fce` (teste 30 02)
  - `9f6cad48-42e9-4ed5-b766-82127a62dce2` (Dona Rosa Botafogo ap 01)
- **Ação necessária**: Remover duplicatas MIGRADAS (manter ORIGINAIS com reservas)
- **Script criado**: `remover-duplicatas.sql` (aguardando execução)
- **Verificação**: `detectar-duplicatas.ps1` e `check-dups.ps1`

---

## 📂 ARQUIVOS CRÍTICOS DO SISTEMA

### **1. Documentação Principal**
- `CHANGELOG.md` - Histórico de mudanças (Issues #42-#49 documentados)
- `⚡_RESUMO_SESSAO_19_12_2024.md` - Sessão anterior (calendário, StaysNet)
- `LIGANDO_MOTORES_UNICO.md` - Guia de inicialização do sistema
- `SETUP_COMPLETO.md` - Protocolo de setup para IAs

### **2. Backend (Edge Functions)**
- `supabase/functions/rendizy-server/routes-anuncios.ts`
  - Rota: `/properties/lista` (linha 16)
  - Consulta: `anuncios_drafts` com RLS automático
  
- `supabase/functions/rendizy-server/staysnet-full-sync.ts`
  - Importação Stays.net (linhas 323-379)
  - **CRÍTICO**: Exporta para `anuncios_drafts` (NÃO properties)

### **3. Frontend**
- `components/anuncio-ultimate/ListaAnuncios.tsx`
  - Linha 73: URL da Edge Function (SEM `/make-server-67caf26a/`)
  - Linha 69: Headers com `X-Auth-Token`
  
- `App.tsx`
  - Linha 583: Carregamento de anúncios via Edge Function
  - Linha 1387: Rota `/properties/lista`

### **4. Scripts de Manutenção**
- `migrar-properties-para-anuncios.ps1` - Migração executada (159 registros)
- `remover-duplicatas.ps1` - Remove duplicatas (aguardando execução)
- `remover-duplicatas.sql` - Queries SQL para remoção manual
- `contar-anuncios.ps1` - Verificação de totais
- `validar-regras.ps1` - Validação pre-commit

### **5. Documentação de Fixes**
- `⚡_FIX_LISTA_ANUNCIOS_VIA_BACKEND_v1.0.103.404.md` (Issue #48)
- `⚡_FIX_MIGRACAO_PROPERTIES_v1.0.103.405.md` (Issue #49)
- `⚡_FIX_STAYSNET_TARGET_properties_v1.0.103.403.md` (Issue #47)

---

## 🎯 REGRAS DE OURO DO SISTEMA

### **1. Tabela Oficial para Anúncios**
```
✅ USAR: anuncios_drafts (Anúncios Ultimate)
❌ NÃO USAR: properties (deprecado, wizard antigo)
```

### **2. Rotas de Anúncios**
```
✅ FRONTEND: /properties/lista
✅ BACKEND: /functions/v1/rendizy-server/properties/lista
❌ NUNCA adicionar prefixos como /make-server-67caf26a/
```

### **3. Autenticação**
```
✅ Edge Functions: X-Auth-Token (do localStorage)
✅ REST API: apikey + Authorization Bearer
❌ NÃO misturar Authorization Bearer com X-Auth-Token
```

### **4. Estrutura de Dados**
```typescript
// anuncios_drafts
{
  id: UUID,
  organization_id: UUID,
  user_id: UUID,
  title: string,
  status: 'draft' | 'active',
  completion_percentage: number,
  data: {  // JSONB - todos os campos flexíveis
    propertyType: string,
    name: string,
    address: string,
    bedrooms: number,
    bathrooms: number,
    basePrice: number,
    photos: string[],
    externalIds: {
      stays_net_id?: string  // Para deduplicação
    },
    migrated_from?: 'properties'  // Flag de migração
  }
}
```

### **5. Prevenção de Duplicatas**
- **StaysNet**: Usa `data->externalIds->stays_net_id` para deduplição
- **Migração**: Verifica `id` antes de inserir (check em `migrar-properties-para-anuncios.ps1`)
- **Regra**: Anúncios de TESTE (com reservas) têm prioridade sobre migrados

---

## 📊 ESTADO DOS DADOS

### **Banco de Dados Atual**
```
anuncios_drafts:
  - Total: 161 registros (⚠️ deveria ser 159)
  - Originais de teste: 2 (IDs conhecidos)
  - Migrados de properties: 159
  - Duplicatas: 2 (detectadas, aguardando remoção)

properties:
  - Total: 157 registros (preservados como backup)
  - Status: DEPRECADO (não usar mais)

reservations:
  - Vinculadas aos 2 anúncios de teste
  
blocks:
  - Vinculados aos 2 anúncios de teste
```

### **IDs Importantes**
```
ANÚNCIOS DE TESTE (com reservas/bloqueios):
- 3cabf06d-51c6-4e2b-b73e-520e018f1fce (teste 30 02)
- 9f6cad48-42e9-4ed5-b766-82127a62dce2 (Dona Rosa Botafogo ap 01)

ANÚNCIO EXEMPLO MIGRADO:
- 6931cc6f-2f36-40de-bb22-2d656931cc6f (Studio Moderno na Lapa)
```

---

## 🚨 TAREFAS PENDENTES (PRIORIDADE)

### **🔴 CRÍTICO - Fazer AGORA**
1. **Remover duplicatas dos anúncios de teste**
   - Executar: `remover-duplicatas.sql` (query DELETE)
   - OU: Remover manualmente via Supabase Dashboard
   - Verificar: Total deve ficar em 159 anúncios
   - Confirmação: Recarregar `/properties/lista` deve mostrar 159

### **🟡 IMPORTANTE - Fazer Hoje**
2. **Commit das correções de duplicatas**
   - Adicionar: `remover-duplicatas.sql`, `detectar-duplicatas.ps1`
   - Atualizar: `CHANGELOG.md` com resolução de duplicatas
   - Mensagem: "fix(anuncios): remove duplicatas e adiciona prevenção"

3. **Testar integração StaysNet**
   - Importar 1 propriedade de teste
   - Verificar: Vai para `anuncios_drafts` (não properties)
   - Confirmar: Não cria duplicatas

### **🟢 FUTURO - Melhorias**
4. Deprecar wizard antigo (redirecionar para Anúncios Ultimate)
5. Adicionar constraint UNIQUE em anuncios_drafts.title
6. Migrar reservas antigas para novo sistema
7. Documentar API completa do backend

---

## 🔧 COMANDOS ÚTEIS

### **Desenvolvimento**
```powershell
# Iniciar servidor
npm run dev  # Porta 3001

# Validar antes de commit
.\validar-regras.ps1

# Verificar anúncios
.\contar-anuncios.ps1

# Detectar duplicatas
.\detectar-duplicatas.ps1
```

### **Git**
```bash
# Ver últimos commits
git log --oneline -5

# Status atual
git status

# Ver diferenças
git diff CHANGELOG.md
```

### **Supabase**
```bash
# Deploy Edge Function
supabase functions deploy rendizy-server

# Ver logs
supabase functions logs rendizy-server

# SQL Editor
# https://supabase.com/dashboard → SQL Editor
```

---

## 📝 HISTÓRICO DE COMMITS DESTA SESSÃO

1. **validar-regras.ps1** - Correção de encoding/sintaxe
2. **198aad7** - Correção URL ListaAnuncios + Script de migração
3. **[commit]** - Migração executada + CHANGELOG atualizado
4. **[pendente]** - Remoção de duplicatas

---

## 💡 COMO CONTINUAR NO PRÓXIMO CHAT

### **Inicie com:**
```
Olá! Leia o arquivo "🚀 PROMPT DE INICIALIZAÇÃO - Rendizy PMS v1.0.103.405.md"
e me diga:

1. Status atual das duplicatas (foram removidas?)
2. Total de anúncios em anuncios_drafts (deve ser 159)
3. Últimos commits realizados

Depois disso, vou precisar testar:
- Importação do StaysNet (verifica se vai para anuncios_drafts)
- Lista de anúncios no frontend (deve mostrar 159)
- Calendário com reservas (deve funcionar nos 2 anúncios de teste)
```

### **Perguntas de Contexto**
Se precisar relembrar algo:
- "Qual era o Issue #49?" → URL incorreta + migração properties
- "Por que 161 anúncios?" → Duplicatas dos 2 testes
- "Onde o StaysNet exporta?" → anuncios_drafts (correto)
- "Qual a URL correta?" → /functions/v1/rendizy-server/properties/lista

### **Validações Rápidas**
```sql
-- Total de anúncios (deve ser 159)
SELECT COUNT(*) FROM anuncios_drafts;

-- Verificar duplicatas (deve retornar 0)
SELECT title, COUNT(*) 
FROM anuncios_drafts 
GROUP BY title 
HAVING COUNT(*) > 1;

-- Anúncios de teste (deve retornar 2)
SELECT id, title 
FROM anuncios_drafts 
WHERE id IN (
  '3cabf06d-51c6-4e2b-b73e-520e018f1fce',
  '9f6cad48-42e9-4ed5-b766-82127a62dce2'
);
```

---

## 🎓 LIÇÕES APRENDIDAS

1. **Sempre verificar tabela de destino** antes de importar
2. **Dedupliação**: Usar IDs externos (stays_net_id) ao invés de campos mutáveis (code)
3. **Migração**: Preservar IDs originais para manter relações (reservas/bloqueios)
4. **Estrutura JSONB**: Permite flexibilidade sem alterar schema
5. **Anúncios de teste**: Sempre verificar quais têm reservas antes de remover

---

## 📞 INFORMAÇÕES TÉCNICAS

**Supabase**:
- URL: `https://odcgnzfremrqnvtitpcc.supabase.co`
- Anon Key: (está em `.env.local`)

**Organização**:
- ID: `00000000-0000-0000-0000-000000000000`
- Nome: Rendizy
- Slug: rendizy-master

**Usuário Admin**:
- ID: `00000000-0000-0000-0000-000000000002`
- Email: admin@admin.com

---

**Versão**: v1.0.103.405  
**Data**: 20/12/2024  
**Status**: 🟡 Sistema operacional, aguardando remoção de duplicatas

---

## 🎯 PRÓXIMA AÇÃO IMEDIATA

Execute no Supabase SQL Editor:
```sql
-- Remover duplicatas (manter originais de teste)
DELETE FROM anuncios_drafts
WHERE title IN (
    SELECT title FROM anuncios_drafts 
    WHERE id IN (
        '3cabf06d-51c6-4e2b-b73e-520e018f1fce',
        '9f6cad48-42e9-4ed5-b766-82127a62dce2'
    )
)
AND id NOT IN (
    '3cabf06d-51c6-4e2b-b73e-520e018f1fce',
    '9f6cad48-42e9-4ed5-b766-82127a62dce2'
);

-- Verificar total (deve ser 159)
SELECT COUNT(*) FROM anuncios_drafts;
```

Depois disso, fazer commit e testar o sistema completo! 🚀
