# ✅ RESUMO: CLI do Supabase

## 🎯 **STATUS**

✅ **CLI disponível via npx (v2.58.5)**

Não precisa instalar globalmente! Você pode usar diretamente:

```powershell
npx supabase --version
```

---

## 📋 **COMO USAR LOGS**

### **1️⃣ Via npx (Recomendado)**

```powershell
# Ver logs do projeto
npx supabase logs --project-ref odcgnzfremrqnvtitpcc

# Filtrar por função
npx supabase logs --project-ref odcgnzfremrqnvtitpcc --filter rendizy-server

# Ver últimas 50 linhas
npx supabase logs --project-ref odcgnzfremrqnvtitpcc --limit 50
```

### **2️⃣ Login primeiro (se necessário)**

Se aparecer erro de autenticação:

```powershell
npx supabase login
```

Isso vai abrir o navegador para você fazer login.

---

## 🔧 **SCRIPT CRIADO**

Criei o script `testar-logs-cli.ps1` para facilitar:

```powershell
.\testar-logs-cli.ps1
```

---

## 📊 **COMPARAÇÃO: Dashboard vs CLI**

| Método | Instalação | Tempo Real | Fácil |
|--------|-----------|------------|-------|
| **Dashboard** | ✅ Nenhuma | Manual (F5) | ✅✅✅ |
| **CLI (npx)** | ✅ Nenhuma | ✅ Sim | ✅✅ |

---

## 🚀 **RECOMENDAÇÃO**

**Para debug visual:**
- Use o **Dashboard** (já está aberto)

**Para automação/scripts:**
- Use **npx supabase logs**

---

**Status:** ✅ CLI funcionando via npx!

