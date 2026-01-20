# 🧪 TESTE: Rascunho na Lista (Localhost)

## 📋 Passo a Passo para Testar

### 1. Iniciar Servidor Local

```bash
cd RendizyPrincipal
npm run dev
```

### 2. Acessar no Navegador

```
http://localhost:5173/properties
```

### 3. Abrir Console (F12)

- Pressione `F12` no navegador
- Vá na aba **Console**
- Limpe o console (botão 🚫 ou Ctrl+L)

### 4. Criar Rascunho

1. Clique em **"Nova Propriedade"**
2. Preencha o **Step 1** (Tipo e Identificação):
   - Selecione uma modalidade (ex: "Compra e venda")
   - Preencha nome/código se necessário
3. Clique em **"Salvar e Avançar"**

### 5. Verificar Console

Procure por estas mensagens no console:

```
✅ [Wizard] Rascunho criado no backend: [ID]
💾 [Wizard] Rascunho salvo no localStorage (backup)
```

### 6. Voltar para Lista

1. Navegue de volta para `/properties`
2. Ou clique em "Locais e Anúncios" no menu lateral

### 7. Verificar Logs no Console

Procure por estas mensagens:

```
📊 [PropertiesManagement] Properties carregadas: { total: X, drafts: Y }
📝 [PropertiesManagement] RASCUNHOS QUE SERÃO EXIBIDOS: [...]
```

### 8. Verificar na Tela

O rascunho deve aparecer:

- ✅ Badge **"Rascunho"** (cor amber/amarela)
- ✅ Barra de progresso mostrando percentual
- ✅ Botão **"Continuar"** (em vez de "Editar")
- ✅ Contador de rascunhos nos KPIs (card "Rascunhos")

## 🔍 Debug: Se Rascunho NÃO Aparecer

### Verificar no Console:

1. **Rascunho foi criado?**

   - Procure: `✅ [Wizard] Rascunho criado no backend`
   - Se não aparecer, há erro na criação

2. **Rascunho foi carregado?**

   - Procure: `📝 [PropertiesManagement] RASCUNHOS QUE SERÃO EXIBIDOS`
   - Se aparecer vazio `[]`, rascunho não está sendo retornado pelo backend

3. **Verificar resposta do backend:**

   - Procure: `📊 [PropertiesManagement] Properties carregadas`
   - Verifique se `drafts: > 0`

4. **Verificar filtro:**
   - Procure: `⚠️ [PropertiesManagement] NENHUM RASCUNHO ENCONTRADO`
   - Se aparecer, o filtro pode estar excluindo rascunhos

### Verificar no Network (F12 → Network):

1. Abra aba **Network**
2. Recarregue a página (`F5`)
3. Procure requisição: `GET /properties`
4. Clique na requisição
5. Vá na aba **Response**
6. Verifique se há propriedades com `"status": "draft"`

### Verificar no Backend (SQL):

Se tiver acesso ao Supabase:

```sql
SELECT id, name, status, completion_percentage
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC;
```

## ✅ Checklist de Validação

- [ ] Console mostra: "✅ Rascunho criado no backend"
- [ ] Console mostra: "📝 RASCUNHOS QUE SERÃO EXIBIDOS" com pelo menos 1 item
- [ ] Rascunho aparece na lista com badge "Rascunho"
- [ ] Barra de progresso visível (se completionPercentage > 0)
- [ ] Botão "Continuar" aparece (em vez de "Editar")
- [ ] Contador de rascunhos nos KPIs mostra número correto
- [ ] Ao clicar "Continuar", wizard carrega dados do rascunho

## 🐛 Problemas Comuns

### Rascunho não aparece na lista

**Causa:** Filtro pode estar excluindo rascunhos
**Solução:** Verificar console para logs de debug

### Badge não aparece

**Causa:** Status não está sendo mapeado corretamente
**Solução:** Verificar se `prop.status === 'draft'` no mapeamento

### Barra de progresso não aparece

**Causa:** `completionPercentage` pode ser `undefined`
**Solução:** Verificar se backend retorna `completion_percentage`

### Botão ainda mostra "Editar"

**Causa:** Condição `property.status === 'draft'` não está funcionando
**Solução:** Verificar se status está sendo mapeado corretamente
