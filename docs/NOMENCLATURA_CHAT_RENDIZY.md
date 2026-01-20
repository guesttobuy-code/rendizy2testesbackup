# 📝 NOMENCLATURA - Sistema de Chat RENDIZY

**Data:** 20/11/2025  
**Versão:** 1.0  
**Status:** ✅ DOCUMENTAÇÃO OFICIAL

---

## 🎯 OBJETIVO

Esta documentação define a nomenclatura oficial para diferenciar os dois sistemas de chat no RENDIZY, permitindo clareza nas conversas e desenvolvimento.

---

## 📱 SISTEMAS DE CHAT

### **1. Chat - Rendizy** ✨

**Nome Oficial:** `Chat - Rendizy`

**Descrição:**  
O chat original do Figma com todas as funcionalidades avançadas projetadas.

**Características:**
- ✅ Sistema Kanban completo (Fixadas, Urgentes, Normais, Resolvidas)
- ✅ Drag & Drop entre categorias
- ✅ Sistema de Templates com variáveis dinâmicas
- ✅ Sistema de Tags personalizadas
- ✅ Modais integrados (Cotação, Reserva, Bloqueio, Ações Rápidas)
- ✅ Filtros avançados
- ✅ Multi-canal (WhatsApp, Email, SMS, Sistema)
- ✅ Notas internas
- ✅ Anexos e arquivos
- ✅ Ações em massa
- ✅ Diferenciação Guest vs Lead

**Arquivos:**
- `src/components/ChatInbox.tsx` - Componente principal
- `src/docs/CHAT_TELAS_1.0_REFERENCIA.md` - Design de referência
- `src/docs/HISTORICO_DESIGN_CHAT_COMPLETO.md` - Histórico completo

**Status:** ✅ Implementado e funcional (precisa integração WhatsApp)

**Versão:** v1.0.90 → v1.0.103

---

### **2. CHAT FEIOSO** 😐

**Nome Oficial:** `CHAT FEIOSO` (temporário)

**Descrição:**  
Chat atual no sistema, criado/influenciado pela integração da API Evolution. Interface simples com tabs separadas.

**Características:**
- ⚠️ Tabs separadas (Chat Inbox / WhatsApp)
- ⚠️ Lista simples de contatos WhatsApp
- ⚠️ Área de conversa básica
- ✅ Status do WhatsApp (conectado/desconectado)
- ✅ Sincronização Evolution API

**Arquivos:**
- `src/components/ChatInboxWithEvolution.tsx` - Wrapper com tabs
- `src/components/EvolutionContactsList.tsx` - Lista simples de contatos
- `src/components/WhatsAppChatsImporter.tsx` - Importador de conversas

**Status:** ⚠️ Funcional mas limitado (será substituído)

**Versão:** v1.0.103.164

---

## 🔄 ESTRATÉGIA DE MIGRAÇÃO

### **Objetivo Final:**
Integrar os dados do WhatsApp Evolution API **dentro** do design completo do **Chat - Rendizy**, mantendo todas as funcionalidades avançadas.

### **Plano:**
1. ✅ Documentar nomenclatura (este documento)
2. 🔄 Integrar dados WhatsApp no `ChatInbox.tsx`
3. 🔄 Fazer conversas WhatsApp aparecerem no Kanban
4. 🔄 Manter funcionalidades (Templates, Tags, Modais)
5. 🔄 Remover/Refatorar `ChatInboxWithEvolution.tsx` (CHAT FEIOSO)

---

## 📊 COMPARAÇÃO

| Característica | Chat - Rendizy | CHAT FEIOSO |
|----------------|----------------|-------------|
| **Design** | ✨ Completo (Figma) | 😐 Simples (Evolution) |
| **Kanban** | ✅ 4 categorias | ❌ Não tem |
| **Drag & Drop** | ✅ Sim | ❌ Não |
| **Templates** | ✅ Sim | ❌ Não |
| **Tags** | ✅ Sim | ❌ Não |
| **Modais** | ✅ Sim (4 modais) | ❌ Não |
| **WhatsApp** | ⚠️ Precisa integrar | ✅ Funciona |
| **Multi-canal** | ✅ Sim | ⚠️ Apenas WhatsApp |
| **Filtros** | ✅ Avançados | ⚠️ Básicos |

---

## 🎯 RESULTADO ESPERADO

### **Antes (CHAT FEIOSO):**
```
┌─────────────────────────────────────┐
│ [Chat Inbox] [WhatsApp]  ← Tabs    │
├─────────────────────────────────────┤
│ Tab "WhatsApp":                     │
│ - Lista simples de contatos         │
│ - Área de conversa básica           │
└─────────────────────────────────────┘
```

### **Depois (Chat - Rendizy + WhatsApp):**
```
┌─────────────────────────────────────┐
│ WhatsApp Evolution API [Importar]   │
├─────────────────────────────────────┤
│ 🔍 Buscar conversas...              │
│                                     │
│ 📌 Fixadas (2/5)                    │
│ ├─ João Silva (WhatsApp) 📌         │
│ └─ Maria Santos (WhatsApp) 📌       │
│                                     │
│ ⚡ Urgentes (3)                      │
│ ├─ Patricia (WhatsApp) ⚡           │
│ ├─ Ana (Email) ⚡                    │
│ └─ Carlos (WhatsApp) ⚡              │
│                                     │
│ 📋 Normais (5)                       │
│ ├─ Conversas WhatsApp...            │
│ ├─ Conversas Email...               │
│ └─ Conversas SMS...                 │
└─────────────────────────────────────┘
```

**Tudo em UMA interface unificada, com todas as funcionalidades do Chat - Rendizy!**

---

## 📝 NOTAS DE USO

### **Ao falar sobre:**
- **Chat - Rendizy**: Referir-se ao chat completo com todas as funcionalidades
- **CHAT FEIOSO**: Referir-se ao chat atual simples (temporário)

### **Ao desenvolver:**
- **Objetivo**: Integrar WhatsApp no Chat - Rendizy
- **Evitar**: Criar novas features no CHAT FEIOSO
- **Foco**: Migrar tudo para Chat - Rendizy

---

## 🔗 LINKS RELACIONADOS

- [Chat Telas 1.0 - Design de Referência](./CHAT_TELAS_1.0_REFERENCIA.md)
- [Histórico Completo do Design](./HISTORICO_DESIGN_CHAT_COMPLETO.md)
- [Sistema Kanban e Drag & Drop](./CHAT_DRAG_DROP_SYSTEM.md)
- [Guia Evolution API](../🚀_COMECE_AQUI_EVOLUTION_API_v1.0.103.318.md)

---

**Última Atualização:** 20/11/2025  
**Versão do Documento:** 1.0  
**Status:** ✅ Oficial

