# 🔧 Como Usar Depuração Chrome → VS Code

## ✅ Método Recomendado: Chrome DevTools Protocol (CDP)

### Opção 1: Anexar ao Chrome já aberto

**1. Abrir Chrome com CDP:**
```powershell
# No PowerShell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**2. No VS Code:**
- Pressione `Ctrl+Shift+D` (Run and Debug)
- Selecione: **🔗 Anexar ao Chrome (CDP 9222)**
- Pressione `F5` ou clique no botão verde ▶️

**3. Resultado:**
- ✅ Logs do `console.log()` aparecem no **Debug Console** do VS Code
- ✅ Breakpoints funcionam
- ✅ Variáveis inspecionáveis
- ✅ Call stack visível

---

### Opção 2: Iniciar Chrome direto do VS Code

**1. No VS Code:**
- Pressione `Ctrl+Shift+D`
- Selecione: **🚀 Iniciar Chrome com Depuração**
- Pressione `F5`

**2. Resultado:**
- Chrome abre automaticamente em `http://localhost:3000`
- Debug já conectado
- Profile isolado em `.chrome-debug-profile/`

---

## 🎯 Vantagens sobre aiLogger.ts

| Recurso | aiLogger.ts | Chrome CDP |
|---------|-------------|------------|
| Logs em tempo real | ❌ | ✅ |
| Breakpoints | ❌ | ✅ |
| Inspeção de variáveis | ❌ | ✅ |
| Source maps | ❌ | ✅ |
| Performance profiling | ❌ | ✅ |
| Network monitoring | ❌ | ✅ |

---

## 📦 Atalhos no VS Code

- **F5** - Iniciar depuração
- **Shift+F5** - Parar depuração
- **Ctrl+Shift+F5** - Reiniciar depuração
- **F9** - Toggle breakpoint
- **F10** - Step over
- **F11** - Step into

---

## 🔍 Ver Logs no Debug Console

Após conectar:

1. Painel **Debug Console** abre automaticamente
2. Todos os `console.log()` aparecem lá
3. Clique nas mensagens para ver o arquivo de origem
4. Use `console.table()`, `console.group()`, etc.

---

## ⚠️ Troubleshooting

### Chrome não conecta:
```powershell
# Verificar se porta 9222 está ocupada
netstat -ano | findstr :9222

# Matar processo se necessário
taskkill /PID <PID> /F
```

### Source maps não funcionam:
- Certifique-se que Vite está gerando source maps
- Verifique `vite.config.ts`:
```typescript
export default defineConfig({
  build: {
    sourcemap: true
  }
})
```

---

## 🚀 Próximos Passos

1. ✅ Configuração feita em `.vscode/launch.json`
2. ✅ Use `F5` para iniciar
3. ✅ Teste o calendário com breakpoints
4. 🎉 Debug profissional ativado!

---

## 💡 Dica Pro

Combine com **aiLogger.ts** para ter:
- CDP para debug local
- aiLogger para capturar logs de usuários em produção
