# 📋 INSTRUÇÕES: Aplicar Migration SQL para Chat WhatsApp

**Versão:** v1.0.103.970  
**Data:** 20/11/2025  

---

## 🎯 OBJETIVO

Criar tabelas SQL `conversations` e `messages` para substituir KV Store e garantir persistência permanente dos dados de chat.

---

## ✅ PASSO 1: Aplicar Migration SQL

1. **Acesse o Supabase Dashboard:**
   - URL: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc
   - Navegue para: **SQL Editor**

2. **Execute a Migration:**
   - Abra o arquivo: `supabase/migrations/20241120_create_whatsapp_chat_tables.sql`
   - Copie TODO o conteúdo do arquivo
   - Cole no SQL Editor do Supabase
   - Clique em **RUN** ou pressione `Ctrl+Enter`

3. **Verificar se funcionou:**
   - Navegue para: **Database → Tables**
   - Verifique se as tabelas `conversations` e `messages` foram criadas

---

## ✅ PASSO 2: Atualizar Código (Já em andamento)

Após aplicar a migration, vou atualizar:
- ✅ Webhook para salvar em SQL ao invés de KV Store
- ✅ Rotas de chat para ler de SQL
- ✅ Validação no kv_store.tsx para prevenir uso indevido

---

## 📋 CHECKLIST

- [ ] Migration SQL aplicada no Supabase
- [ ] Tabelas `conversations` e `messages` criadas
- [ ] Código atualizado para usar SQL
- [ ] Validação KV Store adicionada
- [ ] Testar recebimento de mensagem

---

**NOTA:** A migration já foi criada. Apenas precisa ser aplicada no Supabase Dashboard.

