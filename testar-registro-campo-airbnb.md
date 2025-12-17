# 🧪 Teste: Registro Automático de Campo Financeiro Airbnb

## 📋 Passos para Testar

### 1. Executar Migration (se ainda não executou)
```sql
-- Execute no Supabase SQL Editor:
-- supabase/migrations/20241126_create_financial_fields_registry.sql
```

### 2. Verificar se as colunas existem
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'financeiro_campo_plano_contas_mapping'
  AND column_name IN ('is_system_field', 'registered_by_module', 'obrigatorio');
```

### 3. Acessar a Interface
1. Acesse: **Configurações → Integrações → Airbnb**
2. O componente `AirbnbIntegration` será montado
3. O `useEffect` executará automaticamente e registrará o campo

### 4. Verificar no Console do Navegador
- Abra o DevTools (F12)
- Procure por logs:
  - `📝 [AirbnbIntegration] Registrando campos financeiros do Airbnb...`
  - `✅ [AirbnbIntegration] Campo financeiro "Comissão do Airbnb" registrado com sucesso!`

### 5. Verificar na Tela de Mapeamento
1. Acesse: **Finanças → Configurações do Financeiro → Mapeamento de Campos x Contas**
2. Procure pelo campo: **"Comissão do Airbnb"**
3. Deve aparecer na lista de campos do sistema

### 6. Verificar no Banco de Dados
```sql
SELECT 
  id,
  modulo,
  campo_codigo,
  campo_nome,
  campo_tipo,
  is_system_field,
  registered_by_module,
  obrigatorio,
  created_at
FROM financeiro_campo_plano_contas_mapping
WHERE campo_codigo = 'airbnb.comissao'
ORDER BY created_at DESC;
```

## ✅ Resultado Esperado

- Campo "Comissão do Airbnb" aparece na tela de mapeamento
- Campo tem `is_system_field = true`
- Campo tem `registered_by_module = 'integracoes.airbnb'`
- Campo tem `obrigatorio = true`
- Campo pode ser mapeado para uma conta do plano de contas

## 🐛 Troubleshooting

### Campo não aparece na tela
- Verificar se a migration foi executada
- Verificar console do navegador por erros
- Verificar se o campo foi registrado no banco (query acima)

### Erro ao registrar campo
- Verificar se a API está online
- Verificar se o usuário está autenticado
- Verificar logs do backend

