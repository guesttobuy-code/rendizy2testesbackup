# 🧪 TESTE MANUAL - CRIAÇÃO DE RESERVA

**Data**: 2024-12-16 17:54  
**Versão**: v1.0.103.352  
**Backend**: Deployado ✅ (1.652MB)  
**Frontend**: Rodando ✅ (localhost:3000)

---

## ✅ CORREÇÕES IMPLEMENTADAS

### Backend (routes-reservations.ts)

1. **✅ Guest Lookup Migrado para SQL**
   - **Antes**: `kv.get('guest:...')` (KV Store obsoleto)
   - **Depois**: Query SQL em `guests` table
   - **Multi-tenant**: Filtra por `organization_id`

2. **✅ Logs Detalhados Adicionados**
   - 🚀 Início da função
   - 📦 Body recebido
   - 🔍 Buscando property e guest
   - ✅ Encontrados com sucesso
   - 🎉 Reserva criada
   - 💥 Erros com stack trace

### Frontend (CreateReservationWizard.tsx)

1. **✅ Logs Detalhados no handleComplete**
   - 📤 Início da criação
   - 📦 Dados enviados (property, guest, datas)
   - 📥 Resposta recebida
   - ✅ Sucesso ou ❌ Erro com detalhes

2. **✅ Mensagens de Erro Específicas**
   - Property not found
   - Guest not found
   - Erro genérico com detalhes

---

## 🔬 TESTE PASSO A PASSO

### Pré-requisitos

✅ Backend deployado: https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server  
✅ Frontend rodando: http://localhost:3000  
✅ Browser DevTools aberto (F12 → Console)

### Cenário 1: Criar Reserva com Sucesso

**Passos:**

1. Abrir: http://localhost:3000/calendario

2. Clicar em uma data (ex: 20/12/2024)

3. Clicar **"Criar Reserva"** no Quick Actions

4. **Step 1 - Disponibilidade**
   - ✅ Verificar: Nome do imóvel carrega
   - ✅ Verificar: Localização carrega
   - ✅ Verificar: Preço vem do imóvel (não 350)
   - Clicar **"Próximo"**

5. **Step 2 - Hóspede**
   - ✅ Verificar: Lista de hóspedes carrega
   - ✅ Selecionar: Um hóspede existente
   - Clicar **"Próximo"**

6. **Step 3 - Detalhes**
   - Platform: **Direct**
   - Notas: **"Teste de criação v1.0.103.352"**
   - Clicar **"Criar Reserva"**

7. **Verificar Console (Frontend)**
   ```
   📤 [CreateReservationWizard] === INÍCIO handleComplete ===
   📦 [CreateReservationWizard] Dados da reserva:
   🏠 Property ID: [id-do-imovel]
   🏠 Property Name: [nome-do-imovel]
   👤 Guest ID: [id-do-hospede]
   👤 Guest Name: [nome-do-hospede]
   📅 Check-in: 2024-12-20
   📅 Check-out: 2024-12-25
   👥 Adults: 2 | Children: 0
   🌐 Platform: direct
   📝 Notes: Teste de criação v1.0.103.352
   📤 Enviando para API...
   📥 [CreateReservationWizard] Resposta recebida: {success: true, data: {...}}
   ✅ Reserva criada com sucesso: [id-da-reserva]
   🏁 [CreateReservationWizard] === FIM handleComplete ===
   ```

8. **Verificar Console (Backend - Supabase Logs)**
   - Ir para: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs/functions
   - Filtrar: `rendizy-server`
   - Buscar logs:
   ```
   🚀 [createReservation] === INÍCIO ===
   📦 [createReservation] Body recebido: {...}
   👤 [createReservation] Tenant: [username] [type]
   🔍 [createReservation] Buscando propriedade: [id]
   ✅ [createReservation] Propriedade encontrada: [id] [title]
   🔍 [createReservation] Buscando hóspede: [id]
   ✅ [createReservation] Hóspede encontrado: [id] [name]
   🎉 [createReservation] === SUCESSO ===
   ✅ Reserva criada: [id]
   ```

9. **Verificar UI**
   - ✅ Toast de sucesso aparece
   - ✅ Modal fecha automaticamente
   - ✅ Reserva aparece no calendário (cor azul)
   - ✅ Ao clicar na reserva, detalhes corretos aparecem

10. **Verificar Banco de Dados**
    - Ir para: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/editor
    - Tabela: `reservations`
    - ✅ Verificar: Nova linha criada
    - ✅ Verificar: `property_id` correto
    - ✅ Verificar: `guest_id` correto
    - ✅ Verificar: Datas corretas
    - ✅ Verificar: `organization_id` preenchido

---

### Cenário 2: Erro - Hóspede Não Encontrado

**Simular:**
- Editar `CreateReservationWizard.tsx` temporariamente
- Mudar `guestId: selectedGuest.id` para `guestId: 'guest-fake-123'`
- Tentar criar reserva

**Resultado Esperado:**
```
📤 [CreateReservationWizard] Enviando para API...
📥 [CreateReservationWizard] Resposta recebida: {success: false, error: "Guest not found"}
❌ Erro na resposta: Guest not found
Toast: "Guest not found"
Toast: "💡 O hóspede selecionado não existe no sistema"
```

**Backend Logs Esperados:**
```
🔍 [createReservation] Buscando hóspede: guest-fake-123
❌ [createReservation] Hóspede não encontrado: guest-fake-123
Response: 404 Guest not found
```

---

### Cenário 3: Erro - Propriedade Não Encontrada

**Simular:**
- Editar `CreateReservationWizard.tsx` temporariamente
- Mudar `propertyId: property.id` para `propertyId: 'prop-fake-456'`
- Tentar criar reserva

**Resultado Esperado:**
```
📦 [CreateReservationWizard] Dados da reserva:
🏠 Property ID: prop-fake-456
📤 Enviando para API...
📥 [CreateReservationWizard] Resposta recebida: {success: false, error: "Property not found"}
❌ Erro na resposta: Property not found
Toast: "Property not found"
Toast: "💡 Clique no botão '🔄 Resetar Dados' no topo da página"
```

**Backend Logs Esperados:**
```
🔍 [createReservation] Buscando propriedade: prop-fake-456
❌ [createReservation] Propriedade não encontrada: prop-fake-456
Response: 404 Property not found
```

---

## 📊 CHECKLIST DE VALIDAÇÃO

### Funcionalidade
- [ ] Modal abre ao clicar "Criar Reserva"
- [ ] Step 1 mostra dados do imóvel corretamente
- [ ] Step 2 lista hóspedes existentes
- [ ] Step 3 permite preencher detalhes
- [ ] Botão "Criar Reserva" funciona
- [ ] Toast de sucesso aparece
- [ ] Modal fecha após criação
- [ ] Reserva aparece no calendário

### Logs (Console Frontend)
- [ ] Logs de início aparecem
- [ ] Dados da reserva são logados
- [ ] Resposta da API é logada
- [ ] Sucesso ou erro são logados

### Logs (Backend Supabase)
- [ ] Log de início da função
- [ ] Log de body recebido
- [ ] Log de busca de property
- [ ] Log de busca de guest
- [ ] Log de reserva criada
- [ ] OU logs de erro se falhar

### Banco de Dados
- [ ] Reserva salva em `reservations` table
- [ ] Campos preenchidos corretamente
- [ ] `organization_id` correto
- [ ] Timestamps criados

### Multi-tenant
- [ ] Imobiliária só vê suas reservas
- [ ] Imobiliária só pode criar reserva para seus imóveis
- [ ] Imobiliária só pode usar seus hóspedes
- [ ] Superadmin vê todas as reservas

---

## 🐛 TROUBLESHOOTING

### Problema: "Guest not found"

**Causa Possível:**
- Guest não existe no banco
- Guest pertence a outra organização
- ID do guest está incorreto

**Solução:**
1. Verificar se guest existe: `SELECT * FROM guests WHERE id = '[id]'`
2. Verificar organization_id: `SELECT organization_id FROM guests WHERE id = '[id]'`
3. Comparar com organization do user logado

### Problema: "Property not found"

**Causa Possível:**
- Property não existe em `anuncios_drafts`
- Property pertence a outra organização
- ID do property está incorreto

**Solução:**
1. Verificar se property existe: `SELECT * FROM anuncios_drafts WHERE id = '[id]'`
2. Verificar organization_id
3. Verificar se status = 'draft' ou 'published'

### Problema: "Failed to create reservation"

**Causa Possível:**
- Erro genérico no backend
- Validação falhou
- Conflito de datas

**Solução:**
1. Abrir Supabase Logs: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs/functions
2. Buscar logs de erro com stack trace
3. Identificar causa raiz
4. Corrigir e re-deployar

---

## 📝 RESULTADOS DO TESTE

### Teste Realizado em: [DATA/HORA]

**Cenário 1 - Sucesso:**
- [ ] ✅ Passou
- [ ] ❌ Falhou (descrever erro abaixo)

**Logs do Console:**
```
[Cole aqui os logs do navegador]
```

**Logs do Backend:**
```
[Cole aqui os logs do Supabase]
```

**Screenshot:**
[Cole aqui screenshot da reserva no calendário]

---

**Cenário 2 - Guest Not Found:**
- [ ] ✅ Passou
- [ ] ❌ Falhou

**Observações:**
```
[Descrever comportamento observado]
```

---

**Cenário 3 - Property Not Found:**
- [ ] ✅ Passou
- [ ] ❌ Falhou

**Observações:**
```
[Descrever comportamento observado]
```

---

## 🎯 CONCLUSÃO

**Status Geral:**
- [ ] ✅ TODOS OS TESTES PASSARAM - Sistema 100% funcional
- [ ] ⚠️ ALGUNS TESTES FALHARAM - Necessita correção
- [ ] ❌ TODOS FALHARAM - Problema crítico

**Próximos Passos:**
1. [ ] Testar criação de múltiplas reservas
2. [ ] Testar edição de reserva existente
3. [ ] Testar cancelamento de reserva
4. [ ] Testar integração com WhatsApp (envio de confirmação)

---

**IMPORTANTE**: Após testar, preencher esta checklist e reportar resultados!
