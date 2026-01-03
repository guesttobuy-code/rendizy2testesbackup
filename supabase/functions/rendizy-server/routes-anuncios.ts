/**
 * ROTAS: Anúncios Ultimate V2
 * Gerenciamento completo de anúncios com sistema de drafts e publicação
 */

import { Hono } from "npm:hono";
import { getSupabaseClient } from "./kv_store.tsx";

const app = new Hono();

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';
const SETTINGS_KIND = 'settings';
const SETTINGS_KEY_LOCATIONS_LISTINGS = 'locations_listings';

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
    .from('anuncios_ultimate')
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

/**
 * GET /anuncios-ultimate/lista
 * Lista todos os anúncios drafts com todos os campos necessários para o calendário
 * IMPORTANTE: Esta rota DEVE vir ANTES de /:id para não ser capturada como ID
 */
app.get("/lista", async (c) => {
  try {
    const supabase = getSupabaseClient(c);

    const { data, error } = await supabase
      .from("anuncios_ultimate")
      .select("*")
      // Não retornar registros internos de settings/config
      .neq('data->>__kind', SETTINGS_KIND)
      // Ordenação fixa (não muda ao editar/atualizar): alfabética por título + desempate por id
      .order("title", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });

    if (error) {
      console.error("❌ Erro ao listar anúncios:", error);
      return c.json({ error: "list_failed", details: error }, 500);
    }

    console.log(`✅ ${data?.length || 0} anúncios encontrados no banco`);
    return c.json({ ok: true, anuncios: data || [] });
  } catch (err: any) {
    console.error("❌ Erro interno:", err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

/**
 * GET /anuncios-ultimate/settings/locations-listings
 * Carrega configurações do módulo "Locais e Anúncios".
 * Persistência: registro dedicado em anuncios_ultimate.data com __kind='settings'.
 */
app.get('/settings/locations-listings', async (c) => {
  try {
    const supabase = getSupabaseClient(c);
    const orgId = c.req.query('organization_id') || DEFAULT_ORG_ID;
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

    const orgId = body?.organization_id || DEFAULT_ORG_ID;
    const userId = body?.user_id || DEFAULT_USER_ID;
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
        .from('anuncios_ultimate')
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
      .from('anuncios_ultimate')
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
    const supabase = getSupabaseClient(c);

    // Busca em anuncios_ultimate
    const { data, error } = await supabase
      .from("anuncios_ultimate")
      .select("id, data, organization_id, user_id, status, completion_percentage, step_completed, title, created_at, updated_at")
      .eq("id", id)
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

    const { organization_id, user_id, initial = {} } = body;

    const payload: any = {
      data: initial,
      status: "draft",
      completion_percentage: 0,
      step_completed: 1,
      title: initial.title || "Sem título",
    };

    if (organization_id) payload.organization_id = organization_id;
    if (user_id) payload.user_id = user_id;

    const { data, error } = await supabase
      .from("anuncios_ultimate")
      .insert(payload)
      .select()
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
      organization_id,
      user_id,
    } = body;

    if (!field) {
      return c.json({ error: "field_required" }, 400);
    }

    // Chama RPC wrapper V1→V2
    const { data, error } = await supabase.rpc("save_anuncio_field", {
      p_anuncio_id: anuncio_id || null,
      p_field: field,
      p_value: value === undefined ? null : value,
      p_idempotency_key: idempotency_key || null,
      p_organization_id: organization_id || null,
      p_user_id: user_id || null,
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

    return c.json({ ok: true, anuncio: result });
  } catch (err: any) {
    console.error("❌ [save-field] Erro interno:", err);
    return c.json({ error: err?.message || String(err) }, 500);
  }
});

export default app;
