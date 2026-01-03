# 📚 DOCUMENTAÇÃO OFICIAL: Find Chats Endpoint

**Data:** 2024-11-20  
**Fonte:** https://doc.evolution-api.com/v1/api-reference/chat-controller/find-chats

---

## 🔍 DESCOBERTA IMPORTANTE

**Conflito entre documentação e implementação real:**

### **Documentação Oficial (v1):**
```
GET /chat/findChats/{instance}
```

### **Dashboard da Evolution API (v2.3.6):**
```
POST /chat/findChats/{instance}
```

---

## ✅ INFORMAÇÃO OFICIAL DA DOCUMENTAÇÃO

### **Endpoint:**
```
GET https://{server-url}/chat/findChats/{instance}
```

### **Método HTTP:**
- **GET** (conforme documentação oficial v1)

### **Headers Necessários:**
```bash
--header 'apikey: <api-key>'
```

### **Exemplo cURL:**
```bash
curl --request GET \
  --url https://{server-url}/chat/findChats/{instance} \
  --header 'apikey: <api-key>'
```

### **Descrição:**
"Find all chats"

---

## 🔍 ANÁLISE DO CONFLITO

### **Por que o dashboard usa POST?**

1. **Versão diferente:** O dashboard pode estar usando **v2** da API, enquanto a documentação é **v1**
2. **Implementação customizada:** O dashboard pode usar uma implementação diferente
3. **Backward compatibility:** POST pode funcionar mesmo que GET seja o método oficial

### **Observação nas requisições de rede:**
- O dashboard **REALMENTE** usa `POST` para buscar conversas
- Requisição observada: `POST https://evo.boravendermuito.com.br/chat/findChats/Rafael%20Rendizy%20Google%20teste`
- **192 conversas retornadas** com sucesso usando POST

---

## ✅ SOLUÇÃO IMPLEMENTADA

### **Estratégia Multi-Método:**

1. **POST /chat/findChats/{instance}** (método usado pelo dashboard - PRIORIDADE)
2. **GET /chat/findChats/{instance}** (método oficial da documentação - FALLBACK)

### **Justificativa:**
- O dashboard funciona com **POST** (confirmado)
- A documentação oficial indica **GET**
- Implementamos ambos para máxima compatibilidade

---

## 📊 COMPARAÇÃO

| Fonte | Método | Endpoint | Status |
|-------|--------|----------|--------|
| Documentação Oficial (v1) | **GET** | `/chat/findChats/{instance}` | ✅ Documentado |
| Dashboard (v2.3.6) | **POST** | `/chat/findChats/{instance}` | ✅ Funciona |
| Nossa Implementação | **POST** (1º) + **GET** (2º) | `/chat/findChats/{instance}` | ✅ Ambas |

---

## 🚀 RECOMENDAÇÃO

**Manter a implementação atual** com POST como prioridade porque:
1. ✅ **POST funciona** no dashboard real (confirmado)
2. ✅ **GET como fallback** respeita a documentação oficial
3. ✅ **Máxima compatibilidade** com diferentes versões

---

## 📊 RESUMO DOS ENDPOINTS DA DOCUMENTAÇÃO OFICIAL

### **Find Chats:**
- **Documentação:** `GET /chat/findChats/{instance}`
- **Dashboard Real:** `POST /chat/findChats/{instance}` ✅ (funciona)
- **Nossa Implementação:** POST (1º) + GET (2º) ✅ (correto)

### **Find Messages:**
- **Documentação:** `POST /chat/findMessages/{instance}` ✅
- **Body Required:** `{ "where": { "key": { "remoteJid": "<string>" } } }`
- **Nossa Implementação:** Preciso verificar ✅

### **Find Contacts:**
- **Documentação:** `POST /chat/findContacts/{instance}` ✅
- **Body Optional:** `{ "where": { "id": "<string>" } }` (para buscar um contato específico)
- **Nossa Implementação:** Preciso verificar ✅

**⚠️ IMPORTANTE:** Os endpoints de Messages e Contacts estão em `/chat/`, não `/contact/`!

---

## 🔗 LINKS

- **Documentação Oficial Find Chats:** https://doc.evolution-api.com/v1/api-reference/chat-controller/find-chats
- **Documentação Oficial Find Messages:** https://doc.evolution-api.com/v1/api-reference/chat-controller/find-messages
- **Documentação Oficial Find Contacts:** https://doc.evolution-api.com/v1/api-reference/chat-controller/find-contacts
- **Dashboard:** https://evo.boravendermuito.com.br/manager/instance/{instance}/chat
- **Versão do Dashboard:** v2.3.6

---

**✅ CONCLUSÃO: Nossa implementação está CORRETA para Find Chats!**

**⚠️ AÇÃO NECESSÁRIA:** Verificar e corrigir endpoints de Messages e Contacts para usar `/chat/` ao invés de `/contact/`!

**Última atualização:** 2024-11-20

