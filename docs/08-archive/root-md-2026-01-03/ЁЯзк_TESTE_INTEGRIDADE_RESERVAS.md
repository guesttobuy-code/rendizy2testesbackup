# 🧪 TESTE - Sistema de Integridade de Reservas

**Versão:** v1.0.103.273  
**Data:** 04/11/2025  
**Tempo estimado:** 5 minutos

---

## 🎯 O QUE VAMOS TESTAR

✅ Deletar imóvel SEM reservas (deve funcionar)  
✅ Deletar imóvel COM reservas (deve abrir modal)  
✅ Transferir reservas para outro imóvel  
✅ Cancelar reservas  
✅ Validação de integridade referencial  

---

## 📋 PRÉ-REQUISITOS

Antes de começar, certifique-se de ter:
- [ ] Pelo menos 3 imóveis cadastrados
- [ ] Pelo menos 2 reservas ativas em imóveis diferentes
- [ ] Acesso à página `/properties`

---

## 🚀 TESTE 1: Deletar Imóvel SEM Reservas

### **PASSO 1: Criar imóvel de teste**

```
1. Ir para: /properties
2. Clicar em "+ Nova Propriedade"
3. Preencher dados mínimos:
   - Nome: "Casa Teste Deleção"
   - Cidade: "São Paulo"
   - Endereço: qualquer
4. Salvar
5. Anotar o ID do imóvel criado
```

### **PASSO 2: Tentar deletar**

```
1. Na lista de imóveis, encontrar "Casa Teste Deleção"
2. Clicar no ícone de lixeira (🗑️)
3. Modal de exclusão abre
4. Verificar mensagem: "Esta propriedade não possui reservas ativas"
5. Selecionar "Excluir Permanentemente" (caixa vermelha)
6. Marcar checkbox de confirmação
7. Clicar "Excluir Permanentemente"
```

### **✅ RESULTADO ESPERADO:**

```
✅ Imóvel deletado com sucesso
✅ Toast: "Propriedade excluída permanentemente"
✅ Imóvel removido da lista
```

---

## 🚀 TESTE 2: Deletar Imóvel COM Reservas

### **PASSO 1: Criar reserva em imóvel existente**

```
1. Ir para: /reservations
2. Clicar em "+ Nova Reserva"
3. Preencher:
   - Imóvel: Selecionar qualquer imóvel
   - Hóspede: Criar ou selecionar
   - Check-in: Hoje + 5 dias
   - Check-out: Hoje + 10 dias
   - Status: "Confirmada"
4. Salvar
5. Anotar qual imóvel foi usado
```

### **PASSO 2: Tentar deletar o imóvel**

```
1. Voltar para: /properties
2. Encontrar o imóvel que TEM a reserva
3. Clicar no ícone de lixeira (🗑️)
4. Modal de exclusão abre
5. Verificar mensagem: "⚠️ ATENÇÃO: Esta propriedade possui dados ativos!"
6. Ver contador: "1 reserva(s) ativa(s) em andamento"
7. Selecionar "Excluir Permanentemente" (caixa vermelha)
8. Marcar checkbox de confirmação
9. Clicar "Excluir Permanentemente"
```

### **✅ RESULTADO ESPERADO:**

```
🎯 Modal de Transferência de Reservas abre automaticamente!
```

---

## 🚀 TESTE 3: Modal de Transferência de Reservas

Agora você deve estar vendo o **PropertyReservationsTransferModal**.

### **Verificar Visual:**

```
✅ Título: "⚠️ Imóvel possui reservas ativas"
✅ Alert vermelho: "REGRA CRÍTICA DE INTEGRIDADE"
✅ Card com informações do imóvel que será deletado
✅ Contador: "Progresso: 0/1 reservas resolvidas"
✅ Barra de progresso: 0% (vermelha)
✅ Card da reserva com:
   - Badge de status (Confirmada, Pendente, etc)
   - Nome do hóspede
   - Datas de check-in/check-out
   - Número de hóspedes
   - Valor total
✅ Select dropdown: "Transferir para outro imóvel..."
✅ Botão: "Cancelar esta reserva"
✅ Botão inferior desabilitado: "Resolver Todas (0/1)"
```

---

## 🚀 TESTE 4: Transferir Reserva

### **PASSO 1: Selecionar imóvel destino**

```
1. No card da reserva, clicar no Select dropdown
2. Ver lista de imóveis disponíveis (exceto o que será deletado)
3. Selecionar qualquer imóvel
```

### **✅ RESULTADO ESPERADO:**

```
✅ Select fica verde
✅ Badge "✅ Transferir" aparece ao lado
✅ Contador atualiza: "1/1 reservas resolvidas"
✅ Barra de progresso: 100% (verde)
✅ Botão inferior habilita: "Resolver Todas (1/1)"
```

### **PASSO 2: Processar transferência**

```
1. Clicar em "Resolver Todas (1/1)"
2. Aguardar processamento (~2 segundos)
```

### **✅ RESULTADO ESPERADO:**

```
✅ Toast: "✅ Todas as reservas foram resolvidas!"
✅ Descrição: "1 transferidas, 0 canceladas"
✅ Modal de transferência fecha
✅ Volta para modal de exclusão
✅ Exclusão procede automaticamente
✅ Toast final: "Propriedade excluída permanentemente"
✅ Imóvel removido da lista
```

### **PASSO 3: Verificar transferência**

```
1. Ir para: /reservations
2. Encontrar a reserva que foi transferida
3. Verificar se o imóvel mudou
```

### **✅ RESULTADO ESPERADO:**

```
✅ Reserva agora está vinculada ao novo imóvel
✅ Datas preservadas
✅ Hóspede preservado
✅ Valor preservado
✅ Status preservado
```

---

## 🚀 TESTE 5: Cancelar Reserva

### **PASSO 1: Criar nova reserva**

```
1. Repetir "TESTE 2 - PASSO 1"
2. Criar mais uma reserva em qualquer imóvel
```

### **PASSO 2: Tentar deletar o imóvel**

```
1. Repetir "TESTE 2 - PASSO 2"
2. Modal de transferência abre
```

### **PASSO 3: Cancelar ao invés de transferir**

```
1. NO CARD da reserva, clicar em "Cancelar esta reserva"
```

### **✅ RESULTADO ESPERADO:**

```
✅ Botão fica vermelho
✅ Texto muda para "✅ Marcada para cancelamento"
✅ Contador atualiza: "1/1 reservas resolvidas"
✅ Barra de progresso: 100%
✅ Botão inferior habilita
```

### **PASSO 4: Processar cancelamento**

```
1. Clicar em "Resolver Todas (1/1)"
2. Aguardar processamento
```

### **✅ RESULTADO ESPERADO:**

```
✅ Toast: "✅ Todas as reservas foram resolvidas!"
✅ Descrição: "0 transferidas, 1 canceladas"
✅ Exclusão procede
✅ Imóvel deletado
```

### **PASSO 5: Verificar cancelamento**

```
1. Ir para: /reservations
2. Encontrar a reserva
3. Verificar status
```

### **✅ RESULTADO ESPERADO:**

```
✅ Status: "Cancelada"
✅ Motivo: "Imóvel [Nome] foi deletado"
✅ Data de cancelamento registrada
```

---

## 🚀 TESTE 6: Múltiplas Reservas

### **PASSO 1: Criar imóvel com 3 reservas**

```
1. Criar 1 novo imóvel: "Casa Multi Reservas"
2. Criar 3 reservas neste imóvel:
   - Reserva A: Hoje + 5 dias (João Silva)
   - Reserva B: Hoje + 15 dias (Maria Santos)
   - Reserva C: Hoje + 25 dias (Pedro Costa)
```

### **PASSO 2: Tentar deletar**

```
1. Clicar para deletar "Casa Multi Reservas"
2. Modal de transferência abre
```

### **✅ RESULTADO ESPERADO:**

```
✅ Mostra 3 cards de reservas
✅ Cada uma numerada: #1, #2, #3
✅ Contador: "0/3 reservas resolvidas"
✅ Botão desabilitado
```

### **PASSO 3: Resolver misto**

```
1. RESERVA #1: Selecionar "Transferir" → Apartamento 101
2. RESERVA #2: Clicar "Cancelar"
3. RESERVA #3: Selecionar "Transferir" → Casa Praia
```

### **✅ RESULTADO ESPERADO:**

```
✅ Contador: "3/3 reservas resolvidas"
✅ Barra: 100%
✅ Botão habilitado
```

### **PASSO 4: Processar todas**

```
1. Clicar "Resolver Todas (3/3)"
```

### **✅ RESULTADO ESPERADO:**

```
✅ Toast: "2 transferidas, 1 canceladas"
✅ Exclusão procede
✅ Imóvel deletado
✅ Reserva #1 → Agora em Apartamento 101
✅ Reserva #2 → Cancelada
✅ Reserva #3 → Agora em Casa Praia
```

---

## 🚀 TESTE 7: Validação de Integridade

### **PASSO 1: Tentar burlar a validação**

```
1. Abrir DevTools (F12)
2. Ir para: Console
3. Colar e executar:

// Tentar deletar direto sem resolver reservas
await fetch('https://SEU_PROJECT.supabase.co/functions/v1/make-server-67caf26a/properties/PROPERTY_ID_COM_RESERVAS', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer SEU_ANON_KEY'
  }
});
```

### **✅ RESULTADO ESPERADO:**

```
❌ HTTP 400
{
  "success": false,
  "error": "INTEGRITY_ERROR",
  "message": "Cannot delete property with 1 active reservation(s)...",
  "data": {
    "activeReservationsCount": 1,
    "reservations": [...]
  }
}

✅ Backend BLOQUEOU a exclusão!
✅ Integridade preservada!
```

---

## 🚀 TESTE 8: Verificar Banco de Dados

### **PASSO 1: Consultar reservas órfãs**

```javascript
// Colar no Console (F12)
const response = await fetch('https://SEU_PROJECT.supabase.co/functions/v1/make-server-67caf26a/reservations', {
  headers: {
    'Authorization': 'Bearer SEU_ANON_KEY'
  }
});

const data = await response.json();
const reservations = data.data;

// Verificar integridade
const orphanedReservations = reservations.filter(r => {
  // Se propertyId não existe ou é inválido
  return !r.propertyId || r.propertyId.trim() === '';
});

console.log('🔍 Reservas órfãs:', orphanedReservations);
console.log('✅ Total de reservas:', reservations.length);
console.log('❌ Órfãs encontradas:', orphanedReservations.length);
```

### **✅ RESULTADO ESPERADO:**

```
✅ Total de reservas: X
❌ Órfãs encontradas: 0

🎉 PERFEITO! Nenhuma reserva órfã!
```

---

## 📊 CHECKLIST FINAL

Marque tudo que funcionou:

### **Funcionalidades Básicas:**
- [ ] Deletar imóvel sem reservas funciona
- [ ] Deletar imóvel com reservas abre modal
- [ ] Modal mostra todas as reservas corretamente

### **Transferência:**
- [ ] Select dropdown lista imóveis disponíveis
- [ ] Transferir reserva atualiza contador
- [ ] Processar transferência funciona
- [ ] Reserva aparece no novo imóvel

### **Cancelamento:**
- [ ] Botão de cancelar muda visual
- [ ] Processar cancelamento funciona
- [ ] Reserva fica com status "Cancelada"
- [ ] Motivo é registrado

### **Validações:**
- [ ] Não permite prosseguir sem resolver todas
- [ ] Contador de progresso funciona
- [ ] Barra de progresso visual funciona
- [ ] Backend bloqueia exclusão sem resolver

### **Integridade:**
- [ ] Nenhuma reserva órfã no banco
- [ ] Todas reservas tem imóvel válido
- [ ] Auditoria registrada corretamente

---

## ✅ SE TUDO PASSOU

**Parabéns! O sistema de integridade está funcionando perfeitamente!** 🎉

Você pode:
- ✅ Usar em produção com confiança
- ✅ Garantir 100% de integridade referencial
- ✅ Deletar imóveis sem medo de perder dados

---

## ❌ SE ALGO FALHOU

1. **Verificar console do navegador (F12)**
   - Procurar erros em vermelho

2. **Verificar logs do backend**
   - Abrir Supabase Dashboard → Edge Functions → Logs

3. **Verificar versão**
   - Confirmar que está na v1.0.103.273

4. **Reportar bug**
   - Especificar qual teste falhou
   - Copiar erro do console
   - Copiar logs do backend

---

**📅 Data:** 04/11/2025  
**🔖 Versão:** v1.0.103.273  
**⏱️ Tempo:** ~5 minutos  
**🎯 Status:** Pronto para testar!
