# 📚 ÍNDICE: Documentação Operacional

> **Propósito:** Guias práticos para operação do sistema (setup, deploy, troubleshooting)

---

## 🗂️ DOCUMENTOS DISPONÍVEIS

### 1️⃣ **Setup e Configuração**

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| [SETUP_COMPLETO.md](SETUP_COMPLETO.md) | Setup completo do projeto | Primeira vez configurando |
| [INICIO_RAPIDO.md](INICIO_RAPIDO.md) | Guia rápido (5 minutos) | Já tem ambiente configurado |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Problemas comuns | Algo não funciona |

---

### 2️⃣ **Deploy e Produção**

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| [DEPLOY_FRONTEND.md](DEPLOY_FRONTEND.md) | Deploy Vercel/Netlify | Atualizar frontend |
| [DEPLOY_BACKEND.md](DEPLOY_BACKEND.md) | Deploy Supabase Functions | Atualizar backend |
| [ROLLBACK.md](ROLLBACK.md) | Como reverter deploy | Algo quebrou em produção |
| [ANUNCIOS_PROPERTIES_CAPACITY_SYNC.md](ANUNCIOS_PROPERTIES_CAPACITY_SYNC.md) | Garantir cards refletem edição interna (rooms → capacity) | Cards com números desatualizados |

---

### 3️⃣ **Desenvolvimento Local**

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| [AMBIENTE_LOCAL.md](AMBIENTE_LOCAL.md) | Configurar ambiente dev | Novo desenvolvedor |
| [DEBUG_GUIA.md](DEBUG_GUIA.md) | Como debugar problemas | Investigar bugs |
| [TESTES.md](TESTES.md) | Como rodar testes | Validar mudanças |

---

### 4️⃣ **Manutenção**

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| [BACKUP_RESTORE.md](BACKUP_RESTORE.md) | Backup e restauração | Segurança dos dados |
| [MIGRACAO_BANCO.md](MIGRACAO_BANCO.md) | Rodar migrações SQL | Atualizar schema |
| [LIMPEZA_CACHE.md](LIMPEZA_CACHE.md) | Limpar caches | Performance ruim |

---

## 🚀 COMANDOS RÁPIDOS

### **Iniciar Desenvolvimento**
```powershell
cd "Rendizyoficial-main"
npm run dev
```

### **Deploy Backend**
```powershell
cd "Rendizyoficial-main"
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

### **Ver Logs Backend**
```powershell
npx supabase functions logs rendizy-server --tail
```

### **Build para Produção**
```powershell
npm run build
```

---

## 🔗 LINKS ÚTEIS

- **Supabase Dashboard:** https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
- **Vercel Dashboard:** [Adicionar URL]
- **GitHub Repository:** [Adicionar URL]

---

## 📞 SUPORTE

**Problemas comuns?** Veja [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**Algo quebrou?** Veja [ROLLBACK.md](ROLLBACK.md)

**Precisa de ajuda?** Abra issue no GitHub ou consulte time

---

**Última Atualização:** 2024-12-19  
**Mantenedor:** Time Rendizy
