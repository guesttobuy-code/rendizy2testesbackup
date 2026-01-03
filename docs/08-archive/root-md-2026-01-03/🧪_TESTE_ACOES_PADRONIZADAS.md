# 🧪 TESTE - Ações Padronizadas de Imóveis

**Versão:** v1.0.103.280  
**Data:** 04/11/2025

---

## 🎯 O QUE TESTAR

Sistema padronizado para criar, editar e deletar imóveis com:
- ✅ Mensagens de sucesso consistentes
- ✅ Redirecionamento automático para `/properties`
- ✅ Recarregamento da página
- ✅ Comportamento uniforme em todo sistema

---

## 📋 ROTEIRO DE TESTES

### **TESTE 1: CRIAR IMÓVEL**

#### **Passo a Passo:**

```
1. Acesse: https://sua-url.com/properties

2. Clique no botão "+ Criar Anúncio Individual"

3. Preencha:
   ┌─────────────────────────────────────┐
   │ BÁSICO:                             │
   │ • Nome Interno: Casa Teste 280      │
   │ • Código: TST280                    │
   │ • Tipo: Casa                        │
   └─────────────────────────────────────┘
   
4. Clique em "Próximo"

5. Preencha:
   ┌─────────────────────────────────────┐
   │ DETALHES:                           │
   │ • Cidade: São Paulo                 │
   │ • Estado: SP                        │
   │ • Máx. Hóspedes: 4                  │
   │ • Quartos: 2                        │
   │ • Banheiros: 1                      │
   └─────────────────────────────────────┘

6. Clique em "Próximo"

7. Preencha:
   ┌─────────────────────────────────────┐
   │ PRECIFICAÇÃO:                       │
   │ • Preço Base: 300                   │
   └─────────────────────────────────────┘

8. Clique em "Finalizar"
```

#### **Resultado Esperado:**

```
✅ Toast aparece: "Casa Teste 280 criado com sucesso!"
✅ Aguarda ~500ms
✅ Redireciona para /properties
✅ Página recarrega automaticamente
✅ Imóvel "Casa Teste 280" aparece na lista
```

#### **Se Algo Der Errado:**

```
❌ Toast de erro: "Erro ao criar imóvel: {mensagem}"
❌ Console mostra log detalhado do erro
```

---

### **TESTE 2: EDITAR IMÓVEL**

#### **Passo a Passo:**

```
1. Acesse: https://sua-url.com/properties

2. Encontre "Casa Teste 280" na lista

3. Clique no botão de edição (✏️ lápis)

4. Wizard abre

5. No Step 1 (Tipo), altere:
   ┌─────────────────────────────────────┐
   │ • Nome Interno: Casa Teste 280 V2   │
   └─────────────────────────────────────┘

6. Navegue até o último step (14/14)

7. Clique em "Finalizar"
```

#### **Resultado Esperado:**

```
✅ Toast aparece: "Casa Teste 280 V2 editado com sucesso!"
✅ Aguarda ~500ms
✅ Redireciona para /properties
✅ Página recarrega automaticamente
✅ Nome atualizado aparece na lista: "Casa Teste 280 V2"
✅ Rascunho é limpo (clearDraft)
```

#### **Se Algo Der Errado:**

```
❌ Toast de erro: "Erro ao editar imóvel: {mensagem}"
❌ Console mostra log detalhado do erro
```

---

### **TESTE 3: CANCELAR EDIÇÃO**

#### **Passo a Passo:**

```
1. Acesse: https://sua-url.com/properties

2. Encontre "Casa Teste 280 V2" na lista

3. Clique no botão de edição (✏️ lápis)

4. Wizard abre

5. Faça alguma alteração qualquer

6. Clique em "Cancelar" (botão cinza no footer)
```

#### **Resultado Esperado:**

```
✅ Redireciona IMEDIATAMENTE para /properties
✅ SEM toast (comportamento esperado)
✅ Alterações NÃO são salvas
✅ Imóvel continua com dados originais
```

---

### **TESTE 4: DELETAR IMÓVEL (Soft Delete)**

#### **Passo a Passo:**

```
1. Acesse: https://sua-url.com/properties

2. Encontre "Casa Teste 280 V2" na lista

3. Clique no botão de lixeira (🗑️)

4. Modal de exclusão abre

5. Se houver reservas:
   ┌─────────────────────────────────────┐
   │ • Resolver transferência/cancelar   │
   │ • Seguir fluxo do modal             │
   └─────────────────────────────────────┘

6. Se NÃO houver reservas:
   ┌─────────────────────────────────────┐
   │ • Escolher "Desativar Imóvel"       │
   │ • (soft delete)                     │
   └─────────────────────────────────────┘

7. Confirmar
```

#### **Resultado Esperado:**

```
✅ Toast aparece: "Casa Teste 280 V2 desativado com sucesso!"
✅ Aguarda ~500ms
✅ Redireciona para /properties
✅ Página recarrega automaticamente
✅ Imóvel some da lista (status = inactive)
```

---

### **TESTE 5: DELETAR IMÓVEL (Hard Delete)**

#### **Passo a Passo:**

```
1. Crie um novo imóvel de teste:
   • Nome: Teste Delete Hard
   • SEM reservas

2. Clique na lixeira (🗑️)

3. Modal de exclusão abre

4. Escolher "Excluir Permanentemente"
   (hard delete)

5. Confirmar
```

#### **Resultado Esperado:**

```
✅ Toast aparece: "Teste Delete Hard deletado com sucesso!"
✅ Aguarda ~500ms
✅ Redireciona para /properties
✅ Página recarrega automaticamente
✅ Imóvel some PERMANENTEMENTE do banco
```

---

## 🔍 LOGS DO CONSOLE

### **Durante Criar:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏗️ [PROPERTY ACTIONS] Criando imóvel...
📊 [PROPERTY ACTIONS] Dados: {internalName: "Casa Teste 280", ...}
✅ [PROPERTY ACTIONS] Imóvel criado com sucesso: {...}
🔄 [PROPERTY ACTIONS] Redirecionando para /properties...
🔄 [PROPERTY ACTIONS] Recarregando página...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### **Durante Editar:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✏️ [PROPERTY ACTIONS] Editando imóvel...
📊 [PROPERTY ACTIONS] ID: abc-123
📊 [PROPERTY ACTIONS] Dados: {internalName: "Casa Teste 280 V2", ...}
✅ [PROPERTY ACTIONS] Imóvel editado com sucesso: {...}
🔄 [PROPERTY ACTIONS] Redirecionando para /properties...
🔄 [PROPERTY ACTIONS] Recarregando página...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### **Durante Deletar:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🗑️ [PROPERTY ACTIONS] Deletando imóvel...
📊 [PROPERTY ACTIONS] ID: abc-123
📊 [PROPERTY ACTIONS] Soft Delete: true
✅ [PROPERTY ACTIONS] Imóvel deletado com sucesso: {...}
🔄 [PROPERTY ACTIONS] Redirecionando para /properties...
🔄 [PROPERTY ACTIONS] Recarregando página...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### **Durante Cancelar:**

```
🔙 [PROPERTY ACTIONS] Cancelando edição, voltando para /properties...
```

---

## ✅ CHECKLIST VISUAL

Marque conforme testar:

```
TESTE 1: CRIAR IMÓVEL
□ Toast aparece com mensagem correta
□ Redireciona para /properties
□ Página recarrega
□ Imóvel aparece na lista

TESTE 2: EDITAR IMÓVEL
□ Toast aparece com mensagem correta
□ Redireciona para /properties
□ Página recarrega
□ Alterações aparecem na lista

TESTE 3: CANCELAR EDIÇÃO
□ Redireciona sem toast
□ Alterações NÃO são salvas
□ Dados originais preservados

TESTE 4: SOFT DELETE
□ Toast aparece: "desativado com sucesso!"
□ Redireciona para /properties
□ Página recarrega
□ Imóvel some da lista

TESTE 5: HARD DELETE
□ Toast aparece: "deletado com sucesso!"
□ Redireciona para /properties
□ Página recarrega
□ Imóvel deletado permanentemente
```

---

## 🐛 SE ENCONTRAR BUGS

### **Erro: "Nenhum imóvel selecionado"**

```
Causa: selectedProperty é null
Solução: Verificar se handleDelete está setando selectedProperty
```

### **Erro: "Não redireciona"**

```
Causa: navigate() pode não estar funcionando
Verificar: 
  1. useNavigate() importado corretamente
  2. Router configurado
  3. Rota /properties existe
```

### **Erro: "Página não recarrega"**

```
Causa: window.location.reload() pode estar bloqueado
Solução: Passar reloadPage: false nas opções
```

### **Erro: "Toast não aparece"**

```
Causa: Sonner pode não estar configurado
Verificar:
  1. <Toaster /> no App.tsx
  2. import { toast } from 'sonner'
```

---

## 📊 COMPORTAMENTO ESPERADO

### **Timeline Visual:**

```
┌─────────────────────────────────────────────────┐
│ 1. Usuário clica em "Finalizar"                │
│    ↓ 0ms                                        │
│ 2. Hook executa ação (criar/editar/deletar)    │
│    ↓ ~200-500ms (tempo de API)                 │
│ 3. Toast de sucesso aparece                    │
│    ↓ 500ms (delay intencional)                 │
│ 4. Callback onSuccess executa (se fornecido)   │
│    ↓ 0ms                                        │
│ 5. Redireciona para /properties                │
│    ↓ ~100ms                                     │
│ 6. Página recarrega                            │
│    ↓ ~500-1000ms                                │
│ 7. Lista atualizada aparece                    │
└─────────────────────────────────────────────────┘

Tempo total: ~1.3 - 2.1 segundos
```

---

## 🎯 CRITÉRIOS DE SUCESSO

### **TODOS devem estar OK:**

```
✅ Toast aparece com mensagem correta
✅ Mensagem usa nome do imóvel (não "Imóvel")
✅ Redireciona para /properties
✅ Página recarrega automaticamente
✅ Lista é atualizada com alterações
✅ Logs detalhados aparecem no console
✅ Sem erros no console
✅ Sem warnings no console
```

---

## 📝 RELATÓRIO DE TESTE

### **Copie e preencha após testar:**

```
TESTE REALIZADO EM: ___/___/2025
URL TESTADA: _________________________________

TESTE 1 - CRIAR:    [ ] ✅ OK  [ ] ❌ FALHOU
  Observações: _________________________________

TESTE 2 - EDITAR:   [ ] ✅ OK  [ ] ❌ FALHOU
  Observações: _________________________________

TESTE 3 - CANCELAR: [ ] ✅ OK  [ ] ❌ FALHOU
  Observações: _________________________________

TESTE 4 - SOFT DEL: [ ] ✅ OK  [ ] ❌ FALHOU
  Observações: _________________________________

TESTE 5 - HARD DEL: [ ] ✅ OK  [ ] ❌ FALHOU
  Observações: _________________________________

RESULTADO GERAL:
[ ] ✅ TODOS OS TESTES PASSARAM
[ ] ⚠️ ALGUNS TESTES FALHARAM
[ ] ❌ MAIORIA DOS TESTES FALHARAM

BUGS ENCONTRADOS:
_________________________________________________
_________________________________________________
_________________________________________________

SUGESTÕES DE MELHORIA:
_________________________________________________
_________________________________________________
_________________________________________________
```

---

## 🔗 DOCUMENTAÇÃO RELACIONADA

- **Documentação Completa:** `✅_SISTEMA_ACOES_PADRONIZADAS_v1.0.103.280.md`
- **Guia Rápido:** `🎯_GUIA_RAPIDO_PROPERTY_ACTIONS.md`
- **Changelog:** `/docs/changelogs/CHANGELOG_V1.0.103.280.md`

---

## 🚀 COMECE AGORA!

```
1. Abra o navegador
2. Vá para /properties
3. Siga o roteiro de testes acima
4. Marque os checkboxes
5. Preencha o relatório
6. Reporte qualquer bug encontrado
```

---

**📅 Data:** 04/11/2025  
**🔖 Versão:** v1.0.103.280  
**🎯 Status:** ⏳ AGUARDANDO TESTE  
**👨‍💻 Sistema:** RENDIZY SaaS Multi-Tenant
