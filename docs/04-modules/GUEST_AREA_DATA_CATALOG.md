# Catálogo de Dados — Guest Area (Hóspede)

> Foco: **dados do hóspede**, isolados do painel admin.

## ✅ Endpoints usados

### Sessão
- `GET /api/auth/me?siteSlug=...`
- `POST /api/auth/google`
- `POST /api/auth/logout`

### Reservas do hóspede
- `GET /api/guest/reservations/mine?siteSlug=...`

## 📦 Contratos (resumo)

### `Reservation`
```
{
  id: string,
  property_id: string,
  property_name: string,
  property_image?: string,
  check_in: string,
  check_out: string,
  guests: number | { adults?: number; children?: number; infants?: number; total?: number },
  total_price: number,
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed',
  created_at: string
}
```

## ✅ Garantias

- Só retorna reservas do **usuário autenticado**.
- Nunca mistura dados do painel admin.
- `siteSlug` sempre obrigatório para escopo multi-tenant.

## 🔄 Persistência

- Sessão em cookie httpOnly (BFF)
- `siteSlug` persistido em `localStorage` para navegação direta no `/guest-area/#/...`

