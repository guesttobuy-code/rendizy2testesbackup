# 🧪 Teste: Fluxo Completo Medhome

**Data:** 02/12/2025  
**Objetivo:** Testar fluxo completo: Login → Criar Imóvel → Ver no Site

---

## ✅ STATUS ATUAL

### **1. Site Medhome** ✅
- ✅ Carregando no Netlify: `https://adorable-biscochitos-59023a.netlify.app/sites/medhome`
- ✅ HTML extraído (2611 caracteres)
- ✅ **Configuração RENDIZY injetada** (confirmado no console)
- ✅ `window.RENDIZY_CONFIG` disponível
- ✅ `window.RENDIZY` com funções prontas (`getProperties`, `checkAvailability`, `createBooking`)

### **2. Usuário Medhome** ⏳
- ⏳ **Pendente:** Criar usuário no banco SQL
- 📧 Email: `mrockgarage@gmail.com`
- 👤 Username: `medhome_admin`
- 🔑 Password: `medhome123`
- 🏢 Organization ID: `e78c7bb9-7823-44b8-9aee-95c9b073e7b7`

**Ação necessária:**
```sql
-- Executar criar-usuario-medhome.sql no Supabase SQL Editor
```

---

## 🔍 PRÓXIMOS PASSOS

### **1. Criar Usuário** ⏳
1. Abrir Supabase Dashboard → SQL Editor
2. Executar `criar-usuario-medhome.sql`
3. Verificar se usuário foi criado

### **2. Fazer Login como Medhome**
1. Acessar: `https://adorable-biscochitos-59023a.netlify.app/login`
2. Login com:
   - **Email/Username:** `medhome_admin` ou `mrockgarage@gmail.com`
   - **Password:** `medhome123`

### **3. Criar Imóvel Teste**
1. Após login, ir para `/locais-e-anuncios` ou `/properties`
2. Clicar em "Cadastrar Imóvel"
3. Preencher dados:
   - Nome: "Apartamento Teste Medhome"
   - Código: "MED001"
   - Tipo: Apartamento
   - Endereço: Preencher
   - Preço: R$ 350,00
   - Capacidade: 4 pessoas
   - Salvar

### **4. Verificar no Site Medhome**
1. Acessar: `https://adorable-biscochitos-59023a.netlify.app/sites/medhome`
2. Abrir console do navegador (F12)
3. Executar:
   ```javascript
   // Verificar configuração
   console.log(window.RENDIZY_CONFIG);
   
   // Buscar imóveis
   const properties = await window.RENDIZY.getProperties();
   console.log('Imóveis:', properties);
   ```
4. Verificar se o imóvel criado aparece na lista

---

## 🎯 RESULTADO ESPERADO

1. ✅ Usuário criado e login funcionando
2. ✅ Imóvel criado na organização Medhome
3. ✅ Imóvel aparece na API `/api/medhome/properties`
4. ✅ Site Medhome pode buscar e exibir o imóvel via `window.RENDIZY.getProperties()`
5. ✅ Fluxo completo funcionando!

---

## 📝 NOTAS

- **Gestão de Usuários:** A funcionalidade "Ver Usuários" no Admin Master ainda não exibe usuários (precisa implementar modal/drawer)
- **Rota /users:** Ainda usa KV Store (viola Regras de Ouro) - precisa migrar para SQL
- **Hash de Senha:** Usa SHA256 (função `hashPassword` em `routes-auth.ts`)

---

**Status:** ⏳ **Aguardando criação do usuário no SQL**
