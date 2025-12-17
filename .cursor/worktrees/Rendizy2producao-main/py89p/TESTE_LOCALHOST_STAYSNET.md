# 🧪 TESTE COMPLETO: Funcionalidades Stays.net em Localhost

**Data:** 22/11/2025  
**Status:** ✅ Pronto para Teste

---

## 📋 FUNCIONALIDADES IMPLEMENTADAS

### **1. Configuração da API Stays.net**
- ✅ Interface de configuração (Base URL, API Key, API Secret)
- ✅ Validação inteligente de URL
- ✅ Salvamento no banco de dados
- ✅ Status visual (Ativo/Inativo)

### **2. Teste de Conexão**
- ✅ Endpoint `/staysnet/test`
- ✅ Validação de credenciais
- ✅ Feedback visual (sucesso/erro)

### **3. Importação Completa**
- ✅ **Fase 1:** Importação de hóspedes (`/booking/clients`)
- ✅ **Fase 2:** Importação de propriedades (`/content/listings`)
- ✅ **Fase 3:** Importação de reservas (01/01/2025 - 31/12/2026)
- ✅ Mapeamento de campos (Stays.net → Rendizy)
- ✅ Salvamento no banco SQL
- ✅ Tratamento de duplicatas (update/create)

### **4. Mapeamento de Dados**
- ✅ Conversão de nomenclatura (ex: `_idlisting` → `listing_id`)
- ✅ Campos JSONB (pricing, guests, payment, etc.)
- ✅ Campos de OTA (Airbnb, Booking.com)
- ✅ Avaliações e ratings

---

## 🚀 COMO TESTAR EM LOCALHOST

### **Passo 1: Iniciar o Servidor Local**

```bash
cd RendizyPrincipal
npm run dev
```

O servidor deve iniciar em: `http://localhost:5173`

### **Passo 2: Fazer Login**

1. Abra o navegador em `http://localhost:5173`
2. Faça login com suas credenciais
3. Aguarde o carregamento completo

### **Passo 3: Configurar Stays.net**

1. Acesse: **Configuração > Integrações > Stays.net**
2. Preencha os campos:
   - **Base URL:** `https://bvm.stays.net/external/v1`
   - **API Key:** `a5146970`
   - **API Secret:** `bfcf4daf`
3. Clique em **Salvar**

### **Passo 4: Testar Conexão**

1. Na mesma tela, clique em **Testar Conexão**
2. Aguarde a resposta (deve mostrar "Conexão estabelecida com sucesso!")

### **Passo 5: Executar Importação Completa**

**Opção A: Via Console do Navegador (Recomendado)**

1. Abra o DevTools (F12) > Console
2. Execute o script completo do arquivo `test-localhost-staysnet.ps1`
3. Aguarde a conclusão (pode levar alguns minutos)

**Opção B: Via Interface (quando implementado)**

1. Acesse a aba **"Importar Dados"** (quando disponível)
2. Selecione as propriedades desejadas (ou deixe vazio para todas)
3. Clique em **Importar**

---

## 📊 O QUE ESPERAR

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
    }
  }
}
```

### **Logs Esperados no Console:**

```
🚀 TESTE COMPLETO - STAYS.NET LOCALHOST
============================================================

📝 TESTE 1: Configuração da API
✅ Configuração salva com sucesso!

🔌 TESTE 2: Teste de Conexão
✅ Conexão estabelecida com sucesso!

📥 TESTE 3: Importação Completa (Hóspedes + Propriedades + Reservas)
⏳ Isso pode levar alguns minutos...
⏱️  Tempo: 45.32s
✅ Importação concluída!

📊 ESTATÍSTICAS:

👥 HÓSPEDES:
   Buscados: 10
   ✅ Criados: 8
   🔄 Atualizados: 2
   ❌ Falhas: 0

🏠 PROPRIEDADES:
   Buscadas: 5
   ✅ Criadas: 5
   🔄 Atualizadas: 0
   ❌ Falhas: 0

📅 RESERVAS:
   Buscadas: 50
   ✅ Criadas: 45
   🔄 Atualizadas: 5
   ❌ Falhas: 0
```

---

## ✅ VERIFICAÇÕES PÓS-IMPORTAÇÃO

### **1. Hóspedes**
- Acesse: Menu **Hóspedes**
- Verifique se os hóspedes importados aparecem
- Verifique telefones e emails
- Verifique campos de OTA (se disponíveis)

### **2. Propriedades**
- Acesse: Menu **Propriedades**
- Verifique se as propriedades importadas aparecem
- Verifique endereços e capacidades
- Verifique fotos e descrições

### **3. Reservas**
- Acesse: Menu **Reservas**
- Verifique se as reservas importadas aparecem
- Verifique datas de check-in/check-out
- Verifique valores (pricing)
- Verifique plataforma (Airbnb, Booking.com, etc.)

### **4. Calendário** ⭐ **CRÍTICO**
- Acesse: Menu **Calendário**
- Verifique se as reservas aparecem no calendário
- Verifique se as cores estão corretas (por plataforma)
- Verifique se as datas estão corretas
- Verifique se os períodos estão bloqueados corretamente

---

## 🔍 POSSÍVEIS PROBLEMAS

### **Erro: "Stays.net not configured"**
- ✅ **Solução:** Configure em **Configuração > Integrações > Stays.net**

### **Erro: "property ou guest não encontrado"**
- ⚠️ **Isso é esperado** se não houver propriedades/hóspedes importados ainda
- ✅ **A importação completa resolve isso** (importa tudo em sequência)

### **Erro: "Failed to insert"**
- ⚠️ Verificar logs do backend para detalhes
- ✅ Verificar se tabelas SQL existem e têm permissões corretas

### **Reservas não aparecem no calendário**
- ⚠️ Verificar se `calendarApi.getData()` está buscando do banco SQL
- ✅ Verificar se as datas estão no formato correto (YYYY-MM-DD)
- ✅ Verificar se `propertyId` e `guestId` estão corretos

### **Erro de CORS**
- ⚠️ Verificar se o backend está rodando
- ✅ Verificar se as credenciais estão corretas
- ✅ Verificar se o token está válido

---

## 📝 CHECKLIST DE TESTE

- [ ] Servidor local rodando (`npm run dev`)
- [ ] Login realizado com sucesso
- [ ] Configuração do Stays.net salva
- [ ] Teste de conexão bem-sucedido
- [ ] Importação completa executada
- [ ] Hóspedes aparecem no menu
- [ ] Propriedades aparecem no menu
- [ ] Reservas aparecem no menu
- [ ] Reservas aparecem no calendário
- [ ] Dados estão corretos (nomes, telefones, datas, valores)
- [ ] Campos de OTA estão mapeados corretamente
- [ ] Nenhum erro no console do navegador
- [ ] Nenhum erro nos logs do backend

---

## 🎯 PRÓXIMOS PASSOS APÓS TESTE

1. ✅ **Se funcionar:** Implementar sincronização automática (1 minuto)
2. ✅ **Se funcionar:** Criar interface frontend (botão de importação)
3. ✅ **Se funcionar:** Verificar campos faltantes e adicionar ao banco
4. ✅ **Se funcionar:** Implementar filtros e busca avançada

---

**Última atualização:** 22/11/2025  
**Status:** ✅ Pronto para teste completo em localhost

