# Solução: Simplificação para Remover Bloqueios

## Problemas Identificados

1. **kv_store tentando usar coluna `updated_at` que não existe**
   - Tabela `kv_store_67caf26a` tem apenas: `key` (TEXT) e `value` (JSONB)
   - Código estava tentando inserir `updated_at` causando erro

2. **JWT Authentication confuso**
   - Supabase Edge Functions requer header `Authorization` 
   - Mas a validação de JWT foi desabilitada no código
   - Causando confusão sobre o que é necessário

## Solução Implementada

### ✅ 1. Simplificar kv_store.tsx

**Removido:**
- `updated_at` de todas as operações upsert
- Variável `now` não utilizada

**Mantido:**
- Apenas `key` e `value` - conforme schema real da tabela

### ✅ 2. Header Authorization Mantido

**Por quê:**
- Supabase Edge Functions requer o header `Authorization` por padrão
- Mesmo que não valide JWT, o header precisa existir
- Usar `anon key` é suficiente

**O que realmente precisamos:**
```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${publicAnonKey}` // ✅ Obrigatório pelo Supabase
}
```

## O Que Realmente Precisamos

### ✅ Mínimo Necessário para Login:

1. **Frontend (AuthContext.tsx):**
   - ✅ Enviar `username` e `password` no body
   - ✅ Incluir header `Authorization: Bearer <anon_key>`
   - ✅ Não validar JWT no frontend (Edge Function faz isso)

2. **Backend (routes-auth.ts):**
   - ✅ Não validar JWT - já está assim
   - ✅ Buscar usuário no KV Store
   - ✅ Verificar senha
   - ✅ Criar sessão e retornar token

3. **kv_store.tsx:**
   - ✅ Apenas `key` e `value`
   - ✅ Sem timestamps na tabela
   - ✅ Se precisar de timestamp, colocar no JSON do `value`

## Próximos Passos

1. ✅ **Correção aplicada:** Removido `updated_at` do kv_store
2. ⏳ **Deploy pendente:** Fazer deploy da Edge Function
3. ⏳ **Testar login:** Verificar se funciona após deploy

## Benefícios da Simplificação

- ✅ Menos campos = menos erros
- ✅ Schema alinhado com o banco de dados
- ✅ Menos complexidade = mais fácil de debugar
- ✅ Foco no essencial: login funciona

