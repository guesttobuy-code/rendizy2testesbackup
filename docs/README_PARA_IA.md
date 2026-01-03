# 📚 DOCUMENTOS OBRIGATÓRIOS PARA I.A. - Rendizy

**Última atualização**: 23/12/2025  
**Para**: Claude Sonnet, GitHub Copilot, e futuras I.A.s que trabalhem neste projeto

---

## 🚨 LEIA ANTES DE MODIFICAR CÓDIGO

⚠️ **Governança de documentação (obrigatório)**: antes de criar qualquer `.md`, siga
📄 [`docs/03-conventions/DOCS_GOVERNANCE.md`](docs/03-conventions/DOCS_GOVERNANCE.md)

### 🔒 Arquivos Críticos (Leitura Obrigatória)

#### 1. **CORS e Integração de Módulos**
📄 [`docs/architecture/BLINDAGEM_MODULAR_ANTI_REGRESSAO.md`](docs/architecture/BLINDAGEM_MODULAR_ANTI_REGRESSAO.md)

**Quando ler**: SEMPRE antes de modificar `supabase/functions/rendizy-server/index.ts`

**O que contém**:
- Por que CORS quebra e como prevenir
- Checklist para adicionar novos módulos
- Histórico de regressões (23/12/2025, 20/11/2025)
- Como `index.ts` é ponto único de falha

**Palavras-chave**: CORS, import, index.ts, OPTIONS, preflight

---

#### 2. **Persistência de Dados (Padrão Atômico)**
📄 [`docs/architecture/PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md`](docs/architecture/PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md)

**Quando ler**: SEMPRE antes de adicionar persistência de dados (integrações, novos módulos)

**O que contém**:
- RPC `save_anuncio_field` (padrão vitorioso)
- UPSERT atômico vs INSERT/UPDATE separados
- Idempotência e zero race conditions
- Checklist para criar RPC atômica
- Anti-padrões e como evitar

**Palavras-chave**: RPC, UPSERT, atômico, idempotência, save_anuncio_field, StaysNet

---

#### 3. **Configuração CORS Definitiva**
📄 [`docs/operations/SETUP_COMPLETO.md`](docs/operations/SETUP_COMPLETO.md) - **Seção 4.4**

**Quando ler**: Antes de modificar CORS, autenticação, ou headers

**O que contém**:
- `origin: "*"` SEM `credentials: true` (padrão que funciona)
- Token no header (não cookie)
- Histórico de tentativas falhas
- Por que simplicidade vence complexidade

**Palavras-chave**: CORS, credentials, origin, Authorization, Bearer

---

### 📖 Documentos de Referência

#### 4. **Arquitetura de Anúncios**
📄 [`docs/02-architecture/ARQUITETURA_ANUNCIO_ULTIMATE.md`](docs/02-architecture/ARQUITETURA_ANUNCIO_ULTIMATE.md)

Arquitetura completa do sistema de anúncios com JSONB + RPC atômica.

---

#### 5. **Histórico de Vitórias**
📄 [`docs/resumos/LIGANDO_OS_MOTORES_UNICO.md`](docs/resumos/LIGANDO_OS_MOTORES_UNICO.md)

Histórico de problemas resolvidos e lições aprendidas.

---

#### 6. **Login e Autenticação**
📄 [`docs/05-operations/LOGIN_VITORIAS_CONSOLIDADO.md`](docs/05-operations/LOGIN_VITORIAS_CONSOLIDADO.md)

Como login funciona e o que NÃO fazer.

---

## 🎯 FLUXOGRAMA DE DECISÃO

```
┌─────────────────────────────────────────┐
│ Vou modificar o sistema?                │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ O que vou modificar? │
        └─────────┬────────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
      ▼           ▼           ▼
  ┌─────┐    ┌─────┐    ┌─────┐
  │CORS │    │Dados│    │Outro│
  │ou   │    │ou   │    │     │
  │Auth │    │API  │    │     │
  └──┬──┘    └──┬──┘    └──┬──┘
     │          │          │
     ▼          ▼          ▼
   LER        LER        Revisar
  Doc 1,3    Doc 2      docs/
```

---

## ✅ CHECKLIST RÁPIDO (Copy/Paste)

### Antes de Commit

```markdown
- [ ] Li documentação relevante (BLINDAGEM ou PERSISTENCIA)
- [ ] Segui checklist do documento aplicável
- [ ] Executei VALIDATE-BEFORE-DEPLOY.ps1 (se modificou backend)
- [ ] CORS não foi modificado (ou li SETUP_COMPLETO.md antes)
- [ ] Import adicionado ANTES de registrar rota
- [ ] Se persistência: usei RPC atômica (não INSERT/UPDATE separados)
- [ ] Testei localmente (deno check, npm run dev)
```

### Antes de Deploy

```markdown
- [ ] Commit realizado
- [ ] VALIDATE-BEFORE-DEPLOY.ps1 passou
- [ ] Git push
- [ ] Deploy: npx -y supabase@latest functions deploy rendizy-server
- [ ] Teste CORS: curl -X OPTIONS [URL] → HTTP 204
- [ ] Teste funcional: login, criação de anúncio, etc.
```

---

## 🚨 REGRAS DE OURO

### ❌ NUNCA FAÇA

1. ❌ Modificar CORS sem ler `SETUP_COMPLETO.md` (Seção 4.4)
2. ❌ Adicionar rota em `index.ts` sem adicionar import correspondente
3. ❌ Usar INSERT/UPDATE separados ao invés de RPC atômica
4. ❌ Adicionar `credentials: true` com `origin: "*"`
5. ❌ Deploy sem executar `VALIDATE-BEFORE-DEPLOY.ps1`
6. ❌ Modificar linhas 1-100 de `index.ts` sem ler `BLINDAGEM_MODULAR_ANTI_REGRESSAO.md`

### ✅ SEMPRE FAÇA

1. ✅ Ler documentação ANTES de modificar
2. ✅ Seguir checklist dos documentos
3. ✅ Usar RPC atômica para persistência
4. ✅ Adicionar import ANTES de registrar rota
5. ✅ Testar CORS após modificar `index.ts`
6. ✅ Documentar mudanças em `CHANGELOG_BLINDAGEM.md`

---

## 📊 MAPA DE DOCUMENTOS

```
docs/
├── architecture/
│   ├── BLINDAGEM_MODULAR_ANTI_REGRESSAO.md      ⭐ CRÍTICO - CORS
│   ├── PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md ⭐ CRÍTICO - Dados
│   └── CAPSULAS_MODULARES.md                     Isolamento
│
├── operations/
│   └── SETUP_COMPLETO.md                         ⭐ Seção 4.4 - CORS
│
└── (raiz)/
  ├── (evitar criar .md na raiz)                Ver DOCS_GOVERNANCE
  └── (exceções via whitelist)                  ROOT_MD_WHITELIST.txt
```

---

## 🔄 QUANDO ATUALIZAR ESTE README

- [ ] Novo documento crítico criado
- [ ] Mudança de localização de documentos
- [ ] Nova regra de ouro identificada
- [ ] Novo anti-padrão descoberto

---

## 💬 PARA FUTUROS DESENVOLVEDORES

Este projeto tem **histórico de regressões** causadas por:
1. Não seguir padrões estabelecidos
2. Modificar CORS sem entender implicações
3. Adicionar código sem documentação de suporte

Os documentos listados acima são **resultado de horas de debug** e **lições custosas**.

**Por favor, leia-os.** Eles vão te poupar dias de trabalho.

---

**Mantido por**: Rafael  
**Para dúvidas**: Consulte os documentos ou peça para a I.A. ler este README primeiro
