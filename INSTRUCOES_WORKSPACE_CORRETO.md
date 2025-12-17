# 🔧 INSTRUÇÕES: ABRIR WORKSPACE CORRETO

**PROBLEMA:** Terminal abrindo no diretório errado (backup ao invés do projeto)

---

## ✅ SOLUÇÃO

### **PASSO 1: Fechar Todas as Janelas do Cursor**
- Feche todas as janelas abertas do Cursor
- Isso garante que não há workspace antigo em memória

### **PASSO 2: Abrir Workspace Correto**

**Opção A: Pelo Menu (RECOMENDADO)**
1. Abra o Cursor
2. Vá em **File → Open Workspace from File...**
3. Navegue até: `C:\dev\RENDIZY PASTA OFICIAL\`
4. Selecione: `rendizy.code-workspace`
5. Clique em **Open**

**Opção B: Pelo Explorer**
1. Abra o Windows Explorer
2. Navegue até: `C:\dev\RENDIZY PASTA OFICIAL\`
3. Clique com botão direito em `rendizy.code-workspace`
4. Selecione: **Open with Cursor**

### **PASSO 3: Verificar que Está Correto**

No terminal do Cursor, execute:
```powershell
pwd
```

**Deve mostrar:**
```
C:\dev\RENDIZY PASTA OFICIAL
```

**Se mostrar outro caminho:**
- ❌ `C:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP` → ERRADO (é backup)
- ❌ `C:\Users\rafae\OneDrive\Documentos\MIGGRO` → ERRADO (é outro projeto)
- ✅ `C:\dev\RENDIZY PASTA OFICIAL` → CORRETO

---

## 🚨 NUNCA ABRIR

- ❌ `C:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP`
  - **Motivo:** É apenas um backup, não o projeto ativo
  
- ❌ `C:\Users\rafae\OneDrive\Documentos\MIGGRO`
  - **Motivo:** É outro projeto diferente (MIGGRO), não RENDIZY

---

## ✅ SEMPRE ABRIR

- ✅ `C:\dev\RENDIZY PASTA OFICIAL`
  - **Motivo:** Este é o projeto RENDIZY ativo onde trabalhamos

---

## 🔍 VERIFICAÇÃO RÁPIDA

Execute no terminal:
```powershell
# Deve mostrar o caminho correto
Get-Location

# Deve encontrar os arquivos do projeto
Test-Path "RendizyPrincipal\package.json"
Test-Path "supabase\functions\rendizy-server\index.ts"
```

**Ambos devem retornar `True`**

---

## 📋 CHECKLIST

Antes de começar a trabalhar, verifique:

- [ ] Terminal mostra: `PS C:\dev\RENDIZY PASTA OFICIAL>`
- [ ] `Test-Path "RendizyPrincipal\package.json"` retorna `True`
- [ ] `Test-Path "supabase\functions\rendizy-server\index.ts"` retorna `True`
- [ ] Não está em pasta de backup
- [ ] Não está em pasta MIGGRO

---

## 🎯 RESULTADO ESPERADO

Quando estiver correto:
- ✅ Terminal abre automaticamente em `C:\dev\RENDIZY PASTA OFICIAL`
- ✅ Scripts PowerShell funcionam corretamente
- ✅ Deploy funciona sem erros de caminho
- ✅ Git funciona no repositório correto

---

**Status:** ✅ **WORKSPACE CONFIGURADO CORRETAMENTE**
