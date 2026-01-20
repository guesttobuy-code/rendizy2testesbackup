/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  📊 RECONCILIAÇÃO DE RESERVAS — v1.0.112                                     ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Este módulo implementa a RECONCILIAÇÃO BIDIRECIONAL de reservas entre       ║
 * ║  fontes externas (Stays.net, Airbnb, Booking.com) e o Rendizy.               ║
 * ║                                                                              ║
 * ║  🎯 OBJETIVO PRINCIPAL:                                                      ║
 * ║  Garantir que o Rendizy seja a "single source of truth" consolidada,         ║
 * ║  mas sempre VALIDANDO contra as fontes externas.                             ║
 * ║                                                                              ║
 * ║  📚 DOCUMENTAÇÃO:                                                            ║
 * ║  - docs/ADR_RESERVATION_RECONCILIATION.md                                    ║
 * ║  - docs/ADR_STAYSNET_WEBHOOK_REFERENCE.md                                    ║
 * ║                                                                              ║
 * ║  🔒 REGRAS CANÔNICAS:                                                        ║
 * ║  1. Reserva sem property_id NÃO EXISTE (skip + log issue)                    ║
 * ║  2. Reserva que não existe na fonte = ÓRFÃ (marcar para revisão)             ║
 * ║  3. external_id é a chave canônica de identidade (org, platform, ext_id)     ║
 * ║  4. Cancelamentos SEMPRE propagam (fonte→Rendizy)                            ║
 * ║  5. Criações SEMPRE validam existência na fonte                              ║
 * ║                                                                              ║
 * ║  🚀 USO:                                                                     ║
 * ║  - CRON: Executa reconciliação periódica (hourly)                            ║
 * ║  - WEBHOOK: Valida antes de persistir                                        ║
 * ║  - MANUAL: Endpoint para admin forçar reconciliação                          ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { getSupabaseClient } from './kv_store.tsx';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';

// ============================================================================
// TIPOS
// ============================================================================

export interface ReconciliationResult {
  success: boolean;
  stats: {
    totalScanned: number;
    validatedOk: number;
    orphansDetected: number;
    orphansCancelled: number;
    errorsFromSource: number;
    alreadyCancelled: number;
  };
  orphanReservations: OrphanReservation[];
  errors: string[];
}

export interface OrphanReservation {
  id: string;
  external_id: string | null;
  staysnet_reservation_code: string | null;
  property_id: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
  platform: string | null;
  reason: string;
  action_taken: 'cancelled' | 'flagged' | 'none';
}

export interface ValidationResult {
  valid: boolean;
  existsInSource: boolean;
  sourceStatus: string | null;
  sourceCancelled: boolean;
  error: string | null;
}

// ============================================================================
// CLIENTE STAYS.NET (reutilizável)
// ============================================================================

class StaysNetClientReconciliation {
  private apiKey: string;
  private apiSecret?: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string, apiSecret?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.apiSecret) {
      const credentials = `${this.apiKey}:${this.apiSecret}`;
      const base64 = btoa(credentials);
      headers['Authorization'] = `Basic ${base64}`;
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async getReservation(reservationId: string): Promise<{ success: boolean; data?: any; error?: string; notFound?: boolean }> {
    const url = `${this.baseUrl}/booking/reservations/${encodeURIComponent(reservationId)}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return { success: false, notFound: true, error: 'Reservation not found in source' };
      }

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${text}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  }

  async listReservations(params: { checkInFrom?: string; checkInTo?: string; limit?: number }): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const queryParams = new URLSearchParams();
    if (params.checkInFrom) queryParams.set('checkInFrom', params.checkInFrom);
    if (params.checkInTo) queryParams.set('checkInTo', params.checkInTo);
    if (params.limit) queryParams.set('limit', String(params.limit));
    
    const url = `${this.baseUrl}/booking/reservations?${queryParams.toString()}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `HTTP ${response.status}: ${text}` };
      }

      const data = await response.json();
      const items = Array.isArray(data) ? data : (data?.items || data?.reservations || []);
      return { success: true, data: items };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  }
}

// ============================================================================
// VALIDAÇÃO DE RESERVA INDIVIDUAL
// ============================================================================

/**
 * Valida se uma reserva existe na fonte externa.
 * 
 * REGRA: Se a reserva não existe mais na fonte (404), ela é considerada ÓRFÃ.
 * Reservas órfãs devem ser canceladas ou flagadas para revisão.
 */
export async function validateReservationExistsInSource(
  organizationId: string,
  reservationExternalId: string | null,
  platform: string | null,
): Promise<ValidationResult> {
  // Só validamos reservas que têm external_id e platform conhecida
  if (!reservationExternalId) {
    return {
      valid: false,
      existsInSource: false,
      sourceStatus: null,
      sourceCancelled: false,
      error: 'No external_id to validate',
    };
  }

  // Por agora, só implementamos validação para Stays.net
  if (platform !== 'staysnet' && platform !== 'stays' && platform !== 'direct') {
    // Para outras plataformas, assumimos válido (não temos API para validar)
    return {
      valid: true,
      existsInSource: true,
      sourceStatus: null,
      sourceCancelled: false,
      error: null,
    };
  }

  try {
    const config = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    const client = new StaysNetClientReconciliation(config.apiKey, config.baseUrl, config.apiSecret);
    
    const result = await client.getReservation(reservationExternalId);
    
    if (result.notFound) {
      return {
        valid: false,
        existsInSource: false,
        sourceStatus: null,
        sourceCancelled: false,
        error: 'Reservation does not exist in Stays.net',
      };
    }
    
    if (!result.success) {
      return {
        valid: false,
        existsInSource: false,
        sourceStatus: null,
        sourceCancelled: false,
        error: result.error || 'Failed to validate with source',
      };
    }

    const sourceData = result.data;
    const sourceStatus = String(sourceData?.status || sourceData?.type || '').toLowerCase();
    const isCancelled = sourceStatus.includes('cancel') || sourceStatus.includes('deleted');

    return {
      valid: true,
      existsInSource: true,
      sourceStatus,
      sourceCancelled: isCancelled,
      error: null,
    };
  } catch (error: any) {
    return {
      valid: false,
      existsInSource: false,
      sourceStatus: null,
      sourceCancelled: false,
      error: error?.message || 'Validation error',
    };
  }
}

// ============================================================================
// RECONCILIAÇÃO COMPLETA
// ============================================================================

/**
 * Executa reconciliação de reservas para uma organização.
 * 
 * FLUXO:
 * 1. Lista reservas ativas do Rendizy (confirmed, pending, checked_in)
 * 2. Para cada reserva, valida se existe na fonte
 * 3. Se não existe → marca como órfã e cancela
 * 4. Se existe mas está cancelada na fonte → cancela no Rendizy
 * 
 * @param organizationId - ID da organização
 * @param options - Opções de execução
 */
export async function reconcileReservations(
  organizationId: string,
  options: {
    limit?: number;
    autoCancelOrphans?: boolean;
    checkInFrom?: string;
    checkInTo?: string;
  } = {},
): Promise<ReconciliationResult> {
  const supabase = getSupabaseClient();
  const limit = Math.min(options.limit || 100, 500);
  const autoCancelOrphans = options.autoCancelOrphans ?? true;

  const result: ReconciliationResult = {
    success: true,
    stats: {
      totalScanned: 0,
      validatedOk: 0,
      orphansDetected: 0,
      orphansCancelled: 0,
      errorsFromSource: 0,
      alreadyCancelled: 0,
    },
    orphanReservations: [],
    errors: [],
  };

  try {
    // Query reservas ativas (não canceladas)
    let query = supabase
      .from('reservations')
      .select('id, external_id, staysnet_reservation_code, property_id, check_in, check_out, status, platform, staysnet_raw')
      .eq('organization_id', organizationId)
      .in('status', ['confirmed', 'pending', 'checked_in'])
      .order('check_in', { ascending: true })
      .limit(limit);

    // Filtros opcionais de data
    if (options.checkInFrom) {
      query = query.gte('check_in', options.checkInFrom);
    }
    if (options.checkInTo) {
      query = query.lte('check_in', options.checkInTo);
    }

    const { data: reservations, error: queryError } = await query;

    if (queryError) {
      result.success = false;
      result.errors.push(`Failed to query reservations: ${queryError.message}`);
      return result;
    }

    result.stats.totalScanned = reservations?.length || 0;

    // Processa cada reserva
    for (const reservation of (reservations || [])) {
      const externalId = reservation.external_id || reservation.staysnet_reservation_code;
      const platform = reservation.platform || 'staysnet';

      // Se não tem external_id, não conseguimos validar na fonte
      if (!externalId) {
        // Verificar se tem dados no staysnet_raw para extrair ID
        const raw = reservation.staysnet_raw;
        const rawId = raw?._id || raw?.id || raw?.reservationId;
        
        if (!rawId) {
          // Reserva sem identificador externo - potencialmente criada manualmente
          result.stats.validatedOk++;
          continue;
        }
      }

      // Valida na fonte
      const validation = await validateReservationExistsInSource(
        organizationId,
        externalId,
        platform,
      );

      // Se houve erro de comunicação, não cancela (pode ser problema temporário)
      if (validation.error && !validation.existsInSource && validation.error !== 'Reservation does not exist in Stays.net') {
        result.stats.errorsFromSource++;
        result.errors.push(`Reservation ${externalId}: ${validation.error}`);
        continue;
      }

      // Reserva não existe na fonte → ÓRFÃ
      if (!validation.existsInSource) {
        result.stats.orphansDetected++;
        
        const orphan: OrphanReservation = {
          id: reservation.id,
          external_id: reservation.external_id,
          staysnet_reservation_code: reservation.staysnet_reservation_code,
          property_id: reservation.property_id,
          check_in: reservation.check_in,
          check_out: reservation.check_out,
          status: reservation.status,
          platform: reservation.platform,
          reason: 'Reservation does not exist in source (404)',
          action_taken: 'none',
        };

        if (autoCancelOrphans) {
          const { error: cancelError } = await supabase
            .from('reservations')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: 'RECONCILIATION: Reservation not found in source system (orphan)',
            })
            .eq('organization_id', organizationId)
            .eq('id', reservation.id);

          if (cancelError) {
            orphan.action_taken = 'none';
            result.errors.push(`Failed to cancel orphan ${reservation.id}: ${cancelError.message}`);
          } else {
            orphan.action_taken = 'cancelled';
            result.stats.orphansCancelled++;
          }
        } else {
          orphan.action_taken = 'flagged';
        }

        result.orphanReservations.push(orphan);
        continue;
      }

      // Reserva existe mas está cancelada na fonte → propagar cancelamento
      if (validation.sourceCancelled && reservation.status !== 'cancelled') {
        const { error: cancelError } = await supabase
          .from('reservations')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'RECONCILIATION: Cancelled in source system',
          })
          .eq('organization_id', organizationId)
          .eq('id', reservation.id);

        if (cancelError) {
          result.errors.push(`Failed to propagate cancellation for ${reservation.id}: ${cancelError.message}`);
        } else {
          result.stats.alreadyCancelled++;
        }
        continue;
      }

      // Reserva válida e ativa em ambos os sistemas
      result.stats.validatedOk++;
    }

    return result;
  } catch (error: any) {
    result.success = false;
    result.errors.push(error?.message || 'Unknown reconciliation error');
    return result;
  }
}

// ============================================================================
// RECONCILIAÇÃO REVERSA (fonte → Rendizy)
// ============================================================================

/**
 * Busca reservas na fonte que NÃO existem no Rendizy.
 * Útil para detectar reservas que foram criadas na fonte mas falharam no webhook.
 * 
 * @param organizationId - ID da organização
 * @param checkInFrom - Data inicial de check-in
 * @param checkInTo - Data final de check-in
 */
export async function findMissingReservationsFromSource(
  organizationId: string,
  checkInFrom: string,
  checkInTo: string,
): Promise<{ success: boolean; missing: any[]; error?: string }> {
  const supabase = getSupabaseClient();
  
  try {
    const config = await loadStaysNetRuntimeConfigOrThrow(organizationId);
    const client = new StaysNetClientReconciliation(config.apiKey, config.baseUrl, config.apiSecret);
    
    // Busca reservas na Stays.net
    const sourceResult = await client.listReservations({
      checkInFrom,
      checkInTo,
      limit: 500,
    });

    if (!sourceResult.success) {
      return { success: false, missing: [], error: sourceResult.error };
    }

    const sourceReservations = sourceResult.data || [];
    const missing: any[] = [];

    // Para cada reserva da fonte, verifica se existe no Rendizy
    for (const sourceRes of sourceReservations) {
      const sourceId = sourceRes?._id || sourceRes?.id;
      if (!sourceId) continue;

      // Busca no Rendizy por external_id
      const { data: existingRes } = await supabase
        .from('reservations')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('external_id', String(sourceId))
        .maybeSingle();

      if (!existingRes) {
        missing.push({
          source_id: sourceId,
          confirmation_code: sourceRes?.id || sourceRes?.confirmationCode,
          check_in: sourceRes?.checkInDate || sourceRes?.checkIn,
          check_out: sourceRes?.checkOutDate || sourceRes?.checkOut,
          status: sourceRes?.status || sourceRes?.type,
          listing_id: sourceRes?._idlisting || sourceRes?.propertyId,
        });
      }
    }

    return { success: true, missing };
  } catch (error: any) {
    return { success: false, missing: [], error: error?.message || 'Unknown error' };
  }
}

// ============================================================================
// VALIDAÇÃO PRE-PERSIST (usar antes de salvar novas reservas)
// ============================================================================

/**
 * Valida uma reserva ANTES de persistir no banco.
 * 
 * REGRAS APLICADAS:
 * 1. property_id é OBRIGATÓRIO
 * 2. external_id deve ser único por (org, platform)
 * 3. check_in < check_out
 * 4. Se vem de webhook, valida existência na fonte
 * 
 * @param reservationData - Dados da reserva a validar
 * @param organizationId - ID da organização
 * @param validateInSource - Se deve validar existência na fonte (default: false)
 */
export async function validateReservationBeforePersist(
  reservationData: any,
  organizationId: string,
  validateInSource: boolean = false,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const supabase = getSupabaseClient();

  // 1. property_id obrigatório
  if (!reservationData.property_id) {
    errors.push('property_id is required - reservations cannot exist without a property');
  }

  // 2. Datas válidas
  if (!reservationData.check_in) {
    errors.push('check_in date is required');
  }
  if (!reservationData.check_out) {
    errors.push('check_out date is required');
  }
  if (reservationData.check_in && reservationData.check_out) {
    const checkIn = new Date(reservationData.check_in);
    const checkOut = new Date(reservationData.check_out);
    if (checkIn >= checkOut) {
      errors.push('check_in must be before check_out');
    }
  }

  // 3. external_id único (se estiver criando nova)
  if (reservationData.external_id && !reservationData.id) {
    const { data: existing } = await supabase
      .from('reservations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('platform', reservationData.platform || 'direct')
      .eq('external_id', reservationData.external_id)
      .maybeSingle();

    if (existing) {
      // Não é erro, mas deve usar upsert ao invés de insert
      console.warn(`[Validation] Reservation already exists with external_id=${reservationData.external_id}`);
    }
  }

  // 4. Validação na fonte (opcional, para webhooks)
  if (validateInSource && reservationData.external_id) {
    const validation = await validateReservationExistsInSource(
      organizationId,
      reservationData.external_id,
      reservationData.platform,
    );

    if (!validation.existsInSource && !validation.error?.includes('No external_id')) {
      errors.push(`Reservation does not exist in source system: ${validation.error || 'not found'}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
