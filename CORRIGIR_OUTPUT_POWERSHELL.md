# 🔧 Corrigir Problema de Output do PowerShell no Cursor

**Problema:** Comandos PowerShell executam mas o output não aparece para o AI.

**Status:** Problema conhecido da comunidade Cursor.

---

## ✅ SOLUÇÕES (Tente nesta ordem)

### **Solução 1: Configurar PowerShell 7 como Padrão**

1. **Abrir Configurações do Cursor:**
   - `Ctrl + ,` (ou `File` → `Preferences` → `Settings`)
   - Clicar no ícone `{}` no canto superior direito (abrir JSON)

2. **Adicionar estas configurações:**
   ```json
   {
     "terminal.integrated.profiles.windows": {
       "PowerShell 7": {
         "path": "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
         "icon": "terminal-powershell",
         "args": []
       }
     },
     "terminal.integrated.defaultProfile.windows": "PowerShell 7"
   }
   ```

3. **Se PowerShell 7 não estiver instalado:**
   - Baixar: https://aka.ms/powershell-release?tag=stable
   - Ou usar caminho do PowerShell 5.1:
     ```json
     {
       "terminal.integrated.defaultProfile.windows": "PowerShell",
       "terminal.integrated.profiles.windows": {
         "PowerShell": {
           "path": "C:\\WINDOWS\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
           "args": []
         }
       }
     }
     ```

4. **Reiniciar Cursor completamente** (fechar todas as janelas)

---

### **Solução 2: Desabilitar Preview Box do Terminal**

1. **Abrir Configurações:**
   - `Ctrl + ,`

2. **Buscar por:** `terminal preview`

3. **Desabilitar:** `Use preview box for terminal Ctrl+K`

4. **Reiniciar Cursor**

---

### **Solução 3: Atualizar Cursor**

1. **Verificar versão atual:**
   - `Help` → `About`

2. **Atualizar:**
   - `Help` → `Check for Updates`
   - Ou baixar: https://cursor.sh/

---

### **Solução 4: Verificar Configuração do Terminal**

1. **Abrir Terminal no Cursor:**
   - `Ctrl + `` (backtick)

2. **Verificar qual shell está sendo usado:**
   - Deve aparecer no prompt

3. **Se não for PowerShell, mudar:**
   - Clicar no `+` ao lado do terminal
   - Selecionar `PowerShell` ou `PowerShell 7`

---

### **Solução 5: Usar Script de Diagnóstico**

Execute o script que criei:
```powershell
.\diagnosticar-terminal.ps1
```

Ele vai:
- Verificar qual PowerShell está instalado
- Verificar configurações do Cursor
- Sugerir correções

---

## 🔍 DIAGNÓSTICO

### **Verificar se PowerShell 7 está instalado:**
```powershell
Get-Command pwsh -ErrorAction SilentlyContinue
```

### **Verificar versão do PowerShell atual:**
```powershell
$PSVersionTable
```

### **Verificar configurações do Cursor:**
Arquivo: `%APPDATA%\Cursor\User\settings.json`

---

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] PowerShell 7 instalado OU PowerShell 5.1 configurado
- [ ] Configurações do terminal adicionadas no `settings.json`
- [ ] Preview box do terminal desabilitado
- [ ] Cursor atualizado para última versão
- [ ] Cursor reiniciado completamente
- [ ] Terminal testado com comando simples: `echo "teste"`

---

## 🆘 SE NADA FUNCIONAR

1. **Reportar no GitHub do Cursor:**
   - https://github.com/cursor/cursor/issues
   - Buscar por: "PowerShell output not captured"

2. **Usar workaround temporário:**
   - Executar comandos manualmente
   - Me mostrar o output
   - Ou usar scripts que salvam output em arquivos

---

## 📚 REFERÊNCIAS

- [Cursor Terminal Documentation](https://docs.cursor.com/en/agent/terminal)
- [Cursor Forum - PowerShell Issues](https://forum.cursor.com/t/how-can-i-prevent-cursor-from-making-the-same-mistakes-when-executing-powershell/48389)
- [GitHub Issue #3138](https://github.com/cursor/cursor/issues/3138)

---

**Última atualização:** 2025-11-30


