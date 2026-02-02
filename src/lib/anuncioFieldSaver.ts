// Helper to save anuncio field-by-field using the function wrapper
// Exports: genIdempotencyKey, saveField

type SaveParams = {
  anuncioId?: string | null
  field: string
  value: any
  organizationId?: string | null
  userId?: string | null
  functionUrl?: string // optional override of functions base url
  retries?: number
}

function genIdempotencyKey(anuncioId: string | null | undefined, field: string) {
  try {
    const uuid = (globalThis as any).crypto?.randomUUID?.()
    if (anuncioId) return `${anuncioId}::${field}::${uuid || Date.now()}`
    return `temp::${field}::${Date.now()}::${Math.floor(Math.random() * 10000)}`
  } catch (e) {
    if (anuncioId) return `${anuncioId}::${field}::${Date.now()}`
    return `temp::${field}::${Date.now()}::${Math.floor(Math.random() * 10000)}`
  }
}

async function saveField(params: SaveParams) {
  const {
    anuncioId = null,
    field,
    value,
    organizationId = null,
    userId = null,
    functionUrl,
    retries = 2
  } = params

  const idempotency_key = genIdempotencyKey(anuncioId, field)
  const payload = {
    anuncio_id: anuncioId,
    field,
    value,
    idempotency_key,
    organization_id: organizationId,
    user_id: userId
  }

  const baseUrl = functionUrl || (import.meta.env.VITE_SUPABASE_URL || (window as any).__SUPABASE_URL__)
  const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}/functions/v1/rendizy-server/properties/save-field` : '/functions/v1/rendizy-server/properties/save-field'

  let attempt = 0
  while (attempt <= retries) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        // throw to retry
        throw new Error(JSON.stringify(json) || `HTTP ${res.status}`)
      }
      // success
      return { ok: true, data: json }
    } catch (err) {
      attempt++
      if (attempt > retries) return { ok: false, error: String(err) }
      const backoff = Math.pow(2, attempt) * 200 + Math.random() * 200
      await new Promise(r => setTimeout(r, backoff))
    }
  }
  return { ok: false, error: 'unknown' }
}

export { genIdempotencyKey, saveField }
