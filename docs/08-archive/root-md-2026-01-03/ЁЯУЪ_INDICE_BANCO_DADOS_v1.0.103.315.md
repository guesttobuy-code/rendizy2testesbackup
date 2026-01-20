# 📚 ÍNDICE COMPLETO - BANCO DE DADOS RENDIZY

## 🎯 NAVEGAÇÃO RÁPIDA

### 🚀 Comece Aqui
1. **[🔍 Explorador Visual HTML](#explorador)** ← RECOMENDADO!
2. **[📊 Estrutura Completa](#estrutura)** - Documentação detalhada
3. **[🎨 Diagrama Visual](#diagrama)** - Fluxos e relacionamentos

---

## 📖 DOCUMENTOS CRIADOS

### <a name="explorador"></a>🔍 Explorador Visual Interativo
**Arquivo:** `🔍_EXPLORADOR_BANCO_DADOS_v1.0.103.315.html`

**O que é:**
- Interface HTML interativa
- Clique em cada entidade para ver detalhes
- Exemplos de JSON
- Descrição de campos
- Busca inteligente

**Como usar:**
1. Abrir arquivo no navegador
2. Clicar em qualquer card de entidade
3. Ver estrutura, campos e exemplos
4. Copiar código de exemplo

**Preview:**
```
┌─────────────────────────────────────────┐
│  🔍 Explorador de Banco de Dados       │
│  RENDIZY - Sistema KV Store            │
├─────────────────────────────────────────┤
│  [🔍 Buscar entidade...]               │
├─────────────────────────────────────────┤
│  🏢 Organizações    👥 Usuários         │
│  org_               user_               │
│                                         │
│  🏠 Imóveis         📅 Reservas         │
│  acc_               res_                │
│                                         │
│  💬 Chats WhatsApp  ✉️ Mensagens        │
│  chat_              msg_                │
└─────────────────────────────────────────┘
```

---

### <a name="estrutura"></a>📊 Estrutura Completa do Banco
**Arquivo:** `📊_ESTRUTURA_COMPLETA_BANCO_DADOS_v1.0.103.315.md`

**Conteúdo:**
1. **Arquitetura KV Store** - Conceito geral
2. **17 Entidades Completas** - Estrutura detalhada de CADA uma:
   - Organizações
   - Usuários
   - Imóveis (com estrutura unificada)
   - Reservas
   - Bloqueios
   - Tipos de Imóveis
   - Amenidades (localização e imóvel)
   - Hóspedes
   - Proprietários
   - Chats WhatsApp
   - Mensagens WhatsApp
   - Templates
   - Configurações
   - Preços Sazonais
   - Integrações
   - Sites de Clientes

3. **Sistema de Prefixos** - Como organizar keys
4. **Funções KV Store** - set, get, mget, getByPrefix
5. **Exemplos de Queries** - Como buscar dados
6. **Isolamento Multi-Tenant** - Segurança

**Exemplo de conteúdo:**
```typescript
// IMÓVEL (acc_)
{
  // CAMPOS RAIZ (normalizados)
  "id": "acc_97239cad",
  "shortId": "H3K9P2",
  "name": "Casa da Praia",
  "photos": ["url1", "url2"],
  "coverPhoto": "url1",
  
  // WIZARD (original)
  "contentType": {
    "internalName": "Casa da Praia"
  },
  "contentPhotos": {
    "photos": [...]
  }
}
```

---

### <a name="diagrama"></a>🎨 Diagrama Visual
**Arquivo:** `🎨_DIAGRAMA_VISUAL_BANCO_v1.0.103.315.md`

**Conteúdo:**
1. **Arquitetura Visual** - Desenho da tabela única
2. **Fluxo de Criação de Imóvel** - Passo a passo visual
3. **Estrutura de Imóvel em Árvore** - Hierarquia completa
4. **Relacionamentos entre Entidades** - Diagramas de relacionamento
5. **Relacionamento WhatsApp** - Fluxo Evolution API
6. **Exemplos de Queries** - Como buscar dados
7. **Exemplos de Mutations** - Como salvar dados
8. **Isolamento Multi-Tenant** - Visualização
9. **Performance e Índices** - Otimizações
10. **Escalabilidade** - Projeções futuras

**Exemplo de conteúdo:**
```
┌──────────────────┐
│   FRONTEND       │
│  (Wizard Form)   │
└────────┬─────────┘
         │
         │ POST /properties
         ▼
┌─────────────────────────────┐
│      BACKEND                │
│  normalizeWizardData()      │
└────────┬────────────────────┘
         │
         │ kv.set()
         ▼
┌─────────────────────────────┐
│   SUPABASE KV STORE         │
│   acc_97239cad              │
└─────────────────────────────┘
```

---

## 🎓 GUIAS DE USO

### Para INICIANTES:
1. **Abrir:** `🔍_EXPLORADOR_BANCO_DADOS_v1.0.103.315.html`
2. **Clicar:** Em "🏠 Imóveis"
3. **Ver:** Estrutura completa de um imóvel
4. **Entender:** Como os dados são organizados

### Para DESENVOLVEDORES:
1. **Ler:** `📊_ESTRUTURA_COMPLETA_BANCO_DADOS_v1.0.103.315.md`
2. **Estudar:** Sistema de prefixos
3. **Praticar:** Exemplos de queries
4. **Implementar:** CRUD usando KV Store

### Para ARQUITETOS:
1. **Analisar:** `🎨_DIAGRAMA_VISUAL_BANCO_v1.0.103.315.md`
2. **Entender:** Fluxos de dados
3. **Avaliar:** Escalabilidade
4. **Planejar:** Próximas features

---

## 🔑 CONCEITOS-CHAVE

### 1. KV Store (Key-Value)
```
Conceito: Banco NoSQL simples
Tabela: kv_store_67caf26a
Estrutura: KEY (texto) → VALUE (JSON)
```

### 2. Prefixos
```
Organização: org_
Usuário: user_
Imóvel: acc_
Reserva: res_
Chat: chat_
... e mais 12 tipos
```

### 3. Multi-Tenancy
```
Isolamento: campo organizationId
Filtragem: WHERE organizationId = 'org_xxx'
Segurança: Dados separados por organização
```

### 4. Estrutura Unificada (v1.0.103.315)
```
Imóvel: {
  // RAIZ (normalizado) - leitura
  name: "Casa",
  photos: [...],
  
  // WIZARD (original) - edição
  contentType: {...},
  contentPhotos: {...}
}
```

---

## 📊 ESTATÍSTICAS

### Entidades por Tipo:
```
Core (6):
- Organizações (org_)
- Usuários (user_)
- Imóveis (acc_)
- Reservas (res_)
- Bloqueios (block_)
- Tipos de Imóveis (type_)

Configuração (5):
- Amenidades Localização (location_amenity_)
- Amenidades Imóvel (listing_amenity_)
- Configurações (setting_)
- Preços Sazonais (seasonal_)
- Sites (site_)

CRM (3):
- Hóspedes (guest_)
- Proprietários (owner_)
- Integrações (integration_)

WhatsApp (3):
- Chats (chat_)
- Mensagens (msg_)
- Templates (template_)

TOTAL: 17 entidades
```

### Volume Estimado (Atual):
```
Organizações: ~1
Usuários: ~3
Imóveis: ~10
Reservas: ~45
Bloqueios: ~12
Tipos: ~8
Amenidades: ~50
Hóspedes: ~35
Chats: ~67
Mensagens: ~1.234
Outros: ~30

TOTAL: ~1.500 registros
```

---

## 🔍 BUSCA RÁPIDA

### Precisa saber sobre...

**Imóveis?**
→ Ver "🏠 Imóveis (Properties)" no Explorador
→ Prefixo: `acc_`
→ 11 campos normalizados + estrutura wizard completa

**Reservas?**
→ Ver "📅 Reservas" no Explorador
→ Prefixo: `res_`
→ Campos: checkIn, checkOut, guestName, totalAmount, status

**WhatsApp?**
→ Ver "💬 Conversas WhatsApp" no Explorador
→ Prefixo: `chat_` (conversas) e `msg_` (mensagens)
→ Integração: Evolution API

**Multi-Tenant?**
→ Ler seção "🔐 Isolamento Multi-Tenant" no Diagrama
→ Campo obrigatório: `organizationId`
→ Filtro: `.filter(x => x.organizationId === '...')`

**Estrutura Wizard?**
→ Ler "🏗️ Estrutura de um Imóvel (Unificado)" no Diagrama
→ v1.0.103.315: Sistema híbrido raiz + wizard
→ Normalização automática no backend

---

## 🚀 QUICK START

### Consultar um imóvel:
```typescript
// No backend (Supabase Function)
import * as kv from './kv_store.tsx';

const property = await kv.get('acc_97239cad-4b8d-46c0-82a3-28673ae4cfc1');
console.log(property.name); // "Casa da Praia"
console.log(property.photos); // ["url1", "url2", "url3"]
```

### Listar todos os imóveis:
```typescript
const allProperties = await kv.getByPrefix('acc_');
console.log(`Total: ${allProperties.length}`);
```

### Filtrar por organização:
```typescript
const allProperties = await kv.getByPrefix('acc_');
const orgProperties = allProperties.filter(
  p => p.organizationId === 'org_123e4567'
);
```

### Criar novo imóvel:
```typescript
await kv.set('acc_new_property_id', {
  id: 'acc_new_property_id',
  shortId: 'ABC123',
  organizationId: 'org_123e4567',
  name: 'Casa Nova',
  photos: [],
  contentType: {
    internalName: 'Casa Nova',
    propertyTypeId: 'type_beach_house'
  }
});
```

---

## 📞 SUPORTE E DÚVIDAS

### Problema: Não entendo KV Store
**Solução:** 
1. Abrir `🔍_EXPLORADOR_BANCO_DADOS_v1.0.103.315.html`
2. Clicar em cada entidade
3. Ver exemplos práticos

### Problema: Não sei qual prefixo usar
**Solução:**
1. Ver tabela de prefixos em `📊_ESTRUTURA_COMPLETA_BANCO_DADOS_v1.0.103.315.md`
2. Seção: "🔑 SISTEMA DE PREFIXOS"

### Problema: Não sei como buscar dados
**Solução:**
1. Ver exemplos em `🎨_DIAGRAMA_VISUAL_BANCO_v1.0.103.315.md`
2. Seção: "🎯 COMO BUSCAR DADOS (Queries)"

### Problema: Estrutura de imóvel confusa
**Solução:**
1. Ver árvore completa em `🎨_DIAGRAMA_VISUAL_BANCO_v1.0.103.315.md`
2. Seção: "🏗️ ESTRUTURA DE UM IMÓVEL (Unificado)"

---

## 🎯 PRÓXIMOS PASSOS

Depois de entender o banco de dados:

1. ✅ **Executar migração** - `🤖_EXECUTAR_MIGRACAO_AUTOMATICA_v1.0.103.315.html`
2. ✅ **Ver dados normalizados** - Acessar `/properties`
3. ✅ **Testar CRUD** - Criar, editar, deletar imóveis
4. ✅ **Explorar relacionamentos** - Reservas, bloqueios, etc.
5. ✅ **Integrar WhatsApp** - Usar chats e mensagens

---

## 📚 DOCUMENTAÇÃO RELACIONADA

### Backend:
- `supabase/functions/server/kv_store.tsx` - Funções KV
- `supabase/functions/server/routes-properties.ts` - CRUD de imóveis
- `supabase/functions/server/types.ts` - Tipos TypeScript

### Wizard:
- `docs/📊_LOGICA_SALVAMENTO_WIZARD_v1.0.103.305.md` - Como o wizard salva
- `docs/MAPEAMENTO_WIZARD_COMPLETO_BACKEND_v1.0.103.264.md` - Mapeamento campos

### Sistema Unificado:
- `✅_SISTEMA_UNIFICADO_IMPLEMENTADO_v1.0.103.315.md` - Implementação completa
- `📋_RESUMO_EXECUTIVO_v1.0.103.315.md` - Resumo da solução

---

## ✅ CHECKLIST DE ESTUDO

- [ ] Abri o Explorador Visual HTML
- [ ] Entendi o conceito de KV Store
- [ ] Sei o que são prefixos
- [ ] Entendo Multi-Tenancy
- [ ] Conheço a estrutura de um imóvel
- [ ] Sei como buscar dados (get, getByPrefix)
- [ ] Sei como salvar dados (set)
- [ ] Entendo o sistema unificado (raiz + wizard)
- [ ] Conheço as 17 entidades principais
- [ ] Sei onde buscar ajuda (este índice!)

---

**VERSÃO:** v1.0.103.315  
**DATA:** 05/11/2025  
**CRIADO POR:** Sistema RENDIZY  
**MANTIDO EM:** 3 arquivos principais + este índice

---

## 🎉 PARABÉNS!

Você agora tem acesso à **documentação mais completa** do banco de dados RENDIZY!

### 3 formas de aprender:
1. **Visual (HTML)** - Explorador interativo
2. **Textual (MD)** - Estrutura completa
3. **Diagramas (MD)** - Fluxos e relacionamentos

### Use conforme sua necessidade:
- 🎯 **Busca rápida** → Este índice
- 🔍 **Exploração** → HTML
- 📖 **Estudo profundo** → Estrutura completa
- 🎨 **Entender fluxos** → Diagramas

**Bons estudos! 🚀**
