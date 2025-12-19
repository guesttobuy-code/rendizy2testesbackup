# 🎯 GUIA DE REFERÊNCIA RÁPIDA

> **Para:** Acesso rápido a informações essenciais  
> **Imprima e cole na parede!** 📌

---

## 📂 CAMINHOS IMPORTANTES

```
Pasta Principal:
C:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main

Backup de Consulta:
C:\Users\rafae\OneDrive\Desktop\RENDIZY_BACKUP_CONSULTA
```

---

## ⚡ COMANDOS MAIS USADOS

### **Desenvolvimento**
```powershell
# Iniciar servidor dev
npm run dev

# Build para produção
npm run build

# Rodar testes
npm test
```

### **Git**
```powershell
# Nova branch
git checkout -b feat/nome

# Commit padrão
git commit -m "feat(modulo): descrição"

# Push
git push origin feat/nome
```

### **Supabase**
```powershell
# Deploy backend
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc

# Ver logs
npx supabase functions logs rendizy-server --tail

# Rodar migração
psql -h [host] -U postgres -d postgres -f supabase/migrations/arquivo.sql
```

### **Scripts de Automação**
```powershell
# Iniciar tarefa
.\start-task.ps1 "nome-tarefa"

# Atualizar log
.\update-log.ps1 "arquivo.ts" "descrição"

# Finalizar tarefa
.\finish-task.ps1
```

---

## 🚨 TROUBLESHOOTING RÁPIDO

| Problema | Solução Rápida |
|----------|----------------|
| **Porta ocupada** | `taskkill /PID [PID] /F` |
| **Deps quebradas** | `rm -rf node_modules && npm install` |
| **Supabase 401** | Verificar `.env.local` |
| **Tela branca** | Limpar cache (Ctrl+Shift+Delete) |
| **Build falha** | `rm -rf dist && npm run build` |

---

## 📊 ESTRUTURA DO PROJETO

```
Rendizyoficial-main/
├── components/         ← UI React
│   ├── calendar/      ← Módulo calendário
│   ├── anuncio-ultimate/ ← Anúncios
│   └── StaysNetIntegration/ ← Stays.net
├── docs/              ← 📍 DOCUMENTAÇÃO
│   ├── README_DOCUMENTACAO.md ← COMECE AQUI
│   ├── operations/    ← Setup, deploy
│   └── dev-logs/      ← Logs diários
├── supabase/          ← Backend
│   ├── functions/     ← Edge Functions
│   └── migrations/    ← SQL migrations
├── CHANGELOG.md       ← Histórico de versões
└── App.tsx            ← Raiz da aplicação
```

---

## 🔗 LINKS ÚTEIS

| Recurso | URL |
|---------|-----|
| **Supabase Dashboard** | https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc |
| **Docs do Projeto** | [docs/README_DOCUMENTACAO.md](README_DOCUMENTACAO.md) |
| **Início Rápido** | [docs/operations/INICIO_RAPIDO.md](operations/INICIO_RAPIDO.md) |
| **Troubleshooting** | [docs/operations/TROUBLESHOOTING.md](operations/TROUBLESHOOTING.md) |
| **Workflow Dev** | [docs/WORKFLOW_DESENVOLVIMENTO.md](WORKFLOW_DESENVOLVIMENTO.md) |

---

## 🎓 PADRÕES DE CÓDIGO

### **Commits**
```
feat(modulo): adicionar funcionalidade X
fix(modulo): corrigir bug Y
docs(modulo): atualizar documentação
refactor(modulo): refatorar código
test(modulo): adicionar testes
```

### **Branches**
```
feat/nome-da-feature
fix/nome-do-bug
docs/nome-da-doc
refactor/nome-refactor
```

### **TypeScript**
```typescript
// ✅ BOM: Tipos explícitos
interface Props {
  title: string;
  onClose: () => void;
}

// ✅ BOM: Comentários explicam "porquê"
// Bug #42: Datas hardcoded causam calendário mostrar outubro
const date = new Date(); // Usar data atual ao invés de hardcoded
```

---

## 🔢 CÓDIGOS DE STATUS HTTP

| Código | Significado | O Que Fazer |
|--------|-------------|-------------|
| **200** | OK | Sucesso ✅ |
| **201** | Created | Recurso criado ✅ |
| **400** | Bad Request | Verificar payload |
| **401** | Unauthorized | Verificar auth/token |
| **403** | Forbidden | Sem permissão |
| **404** | Not Found | Rota não existe |
| **500** | Server Error | Ver logs backend |

---

## 📱 ATALHOS DO VSCODE

| Ação | Atalho |
|------|--------|
| **Abrir terminal** | Ctrl + \` |
| **Command Palette** | Ctrl + Shift + P |
| **Buscar arquivo** | Ctrl + P |
| **Buscar em arquivos** | Ctrl + Shift + F |
| **Ir para definição** | F12 |
| **Renomear símbolo** | F2 |
| **Formatar código** | Shift + Alt + F |

---

## 🔐 VARIÁVEIS DE AMBIENTE (.env.local)

```bash
# Supabase
VITE_SUPABASE_URL=https://odcgnzfremrqnvtitpcc.supabase.co
VITE_SUPABASE_ANON_KEY=[sua_key]
VITE_SUPABASE_SERVICE_ROLE_KEY=[sua_key]

# StaysNet (opcional)
VITE_STAYSNET_API_KEY=[sua_key]
VITE_STAYSNET_ACCOUNT_NAME=[nome]
```

---

## 📞 QUEM PROCURAR

| Área | Responsável | Como Contatar |
|------|-------------|---------------|
| **Product** | Rafael | [contato] |
| **Backend** | Time Dev | [contato] |
| **Frontend** | Time Dev | [contato] |
| **DevOps** | Time Infra | [contato] |
| **Suporte** | GitHub Issues | [repo/issues] |

---

## 💡 DICAS PROFISSIONAIS

1. **Sempre use branches** - Nunca commite direto na main
2. **Commits descritivos** - Explique o "porquê", não só o "o quê"
3. **Documente enquanto trabalha** - Não deixe para depois
4. **Teste antes de commitar** - Evite quebrar o build
5. **Use scripts de automação** - Economize tempo

---

## 🎯 FLUXO DE TRABALHO IDEAL

```
1. .\start-task.ps1 "nome"
   ↓ (2 min - preencher objetivo)

2. Programar normalmente
   ↓ (30 seg cada 15 min - atualizar log)

3. git commit -m "feat: descrição"
   ↓ (30 seg - commit descritivo)

4. .\finish-task.ps1
   ↓ (3 min - finalizar e push)

✅ Tarefa completa com contexto preservado!
```

---

**Imprima esta página e tenha sempre à mão! 📌**

**Última Atualização:** 2024-12-19  
**Versão:** 1.0
