# 📦 SISTEMA DE VERSIONAMENTO E DEPLOY

**Data de Criação:** 2025-11-26  
**Versão Atual:** v1.0.103.324

---

## 🎯 OBJETIVO

Sistema automatizado para:
- ✅ Versionamento semântico de releases
- ✅ Deploy automático no Supabase (backend)
- ✅ Commit e push no GitHub
- ✅ Backup automático com data e versão

---

## 📋 COMO USAR

### Deploy Completo (Recomendado)

```powershell
powershell -ExecutionPolicy Bypass -File deploy-completo.ps1
```

**O que faz:**
1. Lê versão atual de `RendizyPrincipal/BUILD_VERSION.txt`
2. Incrementa automaticamente o último número (patch)
3. Atualiza `BUILD_VERSION.txt` e `CACHE_BUSTER.ts`
4. Faz deploy do backend no Supabase
5. Faz commit e push no GitHub
6. Cria backup em `Downloads/rendizy-backup-{versao}-{data}.zip`

### Deploy com Versão Específica

```powershell
powershell -ExecutionPolicy Bypass -File deploy-completo.ps1 -Version "v1.0.104.0"
```

### Deploy com Mensagem Customizada

```powershell
powershell -ExecutionPolicy Bypass -File deploy-completo.ps1 -Message "Minha mensagem de commit"
```

---

## 🔢 FORMATO DE VERSÃO

**Padrão:** `v{MAJOR}.{MINOR}.{PATCH1}.{PATCH2}`

**Exemplo:** `v1.0.103.324`

- **MAJOR:** Mudanças incompatíveis (ex: v2.0.0.0)
- **MINOR:** Novas funcionalidades (ex: v1.1.0.0)
- **PATCH1:** Correções de bugs (ex: v1.0.104.0)
- **PATCH2:** Hotfixes e pequenos ajustes (ex: v1.0.103.325)

**Incremento Automático:**
- O script incrementa automaticamente o último número (PATCH2)
- Ex: `v1.0.103.322` → `v1.0.103.323`

---

## 📁 ARQUIVOS DE VERSÃO

### `RendizyPrincipal/BUILD_VERSION.txt`
```
v1.0.103.324

Build Date: 2025-11-26 03:11:44
```

### `RendizyPrincipal/CACHE_BUSTER.ts`
```typescript
export const CACHE_BUSTER = {
  version: 'v1.0.103.324',
  buildDate: '2025-11-26T03:11:44.000Z',
  reason: 'Deploy automatico: Sistema de registro de campos financeiros',
  changes: [
    'Sistema de registro automatico de campos financeiros',
    'Integracao Airbnb com registro automatico de campo',
    'Migration de campos financeiros aplicada',
    'Filtro de modulos atualizado (inclui Integracoes)',
  ],
};
```

---

## 💾 BACKUP AUTOMÁTICO

**Localização:** `C:\Users\{usuario}\Downloads\`

**Formato:** `rendizy-backup-{versao}-{data}-{hora}.zip`

**Exemplo:** `rendizy-backup-v1.0.103.324-20251126-031144.zip`

**Conteúdo:**
- Todo o projeto (exceto `node_modules`, `.git`, `dist`, `build`)
- Inclui código fonte, migrations, documentação
- Pronto para restauração completa

**Frequência Recomendada:**
- ✅ **Mínimo:** 1 vez por dia
- ✅ **Ideal:** A cada deploy importante
- ✅ **Obrigatório:** Antes de mudanças críticas

---

## 🚀 DEPLOY MANUAL (SE NECESSÁRIO)

### Backend (Supabase)

```powershell
npx supabase functions deploy rendizy-server --no-verify-jwt
```

### Frontend (Vercel)

O frontend é deployado automaticamente via GitHub quando há push na branch `main`.

---

## 📊 HISTÓRICO DE VERSÕES

| Versão | Data | Descrição |
|--------|------|-----------|
| v1.0.103.324 | 2025-11-26 | Sistema de registro automático de campos financeiros |
| v1.0.103.323 | 2025-11-26 | (incremento automático) |
| v1.0.103.322 | 2025-11-24 | Webhook Manager + Login persistente |

---

## 🔧 TROUBLESHOOTING

### Erro: "Docker is not running"
**Solução:** Normal no Windows. O script continua mesmo com este warning.

### Erro: "fatal: The current branch main has no upstream branch"
**Solução:** Execute:
```powershell
git push --set-upstream origin main
```

### Erro: "Failed to deploy function"
**Solução:** 
1. Verifique se está logado no Supabase: `npx supabase login`
2. Verifique se o projeto está linkado: `npx supabase projects list`
3. Tente deploy manual: `npx supabase functions deploy rendizy-server`

---

## 📝 NOTAS IMPORTANTES

1. **Sempre faça backup antes de mudanças críticas**
2. **Versione cada deploy importante**
3. **Mantenha histórico de versões atualizado**
4. **Teste em localhost antes de fazer deploy**
5. **Verifique logs do Supabase após deploy**

---

## 🎯 PRÓXIMOS PASSOS

- [ ] Criar script de backup diário automático (Task Scheduler)
- [ ] Adicionar tags Git para cada versão
- [ ] Criar changelog automático
- [ ] Integrar com CI/CD (GitHub Actions)

---

**Última Atualização:** 2025-11-26 03:11:44








