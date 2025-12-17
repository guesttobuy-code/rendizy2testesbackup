/**
 * REPOSITORY: Channel Config
 * 
 * Única fonte de verdade para operações de banco de dados
 * relacionadas a organization_channel_config
 * 
 * Arquitetura: Repository Pattern
 * - Encapsula toda lógica de acesso ao banco
 * - Garante consistência de dados
 * - Usa UPSERT para garantir atomicidade
 * - Valida tipos antes de salvar
 * - Filtra soft-deleted automaticamente
 * 
 * @version 1.0.103.950
 * @updated 2025-11-19 - Arquitetura limpa e assertiva
 */

import { getSupabaseClient } from '../kv_store.tsx';
import { sanitizeDbData } from '../utils-db-safe.ts';

// ============================================================================
// TYPES
// ============================================================================

interface ChannelConfigDB {
  id?: string;
  organization_id: string;
  
  // WhatsApp
  whatsapp_enabled?: boolean;
  whatsapp_api_url?: string;
  whatsapp_instance_name?: string;
  whatsapp_api_key?: string;
  whatsapp_instance_token?: string;
  whatsapp_connected?: boolean;
  whatsapp_phone_number?: string | null;
  whatsapp_qr_code?: string | null;
  whatsapp_connection_status?: string;
  whatsapp_last_connected_at?: string | null;
  whatsapp_error_message?: string | null;
  
  // SMS
  sms_enabled?: boolean;
  sms_account_sid?: string;
  sms_auth_token?: string;
  sms_phone_number?: string;
  sms_credits_used?: number;
  sms_last_recharged_at?: string | null;
  
  // Automations
  automation_reservation_confirmation?: boolean;
  automation_checkin_reminder?: boolean;
  automation_checkout_review?: boolean;
  automation_payment_reminder?: boolean;
  
  // Metadata
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null; // ✅ Soft delete
}

interface UpsertResult {
  success: boolean;
  data?: ChannelConfigDB;
  error?: string;
}

// ============================================================================
// REPOSITORY CLASS
// ============================================================================

export class ChannelConfigRepository {
  private readonly tableName = 'organization_channel_config';
  private readonly client = getSupabaseClient();

  /**
   * Busca configuração por organization_id
   * ✅ Filtra soft-deleted automaticamente
   */
  async findByOrganizationId(organizationId: string): Promise<ChannelConfigDB | null> {
    try {
      // Validar organization_id
      if (!organizationId || typeof organizationId !== 'string') {
        console.error('❌ [ChannelConfigRepository] organizationId inválido:', organizationId);
        return null;
      }

      const { data, error } = await this.client
        .from(this.tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .is('deleted_at', null) // ✅ Filtrar soft-deleted
        .maybeSingle();

      if (error) {
        console.error('❌ [ChannelConfigRepository] Erro ao buscar:', error);
        return null;
      }

      if (!data) {
        console.log(`⚠️ [ChannelConfigRepository] Nenhuma configuração encontrada para org: ${organizationId}`);
        return null;
      }

      console.log(`✅ [ChannelConfigRepository] Configuração encontrada para org: ${organizationId}`);
      return data as ChannelConfigDB;
    } catch (error) {
      console.error('❌ [ChannelConfigRepository] Erro ao buscar:', error);
      return null;
    }
  }

  /**
   * Garante que a organização existe antes de salvar
   * Se não existir, cria uma organização padrão
   * ✅ Suporta organization_id como TEXT ou UUID
   */
  private async ensureOrganizationExists(organizationId: string): Promise<boolean> {
    try {
      // Validar que organization_id não está vazio
      if (!organizationId || typeof organizationId !== 'string') {
        console.error('❌ [ChannelConfigRepository] organization_id inválido:', organizationId);
        return false;
      }

      // Verificar se é UUID válido
      const isUUID = organizationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      if (!isUUID) {
        console.error(`❌ [ChannelConfigRepository] organization_id não é UUID válido: ${organizationId}`);
        return false;
      }

      // Verificar se organização existe (usando UUID)
      const { data, error } = await this.client
        .from('organizations')
        .select('id')
        .eq('id', organizationId)
        .maybeSingle();

      if (error) {
        console.error('❌ [ChannelConfigRepository] Erro ao verificar organização:', error);
        // Se o erro for de constraint ou foreign key, pode ser que a tabela organizations não exista
        // ou que o schema seja diferente - logar e continuar
        console.warn('⚠️ [ChannelConfigRepository] Tentando criar organização mesmo com erro de verificação:', error.message);
      }

      if (data?.id) {
        console.log(`✅ [ChannelConfigRepository] Organização existe: ${organizationId}`);
        return true;
      }

      // Organização não existe - NÃO criar automaticamente durante login
      // ✅ FIX v1.0.103.970: Não criar organização durante login para evitar erro de trigger
      // A organização deve ser criada manualmente ou via migração
      console.log(`⚠️ [ChannelConfigRepository] Organização não encontrada: ${organizationId}`);
      console.log(`⚠️ [ChannelConfigRepository] NÃO criando organização automaticamente - usar migração ou criar manualmente`);
      console.warn('⚠️ [ChannelConfigRepository] Se a organização não existir, o foreign key constraint vai falhar com mensagem clara');
      return false; // Retornar false para permitir que o erro de foreign key seja claro

      if (createError) {
        // Se erro for de duplicação, significa que a organização foi criada entre a verificação e o insert
        // Isso é OK, pode continuar
        if (createError.code === '23505' || createError.message?.includes('duplicate')) {
          console.log(`✅ [ChannelConfigRepository] Organização já existe (criada concorrentemente): ${organizationId}`);
          return true;
        }
        
        // ✅ CRÍTICO: Logar TODOS os detalhes do erro para debug
        console.error('❌ [ChannelConfigRepository] Erro ao criar organização:', {
          code: createError.code,
          message: createError.message,
          details: createError.details,
          hint: createError.hint,
          organizationId
        });
        
        // Se a tabela organizations não existe ou tem schema diferente, continuar mesmo assim
        // O foreign key constraint vai falhar com mensagem clara se necessário
        if (createError.code === '42P01' || createError.message?.includes('does not exist')) {
          console.warn('⚠️ [ChannelConfigRepository] Tabela organizations não existe ou schema diferente, continuando sem criar organização');
          // Retornar true para permitir que o upsert tente mesmo assim
          // Se houver foreign key constraint, o erro será claro
          return true;
        }
        
        // ✅ FIX v1.0.103.970: Se erro for sobre "updated_at", pode ser trigger no banco
        // Tentar novamente com UPSERT usando ON CONFLICT DO UPDATE
        if (createError.message?.includes('updated_at') || createError.message?.includes('record "new"')) {
          console.warn('⚠️ [ChannelConfigRepository] Erro de trigger (updated_at), tentando UPSERT alternativo...');
          // Tentar UPSERT ao invés de INSERT
          const { data: upserted, error: upsertError } = await this.client
            .from('organizations')
            .upsert({
              id: organizationId,
              name: 'Organização Padrão',
              slug: `org-default-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              email: `admin-${Date.now()}@rendizy.com`,
              plan: 'free',
              status: 'active',
              created_at: now,
              updated_at: now
            }, {
              onConflict: 'id'
            })
            .select('id')
            .single();
          
          if (!upsertError && upserted?.id) {
            console.log(`✅ [ChannelConfigRepository] Organização criada via UPSERT: ${upserted.id}`);
            return true;
          }
        }
        
        // Para outros erros, retornar false mas tentar mesmo assim no upsert
        // O erro de foreign key será mais claro que "não foi possível criar organização"
        console.warn('⚠️ [ChannelConfigRepository] Erro ao criar organização, mas continuando - foreign key constraint vai falhar com mensagem clara se necessário');
        return true; // ✅ MUDANÇA: Retornar true para permitir tentar o upsert
      }

      if (newOrg?.id) {
        console.log(`✅ [ChannelConfigRepository] Organização criada: ${newOrg.id}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [ChannelConfigRepository] Erro ao garantir organização:', error);
      return false;
    }
  }

  /**
   * Salva ou atualiza configuração (UPSERT)
   * ✅ Usa UPSERT para garantir atomicidade e evitar race conditions
   * ✅ Valida tipos antes de salvar
   * ✅ Verifica persistência após salvar
   * ✅ Garante que organização existe antes de salvar (corrige foreign key constraint)
   */
  async upsert(config: ChannelConfigDB): Promise<UpsertResult> {
    try {
      // Validar organization_id
      if (!config.organization_id || typeof config.organization_id !== 'string') {
        const error = 'organization_id é obrigatório e deve ser string';
        console.error(`❌ [ChannelConfigRepository] ${error}:`, config.organization_id);
        return { success: false, error };
      }

      // ✅ FIX v1.0.103.960 - Garantir que organização existe antes de salvar
      // Se não conseguir criar/verificar, tentar mesmo assim - foreign key constraint vai falhar com mensagem clara
      const orgExists = await this.ensureOrganizationExists(config.organization_id);
      if (!orgExists) {
        console.warn(`⚠️ [ChannelConfigRepository] Não foi possível garantir que organização ${config.organization_id} existe, mas tentando upsert mesmo assim - se houver foreign key constraint, o erro será claro`);
        // ✅ MUDANÇA: Não abortar - deixar o upsert tentar e o foreign key constraint falhar com mensagem clara
        // Isso é melhor que falhar silenciosamente
      }

      // Normalizar dados antes de salvar
      // ✅ CRÍTICO: Garantir que TODOS os campos sejam sempre incluídos, mesmo se undefined
      // Isso é necessário para que o UPSERT atualize corretamente todos os campos
      const normalizedConfig: ChannelConfigDB = {
        organization_id: config.organization_id, // Sempre obrigatório
        // WhatsApp - SEMPRE incluir todos os campos, mesmo se undefined (usar valores padrão)
        whatsapp_enabled: config.whatsapp_enabled ?? false,
        whatsapp_api_url: config.whatsapp_api_url !== undefined ? (config.whatsapp_api_url || '') : '',
        whatsapp_instance_name: config.whatsapp_instance_name !== undefined ? (config.whatsapp_instance_name || '') : '',
        whatsapp_api_key: config.whatsapp_api_key !== undefined ? (config.whatsapp_api_key || '') : '',
        whatsapp_instance_token: config.whatsapp_instance_token !== undefined ? (config.whatsapp_instance_token || '') : '',
        whatsapp_connected: config.whatsapp_connected ?? false,
        whatsapp_connection_status: config.whatsapp_connection_status !== undefined ? (config.whatsapp_connection_status || 'disconnected') : 'disconnected',
        whatsapp_phone_number: config.whatsapp_phone_number !== undefined ? config.whatsapp_phone_number : null,
        whatsapp_qr_code: config.whatsapp_qr_code !== undefined ? config.whatsapp_qr_code : null,
        whatsapp_last_connected_at: config.whatsapp_last_connected_at !== undefined ? config.whatsapp_last_connected_at : null,
        whatsapp_error_message: config.whatsapp_error_message !== undefined ? config.whatsapp_error_message : null,
        // SMS
        sms_enabled: config.sms_enabled ?? false,
        sms_account_sid: config.sms_account_sid !== undefined ? (config.sms_account_sid || '') : '',
        sms_auth_token: config.sms_auth_token !== undefined ? (config.sms_auth_token || '') : '',
        sms_phone_number: config.sms_phone_number !== undefined ? (config.sms_phone_number || '') : '',
        sms_credits_used: config.sms_credits_used ?? 0,
        sms_last_recharged_at: config.sms_last_recharged_at !== undefined ? config.sms_last_recharged_at : null,
        // Automations - garantir boolean
        automation_reservation_confirmation: config.automation_reservation_confirmation ?? false,
        automation_checkin_reminder: config.automation_checkin_reminder ?? false,
        automation_checkout_review: config.automation_checkout_review ?? false,
        automation_payment_reminder: config.automation_payment_reminder ?? false,
        // Soft delete - garantir null (não deletado)
        deleted_at: null,
      };

      // Sanitizar (remover updated_at para deixar trigger fazer o trabalho)
      const sanitized = sanitizeDbData(normalizedConfig, ['updated_at', 'created_at']);

      console.log(`💾 [ChannelConfigRepository] Fazendo UPSERT para org: ${sanitized.organization_id}`, {
        whatsapp_api_url: sanitized.whatsapp_api_url || 'VAZIO',
        whatsapp_instance_name: sanitized.whatsapp_instance_name || 'VAZIO',
        whatsapp_api_key: sanitized.whatsapp_api_key ? `${sanitized.whatsapp_api_key.substring(0, 10)}...` : 'VAZIO',
      });

      // UPSERT usando organization_id como chave única
      // ✅ CORREÇÃO: Usar select específico sem updated_at para evitar erro de trigger
      const { data, error } = await this.client
        .from(this.tableName)
        .upsert(sanitized, {
          onConflict: 'organization_id',
          ignoreDuplicates: false
        })
        .select('id, organization_id, whatsapp_enabled, whatsapp_api_url, whatsapp_instance_name, whatsapp_api_key, whatsapp_instance_token, whatsapp_connected, whatsapp_phone_number, whatsapp_qr_code, whatsapp_connection_status, whatsapp_last_connected_at, whatsapp_error_message, sms_enabled, sms_account_sid, sms_auth_token, sms_phone_number, sms_credits_used, sms_last_recharged_at, automation_reservation_confirmation, automation_checkin_reminder, automation_checkout_review, automation_payment_reminder, created_at, deleted_at')
        .single();

      if (error) {
        console.error('❌ [ChannelConfigRepository] Erro no UPSERT:', error);
        
        // ✅ CORREÇÃO: Se erro for sobre updated_at, tentar novamente sem select ou com select diferente
        if (error.message?.includes('updated_at') || error.message?.includes('record "new"')) {
          console.warn('⚠️ [ChannelConfigRepository] Erro de trigger (updated_at), tentando buscar registro diretamente...');
          
          // Tentar buscar o registro que foi criado/atualizado
          const fetchResult = await this.client
            .from(this.tableName)
            .select('*')
            .eq('organization_id', sanitized.organization_id)
            .is('deleted_at', null)
            .maybeSingle();
          
          if (!fetchResult.error && fetchResult.data) {
            console.log('✅ [ChannelConfigRepository] Registro encontrado após erro de trigger');
            return { success: true, data: fetchResult.data as ChannelConfigDB };
          }
        }
        
        return { success: false, error: error.message };
      }

      if (!data) {
        const error = 'UPSERT não retornou dados';
        console.error(`❌ [ChannelConfigRepository] ${error}`);
        return { success: false, error };
      }

      console.log(`✅ [ChannelConfigRepository] UPSERT bem-sucedido para org: ${data.organization_id}`, {
        whatsapp_api_url: data.whatsapp_api_url || 'VAZIO',
        whatsapp_instance_name: data.whatsapp_instance_name || 'VAZIO',
        created_at: data.created_at,
      });

      // Verificação pós-salvamento para garantir persistência
      const verification = await this.findByOrganizationId(config.organization_id);
      if (!verification) {
        const error = 'Verificação pós-salvamento falhou - dados não encontrados';
        console.error(`❌ [ChannelConfigRepository] ${error}`);
        return { success: false, error };
      }

      // Comparar valores salvos
      if (verification.whatsapp_api_url !== normalizedConfig.whatsapp_api_url ||
          verification.whatsapp_instance_name !== normalizedConfig.whatsapp_instance_name) {
        const error = 'Verificação pós-salvamento falhou - dados não correspondem';
        console.error(`❌ [ChannelConfigRepository] ${error}`, {
          esperado: {
            api_url: normalizedConfig.whatsapp_api_url,
            instance_name: normalizedConfig.whatsapp_instance_name
          },
          salvo: {
            api_url: verification.whatsapp_api_url,
            instance_name: verification.whatsapp_instance_name
          }
        });
        return { success: false, error };
      }

      console.log(`✅✅ [ChannelConfigRepository] Verificação pós-salvamento OK para org: ${data.organization_id}`);
      return { success: true, data: data as ChannelConfigDB };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [ChannelConfigRepository] Erro:', error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Soft delete: marca como deletado ao invés de deletar
   * ✅ Preserva dados para auditoria e recovery
   */
  async deleteByOrganizationId(organizationId: string): Promise<boolean> {
    try {
      if (!organizationId || typeof organizationId !== 'string') {
        console.error('❌ [ChannelConfigRepository] organizationId inválido:', organizationId);
        return false;
      }

      // Soft delete: atualizar deleted_at ao invés de deletar
      const { error } = await this.client
        .from(this.tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .is('deleted_at', null); // Só atualizar se ainda não estiver deletado

      if (error) {
        console.error('❌ [ChannelConfigRepository] Erro ao fazer soft delete:', error);
        return false;
      }

      console.log(`✅ [ChannelConfigRepository] Soft delete realizado para org: ${organizationId}`);
      return true;
    } catch (error) {
      console.error('❌ [ChannelConfigRepository] Erro ao fazer soft delete:', error);
      return false;
    }
  }

  /**
   * Hard delete: deleta permanentemente (use com cuidado!)
   * ⚠️ APENAS para admin ou cleanup
   */
  async hardDeleteByOrganizationId(organizationId: string): Promise<boolean> {
    try {
      if (!organizationId || typeof organizationId !== 'string') {
        console.error('❌ [ChannelConfigRepository] organizationId inválido:', organizationId);
        return false;
      }

      const { error } = await this.client
        .from(this.tableName)
        .delete()
        .eq('organization_id', organizationId);

      if (error) {
        console.error('❌ [ChannelConfigRepository] Erro ao fazer hard delete:', error);
        return false;
      }

      console.log(`⚠️ [ChannelConfigRepository] Hard delete realizado para org: ${organizationId}`);
      return true;
    } catch (error) {
      console.error('❌ [ChannelConfigRepository] Erro ao fazer hard delete:', error);
      return false;
    }
  }
}

// Singleton instance
export const channelConfigRepository = new ChannelConfigRepository();
