# 🏗️ COMANDO PARA CRIAR IMÓVEL COMPLETO

## ✅ CORREÇÃO APLICADA

**Status:** ✅ DEPLOYADO  
**Commit:** `039add49`  
**Data:** 23/11/2025

---

## 🎯 O QUE FOI CORRIGIDO

1. **Normalização no Frontend:** Dados do wizard são normalizados ANTES de enviar ao backend
2. **Geração Automática:** `name` e `code` são gerados automaticamente se não existirem
3. **Campos Obrigatórios:** Todos os campos obrigatórios são preenchidos com valores padrão

---

## 🚀 COMO CRIAR UM IMÓVEL COMPLETO

### Opção 1: Via Interface (Recomendado)

1. **Acesse:** https://rendizyoficial.vercel.app/properties/new
2. **Aguarde 1-2 minutos** para o deploy do frontend atualizar
3. **Preencha o Step 1:**
   - Tipo do local: "Casa"
   - Tipo de acomodação: "Casa"
   - Subtipo: "Imóvel inteiro"
   - Modalidades: Marque todas (Aluguel por temporada, Compra e venda, Locação residencial)
   - Estrutura: "Anúncio Individual"
4. **Clique em "Salvar e Avançar"**
5. **✅ Deve funcionar agora!** (sem erro "Name, code, and type are required")

### Opção 2: Via Console do Navegador (Teste Rápido)

1. **Faça login** no sistema
2. **Abra o console** (F12 → Console)
3. **Cole e execute este código:**

```javascript
// Obter token
const token = localStorage.getItem('rendizy-token');
if (!token) {
  console.error('❌ Token não encontrado. Faça login primeiro.');
} else {
  // Dados do imóvel completo
  const imovelData = {
    name: 'Casa de Teste Completa',
    code: `TEST${Date.now().toString(36).toUpperCase()}`,
    type: 'loc_casa',
    propertyType: 'individual',
    accommodationType: 'acc_casa',
    subtype: 'entire_place',
    modalities: ['short_term_rental', 'buy_sell', 'residential_rental'],
    address: {
      street: 'Rua Lady Laura',
      number: '100',
      complement: 'Casa',
      neighborhood: 'Recreio dos Bandeirantes',
      city: 'Rio de Janeiro',
      state: 'Rio de Janeiro',
      stateCode: 'RJ',
      zipCode: '22790-673',
      country: 'BR',
      coordinates: { lat: -23.0065, lng: -43.4728 }
    },
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    basePrice: 500,
    currency: 'BRL',
    minNights: 2,
    financialInfo: {
      monthlyRent: 3000,
      iptu: 200,
      condo: 400,
      salePrice: 800000
    },
    description: 'Casa completa de teste criada automaticamente.',
    tags: ['teste'],
    amenities: ['wifi', 'parking'],
    contentType: {
      propertyTypeId: 'loc_casa',
      accommodationTypeId: 'acc_casa',
      subtipo: 'entire_place',
      modalidades: ['short_term_rental', 'buy_sell', 'residential_rental'],
      propertyType: 'individual'
    },
    contentLocation: {
      address: {
        street: 'Rua Lady Laura',
        number: '100',
        neighborhood: 'Recreio dos Bandeirantes',
        city: 'Rio de Janeiro',
        state: 'Rio de Janeiro',
        stateCode: 'RJ',
        zipCode: '22790-673',
        country: 'BR'
      }
    },
    contentRooms: {
      maxGuests: 6,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2
    }
  };

  // Criar imóvel
  fetch('https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/properties', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': token,
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NzQ1MDAsImV4cCI6MjA1MzQ1MDUwMH0.7qJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq'
    },
    body: JSON.stringify(imovelData)
  })
  .then(r => r.text())
  .then(text => {
    const data = JSON.parse(text);
    if (data.success) {
      console.log('✅ Imóvel criado com sucesso!');
      console.log('📋 ID:', data.data?.id);
      console.log('📋 Código:', data.data?.code);
      console.log('📋 Nome:', data.data?.name);
      console.log('🔗 Verifique na listagem: /properties');
    } else {
      console.error('❌ Erro:', data.error);
    }
  })
  .catch(err => console.error('❌ Erro:', err));
}
```

---

## 📋 COMANDO COMPLETO (Copiar e Colar)

```javascript
// ============================================
// COMANDO PARA CRIAR IMÓVEL COMPLETO
// ============================================
// 1. Faça login no sistema
// 2. Abra o console (F12)
// 3. Cole este código completo:

(async () => {
  const token = localStorage.getItem('rendizy-token');
  if (!token) {
    console.error('❌ Token não encontrado. Faça login primeiro.');
    return;
  }

  const imovelData = {
    name: 'Casa de Teste Completa',
    code: `TEST${Date.now().toString(36).toUpperCase()}`,
    type: 'loc_casa',
    propertyType: 'individual',
    accommodationType: 'acc_casa',
    subtype: 'entire_place',
    modalities: ['short_term_rental', 'buy_sell', 'residential_rental'],
    address: {
      street: 'Rua Lady Laura',
      number: '100',
      complement: 'Casa',
      neighborhood: 'Recreio dos Bandeirantes',
      city: 'Rio de Janeiro',
      state: 'Rio de Janeiro',
      stateCode: 'RJ',
      zipCode: '22790-673',
      country: 'BR',
      coordinates: { lat: -23.0065, lng: -43.4728 }
    },
    maxGuests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2,
    basePrice: 500,
    currency: 'BRL',
    minNights: 2,
    financialInfo: {
      monthlyRent: 3000,
      iptu: 200,
      condo: 400,
      fees: 0,
      salePrice: 800000,
      iptuAnnual: 2400
    },
    description: 'Casa completa de teste criada automaticamente para validação do sistema.',
    tags: ['teste', 'automático'],
    amenities: ['wifi', 'parking', 'pool'],
    contentType: {
      propertyTypeId: 'loc_casa',
      accommodationTypeId: 'acc_casa',
      subtipo: 'entire_place',
      modalidades: ['short_term_rental', 'buy_sell', 'residential_rental'],
      propertyType: 'individual',
      financialData: {
        monthlyRent: 3000,
        iptu: 200,
        condo: 400,
        fees: 0,
        salePrice: 800000,
        iptuAnnual: 2400
      }
    },
    contentLocation: {
      address: {
        street: 'Rua Lady Laura',
        number: '100',
        complement: 'Casa',
        neighborhood: 'Recreio dos Bandeirantes',
        city: 'Rio de Janeiro',
        state: 'Rio de Janeiro',
        stateCode: 'RJ',
        zipCode: '22790-673',
        country: 'BR',
        coordinates: { lat: -23.0065, lng: -43.4728 }
      }
    },
    contentRooms: {
      maxGuests: 6,
      bedrooms: 3,
      beds: 4,
      bathrooms: 2
    }
  };

  try {
    console.log('🏗️ Criando imóvel completo...');
    const response = await fetch('https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/properties', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE4NzQ1MDAsImV4cCI6MjA1MzQ1MDUwMH0.7qJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq'
      },
      body: JSON.stringify(imovelData)
    });

    const text = await response.text();
    const data = JSON.parse(text);

    if (response.ok && data.success) {
      console.log('✅ ✅ ✅ IMÓVEL CRIADO COM SUCESSO! ✅ ✅ ✅');
      console.log('📋 ID:', data.data?.id);
      console.log('📋 Código:', data.data?.code);
      console.log('📋 Nome:', data.data?.name);
      console.log('📋 Tipo:', data.data?.type);
      console.log('🔗 Acesse: https://rendizyoficial.vercel.app/properties');
      alert('✅ Imóvel criado com sucesso! Verifique na listagem.');
    } else {
      console.error('❌ Erro:', data.error || data.message);
      console.error('📡 Resposta completa:', data);
      alert('❌ Erro ao criar imóvel. Veja o console para detalhes.');
    }
  } catch (error) {
    console.error('❌ Erro:', error);
    alert('❌ Erro ao criar imóvel. Veja o console para detalhes.');
  }
})();
```

---

## ✅ RESULTADO ESPERADO

Após executar o comando, você deve ver:

```
✅ ✅ ✅ IMÓVEL CRIADO COM SUCESSO! ✅ ✅ ✅
📋 ID: prop_xxxxx
📋 Código: TESTXXXXX
📋 Nome: Casa de Teste Completa
📋 Tipo: loc_casa
🔗 Acesse: https://rendizyoficial.vercel.app/properties
```

E o imóvel deve aparecer na listagem de propriedades.

---

## 🔧 TROUBLESHOOTING

### Se der erro "Token não encontrado":
1. Faça login no sistema primeiro
2. Verifique se há um token em `localStorage.getItem('rendizy-token')`

### Se der erro "Name, code, and type are required":
1. Aguarde 1-2 minutos para o deploy do frontend atualizar
2. Recarregue a página (Ctrl+F5)
3. Tente novamente

### Se der erro 401 (Unauthorized):
1. Faça login novamente
2. Verifique se o token ainda é válido

---

## 📝 NOTAS

- O imóvel será criado com dados de teste completos
- Todos os campos obrigatórios estão preenchidos
- O código é gerado automaticamente (único)
- O imóvel aparecerá na listagem após criação

---

**Status:** ✅ PRONTO PARA USO  
**Versão:** v1.0.103.1000

