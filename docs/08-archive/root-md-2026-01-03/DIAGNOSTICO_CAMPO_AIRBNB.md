# 🔍 Diagnóstico: Campo Airbnb não aparece

## Problemas Identificados

### 1. ✅ CORRIGIDO: Filtro de Módulo
- **Problema**: O filtro não incluía "integracoes" como opção
- **Solução**: Adicionado `<option value="integracoes">Integrações</option>`
- **Arquivo**: `CampoPlanoContasMappingVisual.tsx`

### 2. ⚠️ PENDENTE: Verificar se Migration foi executada
- Execute: `supabase/migrations/20241126_create_financial_fields_registry.sql`
- Verifique se as colunas existem: `is_system_field`, `registered_by_module`, `obrigatorio`

### 3. ⚠️ PENDENTE: Verificar se Componente foi montado
- O campo só é registrado quando o componente `AirbnbIntegration` é montado
- Acesse: **Configurações → Integrações → Airbnb**
- Verifique o console do navegador (F12) por logs:
  - `📝 [AirbnbIntegration] Registrando campos financeiros do Airbnb...`
  - `✅ [AirbnbIntegration] Campo financeiro "Comissão do Airbnb" registrado com sucesso!`

### 4. ⚠️ PENDENTE: Verificar se Campo foi registrado no Banco
- Execute o script SQL: `verificar-campo-airbnb.sql`
- Verifique se o campo existe com `campo_codigo = 'airbnb.comissao'`

## Passos para Resolver

### Passo 1: Executar Migration
```sql
-- Execute no Supabase SQL Editor:
-- Arquivo: supabase/migrations/20241126_create_financial_fields_registry.sql
```

### Passo 2: Acessar Integração Airbnb
1. Acesse: **Configurações → Integrações → Airbnb**
2. Abra o console do navegador (F12)
3. Verifique se há logs de registro do campo

### Passo 3: Verificar no Banco
```sql
SELECT 
  campo_codigo,
  campo_nome,
  modulo,
  is_system_field,
  registered_by_module,
  obrigatorio
FROM financeiro_campo_plano_contas_mapping
WHERE campo_codigo = 'airbnb.comissao';
```

### Passo 4: Verificar na Tela de Mapeamento
1. Acesse: **Finanças → Configurações do Financeiro → Mapeamento de Campos x Contas**
2. Verifique o filtro de módulo - deve ter opção "Integrações"
3. Selecione "Integrações" no filtro
4. O campo "Comissão do Airbnb" deve aparecer

## Logs de Debug Adicionados

- `📦 [MappingVisual] Total campos retornados: X`
- `🔍 [MappingVisual] Campos de integracoes encontrados: X`
- Lista de todos os campos de integracoes com detalhes

## Próximos Passos

1. Execute a migration SQL
2. Acesse a integração do Airbnb
3. Verifique o console do navegador
4. Verifique o banco de dados
5. Acesse a tela de mapeamento e selecione filtro "Integrações"

