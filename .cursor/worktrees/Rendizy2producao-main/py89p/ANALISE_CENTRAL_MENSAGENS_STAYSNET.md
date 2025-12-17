# 📱 Análise: Central de Mensagens Stays.net

**Data:** 22/11/2025  
**Status:** ✅ Análise Completa

---

## 🔍 RESULTADO DA VERIFICAÇÃO

### **API Externa Stays.net:**
❌ **NÃO possui endpoints de Mensagens/Chat na API Externa**

### **Stays.net (Sistema Interno):**
✅ **TEM Central de Mensagens** (funcionalidade interna do sistema)

---

## 📋 ENDPOINTS TESTADOS

Testei os seguintes endpoints na API Externa (`/external/v1`):

| Endpoint | Resultado | Status |
|----------|-----------|--------|
| `/messages` | 404 - Não existe | ❌ |
| `/chat` | 404 - Não existe | ❌ |
| `/communications` | 404 - Não existe | ❌ |
| `/conversations` | 404 - Não existe | ❌ |
| `/booking/messages` | 404 - Não existe | ❌ |
| `/booking/communications` | 404 - Não existe | ❌ |
| `/webhooks` | Não disponível | ❌ |

---

## ✅ FUNCIONALIDADES DA CENTRAL DE MENSAGENS (Sistema Interno)

Baseado na pesquisa e documentação da Stays.net:

### **1. Central de Mensagens Unificada**
- Consolida mensagens de diferentes canais em um único local
- Integração com **Airbnb Messages**
- Integração com **Booking.com Messages**
- Interface web para gerenciar todas as conversas

### **2. Integração com WhatsApp**
- Configuração via: **App Center > Comunicação > WhatsApp**
- Comunicação direta com hóspedes via WhatsApp
- Mensagens sincronizadas na Central de Mensagens

### **3. Automação com AutochatBnB**
- Integração com AutochatBnB (solução de IA)
- Mensagens automáticas em diferentes etapas:
  - Confirmação de reserva
  - Instruções de check-in
  - Lembretes de check-out
  - Follow-up pós-estadia

---

## 🎯 CONCLUSÃO

### **Para Integração com Rendizy:**

1. **API Externa NÃO oferece mensagens:**
   - Não há endpoints para buscar/enviar mensagens
   - Não há endpoints para gerenciar conversas
   - A Central de Mensagens é funcionalidade interna

2. **Alternativas Possíveis:**

   **Opção A: Webhooks (se disponível)**
   - Verificar se Stays.net oferece webhooks para notificações de mensagens
   - Configurar webhook para receber notificações quando houver novas mensagens
   - ⚠️ Precisa verificar se isso está disponível

   **Opção B: Integração Direta com OTAs**
   - Integrar diretamente com APIs de Airbnb e Booking.com
   - Usar Stays.net apenas como fonte de dados (reservas, hóspedes, propriedades)
   - Gerenciar mensagens diretamente nas APIs das OTAs

   **Opção C: Usar WhatsApp (já implementado)**
   - Rendizy já tem integração com WhatsApp via Evolution API
   - Usar WhatsApp como canal principal de comunicação
   - Stays.net serve apenas para dados de reservas/hóspedes

---

## 📊 COMPARAÇÃO: Stays.net vs Rendizy

| Funcionalidade | Stays.net | Rendizy |
|----------------|-----------|---------|
| Central de Mensagens | ✅ (Interna) | ✅ (Chat Unificado) |
| API Externa de Mensagens | ❌ | ✅ (Evolution API) |
| WhatsApp | ✅ (Integrado) | ✅ (Evolution API) |
| Airbnb Messages | ✅ (Integrado) | ⏳ (Pode integrar) |
| Booking Messages | ✅ (Integrado) | ⏳ (Pode integrar) |
| Automação | ✅ (AutochatBnB) | ⏳ (Pode implementar) |

---

## 💡 RECOMENDAÇÃO

**Para o Rendizy:**

1. **Manter WhatsApp como canal principal** (já implementado)
2. **Usar Stays.net para:**
   - Sincronizar reservas
   - Sincronizar hóspedes
   - Sincronizar propriedades
   - Obter dados de OTAs (Airbnb, Booking)

3. **Para mensagens:**
   - Continuar usando WhatsApp via Evolution API
   - Se necessário, integrar diretamente com APIs de Airbnb/Booking para mensagens
   - Não depender de Stays.net para mensagens (não está disponível na API)

---

## 🔗 REFERÊNCIAS

- [Central de Mensagens Stays.net](https://academy.stays.net/pt-BR/support/solutions/articles/36000207002)
- [Integração WhatsApp Stays.net](https://academy.stays.net/pt-BR/support/solutions/articles/36000493871)
- [AutochatBnB Integration](https://stays.net/blog/integracao-autochatbnb/)
- [Stays.net External API Docs](https://stays.net/external-api)

---

**Última atualização:** 22/11/2025  
**Conclusão:** API Externa não oferece mensagens. Central de Mensagens é funcionalidade interna.

