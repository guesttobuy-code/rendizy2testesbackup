# 📋 Resumo Executivo: Migração Supabase

**Objetivo:** Migrar banco de dados de conta compartilhada para conta privada.

---

## 🎯 **PROCESSO SIMPLIFICADO**

### **1. Preparar Nova Conta**
- [ ] Criar novo projeto no Supabase (nova conta)
- [ ] Anotar novo Project ID
- [ ] Anotar nova Anon Key (Settings → API)

### **2. Exportar da Conta Antiga**
```powershell
.\exportar-banco-completo.ps1
```

### **3. Importar na Conta Nova**
```powershell
.\migrar-supabase.ps1 -ProjectIdNovo "[NOVO_ID]"
```

### **4. Atualizar Frontend**
```powershell
.\atualizar-project-id.ps1 -ProjectIdAntigo "odcgnzfremrqnvtitpcc" -ProjectIdNovo "[NOVO_ID]"
```

### **5. Atualizar info.tsx**
Editar `src/utils/supabase/info.tsx`:
- Project ID novo
- Anon Key nova

### **6. Configurar Secrets**
No Dashboard Supabase (nova conta):
- Settings → Edge Functions → Secrets
- Adicionar todas as variáveis de ambiente

### **7. Atualizar Vercel**
No Vercel Dashboard:
- Settings → Environment Variables
- Atualizar `VITE_SUPABASE_URL`
- Atualizar `VITE_SUPABASE_ANON_KEY`

---

## ⚠️ **IMPORTANTE**

1. **Backup completo antes de começar**
2. **Testar em staging primeiro** (se possível)
3. **Manter conta antiga ativa** por alguns dias após migração
4. **Validar integridade dos dados** após migração
5. **Atualizar webhooks** (Evolution API, etc.)

---

## 📚 **DOCUMENTAÇÃO COMPLETA**

Ver `PLANO_MIGRACAO_SUPABASE.md` para detalhes completos.

