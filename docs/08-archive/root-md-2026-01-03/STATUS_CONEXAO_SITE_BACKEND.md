# 🔌 Status da Conexão do Site com o Backend

**Data:** 02/12/2025  
**Pergunta:** O site está conectado ao nosso backend? Reservas, anúncios, etc?

---

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

### **1. APIs Públicas Criadas** ✅

#### **API de Imóveis (Propriedades)**

```
GET /api/:subdomain/properties
```

- ✅ **Status:** Implementado e funcionando
- ✅ **Público:** Sem autenticação necessária
- ✅ **Retorna:** Lista de imóveis da organização
- ✅ **Filtros:** Por modalidade (short_term, long_term, sale)

#### **API de Disponibilidade**

```
GET /api/:subdomain/availability?propertyId=...&startDate=...&endDate=...
```

- ✅ **Status:** Implementado e funcionando
- ✅ **Público:** Sem autenticação necessária
- ✅ **Retorna:** Disponibilidade do imóvel (considera reservas e blocos)
- ✅ **Valida:** Conflitos de datas, mínimo de noites, etc

#### **API de Reservas**

```
POST /api/:subdomain/bookings
```

- ✅ **Status:** Implementado e funcionando
- ✅ **Público:** Sem autenticação necessária
- ✅ **Cria:** Reserva, hóspede (se necessário), calcula preço
- ✅ **Valida:** Disponibilidade antes de criar

---

## ⚠️ O QUE AINDA PRECISA SER FEITO

### **1. Site Medhome Precisa Ser Configurado** ⚠️

O site Medhome (HTML/JS/CSS do ZIP) é **estático** e precisa:

1. **Configurar API_BASE_URL:**

   ```javascript
   const API_BASE_URL =
     "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites";
   const SUBDOMAIN = "medhome";
   ```

2. **Fazer fetch para buscar imóveis:**

   ```javascript
   // No site Medhome
   fetch(`${API_BASE_URL}/api/${SUBDOMAIN}/properties`)
     .then((res) => res.json())
     .then((data) => {
       // Exibir imóveis na tela
       console.log("Imóveis:", data.data);
     });
   ```

3. **Verificar disponibilidade:**

   ```javascript
   fetch(
     `${API_BASE_URL}/api/${SUBDOMAIN}/availability?propertyId=123&startDate=2025-12-10&endDate=2025-12-15`
   )
     .then((res) => res.json())
     .then((data) => {
       // Verificar se está disponível
       console.log("Disponível:", data.available);
     });
   ```

4. **Criar reserva:**
   ```javascript
   fetch(`${API_BASE_URL}/api/${SUBDOMAIN}/bookings`, {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       propertyId: "123",
       startDate: "2025-12-10",
       endDate: "2025-12-15",
       guests: 2,
       guestName: "João Silva",
       guestEmail: "joao@email.com",
       guestPhone: "11999999999",
     }),
   })
     .then((res) => res.json())
     .then((data) => {
       // Reserva criada
       console.log("Reserva:", data.data);
     });
   ```

---

## 🎯 SITUAÇÃO ATUAL

### **Backend (Rendizy):** ✅ **PRONTO**

- ✅ APIs públicas criadas
- ✅ Endpoints funcionando
- ✅ Validações implementadas
- ✅ Cálculo de preços
- ✅ Verificação de disponibilidade

### **Frontend (Site Medhome):** ⚠️ **PRECISA CONFIGURAR**

- ⚠️ Site estático (HTML/JS/CSS)
- ⚠️ Precisa fazer fetch para APIs
- ⚠️ Precisa configurar `API_BASE_URL` e `SUBDOMAIN`
- ⚠️ Precisa integrar com formulários de reserva

---

## 🔧 COMO RESOLVER

### **Opção 1: Configurar no Site Medhome (Recomendado)**

1. **No código do site Medhome (antes de compilar):**

   - Adicionar arquivo `config/api.ts`:
     ```typescript
     export const API_CONFIG = {
       BASE_URL:
         "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites",
       SUBDOMAIN: "medhome",
     };
     ```

2. **Usar nas páginas:**

   ```typescript
   import { API_CONFIG } from "./config/api";

   // Buscar imóveis
   const properties = await fetch(
     `${API_CONFIG.BASE_URL}/api/${API_CONFIG.SUBDOMAIN}/properties`
   );
   ```

3. **Recompilar o site** e fazer upload novamente

### **Opção 2: Injetar Configuração no HTML (Automático)**

Modificar o backend para **injetar configuração** no HTML servido:

```typescript
// routes-client-sites.ts - app.get("/serve/*")
const htmlWithConfig = html.replace(
  "</head>",
  `<script>
    window.RENDIZY_CONFIG = {
      API_BASE_URL: "${baseUrl}",
      SUBDOMAIN: "${subdomain}",
      ORGANIZATION_ID: "${site.organizationId}"
    };
  </script></head>`
);
```

Assim, o site pode usar `window.RENDIZY_CONFIG` sem precisar recompilar.

---

## 📊 RESUMO

| Componente          | Status                | O Que Falta             |
| ------------------- | --------------------- | ----------------------- |
| **Backend APIs**    | ✅ Pronto             | Nada                    |
| **Site Medhome**    | ⚠️ Precisa configurar | Integrar com APIs       |
| **Reservas**        | ✅ API pronta         | Site precisa chamar API |
| **Imóveis**         | ✅ API pronta         | Site precisa chamar API |
| **Disponibilidade** | ✅ API pronta         | Site precisa chamar API |

---

## 🎯 PRÓXIMOS PASSOS

1. **Decidir:** Opção 1 (configurar no site) ou Opção 2 (injetar no HTML)
2. **Implementar:** Configuração escolhida
3. **Testar:** Verificar se site busca imóveis e cria reservas
4. **Validar:** Fluxo completo de reserva funcionando

---

**Conclusão:** O backend está **100% pronto**. O site Medhome precisa ser **configurado para usar essas APIs**.
