/**
 * ROTAS: Anúncios Ultimate V2
 * Gerenciamento completo de anúncios com sistema de drafts e publicação
 */

import { Hono } from "npm:hono";
import { getSupabaseClient } from "./kv_store.tsx";
import { getTenant, isSuperAdmin, tenancyMiddleware } from "./utils-tenancy.ts";
import { getOrganizationIdForRequest, RENDIZY_MASTER_ORG_ID } from './utils-multi-tenant.ts';

const app = new Hono();

const SETTINGS_KIND = 'settings';
const SETTINGS_KEY_LOCATIONS_LISTINGS = 'locations_listings';

app.use('*', tenancyMiddleware);

async function resolveOrgId(c: any): Promise<string> {
  // ✅ REGRA MESTRE (multi-tenant): nunca retornar dados sem organization_id.
  // Superadmin: por padrão, sempre usa org master (RENDIZY_MASTER_ORG_ID).
  // Usuário normal: org vem da sessão/token.
  return await getOrganizationIdForRequest(c);
}

function resolveUserId(c: any): string {
  const tenant = getTenant(c);
  return tenant.userId;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function defaultLocationsListingsSettings() {
  return {
    defaultView: 'individual',
    showInactiveProperties: false,
    compactMode: false,
    locationCodePrefix: 'LOC',
    propertyCodePrefix: 'PROP',
    listingCodePrefix: 'LIST',
    requiredFields: {
      location: {
        description: true,
        address: true,
        photos: true,
        amenities: false,
      },
      property: {
        description: true,
        address: true,
        photos: true,
        amenities: true,
        pricing: true,
      },
      listing: {
        description: true,
        photos: true,
        amenities: true,
        pricing: true,
      },
    },
    photoSettings: {
      minPhotos: 3,
      maxPhotos: 50,
      maxSizeInMB: 5,
      requireCoverPhoto: true,
    },
    validation: {
      requireApproval: false,
      autoPublish: true,
      allowDuplicateNames: false,
    },
    amenitiesSettings: {
      showCategoryIcons: true,
      allowCustomAmenities: true,
      inheritLocationAmenities: true,
    },
    customDescriptionFields: [],
  };
}

async function findSettingsRow(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  settingsKey: string,
) {
  const { data, error } = await supabase
    .from('properties')
    .select('id,data,organization_id,user_id,created_at,updated_at')
    .eq('organization_id', organizationId)
    .eq('data->>__kind', SETTINGS_KIND)
    .eq('data->>__settings_key', settingsKey)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║ 🚨🚨🚨 ZONA CRÍTICA - ROTA DE LISTAGEM DE ANÚNCIOS 🚨🚨🚨                     ║
// ║                                                                              ║
// ║ REGRAS DE BLOQUEIO PARA AI/COPILOT:                                          ║
// ║ 1. NÃO adicionar filtros que possam excluir anúncios válidos                 ║
// ║ 2. NÃO alterar a query .eq('organization_id', organizationId)                ║
// ║ 3. NÃO remover campos do select (id,data,status,organization_id...)          ║
// ║ 4. NÃO alterar o filtro de __kind (exclusão de settings)                     ║
// ║ 5. NÃO adicionar .limit() sem motivo explícito                               ║
// ║                                                                              ║
// ║ SE PRECISAR ALTERAR: Peça confirmação explícita ao usuário primeiro!         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
/**
 * GET /anuncios-ultimate/lista
 * Lista todos os anúncios drafts com todos os campos necessários para o calendário
 * IMPORTANTE: Esta rota DEVE vir ANTES de /:id para não ser capturada como ID
 */
app.get("/lista", async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await resolveOrgId(c);
    
    // 🔒 PROTEÇÃO: Log obrigatório para diagnóstico - NÃO REMOVER
    console.log(`🔒 [ZONA_CRITICA] /lista chamada para org: ${organizationId}`);

    const { data, error } = await supabase
      // ✅ Tabela oficial do sistema: properties (NÃO existe anuncios_drafts)
      .from("properties")
      .select("id,data,status,organization_id,user_id,owner_contact_id,created_at,updated_at,cleaning_responsibility,maintenance_responsibility")
      .eq('organization_id', organizationId)
      // Excluir registros internos de settings (mantém anúncios normais onde __kind é NULL)
      .or(`data->>__kind.is.null,data->>__kind.neq.${SETTINGS_KIND}`)
      // Ordenação estável (frontend ordena por título localmente)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });

    if (error) {
      console.error("❌ [ZONA_CRITICA] Erro ao listar anúncios:", error);
      return c.json({ error: "list_failed", details: error }, 500);
    }

    // 🔒 PROTEÇÃO: Log obrigatório - NÃO REMOVER
    console.log(`🔒 [ZONA_CRITICA] ${data?.length || 0} anúncios encontrados para org ${organizationId}`);
    return c.json({ ok: true, anuncios: data || [] });
  } catch (err: any) {
    console.error("❌ [ZONA_CRITICA] Erro interno:", err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

/**
 * GET /anuncios-ultimate/settings/locations-listings
 * Carrega configurações do módulo "Locais e Anúncios".
 * Persistência: registro dedicado em properties.data com __kind='settings'.
 */
app.get('/settings/locations-listings', async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    const orgId = await resolveOrgId(c);
    const row = await findSettingsRow(supabase, orgId, SETTINGS_KEY_LOCATIONS_LISTINGS);
    const settings = (row?.data as any)?.settings || defaultLocationsListingsSettings();
    return c.json({ ok: true, organization_id: orgId, settings });
  } catch (err: any) {
    console.error('❌ [settings/locations-listings] Erro:', err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

/**
 * POST /anuncios-ultimate/settings/locations-listings
 * Salva configurações do módulo "Locais e Anúncios".
 */
app.post('/settings/locations-listings', async (c) => {
  try {
    const body = await c.req.json();
    const supabase = getSupabaseClient(c);

    const tenantOrgId = await resolveOrgId(c);
    const tenantUserId = resolveUserId(c);

    // ✅ Compat: superadmin pode especificar org/user (já existia), mas imobiliária não.
    const orgId = isSuperAdmin(c) ? (body?.organization_id || tenantOrgId) : tenantOrgId;
    const userId = isSuperAdmin(c) ? (body?.user_id || tenantUserId) : tenantUserId;
    const settings = body?.settings;

    if (!settings || typeof settings !== 'object') {
      return c.json({ error: 'settings_required' }, 400);
    }

    const existing = await findSettingsRow(supabase, orgId, SETTINGS_KEY_LOCATIONS_LISTINGS);
    const dataPayload = {
      __kind: SETTINGS_KIND,
      __settings_key: SETTINGS_KEY_LOCATIONS_LISTINGS,
      settings,
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('properties')
        .update({ data: dataPayload, user_id: userId })
        .eq('id', existing.id)
        .select('id,data,organization_id,user_id,updated_at')
        .maybeSingle();

      if (error) {
        console.error('❌ [settings/locations-listings] update failed:', error);
        return c.json({ error: 'update_failed', details: error }, 500);
      }

      return c.json({ ok: true, record: data });
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({ organization_id: orgId, user_id: userId, data: dataPayload })
      .select('id,data,organization_id,user_id,created_at,updated_at')
      .single();

    if (error) {
      console.error('❌ [settings/locations-listings] insert failed:', error);
      return c.json({ error: 'insert_failed', details: error }, 500);
    }

    return c.json({ ok: true, record: data });
  } catch (err: any) {
    console.error('❌ [settings/locations-listings] Erro interno:', err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

/**
 * GET /anuncios-ultimate/:id
 * Busca um anúncio por ID (busca em drafts primeiro)
 */
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!isUuid(id)) {
      return c.json({ error: 'invalid_id' }, 400);
    }
    const supabase = getSupabaseClient(c);
    const organizationId = await resolveOrgId(c);

    const { data, error } = await supabase
      // ✅ Tabela canônica: properties
      .from("properties")
      .select("id, data, organization_id, user_id, status, created_at, updated_at")
      .eq("id", id)
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      console.error("❌ Erro ao buscar anúncio:", error);
      return c.json({ error: "not_found" }, 404);
    }

    console.log("✅ Anúncio encontrado:", data);
    return c.json({ ok: true, anuncio: data });
  } catch (err: any) {
    console.error("❌ Erro interno:", err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

/**
 * POST /anuncios-ultimate/create
 * Cria um novo anúncio draft
 */
app.post("/create", async (c) => {
  try {
    const body = await c.req.json();
    const supabase = getSupabaseClient(c);

    const organizationId = await resolveOrgId(c);
    const userId = resolveUserId(c);
    const { id, initial = {} } = body || {};

    if (id != null && !isUuid(id)) {
      return c.json({ error: 'invalid_id' }, 400);
    }

    if (initial != null && typeof initial !== 'object') {
      return c.json({ error: 'initial_must_be_object' }, 400);
    }

    const payload: any = {
      ...(id ? { id } : {}),
      organization_id: organizationId,
      user_id: userId,
      data: initial,
      // O frontend usa status (draft/active/inactive). Mantemos draft como default.
      status: "draft",
    };

    const { data, error } = await supabase
      .from("properties")
      .insert(payload)
      .select('id, data, organization_id, user_id, status, created_at, updated_at')
      .single();

    if (error) {
      console.error("❌ Erro ao criar anúncio:", error);
      return c.json({ error: "insert_failed", details: error }, 500);
    }

    console.log("✅ Anúncio criado:", data);
    return c.json({ ok: true, anuncio: data });
  } catch (err: any) {
    console.error("❌ Erro interno:", err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

/**
 * POST /anuncios-ultimate/save-field
 * Salva um campo do anúncio (usa RPC save_anuncio_field)
 */
app.post("/save-field", async (c) => {
  try {
    const body = await c.req.json();
    const supabase = getSupabaseClient(c);

    console.log("📥 [save-field] Recebido:", body);

    const {
      anuncio_id,
      field,
      value,
      idempotency_key,
    } = body;

    if (!field) {
      return c.json({ error: "field_required" }, 400);
    }

    const organizationId = await resolveOrgId(c);
    const userId = resolveUserId(c);

    // Chama RPC wrapper V1→V2
    // IMPORTANTE: A assinatura correta é: (p_anuncio_id, p_organization_id, p_user_id, p_field, p_value)
    const { data, error } = await supabase.rpc("save_anuncio_field", {
      p_anuncio_id: anuncio_id || null,
      p_organization_id: organizationId,
      p_user_id: userId,
      p_field: field,
      p_value: value === undefined ? null : value,
    });

    if (error) {
      console.error("❌ [save-field] Erro RPC:", error);
      return c.json(
        { error: "rpc_failed", status: 500, details: error },
        500
      );
    }

    const result = Array.isArray(data) ? data[0] || null : data;
    console.log("✅ [save-field] Salvo com sucesso:", result);

    // ------------------------------------------------------------------------
    // 🧾 Ensure audit row exists (defensive)
    // ------------------------------------------------------------------------
    // Why: migrations evolved to V2 wrappers; if DB-side logging regresses,
    // we still want idempotency/audit for the UI and forensics.
    try {
      const resultId = (result as any)?.id ?? anuncio_id ?? null;
      const idem = (idempotency_key || null) as string | null;
      if (resultId && idem) {
        const { data: auditRows, error: auditErr } = await supabase
          .from('anuncios_field_changes')
          .select('id')
          .eq('idempotency_key', idem)
          .limit(1);

        if (auditErr) {
          console.warn('⚠️ [save-field] audit select failed:', auditErr);
        } else if (!auditRows || auditRows.length === 0) {
          const { error: insErr } = await supabase
            .from('anuncios_field_changes')
            .insert({
              anuncio_id: resultId,
              field,
              value: value === undefined ? null : value,
              idempotency_key: idem,
            });
          if (insErr) {
            console.warn('⚠️ [save-field] audit insert failed:', insErr);
          } else {
            console.log('✅ [save-field] audit row inserted (fallback):', {
              anuncio_id: resultId,
              idempotency_key: idem,
              field,
            });
          }
        }
      }
    } catch (auditCatch) {
      console.warn('⚠️ [save-field] audit fallback threw:', auditCatch);
    }

    // ------------------------------------------------------------------------
    // 🔁 REMOVIDO: Sync para tabela `properties` (2026-01-06)
    // A tabela `properties` foi depreciada e removida.
    // Todos os dados de propriedades agora ficam apenas em `properties`.
    // ------------------------------------------------------------------------

    return c.json({ ok: true, anuncio: result });
  } catch (err: any) {
    console.error("❌ [save-field] Erro interno:", err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

/**
 * PATCH /anuncios-ultimate/:id
 * Atualiza campos do registro (sem permitir trocar organization_id/user_id).
 */
app.patch('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) {
      return c.json({ error: 'invalid_id' }, 400);
    }
    const body = await c.req.json().catch(() => ({}));
    const supabase = getSupabaseClient(c);
    const organizationId = await resolveOrgId(c);

    const deepMerge = (base: any, patch: any): any => {
      if (patch === null || patch === undefined) return base;
      if (Array.isArray(patch)) return patch;
      if (typeof patch !== 'object') return patch;
      if (Array.isArray(base)) return patch;
      const out: any = { ...(base && typeof base === 'object' ? base : {}) };
      for (const [k, v] of Object.entries(patch)) {
        const bv = (out as any)[k];
        if (v && typeof v === 'object' && !Array.isArray(v) && bv && typeof bv === 'object' && !Array.isArray(bv)) {
          (out as any)[k] = deepMerge(bv, v);
        } else {
          (out as any)[k] = v;
        }
      }
      return out;
    };

    const update: any = {
      updated_at: new Date().toISOString(),
    };

    // IMPORTANT: never overwrite properties.data with a partial object.
    // Always merge server-side to prevent accidental loss of unrelated keys.
    if (body?.data && typeof body.data === 'object') {
      const { data: current, error: curErr } = await supabase
        .from('properties')
        .select('id,data')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (curErr) {
        console.error('❌ [PATCH /:id] failed to load current data:', curErr);
        return c.json({ error: 'load_current_failed', details: curErr }, 500);
      }
      if (!current) {
        return c.json({ error: 'not_found' }, 404);
      }

      update.data = deepMerge((current as any).data ?? {}, body.data);
    }
    if (typeof body?.status === 'string') update.status = body.status;
    // Suporte a owner_contact_id (vínculo com proprietário no CRM)
    if (body?.owner_contact_id !== undefined) {
      update.owner_contact_id = body.owner_contact_id; // pode ser UUID ou null
    }
    // Atualiza user_id para rastrear autoria da última alteração (não permite trocar org)
    update.user_id = resolveUserId(c);

    const { data, error } = await supabase
      .from('properties')
      .update(update)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('id, data, organization_id, user_id, owner_contact_id, status, created_at, updated_at')
      .maybeSingle();

    if (error || !data) {
      console.error('❌ [PATCH /:id] Erro ao atualizar anúncio:', error);
      return c.json({ error: 'update_failed', details: error }, 500);
    }

    // ------------------------------------------------------------------------
    // 🔁 REMOVIDO: Sync para tabela `properties` (2026-01-06)
    // A tabela `properties` foi depreciada e removida.
    // Todos os dados de propriedades agora ficam apenas em `properties`.
    // ------------------------------------------------------------------------

    return c.json({ ok: true, anuncio: data });
  } catch (err: any) {
    console.error('❌ [PATCH /:id] Erro interno:', err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

/**
 * DELETE /anuncios-ultimate/:id
 * Exclui anúncio do tenant.
 */
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    if (!isUuid(id)) {
      return c.json({ error: 'invalid_id' }, 400);
    }
    const supabase = getSupabaseClient(c);
    const organizationId = await resolveOrgId(c);

    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      console.error('❌ [DELETE /:id] Erro ao excluir anúncio:', error);
      return c.json({ error: 'delete_failed', details: error }, 500);
    }

    return c.json({ ok: true });
  } catch (err: any) {
    console.error('❌ [DELETE /:id] Erro interno:', err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

export default app;
