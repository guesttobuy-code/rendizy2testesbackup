# 🧪 TESTE - DELETE ALL PROPERTIES

**Versão:** v1.0.103.272  
**Data:** 04/11/2025

---

## 🎯 TESTE RÁPIDO - 3 PASSOS

### **PASSO 1: Verificar Status Atual**

Abra o console do navegador (F12) e cole:

```javascript
// Verificar quantos registros existem
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties/status', {
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY'
  }
})
.then(r => r.json())
.then(data => {
  console.log('📊 STATUS ATUAL:', data.data);
  console.table(data.data);
})
.catch(err => console.error('❌ Erro:', err));
```

**Resultado esperado:**
```
📊 STATUS ATUAL: {
  properties: 25,
  locations: 1,
  photos: 45,
  rooms: 30,
  listings: 20,
  reservations: 10,
  blocks: 5,
  shortIds: 26,
  totalToDelete: 162
}
```

---

### **PASSO 2: DELETAR TUDO** ⚠️

**⚠️ ATENÇÃO: Depois deste comando, NÃO HÁ VOLTA!**

```javascript
// DELETAR TODAS AS PROPRIEDADES
if (confirm('⚠️ DELETAR TUDO? Esta ação é IRREVERSÍVEL!')) {
  fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties', {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer YOUR_ANON_KEY'
    }
  })
  .then(r => r.json())
  .then(data => {
    console.log('✅ DELETADO:', data.data);
    console.table(data.data);
    alert('✅ Limpeza completa!\n\n' + JSON.stringify(data.data, null, 2));
  })
  .catch(err => console.error('❌ Erro:', err));
}
```

**Resultado esperado:**
```
✅ DELETADO: {
  properties: 25,
  locations: 1,
  photos: 45,
  rooms: 30,
  listings: 20,
  reservations: 10,
  blocks: 5,
  totalDeleted: 136,
  durationSeconds: "2.45"
}
```

---

### **PASSO 3: Verificar que Ficou Zerado**

```javascript
// Verificar se ficou vazio
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties/status', {
  headers: {
    'Authorization': 'Bearer YOUR_ANON_KEY'
  }
})
.then(r => r.json())
.then(data => {
  console.log('📊 STATUS APÓS LIMPEZA:', data.data);
  console.table(data.data);
  
  if (data.data.totalToDelete === 0) {
    console.log('✅ BANCO ZERADO COM SUCESSO!');
  } else {
    console.log('⚠️ Ainda há registros no banco');
  }
})
.catch(err => console.error('❌ Erro:', err));
```

**Resultado esperado:**
```
📊 STATUS APÓS LIMPEZA: {
  properties: 0,
  locations: 0,
  photos: 0,
  rooms: 0,
  listings: 0,
  reservations: 0,
  blocks: 0,
  shortIds: 0,
  totalToDelete: 0
}

✅ BANCO ZERADO COM SUCESSO!
```

---

## 🔧 VERSÃO SIMPLIFICADA (COPIAR E COLAR)

### **Cole no Console (F12):**

```javascript
// ============================================================================
// SCRIPT DE LIMPEZA COMPLETA - v1.0.103.272
// ============================================================================

const PROJECT_ID = 'YOUR_PROJECT_ID'; // ⬅️ TROCAR AQUI
const ANON_KEY = 'YOUR_ANON_KEY';     // ⬅️ TROCAR AQUI

const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/make-server-67caf26a`;

// Função auxiliar
async function apiCall(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  return response.json();
}

// 1. Ver Status
async function verStatus() {
  console.log('📊 Verificando status...');
  const data = await apiCall('/admin/cleanup/properties/status');
  console.table(data.data);
  return data.data;
}

// 2. Deletar Tudo
async function deletarTudo() {
  if (!confirm('⚠️ DELETAR TUDO? Esta ação é IRREVERSÍVEL!')) {
    console.log('❌ Operação cancelada');
    return;
  }
  
  console.log('🗑️ Deletando TUDO...');
  const data = await apiCall('/admin/cleanup/properties', 'DELETE');
  console.log('✅ RESULTADO:');
  console.table(data.data);
  alert('✅ Limpeza completa!\n\n' + JSON.stringify(data.data, null, 2));
  return data.data;
}

// 3. Deletar IDs específicos
async function deletarEspecificos(ids) {
  if (!confirm(`⚠️ Deletar ${ids.length} IDs? Esta ação é IRREVERSÍVEL!`)) {
    console.log('❌ Operação cancelada');
    return;
  }
  
  console.log(`🗑️ Deletando ${ids.length} IDs...`);
  const data = await apiCall('/admin/cleanup/properties/specific', 'POST', { ids });
  console.log('✅ RESULTADO:');
  console.table(data.data);
  return data.data;
}

// Tornar funções disponíveis globalmente
window.verStatus = verStatus;
window.deletarTudo = deletarTudo;
window.deletarEspecificos = deletarEspecificos;

console.log('✅ Funções carregadas!');
console.log('\nFunções disponíveis:');
console.log('  • verStatus()           - Ver quantos registros existem');
console.log('  • deletarTudo()         - Deletar TUDO (irreversível)');
console.log('  • deletarEspecificos([ids]) - Deletar IDs específicos');
console.log('\nExemplo de uso:');
console.log('  await verStatus()');
console.log('  await deletarTudo()');
```

---

## 📋 COMO USAR:

### **1. Configurar:**
```javascript
// Trocar estas linhas:
const PROJECT_ID = 'teu-projeto-id';
const ANON_KEY = 'tua-chave-anon';
```

### **2. Executar:**
```javascript
// Ver status
await verStatus()

// Deletar tudo
await deletarTudo()

// Ver se ficou zerado
await verStatus()
```

---

## 🎯 DELETAR OS 28 IDs ESPECÍFICOS

```javascript
// Lista dos 28 IDs que você quer deletar
const idsParaDeletar = [
  "loc_7bd319a1-b036-4bbd-8434-509313d0bc53",
  "prop_2c66088d-7029-4e87-b18c-b3c40efafd64",
  "prop_47228ca2-76ab-4f57-a501-688f2633d468",
  "prop_26bb9358-3059-49b2-bbc0-b43efa4ef0ae",
  "prop_0a83fd18-a14d-4bfa-9ec3-a44a693cdb0c",
  "prop_43edb62c-5717-4bbd-9f7c-7f42eacfeb1c",
  "prop_41264de2-dd1d-4f10-847d-9bb58f81a1f6",
  "prop_f37ce5ab-2a18-4db1-9ee5-9bb4a26d4c7e",
  "prop_967be996-ccff-469d-b295-3910a216bb49",
  "prop_611a92c8-f2c8-43fd-a599-1d582eb0471d",
  "prop_560255a1-9d45-479d-886d-feeb900d63e7",
  "prop_9a464842-937c-4116-a005-dda680e6389b",
  "prop_5dab561e-e2ca-48a0-9058-753e99b3dbea",
  "prop_a3ddfa46-01d3-412e-85e9-dfe16afede9d",
  "prop_f578a007-d283-4a1f-b266-cdbfd03dad57",
  "prop_e71c2ea5-ea47-43bf-bb94-b9f6d3892f2e",
  "acc_e9c46bbb-f000-4af5-a8a4-2d70de3e7606",
  "prop_464e5320-f86e-4773-a9ba-59646752d3d6",
  "prop_f29874ef-cd33-41ed-91a3-ed323805a82a",
  "prop_13fa801c-34ea-4fab-82e0-50d7ef95a62b",
  "prop_5ed34754-1b18-45e8-a42e-0de4913cde3d",
  "prop_8a60a836-3915-47c4-b0cf-5f16f9de49e8",
  "acc_d6845d59-298f-4269-97f2-15029e7e2e14",
  "prop_005399f3-9bec-4c19-90d2-e68d7a0f219f",
  "prop_63fa2d1c-23f6-4bd9-935e-9abcacb86849",
  "prop_a4d14977-a99d-446a-adf1-b0b59f39297a",
  "prop_8e9919fe-2da5-4774-a155-c53ca62eeaa1",
  "prop_a92043e7-32ca-4eea-842a-4b0b1e40a654"
];

// Deletar
await deletarEspecificos(idsParaDeletar);
```

---

## ✅ CHECKLIST

- [ ] Trocar `PROJECT_ID` no script
- [ ] Trocar `ANON_KEY` no script
- [ ] Colar script no console (F12)
- [ ] Executar `await verStatus()` para ver status atual
- [ ] Executar `await deletarTudo()` para deletar tudo
- [ ] Executar `await verStatus()` para confirmar que zerou
- [ ] Recarregar `/properties` no navegador
- [ ] Verificar que lista está vazia
- [ ] Criar nova propriedade do zero

---

## 🚨 ERROS COMUNS

### **Erro: "Failed to fetch"**
```
❌ Causa: URL ou credenciais incorretas
✅ Solução: Verificar PROJECT_ID e ANON_KEY
```

### **Erro: "Authorization required"**
```
❌ Causa: ANON_KEY inválida
✅ Solução: Pegar chave correta do Supabase
```

### **Erro: "Cannot read property of undefined"**
```
❌ Causa: Resposta inesperada da API
✅ Solução: Verificar logs do backend no Supabase
```

---

## 📱 TESTAR NO FRONTEND

Depois de deletar, abrir:

```
https://suacasaavenda.com.br/properties
```

**Deve aparecer:**
- ✅ Lista vazia
- ✅ Mensagem "Nenhuma propriedade encontrada"
- ✅ Botão "Nova Propriedade" disponível
- ✅ Pode criar nova propriedade

---

**📅 Data:** 04/11/2025  
**🔖 Versão:** v1.0.103.272  
**🎯 Objetivo:** Teste de Limpeza Completa

---

✅ **Pronto para deletar tudo e começar do zero!** 🗑️
