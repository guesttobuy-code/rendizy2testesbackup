# 🔧 PROMPT 4: Refinamento Geral Multi-Tenant

**Status:** ⚠️ **PENDENTE**  
**Prioridade:** 🔴 **ALTA**

---

## 📋 PROMPT COMPLETO PARA CURSOR

```
Varra todas as rotas de backend que acessam dados de propriedades, reservas e bloqueios e garanta que, se o usuário for imobiliaria, os selects sempre tenham filtro por imobiliariaId. Use o tenancyMiddleware para extrair o contexto.

Siga este padrão em todas as rotas:

1. Aplicar tenancyMiddleware no grupo de rotas (no index.ts):
   app.use('/make-server-67caf26a/reservations/*', tenancyMiddleware);
   app.use('/make-server-67caf26a/blocks/*', tenancyMiddleware);
   app.use('/make-server-67caf26a/guests/*', tenancyMiddleware);
   app.use('/make-server-67caf26a/calendar/*', tenancyMiddleware);

2. Em cada função de rota, usar getTenant(c):
   const tenant = getTenant(c);
   
3. Filtrar por imobiliariaId se não for superadmin:
   if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
     // Filtrar dados por tenant.imobiliariaId
   } else if (isSuperAdmin(c)) {
     // Ver tudo (sem filtro)
   }

4. Verificar permissões em operações de update/delete:
   - Antes de atualizar/deletar, verificar se o registro pertence à imobiliária
   - Se não pertencer, retornar 403 Forbidden

5. Associar imobiliariaId em operações de create:
   - Ao criar novo registro, associar com tenant.imobiliariaId
   - Se não tiver imobiliariaId, retornar erro

Arquivos a atualizar:
- supabase/functions/rendizy-server/routes-reservations.ts
- supabase/functions/rendizy-server/routes-blocks.ts
- supabase/functions/rendizy-server/routes-guests.ts
- supabase/functions/rendizy-server/routes-calendar.ts
- supabase/functions/rendizy-server/routes-properties.ts (completar filtros)
- supabase/functions/rendizy-server/index.ts (aplicar middlewares)
```

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### 1. Routes-Reservations.ts

- [ ] Aplicar `tenancyMiddleware` no `index.ts`
- [ ] Atualizar `listReservations`:
  - [ ] Usar `getTenant(c)`
  - [ ] Filtrar por `imobiliariaId` se não for superadmin
  - [ ] Filtrar propriedades antes de buscar reservas
- [ ] Atualizar `getReservation`:
  - [ ] Verificar se reserva pertence à imobiliária
  - [ ] Retornar 403 se não pertencer
- [ ] Atualizar `createReservation`:
  - [ ] Associar com `tenant.imobiliariaId`
  - [ ] Verificar se propriedade pertence à imobiliária
- [ ] Atualizar `updateReservation`:
  - [ ] Verificar se reserva pertence à imobiliária
  - [ ] Retornar 403 se não pertencer
- [ ] Atualizar `deleteReservation`:
  - [ ] Verificar se reserva pertence à imobiliária
  - [ ] Retornar 403 se não pertencer

---

### 2. Routes-Blocks.ts

- [ ] Aplicar `tenancyMiddleware` no `index.ts`
- [ ] Atualizar `listBlocks`:
  - [ ] Usar `getTenant(c)`
  - [ ] Filtrar por `imobiliariaId` se não for superadmin
- [ ] Atualizar `getBlock`:
  - [ ] Verificar se bloqueio pertence à imobiliária
  - [ ] Retornar 403 se não pertencer
- [ ] Atualizar `createBlock`:
  - [ ] Associar com `tenant.imobiliariaId`
  - [ ] Verificar se propriedade pertence à imobiliária
- [ ] Atualizar `updateBlock`:
  - [ ] Verificar se bloqueio pertence à imobiliária
  - [ ] Retornar 403 se não pertencer
- [ ] Atualizar `deleteBlock`:
  - [ ] Verificar se bloqueio pertence à imobiliária
  - [ ] Retornar 403 se não pertencer

---

### 3. Routes-Guests.ts

- [ ] Aplicar `tenancyMiddleware` no `index.ts`
- [ ] Atualizar `listGuests`:
  - [ ] Usar `getTenant(c)`
  - [ ] Filtrar por `imobiliariaId` se não for superadmin
- [ ] Atualizar `getGuest`:
  - [ ] Verificar se hóspede pertence à imobiliária
  - [ ] Retornar 403 se não pertencer
- [ ] Atualizar `createGuest`:
  - [ ] Associar com `tenant.imobiliariaId`
- [ ] Atualizar `updateGuest`:
  - [ ] Verificar se hóspede pertence à imobiliária
  - [ ] Retornar 403 se não pertencer
- [ ] Atualizar `deleteGuest`:
  - [ ] Verificar se hóspede pertence à imobiliária
  - [ ] Retornar 403 se não pertencer

---

### 4. Routes-Calendar.ts

- [ ] Aplicar `tenancyMiddleware` no `index.ts`
- [ ] Atualizar `getCalendarData`:
  - [ ] Usar `getTenant(c)`
  - [ ] Filtrar propriedades por `imobiliariaId` se não for superadmin
  - [ ] Filtrar reservas e bloqueios por propriedades da imobiliária

---

### 5. Routes-Properties.ts (Completar)

- [ ] Atualizar `getProperty`:
  - [ ] Verificar se propriedade pertence à imobiliária
  - [ ] Retornar 403 se não pertencer
- [ ] Atualizar `createProperty`:
  - [ ] Associar com `tenant.imobiliariaId`
- [ ] Atualizar `updateProperty`:
  - [ ] Verificar se propriedade pertence à imobiliária
  - [ ] Retornar 403 se não pertencer
- [ ] Atualizar `deleteProperty`:
  - [ ] Verificar se propriedade pertence à imobiliária
  - [ ] Retornar 403 se não pertencer

---

## 🔍 EXEMPLO DE IMPLEMENTAÇÃO

### Exemplo 1: Listar Reservas

```typescript
export async function listReservations(c: Context) {
  try {
    // ✅ Usar tenancyMiddleware (aplicado no index.ts)
    const tenant = getTenant(c);
    
    logInfo(`Listing reservations for tenant: ${tenant.username} (${tenant.type})`);

    // Buscar todas as reservas
    let allReservations = await kv.getByPrefix<Reservation>('reservation:');
    
    // ✅ FILTRO MULTI-TENANT: Se for imobiliária, filtrar por imobiliariaId
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      // Buscar propriedades da imobiliária
      const allProperties = await kv.getByPrefix<Property>('property:');
      const imobiliariaProperties = allProperties.filter(
        p => p.imobiliariaId === tenant.imobiliariaId
      );
      const propertyIds = new Set(imobiliariaProperties.map(p => p.id));
      
      // Filtrar reservas por propriedades da imobiliária
      allReservations = allReservations.filter(r => propertyIds.has(r.propertyId));
      
      logInfo(`Filtered ${allReservations.length} reservations for imobiliaria ${tenant.imobiliariaId}`);
    } else if (isSuperAdmin(c)) {
      logInfo(`SuperAdmin viewing all ${allReservations.length} reservations`);
    }
    
    // ... resto da lógica
  } catch (error) {
    // ...
  }
}
```

### Exemplo 2: Criar Reserva

```typescript
export async function createReservation(c: Context) {
  try {
    const tenant = getTenant(c);
    const body = await c.req.json();
    
    // ✅ Verificar se propriedade pertence à imobiliária
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      const property = await kv.get<Property>(`property:${body.propertyId}`);
      
      if (!property || property.imobiliariaId !== tenant.imobiliariaId) {
        return c.json(
          { success: false, error: 'Propriedade não encontrada ou não pertence à sua imobiliária' },
          403
        );
      }
    }
    
    // Criar reserva
    const reservation: Reservation = {
      id: generateId('res'),
      propertyId: body.propertyId,
      // ✅ Associar com imobiliariaId se existir
      imobiliariaId: tenant.imobiliariaId,
      // ... outros campos
    };
    
    await kv.set(`reservation:${reservation.id}`, reservation);
    
    return c.json({ success: true, data: reservation }, 201);
  } catch (error) {
    // ...
  }
}
```

### Exemplo 3: Atualizar Reserva

```typescript
export async function updateReservation(c: Context) {
  try {
    const tenant = getTenant(c);
    const reservationId = c.req.param('id');
    
    const reservation = await kv.get<Reservation>(`reservation:${reservationId}`);
    
    if (!reservation) {
      return c.json({ success: false, error: 'Reserva não encontrada' }, 404);
    }
    
    // ✅ Verificar se reserva pertence à imobiliária
    if (tenant.type === 'imobiliaria' && tenant.imobiliariaId) {
      if (reservation.imobiliariaId !== tenant.imobiliariaId) {
        return c.json(
          { success: false, error: 'Reserva não pertence à sua imobiliária' },
          403
        );
      }
    }
    
    // Atualizar reserva
    // ...
  } catch (error) {
    // ...
  }
}
```

---

## ⚠️ PONTOS DE ATENÇÃO

1. **Property não tem imobiliariaId:**
   - ⚠️ Interface `Property` ainda não tem campo `imobiliariaId`
   - ✅ Por enquanto, filtrar por propriedades do usuário (ownerId)
   - ✅ Quando migrar para Postgres, adicionar campo `imobiliariaId`

2. **Compatibilidade:**
   - ✅ Manter compatibilidade com código existente
   - ✅ Não quebrar funcionalidades atuais

3. **Performance:**
   - ⚠️ Filtros em memória com KV Store (OK para início)
   - ✅ Quando migrar para Postgres, usar queries no banco

---

**Status:** ⚠️ Pendente  
**Prioridade:** 🔴 Alta  
**Estimativa:** 2-3 horas de trabalho

