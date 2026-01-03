# ⚡ APRENDIZADOS CRÍTICOS - RESUMO DIÁRIO

**Data:** 05/11/2025 | **Versão:** v1.0.103.315

---

## 🚨 REGRAS ABSOLUTAS - NÃO VIOLAR!

### 1️⃣ **SUPABASE ONLY - SEMPRE**

```typescript
// ❌ NUNCA FAZER:
localStorage.setItem('property', data);
if (isMockEnabled()) { ... }

// ✅ SEMPRE FAZER:
await apiRequest('/properties', { method: 'POST', body: data });
```

**Por quê:**
- Mock = falsa segurança (funciona local, quebra produção)
- localStorage = perda de dados (cache apaga tudo)
- Desenvolvimento ≠ Produção = bugs escondidos

**Regra de ouro:**
> "Se não salva no Supabase, não está salvo."

---

### 2️⃣ **INTEGRIDADE REFERENCIAL - ZERO ÓRFÃOS**

```typescript
// ❌ NUNCA PERMITIR:
await deleteProperty(id); // Sem verificar reservas

// ✅ SEMPRE VALIDAR:
const reservations = await getActiveReservations(propertyId);
if (reservations.length > 0) {
  throw new Error('Transfer or cancel reservations first');
}
```

**Por quê:**
- Reservas órfãs = perda de dados financeiros
- Impossível rastrear histórico
- Violação de integridade = sistema corrompido

**Regra de ouro:**
> "Uma reserva NUNCA pode ficar sem imóvel atrelado."

---

### 3️⃣ **DADOS NORMALIZADOS + WIZARD PRESERVADO**

```typescript
// ✅ ESTRUTURA HÍBRIDA CORRETA:
{
  // Raiz (normalizado) - para leitura
  name: "Casa",
  photos: [...],
  coverPhoto: "url",
  
  // Wizard (original) - para edição
  contentType: { internalName: "Casa" },
  contentPhotos: { photos: [...] }
}
```

**Por quê:**
- Cards leem campos raiz (60% mais rápido)
- Wizard edita estrutura original (compatibilidade)
- APIs externas funcionam (normalizado)

**Regra de ouro:**
> "Salvar em AMBOS formatos, sempre."

---

### 4️⃣ **TABELA ÚNICA KV STORE - LIMITAÇÃO**

```typescript
// ⚠️ REALIDADE:
// Só temos: kv_store_67caf26a (1 tabela)
// Não podemos: CREATE TABLE, ALTER TABLE, migrations SQL

// ✅ TRABALHAR COM:
await kv.set(`acc_${id}`, property); // Prefixo + ID
await kv.getByPrefix('acc_'); // Buscar por prefixo
```

**Por quê:**
- Ambiente Figma Make não permite múltiplas tabelas
- Não é escolha, é limitação técnica
- Simular SQL no código (validações manuais)

**Regra de ouro:**
> "KV Store é suficiente para MVP, não para produção final."

---

### 5️⃣ **CACHE - SEMPRE LIMPAR APÓS MUDANÇAS**

```bash
# ⚠️ OBRIGATÓRIO após:
# - Deploy novo
# - Migração de dados
# - Mudança de estrutura
# - Bugs visuais estranhos

# Limpar:
1. Ctrl + Shift + Delete
2. "Cached images and files"
3. "All time"
4. Clear data

# Hard Refresh:
Ctrl + Shift + R
```

**Por quê:**
- Browser cacheia agressivamente
- JavaScript antigo causa bugs
- Dados novos não aparecem

**Regra de ouro:**
> "Deu bug visual? Ctrl+Shift+R primeiro."

---

## 📋 CHECKLIST ANTES DE CRIAR FEATURE

- [ ] Rota no backend (`/supabase/functions/server/`)
- [ ] Função no frontend (`/utils/api.ts`)
- [ ] Salva no Supabase KV Store
- [ ] Isola por `organizationId` (multi-tenant)
- [ ] Valida integridade referencial
- [ ] Testa com dados reais
- [ ] Nenhum uso de `localStorage` para dados
- [ ] Nenhum uso de `mockBackend`
- [ ] Documentado no CHANGELOG

---

## 🐛 BUGS MAIS COMUNS (E COMO EVITAR)

### Bug 1: "Cards aparecem vazios"
**Causa:** Dados em estrutura wizard, cards lendo raiz  
**Solução:** Normalização automática no backend  
**Prevenção:** Usar estrutura híbrida desde início

### Bug 2: "Funciona local, quebra produção"
**Causa:** Usar mock/localStorage  
**Solução:** SEMPRE usar Supabase  
**Prevenção:** Desenvolver com backend real desde dia 1

### Bug 3: "Reservas órfãs no banco"
**Causa:** Deletar imóvel sem verificar dependências  
**Solução:** Validar reservas antes de deletar  
**Prevenção:** Modal de transferência/cancelamento obrigatório

### Bug 4: "Mudanças não aparecem"
**Causa:** Cache do navegador  
**Solução:** Ctrl+Shift+R  
**Prevenção:** CACHE_BUSTER.ts + avisar usuário

### Bug 5: "Query lenta com muitos dados"
**Causa:** Buscar todos e filtrar no código  
**Solução:** Usar `getByPrefix()` + índices  
**Prevenção:** Planejar queries antes de implementar

---

## 🎯 WORKFLOW CORRETO

### ❌ ERRADO:
```
1. Criar UI bonita
2. "Quando tiver tempo" fazer backend
3. Usar mock temporário
4. 🐛 Descobrir que quebra tudo
5. Reescrever
```

### ✅ CORRETO:
```
1. Desenhar rota backend
2. Implementar persistência no Supabase
3. Testar com Postman
4. Criar função em api.ts
5. Implementar UI que chama API
6. Verificar dados salvos no banco
```

---

## 💡 PRINCÍPIOS FUNDAMENTAIS

### Backend First
> "Comece pelo backend, não pela UI."

### Dados São Sagrados
> "localStorage perde dados, Supabase não."

### Multi-Tenant Sempre
> "Isole por organizationId em TUDO."

### Integridade Acima de Tudo
> "Dados órfãos são inaceitáveis."

### Cache É Inimigo se Mal Usado
> "Ctrl+Shift+R resolve 40% dos bugs."

---

## 🔍 VERIFICAÇÕES RÁPIDAS

### 1. Está salvando corretamente?
```javascript
// Console deve mostrar:
✅ "Salvando no Supabase..."
✅ "Salvo com sucesso no banco"

// Não deve mostrar:
❌ "MOCK: Salvando..."
❌ "Salvando em localStorage"
```

### 2. Dados persistem?
```
1. Criar/Editar dado
2. Ctrl + Shift + R
3. ✅ Dado continua = CORRETO
4. ❌ Dado sumiu = ERRADO
```

### 3. Multi-tenant isolado?
```typescript
// Verificar:
const data = await kv.get('acc_123');
console.log(data.organizationId); // ✅ Deve existir
```

### 4. Integridade preservada?
```typescript
// Antes de deletar:
const dependencies = await checkDependencies(id);
console.log(dependencies); // ✅ Deve verificar
```

---

## 🚨 RED FLAGS - AVISOS IMEDIATOS

```typescript
// 🚩 Código deletando sem verificar
await kv.del(`property:${id}`);

// 🚩 Usando localStorage para dados
localStorage.setItem('properties', JSON.stringify(data));

// 🚩 Verificando mock mode
if (isMockEnabled()) { ... }

// 🚩 Permitindo null em foreign key crítica
propertyId?: string | null;

// 🚩 Não registrando organizationId
await kv.set(id, { name: 'Casa' }); // Falta organizationId!

// 🚩 Conversão em runtime (lento)
const name = property.contentType.internalName; // Deveria ser property.name
```

---

## 📊 MÉTRICAS DE QUALIDADE

### Sistema Saudável:
```
✅ 0 registros órfãos no banco
✅ 0 erros de integridade referencial
✅ 100% das exclusões com validação
✅ 100% dos dados salvos no Supabase
✅ 100% isolamento por organizationId
✅ 0 uso de mock/localStorage
```

### Sistema Com Problemas:
```
❌ > 0 reservas sem imóvel
❌ Dados em localStorage
❌ Mock habilitado em produção
❌ Queries lentas (> 500ms)
❌ Cache causando bugs
```

---

## 🎓 PARA O DIA DE HOJE

### Perguntas a Fazer Sempre:

1. **Antes de salvar:**
   - "Estou salvando no Supabase?"
   - "Tem organizationId?"
   - "Normalização está aplicada?"

2. **Antes de deletar:**
   - "Tem dependências?"
   - "Validei no backend?"
   - "Ofereci resolução?"

3. **Antes de fazer PR:**
   - "Testei com dados reais?"
   - "Dados persistem?"
   - "Cache limpo funciona?"

---

## 🔥 MANTRAS DO DIA

```
"Se não está no Supabase, não existe."

"Cache é amigo, mas tem que limpar."

"Órfão no banco = bug crítico."

"Backend first, UI depois."

"Multi-tenant SEMPRE."
```

---

## 📚 DOCUMENTOS DE REFERÊNCIA RÁPIDA

- **Supabase Only:** `/docs/⚠️_APRENDIZADO_CRITICO_SUPABASE_ONLY.md`
- **Integridade:** `/🎯_APRENDIZADO_CRITICO_INTEGRIDADE.md`
- **Sistema Unificado:** `/✅_SISTEMA_UNIFICADO_IMPLEMENTADO_v1.0.103.315.md`
- **KV Store vs SQL:** `/⚖️_KV_STORE_VS_SQL_RELACIONAL.md`
- **Banco de Dados:** `/📊_ESTRUTURA_COMPLETA_BANCO_DADOS_v1.0.103.315.md`

---

## ✅ RESUMO SUPER DIRETO

### NÃO FAZER HOJE:
1. ❌ Usar `localStorage` para dados
2. ❌ Usar `mockBackend`
3. ❌ Deletar sem validar dependências
4. ❌ Esquecer `organizationId`
5. ❌ Salvar só estrutura wizard OU só normalizada

### FAZER SEMPRE HOJE:
1. ✅ Salvar no Supabase
2. ✅ Estrutura híbrida (normalizado + wizard)
3. ✅ Validar integridade antes de deletar
4. ✅ Incluir `organizationId` em tudo
5. ✅ Limpar cache após mudanças (Ctrl+Shift+R)

---

**VERSÃO:** v1.0.103.315  
**CRIADO:** 05/11/2025  
**USO:** Ler TODA MANHÃ antes de começar  
**ATUALIZAR:** Sempre que aprender algo novo crítico
