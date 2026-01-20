# 🏗️ PROPOSTA ARQUITETURAL: Persistência Assertiva

## 📊 Análise do Problema Atual

### Problemas Identificados:
1. **Falta de Fonte Única de Verdade**: Múltiplas implementações de UPDATE/INSERT espalhadas
2. **Inconsistência de Tipos**: `organization_id` como TEXT no banco, mas validação inconsistente
3. **Race Conditions**: UPDATE/INSERT separados podem criar duplicatas
4. **Falta de Validação Pós-Salvamento**: Dados podem ser salvos mas não verificados
5. **Complexidade**: Lógica de salvamento duplicada em vários lugares

## ✅ Solução Proposta: Repository Pattern

### 1. **Repository Pattern**
- **Única fonte de verdade** para operações de banco
- **Encapsula toda lógica** de acesso ao banco
- **Garante consistência** de dados
- **Usa UPSERT** para evitar race conditions
- **Valida tipos** antes de salvar

### 2. **Arquitetura Proposta**

```
┌─────────────────────────────────────────────────┐
│           ROUTES (Hono Handlers)                │
│  - routes-chat.ts                               │
│  - routes-whatsapp-evolution.ts                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│        REPOSITORY LAYER                         │
│  repositories/channel-config-repository.ts      │
│  - findByOrganizationId()                       │
│  - upsert()                                     │
│  - deleteByOrganizationId()                     │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│        DATABASE LAYER                           │
│  Supabase Client (Service Role Key)             │
│  - organization_channel_config table            │
│  - RLS Policies                                 │
│  - Triggers (updated_at)                        │
└─────────────────────────────────────────────────┘
```

### 3. **Benefícios**

✅ **Fonte Única de Verdade**: Todo código usa o mesmo Repository
✅ **Atomicidade**: UPSERT garante que não há race conditions
✅ **Validação**: Valida tipos antes de salvar
✅ **Testabilidade**: Repository pode ser testado isoladamente
✅ **Manutenibilidade**: Mudanças em um só lugar
✅ **Verificação Pós-Salvamento**: Confirma que dados foram persistidos

### 4. **Implementação**

#### 4.1. Repository (`channel-config-repository.ts`)
```typescript
class ChannelConfigRepository {
  // Busca configuração
  async findByOrganizationId(organizationId: string): Promise<ChannelConfigDB | null>
  
  // Salva ou atualiza (UPSERT)
  async upsert(config: ChannelConfigDB): Promise<UpsertResult>
  
  // Deleta configuração
  async deleteByOrganizationId(organizationId: string): Promise<boolean>
}
```

#### 4.2. Uso no Route Handler
```typescript
// ANTES (atual - complexo, propenso a erros)
const { data: existing } = await client.from('...').select('...').eq('...');
if (existing) {
  await client.from('...').update(...);
} else {
  await client.from('...').insert(...);
}

// DEPOIS (limpo, assertivo)
const result = await channelConfigRepository.upsert(dbData);
if (!result.success) {
  return c.json(errorResponse(result.error), 500);
}
```

### 5. **Próximos Passos**

1. ✅ Criar Repository (`repositories/channel-config-repository.ts`)
2. ⏳ Refatorar `PATCH /channels/config` para usar Repository
3. ⏳ Refatorar `GET /channels/config` para usar Repository
4. ⏳ Refatorar `loadChannelConfigFromDB()` para usar Repository
5. ⏳ Remover todas as implementações diretas de UPDATE/INSERT
6. ⏳ Adicionar testes de integração

## 🎯 Garantias

Com essa arquitetura, garantimos:

1. **Uma única fonte de verdade** para operações de banco
2. **Atomicidade** nas operações (UPSERT)
3. **Validação** de tipos antes de salvar
4. **Verificação** pós-salvamento para garantir persistência
5. **Manutenibilidade** - mudanças em um só lugar
6. **Testabilidade** - Repository pode ser testado isoladamente

## 📝 Observações Importantes

- **Service Role Key**: Repository usa Service Role Key, garantindo acesso sem RLS bloqueando
- **UPSERT**: Usa `onConflict: 'organization_id'` para garantir atomicidade
- **Validação**: Valida `organization_id` como string antes de salvar
- **Verificação**: Verifica dados salvos imediatamente após UPSERT
- **Logs**: Logs detalhados em cada etapa para debugging

