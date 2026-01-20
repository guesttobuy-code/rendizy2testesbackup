# 📋 INSTRUÇÕES FINAIS - TESTAR CONFIGURAÇÕES DO FINANCEIRO

**Data:** 26/11/2025  
**Status:** ⚠️ Backend offline - Usando token temporário

---

## 🎯 **OBJETIVO**

Acessar a tela de **Configurações do Financeiro** para testar a funcionalidade de mapeamento de campos.

---

## 🔧 **PASSO A PASSO**

### **1. Inserir Token no localStorage**

1. Abra o navegador em: `http://localhost:3000/login`
2. Pressione **F12** para abrir o DevTools
3. Vá na aba **Console**
4. Cole o seguinte código e pressione **Enter**:

```javascript
localStorage.setItem('rendizy-token', 'e5f471292049ca396d5fa4f9fd691814c127d7ca5286e4ae1f77adc8d31950860264ecfee2128c47a954b98f38f15a8b719c552e2ba681a36ef5379962f967e8');
window.location.reload();
```

5. A página será recarregada automaticamente
6. Você deve ser redirecionado para o dashboard

### **2. Navegar até Configurações do Financeiro**

**Opção A: Via Menu Lateral**
1. No menu lateral esquerdo, encontre a seção **"Financeiro"**
2. Clique em **"Finanças"** (não "Financeiro")
3. No submenu do Financeiro, encontre **"Configurações"**
4. Clique em **"Configurações do Financeiro"**

**Opção B: Via URL Direta**
1. Após o login, acesse diretamente:
   ```
   http://localhost:3000/financeiro/configuracoes
   ```

### **3. Testar Funcionalidade**

Na tela de **Configurações do Financeiro**, você verá duas abas:

1. **Mapeamento de Campos x Contas**
   - Lista de campos do sistema (ex: "Preço por Noite", "Taxa de Limpeza")
   - Clique em um campo para mapeá-lo a uma conta do plano de contas
   - Modal de busca para selecionar a conta
   - Apenas subcategorias são selecionáveis

2. **Plataformas de Pagamento**
   - Gerenciamento de plataformas de pagamento

---

## 🐛 **PROBLEMAS CONHECIDOS**

### **Backend Offline (503)**
- **Status:** Backend retornando 503 Service Unavailable
- **Causa:** Erro de compilação no backend (já corrigido, mas pode estar em cache)
- **Solução Temporária:** Usar token no localStorage para bypass de autenticação
- **Impacto:** Algumas funcionalidades podem não funcionar sem backend

### **Erro de CORS**
- **Status:** Requisições OPTIONS retornando 503
- **Causa:** Backend não está respondendo corretamente
- **Impacto:** APIs não funcionam, sistema usa modo fallback

---

## 📝 **ARQUIVOS CRIADOS**

1. ✅ `criar-token-temporario.sql` - Script SQL para gerar token
2. ✅ `inserir-token-console.js` - Script JavaScript para console
3. ✅ `FALHAS_MAPEADAS_LOCALHOST.md` - Documento com todas as falhas
4. ✅ `INSTRUCOES_TESTE_CONFIGURACOES_FINANCEIRO.md` - Instruções anteriores
5. ✅ `INSTRUCOES_FINAIS_TESTE_CONFIGURACOES.md` - Este documento

---

## ✅ **CHECKLIST**

- [ ] Token inserido no localStorage
- [ ] Página recarregada
- [ ] Login bem-sucedido (redirecionado para dashboard)
- [ ] Navegou até `/financeiro/configuracoes`
- [ ] Tela de Configurações do Financeiro carregada
- [ ] Aba "Mapeamento de Campos x Contas" visível
- [ ] Lista de campos exibida
- [ ] Testou clicar em um campo para mapear
- [ ] Modal de busca de contas funcionando
- [ ] Mapeamento confirmado

---

## 🚨 **SE NÃO FUNCIONAR**

1. **Verifique o token no localStorage:**
   ```javascript
   localStorage.getItem('rendizy-token')
   ```

2. **Verifique se o backend voltou:**
   - Acesse: `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/health`
   - Deve retornar `200 OK` (não `503`)

3. **Tente fazer login normalmente:**
   - Use as credenciais: `admin / root`
   - Se funcionar, o backend voltou

4. **Verifique os logs do console:**
   - Pressione F12
   - Vá na aba Console
   - Procure por erros relacionados a autenticação

---

## 📞 **PRÓXIMOS PASSOS**

Após conseguir acessar a tela de Configurações do Financeiro:

1. **Testar mapeamento de campos:**
   - Clique em "Preço por Noite"
   - Verifique se o modal abre
   - Busque por uma conta
   - Confirme o mapeamento

2. **Verificar se o mapeamento salva:**
   - Recarregue a página
   - Verifique se o mapeamento persiste

3. **Testar edição de mapeamento:**
   - Clique em "Editar" em um campo já mapeado
   - Verifique se o modal de confirmação dupla aparece
   - Confirme a edição

4. **Reportar falhas encontradas:**
   - Documente qualquer erro ou comportamento inesperado
   - Capture screenshots se necessário

---

**Última atualização:** 26/11/2025 01:05

