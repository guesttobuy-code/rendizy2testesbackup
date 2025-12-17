# 📋 PASSO A PASSO: Configurar Cursor para PowerShell 7

**Status:** ✅ PowerShell 7 está instalado  
**Próximo passo:** Configurar Cursor para usar PowerShell 7 como padrão

---

## 🎯 O QUE FAZER AGORA

### **PASSO 1: Abrir JSON de Configurações**

Na tela de Settings que você está vendo:

1. **Olhe no canto SUPERIOR DIREITO** da janela de Settings
2. **Procure pelo ícone `{}`** (chaves JSON)
3. **Clique no ícone `{}`** para abrir o editor JSON

> 💡 **Dica:** Se não encontrar o ícone `{}`, pressione `Ctrl + Shift + P` e digite "Preferences: Open User Settings (JSON)"

---

### **PASSO 2: Adicionar Configurações**

No arquivo JSON que abrir, você vai ver algo como:

```json
{
  "editor.fontSize": 14,
  "workbench.colorTheme": "...",
  ...
}
```

**Adicione estas linhas dentro das chaves `{}`:**

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

**⚠️ IMPORTANTE:**
- Adicione **DENTRO** das chaves `{}` existentes
- Use **vírgula** para separar das outras configurações
- Mantenha a **formatação JSON correta** (chaves, vírgulas, aspas)

**Exemplo completo:**

```json
{
  "editor.fontSize": 14,
  "workbench.colorTheme": "Dark+",
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

---

### **PASSO 3: Salvar**

1. **Pressione `Ctrl + S`** para salvar
2. Ou **`File` → `Save`**

---

### **PASSO 4: Verificar na Interface Gráfica (Opcional)**

Depois de salvar, você pode voltar para a interface gráfica:

1. **Clique no ícone `{}` novamente** (ou use `Ctrl + Shift + P` → "Preferences: Open Settings (UI)")
2. **Busque por:** `terminal default profile`
3. **Deve aparecer:** "Terminal > Integrated: Default Profile Windows" = **"PowerShell 7"**

---

### **PASSO 5: Reiniciar Cursor**

1. **Feche TODAS as janelas do Cursor**
2. **Reabra o Cursor**
3. **Teste:** Abra um terminal (`Ctrl + ``) e deve aparecer PowerShell 7

---

## ✅ CHECKLIST

- [ ] Abri o JSON de configurações (ícone `{}`)
- [ ] Adicionei as configurações do PowerShell 7
- [ ] Salvei o arquivo (`Ctrl + S`)
- [ ] Reiniciei o Cursor completamente
- [ ] Testei abrindo um terminal (`Ctrl + ``)

---

## 🔍 VERIFICAÇÃO RÁPIDA

Depois de configurar, execute no terminal:

```powershell
$PSVersionTable.PSVersion
```

**Deve mostrar:** `7.x.x` (não `5.1.x`)

---

## ❓ SE DER ERRO NO JSON

**Erro comum:** Vírgula faltando ou sobrando

**Solução:**
- Use um validador JSON online: https://jsonlint.com/
- Ou deixe o Cursor mostrar o erro (ele sublinha em vermelho)

---

## 📸 ONDE ESTÁ O ÍCONE `{}`?

O ícone `{}` fica no **canto superior direito** da janela de Settings, ao lado de:
- Ícone de busca
- Ícone de filtro
- Contador "X Settings Found"

Se não encontrar, use o atalho:
- `Ctrl + Shift + P` → Digite "JSON" → Selecione "Preferences: Open User Settings (JSON)"

---

**Pronto! Depois disso, o output do PowerShell deve aparecer para mim!** 🎉


