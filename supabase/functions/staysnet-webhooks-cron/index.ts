/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🔗 EDGE FUNCTION: staysnet-webhooks-cron                                    ║
 * ║                                                                              ║
 * ║  ⚠️  ATENÇÃO: Esta função IMPORTA código de rendizy-server!                  ║
 * ║                                                                              ║
 * ║  📋 ADR: docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md                 ║
 * ║  📋 ADR: docs/ADR_STAYSNET_WEBHOOK_REFERENCE.md                              ║
 * ║                                                                              ║
 * ║  🚨 REGRA DE DEPLOY OBRIGATÓRIA:                                             ║
 * ║     Sempre que alterar routes-staysnet-webhooks.ts,                          ║
 * ║     DEVE fazer deploy DESTA função também!                                   ║
 * ║                                                                              ║
 * ║  💻 Comando: npm run deploy:webhooks                                         ║
 * ║     (ou manualmente: supabase functions deploy staysnet-webhooks-cron)       ║
 * ║                                                                              ║
 * ║  📅 Última revisão: 2026-01-18                                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { serve } from 'https://deno.land/std@0.201.0/http/server.ts'

import { processPendingStaysNetWebhooksForOrg } from '../rendizy-server/routes-staysnet-webhooks.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function requiredEnv(name: string): string {
  const v = (Deno.env.get(name) || '').trim()
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

function requireCronSecretIfConfigured(req: Request) {
  const secret = (Deno.env.get('STAYSNET_CRON_SECRET') || '').trim()
  if (!secret) return

  const got = (req.headers.get('x-cron-secret') || '').trim()
  if (!got) throw new Error('Missing x-cron-secret')
  if (got !== secret) throw new Error('Invalid x-cron-secret')
}

async function listEnabledOrganizations(supabaseUrl: string, serviceRole: string, limit: number): Promise<string[]> {
  const url = `${supabaseUrl}/rest/v1/staysnet_config?select=organization_id&enabled=eq.true&limit=${limit}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to list staysnet_config: ${res.status} ${text}`)
  }

  const rows = (await res.json()) as Array<{ organization_id?: string }>
  return (rows || []).map((r) => String(r.organization_id || '').trim()).filter(Boolean)
}

async function processOrg(organizationId: string, limit: number) {
  try {
    const stats = await processPendingStaysNetWebhooksForOrg(organizationId, limit)
    return {
      organizationId,
      ok: true,
      status: 200,
      body: stats,
    }
  } catch (e: any) {
    return {
      organizationId,
      ok: false,
      status: 500,
      body: e?.message || String(e),
    }
  }
}

serve(async (req: Request) => {
  // Scheduled functions will call with POST by default, but we accept GET too.
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method Not Allowed' }, 405)
  }

  try {
    // If STAYSNET_CRON_SECRET is configured, only allow calls with matching header.
    requireCronSecretIfConfigured(req)

    const supabaseUrl = requiredEnv('SUPABASE_URL')

    // Compat: vários scripts/ambientes usam nomes diferentes
    const serviceRole =
      (Deno.env.get('SERVICE_ROLE_KEY') ||
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
        Deno.env.get('PRIVATE_SERVICE_ROLE_KEY') ||
        Deno.env.get('RENDIZY_SERVICE_ROLE_KEY') ||
        '').trim()

    if (!serviceRole) {
      throw new Error('Missing service role key (SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY)')
    }

    const orgLimit = Math.max(1, Math.min(200, Number(Deno.env.get('STAYSNET_CRON_MAX_ORGS') || 50)))
    const processLimit = Math.max(1, Math.min(200, Number(Deno.env.get('STAYSNET_PROCESS_LIMIT') || 200)))

    const orgs = await listEnabledOrganizations(supabaseUrl, serviceRole, orgLimit)
    if (orgs.length === 0) {
      return json({ ok: true, processedOrganizations: 0, results: [] })
    }

    const results = [] as any[]
    for (const orgId of orgs) {
      const r = await processOrg(orgId, processLimit)
      results.push(r)
    }

    const okCount = results.filter((r) => r.ok).length
    const failCount = results.length - okCount

    return json({
      ok: failCount === 0,
      processedOrganizations: results.length,
      okCount,
      failCount,
      results,
    })
  } catch (e: any) {
    return json({ ok: false, error: e?.message || String(e) }, 500)
  }
})
