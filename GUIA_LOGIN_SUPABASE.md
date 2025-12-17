# 🔐 GUIA: Instalar e Usar Supabase CLI para Logs

## ✅ INSTALAÇÃO COMPLETA

### 1️⃣ **Instalar CLI**

Execute o script:
```powershell
.\instalar-supabase-cli.ps1
```

Ou manualmente:
```powershell
npm install -g supabase
```

### 2️⃣ **Autenticar**

```powershell
supabase login
```

Isso abrirá o navegador para autorizar. Siga o fluxo de autenticação.

### 3️⃣ **Linkar Projeto**

```powershell
supabase link --project-ref odcgnzfremrqnvtitpcc
```

### 4️⃣ **Ver Logs**

```powershell
# Todos os logs
supabase logs

# Filtrar apenas login
.\ver-logs.ps1 -Filter "login|auth|rppt"
```

---

## 📊 OPÇÕES DISPONÍVEIS

### **Opção 1: Dashboard (Mais Fácil)**
```
https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs
```
- ✅ Interface visual
- ✅ Filtros e busca
- ✅ Atualização automática

### **Opção 2: CLI (Terminal)**
```powershell
supabase logs
```
- ✅ Linha de comando
- ✅ Scripts automatizados
- ✅ Integração com outros tools

### **Opção 3: Tabela SQL (Recomendado para Produção)**
```sql
SELECT * FROM function_logs 
ORDER BY created_at DESC 
LIMIT 50;
```
- ✅ Histórico completo
- ✅ Consultas customizadas
- ✅ Realtime opcional

---

**Status:** CLI instalado via npm. Próximo passo: autenticar com `supabase login`

