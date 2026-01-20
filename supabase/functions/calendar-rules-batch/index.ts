// calendar-rules-batch/index.ts
// ============================================================================
// EDGE FUNCTION: Batch de Regras do Calendário
// ============================================================================
//
// CRIADO: 2026-01-06 (commit 178ce7d)
// CHAMADO POR: hooks/useCalendarPricingRules.ts (flushQueue)
//
// PROPÓSITO:
// Processar múltiplas operações (upsert/delete) de regras de calendário
// em uma única requisição HTTP, reduzindo latência e overhead de conexão.
//
// LIMITES:
// - MAX_BATCH_SIZE: 500 operações por request
// - UPSERT_BATCH_SIZE: 100 operações por query (interno)
//
// SEGURANÇA:
// - Requer token JWT válido (Authorization header)
// - Verifica organization_id do usuário
// - Operações restritas à organização do usuário
//
// DEPLOY:
// npx supabase functions deploy calendar-rules-batch --project-ref odcgnzfremrqnvtitpcc
//
// TESTE LOCAL:
// npx supabase functions serve calendar-rules-batch
//
// PAYLOAD ESPERADO:
// {
//   "operations": [
//     { "type": "upsert", "property_id": "uuid", "date": "2026-01-06", "min_nights": 3 },
//     { "type": "delete", "id": "rule-uuid", "property_id": "uuid", "date": "2026-01-07" }
//   ]
// }
//
// RESPOSTA:
// {
//   "success": true,
//   "processed": 2,
//   "failed": 0,
//   "errors": [],
//   "results": [{ "index": 0, "id": "uuid", "action": "updated" }, ...]
// }
//
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

// ============================================================================
// TYPES
// ============================================================================

interface BatchOperation {
  type: 'upsert' | 'delete';
  id?: string; // Para updates/deletes
  property_id: string;
  organization_id?: string;
  // Suporte a ambos formatos: date (1 dia) ou start_date+end_date (range)
  date?: string; // YYYY-MM-DD - converte para start_date=end_date=date
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  // Campos opcionais para upsert
  base_price?: number;
  min_nights?: number;
  condition_percent?: number;
  restriction?: string;
  notes?: string;
}

interface BatchRequest {
  operations: BatchOperation[];
  organization_id?: string;
}

interface BatchResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
  results: Array<{ index: number; id: string; action: 'inserted' | 'updated' | 'deleted' }>;
}

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-auth-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ============================================================================
// SESSION VALIDATION (custom token from sessions table)
// ============================================================================

interface SessionData {
  user_id: string;
  organization_id: string;
}

async function validateCustomToken(token: string, supabase: any): Promise<SessionData | null> {
  if (!token || token.length < 30) {
    return null;
  }
  
  try {
    // Query sessions table for valid session
    const { data: session, error } = await supabase
      .from('sessions')
      .select('user_id, organization_id')
      .or(`token.eq.${token},access_token.eq.${token}`)
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error || !session) {
      console.log('[calendar-rules-batch] Session not found for token:', token.substring(0, 20) + '...');
      return null;
    }
    
    return {
      user_id: session.user_id,
      organization_id: session.organization_id,
    };
  } catch (err) {
    console.error('[calendar-rules-batch] Error validating token:', err);
    return null;
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client first (needed for session validation)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // ========================================================================
    // AUTHENTICATION: Use custom token from X-Auth-Token header (sessions table)
    // ========================================================================
    let token = req.headers.get('x-auth-token');
    
    // Fallback to Authorization header (strip Bearer prefix)
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        token = authHeader.replace('Bearer ', '');
      }
    }
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing authentication token (x-auth-token or authorization header)' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate token against sessions table
    const sessionData = await validateCustomToken(token, supabase);
    
    if (!sessionData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = sessionData.organization_id;
    console.log('[calendar-rules-batch] Authenticated user:', sessionData.user_id, 'org:', organizationId);

    // ========================================================================
    // READ MODE (GET): list rules for org with optional filters
    // ========================================================================
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const propertyId = url.searchParams.get('property_id');
      const idsParam = url.searchParams.get('ids');

      let query = supabase
        .from('calendar_pricing_rules')
        .select('*')
        .eq('organization_id', organizationId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      if (idsParam) {
        const ids = idsParam.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
        if (ids.length > 0) {
          query = query.in('id', ids);
        }
      }

      if (from && to) {
        query = query.lte('start_date', to).gte('end_date', from);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: data || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only accept POST for writes
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: BatchRequest = await req.json();
    
    if (!body.operations || !Array.isArray(body.operations)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: operations array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit batch size to prevent abuse
    const MAX_BATCH_SIZE = 500;
    if (body.operations.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ error: `Batch size exceeds limit of ${MAX_BATCH_SIZE}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process operations
    const result: BatchResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
      results: [],
    };

    // Group operations by type for efficiency
    const upsertOps: Array<{ index: number; data: any }> = [];
    const deleteOps: Array<{ index: number; id: string }> = [];

    for (let i = 0; i < body.operations.length; i++) {
      const op = body.operations[i];

      // Validate required fields
      if (!op.property_id) {
        result.errors.push({ index: i, error: 'Missing property_id' });
        result.failed++;
        continue;
      }

      // Normalizar datas: aceitar date OU start_date+end_date
      const startDate = op.start_date || op.date;
      const endDate = op.end_date || op.date;
      
      if (!startDate || !endDate) {
        result.errors.push({ index: i, error: 'Missing date (use date or start_date+end_date)' });
        result.failed++;
        continue;
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        result.errors.push({ index: i, error: 'Invalid date format, expected YYYY-MM-DD' });
        result.failed++;
        continue;
      }

      if (op.type === 'delete') {
        if (!op.id) {
          result.errors.push({ index: i, error: 'Delete requires id' });
          result.failed++;
          continue;
        }
        deleteOps.push({ index: i, id: op.id });
      } else {
        // Upsert operation
        upsertOps.push({
          index: i,
          data: {
            property_id: op.property_id,
            organization_id: organizationId,
            start_date: startDate,
            end_date: endDate,
            base_price: op.base_price,
            min_nights: op.min_nights,
            condition_percent: op.condition_percent,
            restriction: op.restriction,
            updated_at: new Date().toISOString(),
          },
        });
      }
    }

    // Process deletes in batch
    if (deleteOps.length > 0) {
      const idsToDelete = deleteOps.map(d => d.id);
      const { error: deleteError } = await supabase
        .from('calendar_pricing_rules')
        .delete()
        .in('id', idsToDelete)
        .eq('organization_id', organizationId);

      if (deleteError) {
        // Mark all deletes as failed
        for (const d of deleteOps) {
          result.errors.push({ index: d.index, error: deleteError.message });
          result.failed++;
        }
      } else {
        for (const d of deleteOps) {
          result.results.push({ index: d.index, id: d.id, action: 'deleted' });
          result.processed++;
        }
      }
    }

    // Process upserts in batches of 100
    // 🔒 RENDIZY_STABLE_TAG v1.0.103.600 (2026-01-15): merge parcial por coluna (não apagar outras regras)
    const UPSERT_BATCH_SIZE = 100;
     for (let i = 0; i < upsertOps.length; i += UPSERT_BATCH_SIZE) {
       const batch = upsertOps.slice(i, i + UPSERT_BATCH_SIZE);

       for (const b of batch) {
         const updateData: Record<string, unknown> = {
           updated_at: new Date().toISOString(),
         };

         if (typeof b.data.base_price !== 'undefined') updateData.base_price = b.data.base_price;
         if (typeof b.data.min_nights !== 'undefined') updateData.min_nights = b.data.min_nights;
         if (typeof b.data.condition_percent !== 'undefined') updateData.condition_percent = b.data.condition_percent;
         if (typeof b.data.restriction !== 'undefined') updateData.restriction = b.data.restriction;
         if (typeof b.data.notes !== 'undefined') updateData.notes = b.data.notes;

         const { data: updatedRows, error: updateError } = await supabase
           .from('calendar_pricing_rules')
           .update(updateData)
           .eq('organization_id', b.data.organization_id)
           .eq('property_id', b.data.property_id)
           .eq('start_date', b.data.start_date)
           .eq('end_date', b.data.end_date)
           .select('id')
           .limit(1);

         if (updateError) {
           result.errors.push({ index: b.index, error: updateError.message });
           result.failed++;
           continue;
         }

         if (updatedRows && updatedRows.length > 0) {
           result.results.push({ index: b.index, id: updatedRows[0].id, action: 'updated' });
           result.processed++;
           continue;
         }

         const insertData: Record<string, unknown> = {
           property_id: b.data.property_id,
           organization_id: b.data.organization_id,
           start_date: b.data.start_date,
           end_date: b.data.end_date,
           updated_at: new Date().toISOString(),
         };

         if (typeof b.data.base_price !== 'undefined') insertData.base_price = b.data.base_price;
         if (typeof b.data.min_nights !== 'undefined') insertData.min_nights = b.data.min_nights;
         if (typeof b.data.condition_percent !== 'undefined') insertData.condition_percent = b.data.condition_percent;
         if (typeof b.data.restriction !== 'undefined') insertData.restriction = b.data.restriction;
         if (typeof b.data.notes !== 'undefined') insertData.notes = b.data.notes;

         const { data: insertedData, error: insertError } = await supabase
           .from('calendar_pricing_rules')
           .insert(insertData)
           .select('id')
           .limit(1);

         if (insertError) {
           result.errors.push({ index: b.index, error: insertError.message });
           result.failed++;
           continue;
         }

         result.results.push({ index: b.index, id: insertedData?.[0]?.id || '', action: 'inserted' });
         result.processed++;
       }
    }

    // Set overall success flag
    result.success = result.failed === 0;

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('calendar-rules-batch error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
