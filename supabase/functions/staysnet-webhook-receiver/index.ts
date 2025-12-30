import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'

import { saveStaysNetWebhookDB, markWebhookProcessedDB } from '../rendizy-server/staysnet-db.ts'
import { processPendingStaysNetWebhooksForOrg } from '../rendizy-server/routes-staysnet-webhooks.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function isHexString(value: string): boolean {
  return /^[0-9a-f]+$/i.test(value)
}

function bytesFromHex(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase()
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length')
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return new Uint8Array(sig)
}

async function verifyStaysNetWebhookSignature(provided: string, secret: string, rawBodyText: string): Promise<boolean> {
  const raw = String(provided || '').trim()
  if (!raw) throw new Error('empty_signature')

  // Aceitar formatos comuns: "sha256=<hex>", "hmac-sha256=<hex/base64>", ou apenas valor.
  const cleaned = raw.replace(/^sha256=/i, '').replace(/^hmac-sha256=/i, '').trim()

  const computed = await hmacSha256(secret, rawBodyText)

  // Comparar como hex ou base64 conforme input.
  if (isHexString(cleaned)) {
    const expected = bytesFromHex(cleaned)
    return constantTimeEqual(expected, computed)
  }

  // Base64 (ou outro formato): tentar base64 estrito.
  const expectedB64 = bytesFromBase64(cleaned)
  return constantTimeEqual(expectedB64, computed)
}

function extractOrganizationIdFromPath(url: URL): string | null {
  // Expected:
  //  - /<orgId>
  //  - /webhook/<orgId>
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0]
  if (parts.length >= 2 && parts[0].toLowerCase() === 'webhook') return parts[1]
  return parts[parts.length - 1]
}

serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ ok: false, error: 'Method Not Allowed' }, 405)
  }

  try {
    const url = new URL(req.url)
    const organizationId = extractOrganizationIdFromPath(url)
    if (!organizationId) return json({ ok: false, error: 'organizationId is required' }, 400)

    const clientId = req.headers.get('x-stays-client-id') || null
    const signature = req.headers.get('x-stays-signature') || null

    const rawText = req.method === 'GET' ? '{}' : await req.text()

    let body: unknown = rawText
    try {
      body = JSON.parse(rawText)
    } catch {
      // keep as string
    }

    const bodyObj = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null
    const action = bodyObj ? String(bodyObj.action ?? 'unknown') : 'unknown'
    const payload = bodyObj ? (('payload' in bodyObj ? bodyObj.payload : undefined) ?? bodyObj) : body
    const dt = bodyObj ? ('_dt' in bodyObj ? bodyObj._dt : null) : null

    const verifyEnabled = String(Deno.env.get('STAYSNET_WEBHOOK_VERIFY_SIGNATURE') || '').trim().toLowerCase() === 'true'
    const webhookSecret = String(Deno.env.get('STAYSNET_WEBHOOK_SECRET') || '').trim()

    let signatureVerified: boolean | null = null
    let signatureReason: string | null = null
    if (verifyEnabled) {
      if (!webhookSecret) {
        signatureVerified = null
        signatureReason = 'verify_enabled_but_secret_missing'
      } else if (!signature) {
        signatureVerified = false
        signatureReason = 'missing_signature_header'
      } else {
        try {
          signatureVerified = await verifyStaysNetWebhookSignature(signature, webhookSecret, rawText)
          signatureReason = signatureVerified ? 'ok' : 'mismatch'
        } catch (e: unknown) {
          signatureVerified = false
          signatureReason = (e instanceof Error ? e.message : String(e)) || 'verification_error'
        }
      }
    }

    const save = await saveStaysNetWebhookDB(organizationId, action, payload, {
      received_dt: dt,
      headers: {
        'x-stays-client-id': clientId,
        'x-stays-signature': signature,
        'user-agent': req.headers.get('user-agent') || null,
      },
      signature_verification: {
        enabled: verifyEnabled,
        verified: signatureVerified,
        reason: signatureReason,
      },
    })

    if (!save.success) {
      return json({ ok: false, error: save.error || 'Failed to save webhook' }, 500)
    }

    // If verification is enabled and fails, mark as processed (so cron doesn't keep retrying) and return error.
    if (verifyEnabled) {
      if (!webhookSecret) {
        await markWebhookProcessedDB(save.id!, 'Signature verify enabled but secret missing')
        return json({ ok: false, error: 'Webhook signature verification misconfigured' }, 500)
      }
      if (!signature) {
        await markWebhookProcessedDB(save.id!, 'Missing x-stays-signature')
        return json({ ok: false, error: 'Missing webhook signature' }, 401)
      }
      if (signatureVerified === false) {
        await markWebhookProcessedDB(save.id!, 'Invalid webhook signature')
        return json({ ok: false, error: 'Invalid webhook signature' }, 401)
      }
    }

    // 🚀 Best-effort realtime: processar imediatamente alguns webhooks pendentes da organização.
    // Observação: aqui não temos ExecutionContext.waitUntil; então rodamos um processamento curto.
    const realtimeEnabled = String(Deno.env.get('STAYSNET_WEBHOOK_REALTIME_PROCESS') || 'true')
      .trim()
      .toLowerCase() === 'true'
    const realtimeLimit = Math.max(1, Math.min(25, Number(Deno.env.get('STAYSNET_WEBHOOK_REALTIME_LIMIT') || 5)))
    if (realtimeEnabled) {
      try {
        await processPendingStaysNetWebhooksForOrg(organizationId, realtimeLimit)
      } catch (e: any) {
        // Não falhar o receiver por causa do processamento; o cron pode consumir depois.
        console.error('[StaysNet Webhook Receiver] realtime process failed:', e?.message || String(e))
      }
    }

    return json({ ok: true, received: true, id: save.id })
  } catch (e: unknown) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
