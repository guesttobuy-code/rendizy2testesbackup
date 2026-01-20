# 🚀 ARQUITETURA ESCALÁVEL PARA SAAS MULTI-TENANT

## 📊 Cenário de Escala
- **Milhares de imobiliárias** (organizações)
- **Milhares de propriedades** por organização
- **Milhares de hóspedes** por organização
- **Milhares de reservas** ativas
- **Sistema SaaS** com isolamento completo de dados

## 🏗️ Arquitetura Proposta: 3 Camadas + Cache

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                    │
│              - CDN Global                                │
│              - Edge Caching                              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              API LAYER (Supabase Edge Functions)        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Repository Layer (Data Access)                  │   │
│  │  - ChannelConfigRepository                       │   │
│  │  - PropertyRepository                            │   │
│  │  - ReservationRepository                         │   │
│  │  - GuestRepository                               │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Service Layer (Business Logic)                  │   │
│  │  - Multi-tenant isolation                        │   │
│  │  - Validation                                    │   │
│  │  - Event emission                                │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌──────────────┐            ┌──────────────┐
│   CACHE      │            │   DATABASE   │
│   (Redis)    │            │  (PostgreSQL)│
│              │            │              │
│  - Hot data  │            │  - Primary   │
│  - Sessions  │            │  - Replicas  │
│  - Rate limit│            │  - Partitions│
└──────────────┘            └──────────────┘
```

## 🎯 Princípios Fundamentais

### 1. **Multi-Tenancy com RLS (Row Level Security)**

```sql
-- ✅ CORRETO: RLS Policy por organization_id
CREATE POLICY "tenant_isolation" 
ON properties 
FOR ALL 
USING (organization_id = current_setting('app.current_organization_id', true)::uuid)
WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::uuid);

-- ✅ CORRETO: Índice composto para queries multi-tenant
CREATE INDEX idx_properties_org_status 
ON properties(organization_id, status) 
WHERE deleted_at IS NULL;

-- ✅ CORRETO: Índice para filtros comuns
CREATE INDEX idx_reservations_org_dates 
ON reservations(organization_id, check_in_date, check_out_date) 
WHERE cancelled_at IS NULL;
```

### 2. **Database Design Escalável**

#### 2.1. **Índices Estratégicos**
```sql
-- ✅ Para organization_channel_config
CREATE INDEX idx_channel_config_org ON organization_channel_config(organization_id);

-- ✅ Para properties (filtros comuns)
CREATE INDEX idx_properties_org_status ON properties(organization_id, status);
CREATE INDEX idx_properties_org_location ON properties(organization_id, location_id);
CREATE INDEX idx_properties_org_created ON properties(organization_id, created_at DESC);

-- ✅ Para reservations (queries de calendário)
CREATE INDEX idx_reservations_org_dates 
ON reservations(organization_id, check_in_date, check_out_date) 
WHERE cancelled_at IS NULL;

-- ✅ Para guests (busca)
CREATE INDEX idx_guests_org_email ON guests(organization_id, email);
CREATE INDEX idx_guests_org_phone ON guests(organization_id, phone);
CREATE INDEX idx_guests_org_name ON guests(organization_id, first_name, last_name);
```

#### 2.2. **Soft Deletes (Para Auditoria e Recovery)**
```sql
-- ✅ Todas as tabelas devem ter soft delete
ALTER TABLE properties ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN cancelled_at TIMESTAMPTZ;
ALTER TABLE guests ADD COLUMN deleted_at TIMESTAMPTZ;

-- ✅ Índice para excluir soft-deleted nas queries
CREATE INDEX idx_properties_active 
ON properties(organization_id, status) 
WHERE deleted_at IS NULL;
```

#### 2.3. **Partitioning para Tabelas Grandes** (PostgreSQL 10+)
```sql
-- ✅ Para reservations (pode ter milhões de registros)
CREATE TABLE reservations_2024 PARTITION OF reservations
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE reservations_2025 PARTITION OF reservations
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Benefícios:
-- - Queries mais rápidas (menos dados para escanear)
-- - Maintenance mais fácil (drop old partitions)
-- - Backups mais eficientes
```

### 3. **Repository Pattern Otimizado**

#### 3.1. **Connection Pooling**
```typescript
// ✅ Service Role Key já faz connection pooling no Supabase
// Mas podemos otimizar com configurações específicas
const client = createClient(
  Deno.env.get("SUPABASE_URL") ?? '',
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '',
  {
    db: {
      schema: 'public',
    },
    global: {
      headers: { 'x-organization-id': organizationId },
    },
  }
);
```

#### 3.2. **Paginação Cursor-Based** (Mais eficiente que OFFSET)
```typescript
class PropertyRepository {
  async listByOrganization(
    organizationId: string,
    cursor?: string,
    limit: number = 50
  ): Promise<{ data: Property[]; nextCursor?: string }> {
    const query = this.client
      .from('properties')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('deleted_at', null)
      .order('id', { ascending: true })
      .limit(limit + 1); // +1 para verificar se tem mais
    
    if (cursor) {
      query.gt('id', cursor);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;
    
    return { data: items, nextCursor };
  }
}
```

#### 3.3. **Batch Operations**
```typescript
class ReservationRepository {
  // ✅ Batch insert para múltiplas reservas
  async createBatch(
    reservations: CreateReservationDTO[]
  ): Promise<Reservation[]> {
    // Agrupar por organization_id para otimizar
    const grouped = reservations.reduce((acc, r) => {
      if (!acc[r.organization_id]) acc[r.organization_id] = [];
      acc[r.organization_id].push(r);
      return acc;
    }, {} as Record<string, CreateReservationDTO[]>);
    
    // Processar em paralelo por organização
    const results = await Promise.all(
      Object.entries(grouped).map(([orgId, items]) =>
        this.client
          .from('reservations')
          .insert(items)
          .select()
      )
    );
    
    return results.flatMap(r => r.data || []);
  }
}
```

### 4. **Caching Estratégico**

#### 4.1. **Camadas de Cache**
```typescript
class CachedChannelConfigRepository extends ChannelConfigRepository {
  private cache = new Map<string, { data: ChannelConfigDB; expires: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutos
  
  async findByOrganizationId(organizationId: string): Promise<ChannelConfigDB | null> {
    // ✅ Verificar cache primeiro
    const cached = this.cache.get(organizationId);
    if (cached && cached.expires > Date.now()) {
      console.log(`✅ [Cache HIT] organization: ${organizationId}`);
      return cached.data;
    }
    
    // ✅ Buscar do banco
    const data = await super.findByOrganizationId(organizationId);
    
    if (data) {
      // ✅ Armazenar no cache
      this.cache.set(organizationId, {
        data,
        expires: Date.now() + this.TTL,
      });
    }
    
    return data;
  }
  
  async upsert(config: ChannelConfigDB): Promise<UpsertResult> {
    // ✅ Invalidar cache ao salvar
    this.cache.delete(config.organization_id);
    
    const result = await super.upsert(config);
    
    if (result.success && result.data) {
      // ✅ Atualizar cache com novo valor
      this.cache.set(config.organization_id, {
        data: result.data,
        expires: Date.now() + this.TTL,
      });
    }
    
    return result;
  }
}
```

#### 4.2. **Cache Redis para Produção** (Recomendado)
```typescript
// Para produção: usar Redis ao invés de Map
import { Redis } from "npm:ioredis@5.3.2";

class RedisCachedRepository {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(Deno.env.get("REDIS_URL") ?? "");
  }
  
  async findByOrganizationId(organizationId: string): Promise<ChannelConfigDB | null> {
    // ✅ Verificar Redis
    const cached = await this.redis.get(`config:${organizationId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // ✅ Buscar do banco
    const data = await super.findByOrganizationId(organizationId);
    
    if (data) {
      // ✅ Armazenar no Redis (TTL 5 minutos)
      await this.redis.setex(
        `config:${organizationId}`,
        300,
        JSON.stringify(data)
      );
    }
    
    return data;
  }
}
```

### 5. **Queries Otimizadas**

#### 5.1. **Select Apenas Campos Necessários**
```typescript
// ❌ ERRADO: Selecionar tudo
const { data } = await client
  .from('properties')
  .select('*')
  .eq('organization_id', orgId);

// ✅ CORRETO: Selecionar apenas campos necessários
const { data } = await client
  .from('properties')
  .select('id, name, status, created_at')
  .eq('organization_id', orgId);
```

#### 5.2. **Avoid N+1 Queries**
```typescript
// ❌ ERRADO: N+1 queries
const reservations = await getReservations(orgId);
for (const r of reservations) {
  r.guest = await getGuest(r.guest_id); // N queries!
}

// ✅ CORRETO: Join ou batch fetch
const { data } = await client
  .from('reservations')
  .select(`
    *,
    guest:guests(*)
  `)
  .eq('organization_id', orgId);
```

### 6. **Event-Driven Architecture**

```typescript
// ✅ Para operações pesadas, usar eventos assíncronos
class ReservationService {
  async createReservation(data: CreateReservationDTO): Promise<Reservation> {
    // ✅ Salvar no banco
    const reservation = await this.repository.create(data);
    
    // ✅ Emitir evento assíncrono (não bloquear resposta)
    await this.eventEmitter.emit('reservation.created', {
      reservation_id: reservation.id,
      organization_id: reservation.organization_id,
    });
    
    // ✅ Event handlers processam:
    // - Enviar email de confirmação
    // - Atualizar calendário
    // - Notificar proprietário
    // - Sincronizar com OTAs
    
    return reservation;
  }
}
```

### 7. **Monitoring e Observability**

```typescript
// ✅ Logging estruturado para monitoramento
class InstrumentedRepository {
  async upsert(config: ChannelConfigDB): Promise<UpsertResult> {
    const startTime = Date.now();
    
    try {
      const result = await super.upsert(config);
      
      // ✅ Métricas de performance
      console.log(JSON.stringify({
        type: 'database.operation',
        operation: 'upsert',
        table: 'organization_channel_config',
        organization_id: config.organization_id,
        duration_ms: Date.now() - startTime,
        success: result.success,
      }));
      
      return result;
    } catch (error) {
      // ✅ Log de erros para alertas
      console.error(JSON.stringify({
        type: 'database.error',
        operation: 'upsert',
        table: 'organization_channel_config',
        organization_id: config.organization_id,
        error: error.message,
        duration_ms: Date.now() - startTime,
      }));
      throw error;
    }
  }
}
```

## 📋 Checklist de Implementação

### Fase 1: Fundação (Agora)
- [x] Repository Pattern para `organization_channel_config`
- [ ] Índices estratégicos em todas as tabelas
- [ ] Soft deletes em todas as tabelas
- [ ] RLS policies otimizadas

### Fase 2: Performance (Curto Prazo)
- [ ] Cursor-based pagination em todas as listagens
- [ ] Select apenas campos necessários
- [ ] Evitar N+1 queries
- [ ] Connection pooling otimizado

### Fase 3: Escalabilidade (Médio Prazo)
- [ ] Cache Redis para hot data
- [ ] Partitioning para tabelas grandes (reservations, bookings)
- [ ] Event-driven para operações pesadas
- [ ] Read replicas para queries complexas

### Fase 4: Observability (Longo Prazo)
- [ ] Logging estruturado
- [ ] Métricas de performance
- [ ] Alertas automáticos
- [ ] Database monitoring

## 🎯 Métricas de Sucesso

- **Query Performance**: < 100ms para 95% das queries
- **Cache Hit Rate**: > 80% para hot data
- **Database Connections**: Pooling eficiente
- **API Response Time**: < 500ms para 95% das requisições
- **Concurrent Users**: Suportar 10k+ usuários simultâneos

## 💡 Próximos Passos Imediatos

1. **Refatorar Repository atual** para incluir:
   - Cursor-based pagination
   - Cache em memória (Map) como MVP
   - Logging estruturado

2. **Adicionar índices** em todas as queries comuns:
   - `organization_id` + campos filtrados
   - Soft delete filters

3. **Criar Repositories** para todas as entidades:
   - PropertyRepository
   - ReservationRepository
   - GuestRepository

Posso implementar isso agora!

