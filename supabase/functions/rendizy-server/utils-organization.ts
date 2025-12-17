/**
 * UTILS - Organization Helpers
 * 
 * Helpers para garantir que organizationId sempre seja válido
 * Implementa fallback seguro quando organizationId é undefined
 * 
 * @version 1.0.103.400
 * @updated 2025-11-17 - Usa tabela organizations do Supabase
 */

import { getSupabaseClient } from "./kv_store.tsx";

/**
 * Obtém organizationId válido com fallback automático
 * 
 * Ordem de prioridade:
 * 1. URL params (/:id, /:orgId)
 * 2. Query params (?organization_id=...)
 * 3. Body (POST/PATCH com organization_id)
 * 4. Primeira organização do banco
 * 5. Criar organização padrão automaticamente
 * 
 * @param c - Context do Hono
 * @param paramName - Nome do parâmetro que contém organizationId (default: 'id')
 * @returns Promise<string> - organizationId válido
 */
export async function ensureOrganizationId(c: any, paramName: string = "id"): Promise<string> {
  try {
    const client = getSupabaseClient();

    // 1) URL params - Parâmetros da rota (/:id, /:orgId)
    const urlParam = c.req.param(paramName) || c.req.param('orgId') || c.req.param('organization_id');
    if (urlParam && urlParam !== "undefined" && urlParam !== "null") {
      console.log(`✅ [ensureOrganizationId] Usando organizationId do URL param: ${urlParam}`);
      return urlParam;
    }

    // 2) Query param - Query string (?organization_id=...)
    const queryParam = c.req.query(paramName) || 
                      c.req.query('organizationId') || 
                      c.req.query('organization_id') ||
                      c.req.query('orgId');
    if (queryParam && queryParam !== "undefined" && queryParam !== "null") {
      console.log(`✅ [ensureOrganizationId] Usando organizationId do query param: ${queryParam}`);
      return queryParam;
    }

    // 3) Body - Body da requisição (POST/PATCH)
    try {
      const body = await c.req.json().catch(() => null);
      if (body && body.organization_id) {
        const bodyId = body.organization_id || body.organizationId || body.orgId;
        if (bodyId && bodyId !== "undefined" && bodyId !== "null") {
          console.log(`✅ [ensureOrganizationId] Usando organizationId do body: ${bodyId}`);
          return bodyId;
        }
      }
    } catch {
      // Ignorar se body não existir ou não for JSON
    }

    // 4) First organization - Primeira organização do banco
    const { data } = await client
      .from("organizations")
      .select("id")
      .limit(1);
    
    if (data && data.length > 0) {
      console.log(`✅ [ensureOrganizationId] Usando primeira organização encontrada: ${data[0].id}`);
      return data[0].id;
    }

    // 5) If none exists, create default - Criar organização padrão
    console.log('⚠️ [ensureOrganizationId] Nenhuma organização encontrada, criando automaticamente...');
    const { data: created, error } = await client
      .from("organizations")
      .insert({
        name: "Default Org",
        slug: crypto.randomUUID(),
        email: "default@rendizy.app"
      })
      .select("id")
      .single();

    if (error || !created) {
      console.error('❌ [ensureOrganizationId] Erro ao criar organização padrão:', error);
      throw new Error('Não foi possível criar uma organização válida');
    }

    console.log(`✅ [ensureOrganizationId] Organização criada automaticamente: ${created.id}`);
    return created.id;

  } catch (error) {
    console.error('❌ [ensureOrganizationId] Erro ao garantir organizationId:', error);
    throw error;
  }
}

/**
 * Valida se organizationId é válido
 * @param organizationId - ID da organização para validar
 * @returns Promise<boolean> - true se válido
 */
export async function validateOrganizationId(organizationId: string | undefined | null): Promise<boolean> {
  if (!organizationId || organizationId === 'undefined' || organizationId === 'null') {
    return false;
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ [validateOrganizationId] Database error:', error);
      return false;
    }

    return !!data;
  } catch {
    return false;
  }
}

