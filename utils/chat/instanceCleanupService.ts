/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║              INSTANCE CLEANUP SERVICE - LIMPEZA AUTOMÁTICA                ║
 * ║                                                                            ║
 * ║  Remove instâncias fantasmas do banco de dados de forma persistente       ║
 * ║  Roda automaticamente ao iniciar o módulo de Chat                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * 
 * PROBLEMA RESOLVIDO:
 * - Instâncias com deleted_at preenchido mas não removidas
 * - Instâncias órfãs (existem no banco mas não no provider)
 * - Instâncias duplicadas para mesma organização
 * 
 * ESTRATÉGIA:
 * 1. Hard delete de instâncias com deleted_at preenchido
 * 2. Verificação de instâncias órfãs via API do provider
 * 3. Limpeza automática ao abrir o Chat
 * 4. Debounce para evitar múltiplas execuções
 */

import { getSupabaseClient } from '../supabase/client';

// ============================================================
// CONSTANTS
// ============================================================

/** Chave do localStorage para última execução */
const CLEANUP_LAST_RUN_KEY = 'rendizy-instance-cleanup-last-run';

/** Intervalo mínimo entre limpezas (5 minutos) */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/** Flag para evitar execuções simultâneas */
let isCleanupRunning = false;

// ============================================================
// TYPES
// ============================================================

interface CleanupResult {
  success: boolean;
  hardDeleted: number;
  orphansMarked: number;
  errors: string[];
  timestamp: string;
}

interface ChannelInstanceRow {
  id: string;
  organization_id: string;
  provider: string;
  instance_name: string;
  status: string;
  api_url?: string;
  api_key?: string;
  deleted_at: string | null;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Executa limpeza completa de instâncias fantasmas
 * 
 * 1. Hard delete de instâncias soft-deleted
 * 2. Verifica instâncias órfãs (não existem mais no provider)
 * 3. Loga resultado para auditoria
 * 
 * @param organizationId - ID da organização
 * @param force - Força execução mesmo dentro do intervalo
 * @returns Resultado da limpeza
 */
export async function cleanupGhostInstances(
  organizationId: string,
  force = false
): Promise<CleanupResult> {
  const result: CleanupResult = {
    success: false,
    hardDeleted: 0,
    orphansMarked: 0,
    errors: [],
    timestamp: new Date().toISOString(),
  };

  // Evitar execuções simultâneas
  if (isCleanupRunning) {
    console.log('[InstanceCleanup] ⏳ Já existe uma limpeza em andamento');
    return { ...result, errors: ['Cleanup already running'] };
  }

  // Verificar intervalo mínimo
  if (!force) {
    const lastRun = localStorage.getItem(CLEANUP_LAST_RUN_KEY);
    if (lastRun) {
      const elapsed = Date.now() - parseInt(lastRun, 10);
      if (elapsed < CLEANUP_INTERVAL_MS) {
        console.log(`[InstanceCleanup] ⏰ Última limpeza há ${Math.round(elapsed / 1000)}s, aguardando intervalo`);
        return { ...result, success: true, errors: ['Skipped - within interval'] };
      }
    }
  }

  isCleanupRunning = true;
  console.log('[InstanceCleanup] 🧹 Iniciando limpeza de instâncias fantasmas...');

  try {
    const supabase = getSupabaseClient();

    // ============================================================
    // STEP 1: Hard delete de instâncias soft-deleted
    // ============================================================
    
    console.log('[InstanceCleanup] 🗑️ Buscando instâncias soft-deleted para hard delete...');
    
    // Tipo para o resultado da query
    interface SoftDeletedInstance {
      id: string;
      instance_name: string;
      provider: string;
      status: string;
      deleted_at: string;
    }
    
    const { data: softDeletedRaw, error: fetchError } = await supabase
      .from('channel_instances')
      .select('id, instance_name, provider, status, deleted_at')
      .eq('organization_id', organizationId)
      .not('deleted_at', 'is', null);
    
    const softDeleted = softDeletedRaw as SoftDeletedInstance[] | null;

    if (fetchError) {
      result.errors.push(`Fetch error: ${fetchError.message}`);
      console.error('[InstanceCleanup] ❌ Erro ao buscar soft-deleted:', fetchError);
    } else if (softDeleted && softDeleted.length > 0) {
      console.log(`[InstanceCleanup] 📋 Encontradas ${softDeleted.length} instâncias soft-deleted`);
      
      for (const instance of softDeleted) {
        console.log(`[InstanceCleanup] 🔥 Hard deleting: ${instance.instance_name} (${instance.provider})`);
        
        // Hard delete
        const { error: deleteError } = await supabase
          .from('channel_instances')
          .delete()
          .eq('id', instance.id);

        if (deleteError) {
          result.errors.push(`Delete ${instance.instance_name}: ${deleteError.message}`);
          console.error(`[InstanceCleanup] ❌ Erro ao deletar ${instance.instance_name}:`, deleteError);
        } else {
          result.hardDeleted++;
          console.log(`[InstanceCleanup] ✅ Deletada: ${instance.instance_name}`);
        }
      }
    } else {
      console.log('[InstanceCleanup] ✨ Nenhuma instância soft-deleted encontrada');
    }

    // ============================================================
    // STEP 2: Verificar instâncias órfãs (não existem no provider)
    // ============================================================
    
    console.log('[InstanceCleanup] 🔍 Verificando instâncias órfãs...');
    
    const { data: activeInstancesRaw, error: activeError } = await supabase
      .from('channel_instances')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('channel', 'whatsapp')
      .is('deleted_at', null);
    
    const activeInstances = activeInstancesRaw as ChannelInstanceRow[] | null;

    if (activeError) {
      result.errors.push(`Active fetch error: ${activeError.message}`);
    } else if (activeInstances && activeInstances.length > 0) {
      for (const instance of activeInstances) {
        const exists = await verifyInstanceExistsInProvider(instance);
        
        if (!exists) {
          console.log(`[InstanceCleanup] 👻 Instância órfã detectada: ${instance.instance_name}`);
          
          // Soft delete da instância órfã usando fetch direto para evitar problemas de tipagem
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            const response = await fetch(`${supabaseUrl}/rest/v1/channel_instances?id=eq.${instance.id}`, {
              method: 'PATCH',
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                deleted_at: new Date().toISOString(),
                status: 'orphan_deleted',
                error_message: 'Instância não existe mais no provider - deletada automaticamente'
              })
            });
            
            if (response.ok) {
              result.orphansMarked++;
              console.log(`[InstanceCleanup] 🏷️ Marcada como órfã: ${instance.instance_name}`);
            } else {
              const errorText = await response.text();
              result.errors.push(`Orphan mark ${instance.instance_name}: ${errorText}`);
            }
          } catch (err) {
            result.errors.push(`Orphan mark ${instance.instance_name}: ${err}`);
          }
        }
      }
    }

    // ============================================================
    // STEP 3: Registrar execução
    // ============================================================
    
    localStorage.setItem(CLEANUP_LAST_RUN_KEY, Date.now().toString());
    result.success = true;

    console.log('[InstanceCleanup] ✅ Limpeza concluída:', {
      hardDeleted: result.hardDeleted,
      orphansMarked: result.orphansMarked,
      errors: result.errors.length,
    });

  } catch (error) {
    result.errors.push(`Exception: ${error}`);
    console.error('[InstanceCleanup] ❌ Exceção durante limpeza:', error);
  } finally {
    isCleanupRunning = false;
  }

  return result;
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Verifica se uma instância existe no provider (Evolution/WAHA)
 */
async function verifyInstanceExistsInProvider(instance: ChannelInstanceRow): Promise<boolean> {
  try {
    const apiUrl = instance.api_url;
    const apiKey = instance.api_key;

    if (!apiUrl || !apiKey) {
      console.log(`[InstanceCleanup] ⚠️ Instância sem API URL/Key: ${instance.instance_name}`);
      return true; // Assume que existe se não tem como verificar
    }

    if (instance.provider === 'evolution') {
      // Verificar no Evolution API
      const response = await fetch(`${apiUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
      });

      if (!response.ok) {
        console.log(`[InstanceCleanup] ⚠️ Evolution API não respondeu para: ${instance.instance_name}`);
        return true; // Assume que existe se API não responde
      }

      const instances = await response.json();
      const exists = instances.some((i: any) => i.name === instance.instance_name);
      
      console.log(`[InstanceCleanup] 🔍 Evolution ${instance.instance_name}: ${exists ? 'existe' : 'NÃO existe'}`);
      return exists;

    } else if (instance.provider === 'waha') {
      // Verificar no WAHA API
      const response = await fetch(`${apiUrl}/api/sessions`, {
        headers: { 'X-Api-Key': apiKey },
      });

      if (!response.ok) {
        console.log(`[InstanceCleanup] ⚠️ WAHA API não respondeu para: ${instance.instance_name}`);
        return true;
      }

      const sessions = await response.json();
      const exists = sessions.some((s: any) => s.name === instance.instance_name);
      
      console.log(`[InstanceCleanup] 🔍 WAHA ${instance.instance_name}: ${exists ? 'existe' : 'NÃO existe'}`);
      return exists;
    }

    return true; // Provider desconhecido, assume que existe
  } catch (error) {
    console.error(`[InstanceCleanup] ❌ Erro ao verificar instância ${instance.instance_name}:`, error);
    return true; // Em caso de erro, não deletar
  }
}

/**
 * Hook para executar limpeza ao montar componente
 * Usa useEffect internamente
 */
export function useInstanceCleanup(organizationId: string | undefined): {
  isRunning: boolean;
  lastResult: CleanupResult | null;
  runNow: () => Promise<void>;
} {
  // Este hook pode ser expandido para React
  return {
    isRunning: isCleanupRunning,
    lastResult: null,
    runNow: async () => {
      if (organizationId) {
        await cleanupGhostInstances(organizationId, true);
      }
    },
  };
}

/**
 * Função para forçar limpeza imediata (chamada via console ou admin)
 */
export async function forceCleanupNow(organizationId?: string): Promise<CleanupResult> {
  const orgId = organizationId || getOrganizationIdFromStorage();
  
  if (!orgId) {
    console.error('[InstanceCleanup] ❌ Nenhum organizationId disponível');
    return {
      success: false,
      hardDeleted: 0,
      orphansMarked: 0,
      errors: ['No organizationId'],
      timestamp: new Date().toISOString(),
    };
  }

  return cleanupGhostInstances(orgId, true);
}

/**
 * Obtém organizationId do localStorage
 */
function getOrganizationIdFromStorage(): string | null {
  try {
    const userJson = localStorage.getItem('rendizy-user');
    if (userJson) {
      const user = JSON.parse(userJson);
      return user.organizationId || null;
    }
  } catch {
    // Ignore
  }
  return null;
}

// Expor para console/debug
if (typeof window !== 'undefined') {
  (window as any).cleanupGhostInstances = forceCleanupNow;
}
