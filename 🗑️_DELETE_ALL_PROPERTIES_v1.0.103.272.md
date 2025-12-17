# 🗑️ DELETE ALL PROPERTIES - LIMPEZA COMPLETA

**Versão:** v1.0.103.272  
**Data:** 04/11/2025  
**Status:** Sistema de Limpeza Implementado

---

## ⚠️ ATENÇÃO: AÇÃO IRREVERSÍVEL!

Este guia mostra como **DELETAR COMPLETAMENTE TODOS OS IMÓVEIS** do sistema.

**O que será deletado:**
- ✅ Todas as Properties (prop_, acc_)
- ✅ Todas as Locations (loc_)
- ✅ Todos os Short IDs associados
- ✅ Todas as Photos
- ✅ Todos os Rooms
- ✅ Todas as Listings
- ✅ Todas as Reservations
- ✅ Todos os Blocks

**⚠️ Esta ação NÃO PODE SER DESFEITA!**

---

## 🎯 MÉTODO 1: DELETE TUDO (RECOMENDADO)

### **Deletar TODAS as propriedades do sistema:**

```bash
# Via CURL
curl -X DELETE \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Via Thunder Client / Postman
DELETE /make-server-67caf26a/admin/cleanup/properties
Headers:
  Authorization: Bearer YOUR_ANON_KEY
```

### **Response de Sucesso:**

```json
{
  "success": true,
  "message": "Todas as propriedades e dados relacionados foram deletados com sucesso",
  "data": {
    "properties": 25,
    "locations": 1,
    "photos": 45,
    "rooms": 30,
    "listings": 20,
    "reservations": 10,
    "blocks": 5,
    "totalDeleted": 136,
    "durationSeconds": "2.45"
  }
}
```

---

## 🔍 MÉTODO 2: VERIFICAR ANTES DE DELETAR

### **Verificar quantos registros serão deletados (SEM deletar):**

```bash
# Via CURL
curl -X GET \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties/status \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Via Thunder Client / Postman
GET /make-server-67caf26a/admin/cleanup/properties/status
Headers:
  Authorization: Bearer YOUR_ANON_KEY
```

### **Response:**

```json
{
  "success": true,
  "data": {
    "properties": 25,
    "locations": 1,
    "photos": 45,
    "rooms": 30,
    "listings": 20,
    "reservations": 10,
    "blocks": 5,
    "shortIds": 26,
    "totalToDelete": 162
  }
}
```

---

## 🎯 MÉTODO 3: DELETE ESPECÍFICO (IDs Individuais)

### **Deletar apenas os 28 IDs que você listou:**

```bash
# Via CURL
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties/specific \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": [
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
    ]
  }'
```

### **Response:**

```json
{
  "success": true,
  "message": "28/28 IDs deletados com sucesso",
  "data": {
    "totalRequested": 28,
    "deleted": 28,
    "failed": 0,
    "errors": []
  }
}
```

---

## 📋 ROTAS DISPONÍVEIS

### **1. DELETE ALL** ⚠️
```
DELETE /make-server-67caf26a/admin/cleanup/properties
```
**Deleta TUDO do sistema**

### **2. GET STATUS** ✅
```
GET /make-server-67caf26a/admin/cleanup/properties/status
```
**Verifica quantos registros serão deletados (não deleta)**

### **3. DELETE SPECIFIC** 🎯
```
POST /make-server-67caf26a/admin/cleanup/properties/specific
Body: { "ids": ["id1", "id2", ...] }
```
**Deleta apenas IDs específicos**

---

## 🚀 PASSO A PASSO RECOMENDADO

### **OPÇÃO A: Deletar Tudo e Começar do Zero**

```bash
# PASSO 1: Verificar o que tem
curl -X GET \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties/status \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# PASSO 2: Deletar TUDO
curl -X DELETE \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# PASSO 3: Verificar que ficou zerado
curl -X GET \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties/status \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# PASSO 4: Abrir /properties no navegador
# Deve estar vazio
```

### **OPÇÃO B: Deletar Apenas os 28 IDs Específicos**

```bash
# Usar o MÉTODO 3 acima
# Enviar POST com a lista dos 28 IDs
```

---

## 🔧 CÓDIGO FRONTEND (OPCIONAL)

Se quiser criar um botão no frontend para isso:

```typescript
// utils/adminCleanup.ts
import { projectId, publicAnonKey } from './supabase/info';

export async function deleteAllProperties() {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Todas as propriedades deletadas:', result.data);
      return result;
    } else {
      console.error('❌ Erro ao deletar:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    throw error;
  }
}

export async function getCleanupStatus() {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties/status`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    const result = await response.json();
    
    if (result.success) {
      console.log('📊 Status:', result.data);
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    throw error;
  }
}

export async function deleteSpecificIds(ids: string[]) {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties/specific`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      }
    );

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ IDs deletados:', result.data);
      return result;
    } else {
      console.error('❌ Erro ao deletar IDs:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    throw error;
  }
}
```

### **Usar no componente:**

```typescript
import { deleteAllProperties, getCleanupStatus } from '@/utils/adminCleanup';
import { toast } from 'sonner@2.0.3';

// Dentro do componente
const handleDeleteAll = async () => {
  const confirm = window.confirm(
    '⚠️ ATENÇÃO!\n\n' +
    'Isso vai deletar TODAS as propriedades, locations, reservas e dados relacionados.\n\n' +
    'Esta ação NÃO PODE SER DESFEITA!\n\n' +
    'Tem certeza que deseja continuar?'
  );
  
  if (!confirm) return;
  
  try {
    toast.loading('Deletando todas as propriedades...');
    
    const result = await deleteAllProperties();
    
    toast.success(
      `✅ Limpeza completa!\n\n` +
      `• ${result.data.properties} properties deletadas\n` +
      `• ${result.data.locations} locations deletadas\n` +
      `• ${result.data.totalDeleted} registros totais deletados`
    );
    
    // Recarregar a página
    window.location.reload();
    
  } catch (error) {
    toast.error('❌ Erro ao deletar propriedades');
    console.error(error);
  }
};

const handleCheckStatus = async () => {
  try {
    const status = await getCleanupStatus();
    
    alert(
      `📊 Status do Banco de Dados:\n\n` +
      `• Properties: ${status.properties}\n` +
      `• Locations: ${status.locations}\n` +
      `• Photos: ${status.photos}\n` +
      `• Rooms: ${status.rooms}\n` +
      `• Listings: ${status.listings}\n` +
      `• Reservations: ${status.reservations}\n` +
      `• Blocks: ${status.blocks}\n` +
      `• Short IDs: ${status.shortIds}\n\n` +
      `TOTAL: ${status.totalToDelete} registros`
    );
    
  } catch (error) {
    toast.error('❌ Erro ao verificar status');
    console.error(error);
  }
};
```

---

## 📊 LOGS DO BACKEND

Ao executar a limpeza, o backend mostrará logs detalhados:

```
🗑️ [ADMIN CLEANUP] Iniciando LIMPEZA COMPLETA de todas as propriedades...
📦 [STEP 1/8] Deletando PROPERTIES...
   Encontradas 25 properties para deletar
   ✅ 25 properties deletadas
📍 [STEP 2/8] Deletando LOCATIONS...
   Encontradas 1 locations para deletar
   ✅ 1 locations deletadas
🔤 [STEP 3/8] Deletando SHORT IDs...
   Encontrados 26 mapeamentos de Short IDs
   Encontrados 26 mapeamentos reversos
   ✅ Short IDs deletados
📸 [STEP 4/8] Deletando PHOTOS...
   Encontradas 45 photos para deletar
   ✅ 45 photos deletadas
🛏️ [STEP 5/8] Deletando ROOMS...
   Encontrados 30 rooms para deletar
   ✅ 30 rooms deletados
📋 [STEP 6/8] Deletando LISTINGS...
   Encontrados 20 listings para deletar
   ✅ 20 listings deletados
📅 [STEP 7/8] Deletando RESERVATIONS...
   Encontradas 10 reservations para deletar
   ✅ 10 reservations deletadas
🚫 [STEP 8/8] Deletando BLOCKS...
   Encontrados 5 blocks para deletar
   ✅ 5 blocks deletados
✅ [ADMIN CLEANUP] Limpeza completa FINALIZADA!
📊 Resumo: {
  "properties": 25,
  "locations": 1,
  "photos": 45,
  "rooms": 30,
  "listings": 20,
  "reservations": 10,
  "blocks": 5,
  "totalDeleted": 136,
  "durationSeconds": "2.45"
}
```

---

## ✅ VERIFICAR SE FICOU LIMPO

### **Após a limpeza, verificar:**

```bash
# 1. Status (deve retornar tudo zerado)
GET /admin/cleanup/properties/status

# Response esperado:
{
  "success": true,
  "data": {
    "properties": 0,
    "locations": 0,
    "photos": 0,
    "rooms": 0,
    "listings": 0,
    "reservations": 0,
    "blocks": 0,
    "shortIds": 0,
    "totalToDelete": 0
  }
}

# 2. Listar properties (deve retornar array vazio)
GET /properties

# Response esperado:
{
  "success": true,
  "data": []
}

# 3. Listar locations (deve retornar array vazio)
GET /locations

# Response esperado:
{
  "success": true,
  "data": []
}
```

### **No Frontend:**

```
1. Abrir: /properties
2. Deve mostrar "Nenhuma propriedade encontrada"
3. Lista vazia
4. Pode criar nova propriedade do zero
```

---

## 🎯 RESUMO EXECUTIVO

### **Para DELETAR TUDO:**

```bash
# Um único comando:
curl -X DELETE \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### **Para DELETAR só os 28 IDs:**

```bash
# Ver código completo no MÉTODO 3 acima
```

### **Para VERIFICAR antes:**

```bash
# Ver status:
curl -X GET \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-67caf26a/admin/cleanup/properties/status \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## ⚠️ AVISOS IMPORTANTES

1. **IRREVERSÍVEL:**
   - Não há backup automático
   - Não há undo
   - Dados deletados não podem ser recuperados

2. **MULTI-TENANT:**
   - Respeita isolamento por tenant
   - Deleta apenas do tenant especificado
   - Não afeta outros tenants

3. **DADOS RELACIONADOS:**
   - Deleta automaticamente:
     - Reservas associadas
     - Fotos associadas
     - Rooms associados
     - Listings associados
     - Short IDs associados

4. **SEGURANÇA:**
   - Requer autenticação
   - Apenas admins devem ter acesso
   - Recomenda-se confirmação dupla

---

## 🚀 PRÓXIMOS PASSOS

Após deletar tudo:

1. ✅ **Sistema limpo**
2. ✅ **Banco zerado**
3. ✅ **Pronto para começar do zero**
4. ✅ **Criar primeira propriedade:**
   - Ir em `/properties`
   - Clicar em "Nova Propriedade"
   - Preencher wizard
   - Salvar

---

**📅 Criado em:** 04/11/2025  
**🔖 Versão:** v1.0.103.272  
**⚠️ Status:** Sistema de Limpeza Implementado  
**🎯 Objetivo:** DELETE ALL PROPERTIES

---

✅ **Sistema pronto para limpeza completa!** 🗑️
