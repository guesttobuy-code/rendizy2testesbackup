# 📝 Como Registrar Campos Financeiros Automaticamente

Este documento explica como fazer com que campos financeiros de qualquer módulo apareçam automaticamente na tela de **Mapeamento de Campos x Contas**.

## 🎯 Objetivo

Quando você criar um novo campo financeiro em qualquer módulo (ex: comissão do Airbnb, taxa de plataforma de pagamento), ele deve aparecer automaticamente na tela de configurações financeiras para mapeamento.

## ✅ Solução Implementada

### 1. **Migration SQL** (`20241126_create_financial_fields_registry.sql`)
- Adiciona colunas: `is_system_field`, `registered_by_module`, `obrigatorio`
- Cria função SQL `registrar_campo_financeiro()` para registro idempotente
- Cria função SQL `registrar_campo_financeiro_global()` para registrar em todas as organizações

### 2. **API Backend** (`/financeiro/campo-mappings/register`)
- Endpoint POST para registrar novos campos
- Valida e registra campos financeiros automaticamente

### 3. **Helper Frontend** (`utils/registerFinancialField.ts`)
- Função `registerFinancialField()` para facilitar registro
- Função `registerMultipleFinancialFields()` para registrar múltiplos campos

### 4. **Interface Atualizada**
- Frontend busca campos dinamicamente do banco
- Campos registrados aparecem automaticamente na tela

## 📖 Como Usar

### Exemplo 1: Registrar Comissão do Airbnb

```typescript
// No módulo de integração Airbnb (ex: integracoes/airbnb/index.ts)
import { registerFinancialField } from '@/utils/registerFinancialField';

// Ao inicializar o módulo ou quando a integração for configurada
export async function initializeAirbnbIntegration() {
  // ... código de inicialização ...
  
  // Registrar campo financeiro da comissão
  await registerFinancialField({
    modulo: 'integracoes',
    campo_codigo: 'airbnb.comissao',
    campo_nome: 'Comissão do Airbnb',
    campo_tipo: 'despesa',
    descricao: 'Comissão cobrada pelo Airbnb sobre cada reserva (geralmente 3%)',
    registered_by_module: 'integracoes.airbnb',
    obrigatorio: true, // Campo obrigatório DEVE ter mapeamento
  });
  
  console.log('✅ Campo financeiro "Comissão do Airbnb" registrado');
}
```

### Exemplo 2: Registrar Taxa de Plataforma de Pagamento

```typescript
// No módulo de pagamentos (ex: pagamentos/stripe/index.ts)
import { registerFinancialField } from '@/utils/registerFinancialField';

export async function initializeStripePayment() {
  // ... código de inicialização ...
  
  // Registrar taxa do Stripe
  await registerFinancialField({
    modulo: 'pagamentos',
    campo_codigo: 'stripe.taxa_transacao',
    campo_nome: 'Taxa do Stripe',
    campo_tipo: 'despesa',
    descricao: 'Taxa cobrada pelo Stripe por transação (2.9% + R$ 0,30)',
    registered_by_module: 'pagamentos.stripe',
    obrigatorio: true,
  });
  
  console.log('✅ Campo financeiro "Taxa do Stripe" registrado');
}
```

### Exemplo 3: Registrar Múltiplos Campos de Uma Vez

```typescript
import { registerMultipleFinancialFields } from '@/utils/registerFinancialField';

export async function initializeBookingPlatform() {
  await registerMultipleFinancialFields([
    {
      modulo: 'integracoes',
      campo_codigo: 'booking.comissao',
      campo_nome: 'Comissão do Booking.com',
      campo_tipo: 'despesa',
      descricao: 'Comissão cobrada pelo Booking.com',
      registered_by_module: 'integracoes.booking',
      obrigatorio: true,
    },
    {
      modulo: 'integracoes',
      campo_codigo: 'booking.taxa_cancelamento',
      campo_nome: 'Taxa de Cancelamento Booking.com',
      campo_tipo: 'despesa',
      descricao: 'Taxa cobrada em caso de cancelamento',
      registered_by_module: 'integracoes.booking',
      obrigatorio: false,
    },
  ]);
}
```

## 🔧 Parâmetros

| Parâmetro | Tipo | Obrigatório | Descrição |
|-----------|------|-------------|-----------|
| `modulo` | `string` | ✅ Sim | Módulo do sistema (ex: 'integracoes', 'pagamentos', 'reservas') |
| `campo_codigo` | `string` | ✅ Sim | Código único do campo (ex: 'airbnb.comissao', 'stripe.taxa') |
| `campo_nome` | `string` | ✅ Sim | Nome legível do campo (ex: 'Comissão do Airbnb') |
| `campo_tipo` | `'receita' \| 'despesa'` | ✅ Sim | Tipo do campo financeiro |
| `descricao` | `string` | ❌ Não | Descrição detalhada do campo |
| `registered_by_module` | `string` | ❌ Não | Identificador do módulo que registrou (ex: 'integracoes.airbnb') |
| `obrigatorio` | `boolean` | ❌ Não | Se `true`, o campo DEVE ter mapeamento (padrão: `false`) |

## 🎨 Comportamento

1. **Registro Idempotente**: Se o campo já existir, ele é atualizado (não duplica)
2. **Aparece Automaticamente**: Campo aparece na tela de mapeamento imediatamente após registro
3. **Por Organização**: Cada organização tem seus próprios campos registrados
4. **Campos Obrigatórios**: Campos com `obrigatorio: true` devem ter mapeamento (validação futura)

## 📋 Checklist para Novos Módulos

Quando criar um novo módulo com campos financeiros:

- [ ] Identificar todos os campos financeiros do módulo
- [ ] Registrar cada campo usando `registerFinancialField()`
- [ ] Definir `obrigatorio: true` para campos que sempre devem ter mapeamento
- [ ] Testar se os campos aparecem na tela de mapeamento
- [ ] Documentar os campos no README do módulo

## 🚀 Próximos Passos

1. **Executar Migration**: Execute `20241126_create_financial_fields_registry.sql` no Supabase
2. **Registrar Campos Existentes**: Use a função SQL para registrar campos já existentes
3. **Atualizar Módulos**: Adicione chamadas `registerFinancialField()` nos módulos existentes
4. **Testar**: Verifique se os campos aparecem na tela de mapeamento

## 📚 Referências

- Migration: `supabase/migrations/20241126_create_financial_fields_registry.sql`
- Helper: `RendizyPrincipal/utils/registerFinancialField.ts`
- API: `POST /rendizy-server/make-server-67caf26a/financeiro/campo-mappings/register`
- Interface: `RendizyPrincipal/components/financeiro/components/CampoPlanoContasMappingVisual.tsx`

