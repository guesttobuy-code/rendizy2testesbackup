// calendar-rules-batch/index.ts
// Edge Function para processar múltiplas regras de calendário em uma única requisição
// Otimizado para cenários de alto volume (1000+ imobiliárias, 100+ clientes cada)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2';

// ============================================================================
// TYPES
// ============================================================================

interface BatchOperation {
  type: 'upsert' | 'delete';
  id?: string; // Para updates/deletes
  property_id: string;
  organization_id?: string;
  date: string; // YYYY-MM-DD
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Get user's organization
    const { data: userData, error: orgError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (orgError || !userData?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User organization not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = userData.organization_id;

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
      if (!op.property_id || !op.date) {
        result.errors.push({ index: i, error: 'Missing property_id or date' });
        result.failed++;
        continue;
      }

      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(op.date)) {
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
            date: op.date,
            base_price: op.base_price,
            min_nights: op.min_nights,
            condition_percent: op.condition_percent,
            restriction: op.restriction,
            notes: op.notes,
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
    const UPSERT_BATCH_SIZE = 100;
    for (let i = 0; i < upsertOps.length; i += UPSERT_BATCH_SIZE) {
      const batch = upsertOps.slice(i, i + UPSERT_BATCH_SIZE);
      const dataToUpsert = batch.map(b => b.data);

      const { data: upsertedData, error: upsertError } = await supabase
        .from('calendar_pricing_rules')
        .upsert(dataToUpsert, {
          onConflict: 'property_id,date',
          ignoreDuplicates: false,
        })
        .select('id, property_id, date');

      if (upsertError) {
        // Mark batch as failed
        for (const b of batch) {
          result.errors.push({ index: b.index, error: upsertError.message });
          result.failed++;
        }
      } else {
        // Match results back to original indexes
        for (let j = 0; j < batch.length; j++) {
          const original = batch[j];
          const matchedResult = upsertedData?.find(
            r => r.property_id === original.data.property_id && r.date === original.data.date
          );

          if (matchedResult) {
            result.results.push({
              index: original.index,
              id: matchedResult.id,
              action: 'updated', // Upsert treats inserts as updates
            });
            result.processed++;
          } else {
            result.errors.push({ index: original.index, error: 'No result returned' });
            result.failed++;
          }
        }
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
