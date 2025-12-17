# 🧪 Teste: Importação Completa Stays.net

**Data:** 22/11/2025  
**Status:** 🟡 Aguardando Teste

---

## 📋 INSTRUÇÕES PARA TESTE

### **1. Preparação**

1. **Fazer login no sistema** (localhost ou produção)
2. **Configurar Stays.net:**
   - Acesse: `Configuração > Integrações > Stays.net`
   - Preencha:
     - API Key: `a5146970`
     - API Secret: `bfcf4daf`
     - Base URL: `https://bvm.stays.net/external/v1`
   - Salve a configuração

### **2. Executar Teste**

#### **Opção A: Via Console do Navegador (Recomendado)**

1. Abra o DevTools (F12)
2. Vá para a aba "Console"
3. Cole e execute o script abaixo:

```javascript
async function testStaysNetImport() {
  const token = localStorage.getItem('rendizy-token');
  if (!token) {
    console.error('❌ Token não encontrado. Faça login primeiro.');
    return;
  }
  
  const projectId = 'make-server-67caf26a';
  const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/import/full`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'apikey': '<REDACTED>'
      },
      body: JSON.stringify({
        selectedPropertyIds: [] // Importar todas
      })
    });
    
    const result = await response.json();
    console.log('✅ Resultado:', result);
    return result;
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

testStaysNetImport();
```

#### **Opção B: Via Postman/Insomnia**

```
POST https://make-server-67caf26a.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/import/full

Headers:
  Content-Type: application/json
  X-Auth-Token: <seu-token>
  apikey: <sua-apikey>

Body:
{
  "selectedPropertyIds": []
}
```

---

## ✅ O QUE ESPERAR

### **Resposta de Sucesso:**

```json
{
  "success": true,
  "data": {
    "message": "Full import completed",
    "stats": {
      "guests": {
        "fetched": 10,
        "created": 8,
        "updated": 2,
        "failed": 0
      },
      "properties": {
        "fetched": 5,
        "created": 5,
        "updated": 0,
        "failed": 0
      },
      "reservations": {
        "fetched": 50,
        "created": 45,
        "updated": 5,
        "failed": 0
      },
      "errors": []
    },
    "success": true,
    "timestamp": "2025-11-22T..."
  }
}
```

---

## 🔍 VERIFICAÇÕES PÓS-IMPORTAÇÃO

### **1. Verificar Hóspedes**

- Acesse: `Hóspedes` no menu
- Verifique se os hóspedes importados aparecem
- Verifique se telefones e emails estão corretos

### **2. Verificar Propriedades**

- Acesse: `Propriedades` no menu
- Verifique se as propriedades importadas aparecem
- Verifique se endereços e capacidades estão corretos

### **3. Verificar Reservas**

- Acesse: `Reservas` no menu
- Verifique se as reservas importadas aparecem
- Verifique se datas de check-in/check-out estão corretas
- Verifique se valores estão corretos

### **4. Verificar Calendário**

- Acesse: `Calendário` no menu
- Verifique se as reservas aparecem no calendário
- Verifique se as cores estão corretas (por plataforma)
- Verifique se as datas estão corretas

---

## ⚠️ PROBLEMAS COMUNS

### **Erro: "Stays.net not configured"**
- **Solução:** Configure Stays.net em `Configuração > Integrações > Stays.net`

### **Erro: "Token não encontrado"**
- **Solução:** Faça login no sistema primeiro

### **Erro: "Failed to fetch"**
- **Solução:** Verifique se o backend está rodando e acessível

### **Erro: "property ou guest não encontrado"**
- **Solução:** Isso é esperado se não houver propriedades/hóspedes importados ainda. A importação completa resolve isso.

---

## 📊 LOGS ESPERADOS NO CONSOLE

```
[StaysNet Full Sync] 🚀 Iniciando importação completa...
[StaysNet Full Sync] 📥 Fase 1: Importando hóspedes...
[StaysNet Full Sync] ✅ Hóspedes: 8 criados, 2 atualizados
[StaysNet Full Sync] 📥 Fase 2: Importando propriedades (listings)...
[StaysNet Full Sync] ✅ Propriedades: 5 criadas, 0 atualizadas
[StaysNet Full Sync] 📥 Fase 3: Importando reservas...
[StaysNet Full Sync] ✅ Reservas: 45 criadas, 5 atualizadas
[StaysNet Full Sync] ✅ Importação completa finalizada!
```

---

**Última atualização:** 22/11/2025  
**Próximo passo:** Executar teste e verificar resultados


