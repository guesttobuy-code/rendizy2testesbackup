/**
 * RENDIZY - Database Reset Script
 * 
 * Script para LIMPAR COMPLETAMENTE o banco de dados
 * Remove TODOS os dados de teste e deixa apenas estrutura inicial
 * 
 * ⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!
 * 
 * @version 1.0.103.267
 * @date 2025-11-03
 */

import { Hono } from 'npm:hono@4';
import * as kv from './kv_store.tsx';

export const resetRoutes = new Hono();

// ============================================================================
// LISTA DE PREFIXOS A SEREM LIMPOS
// ============================================================================

const PREFIXES_TO_DELETE = [
  // Propriedades e Anúncios
  'property:',
  'properties:org:',
  'listing:',
  'listings:org:',
  'property-types:',
  
  // Locais e Amenidades
  'location:',
  'locations:org:',
  'location-amenity:',
  'location-amenities:org:',
  'amenity:',
  'amenities:org:',
  'room:',
  'rooms:org:',
  
  // Reservas e Bloqueios
  'reservation:',
  'reservations:org:',
  'block:',
  'blocks:org:',
  'quotation:',
  'quotations:org:',
  
  // Clientes e Hóspedes
  'client:',
  'clients:org:',
  'guest:',
  'guests:org:',
  'owner:',
  'owners:org:',
  
  // Calendário e Preços
  'calendar:',
  'seasonal-pricing:',
  'seasonal-pricings:org:',
  'bulk-pricing:',
  'bulk-pricings:org:',
  'ical:',
  'icals:org:',
  
  // Chat e WhatsApp
  'chat:',
  'chats:org:',
  'chat-message:',
  'chat-messages:org:',
  'chat-template:',
  'chat-templates:org:',
  'whatsapp:',
  
  // Configurações Globais
  'settings:',
  'rules:',
  'pricing-settings:',
  
  // Integrações
  'bookingcom:',
  'staysnet:',
  'client-site:',
  'client-sites:org:',
];

// ============================================================================
// DADOS QUE DEVEM SER PRESERVADOS
// ============================================================================

const PREFIXES_TO_KEEP = [
  'org:',              // Organizações (apenas estrutura, não dados)
  'user:',             // Usuários (apenas admin/superadmin)
  'session:',          // Sessões ativas
  'auth:',             // Dados de autenticação
];

// ============================================================================
// RESET ROUTES
// ============================================================================

/**
 * GET /make-server-67caf26a/reset/status
 * Verifica quantos registros existem no banco
 */
resetRoutes.get('/status', async (c) => {
  try {
    const stats: Record<string, number> = {};
    
    for (const prefix of PREFIXES_TO_DELETE) {
      const keys = await kv.getByPrefix(prefix);
      stats[prefix] = keys.length;
    }
    
    const total = Object.values(stats).reduce((sum, count) => sum + count, 0);
    
    return c.json({
      success: true,
      total_records: total,
      breakdown: stats,
      message: `Total de ${total} registros encontrados no banco`,
    });
  } catch (error: any) {
    console.error('❌ [RESET] Erro ao verificar status:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * POST /make-server-67caf26a/reset/confirm
 * Limpa TODO o banco de dados (exceto organizações e usuários)
 * 
 * Body:
 * {
 *   "confirmation": "DELETE_ALL_DATA",
 *   "organizationId": "ORG-xxx"
 * }
 */
resetRoutes.post('/confirm', async (c) => {
  try {
    const body = await c.req.json();
    const { confirmation, organizationId } = body;
    
    // VERIFICAÇÃO DE SEGURANÇA
    if (confirmation !== 'DELETE_ALL_DATA') {
      return c.json({
        success: false,
        error: 'Confirmação inválida. Use "DELETE_ALL_DATA" para confirmar.',
      }, 400);
    }
    
    if (!organizationId) {
      return c.json({
        success: false,
        error: 'organizationId é obrigatório',
      }, 400);
    }
    
    console.log(`🗑️ [RESET] Iniciando limpeza do banco para org: ${organizationId}`);
    
    const deleted: Record<string, number> = {};
    let totalDeleted = 0;
    
    // Deletar por prefixo
    for (const prefix of PREFIXES_TO_DELETE) {
      try {
        // Se o prefixo tem :org:, adicionar organizationId
        const searchPrefix = prefix.includes(':org:') 
          ? prefix.replace(':org:', `:${organizationId}:`)
          : prefix;
        
        const keys = await kv.getByPrefix(searchPrefix);
        
        if (keys.length > 0) {
          // Extrair apenas as keys (primeiro elemento de cada array)
          const keyStrings = keys.map(k => k[0]);
          await kv.mdel(keyStrings);
          
          deleted[prefix] = keys.length;
          totalDeleted += keys.length;
          
          console.log(`✅ [RESET] Deletados ${keys.length} registros de ${prefix}`);
        }
      } catch (prefixError: any) {
        console.error(`⚠️ [RESET] Erro ao deletar prefixo ${prefix}:`, prefixError);
        deleted[prefix] = 0;
      }
    }
    
    console.log(`✅ [RESET] Limpeza concluída! Total deletado: ${totalDeleted} registros`);
    
    return c.json({
      success: true,
      message: `Banco de dados limpo com sucesso! ${totalDeleted} registros deletados.`,
      total_deleted: totalDeleted,
      breakdown: deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [RESET] Erro ao limpar banco:', error);
    return c.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, 500);
  }
});

/**
 * POST /make-server-67caf26a/reset/partial
 * Limpa apenas dados específicos
 * 
 * Body:
 * {
 *   "prefixes": ["property:", "listing:"],
 *   "organizationId": "ORG-xxx"
 * }
 */
resetRoutes.post('/partial', async (c) => {
  try {
    const body = await c.req.json();
    const { prefixes, organizationId } = body;
    
    if (!prefixes || !Array.isArray(prefixes) || prefixes.length === 0) {
      return c.json({
        success: false,
        error: 'prefixes é obrigatório e deve ser um array',
      }, 400);
    }
    
    if (!organizationId) {
      return c.json({
        success: false,
        error: 'organizationId é obrigatório',
      }, 400);
    }
    
    console.log(`🗑️ [RESET] Limpeza parcial para org: ${organizationId}`);
    console.log(`🗑️ [RESET] Prefixos: ${prefixes.join(', ')}`);
    
    const deleted: Record<string, number> = {};
    let totalDeleted = 0;
    
    for (const prefix of prefixes) {
      try {
        const searchPrefix = prefix.includes(':org:')
          ? prefix.replace(':org:', `:${organizationId}:`)
          : prefix;
        
        const keys = await kv.getByPrefix(searchPrefix);
        
        if (keys.length > 0) {
          const keyStrings = keys.map(k => k[0]);
          await kv.mdel(keyStrings);
          
          deleted[prefix] = keys.length;
          totalDeleted += keys.length;
          
          console.log(`✅ [RESET] Deletados ${keys.length} registros de ${prefix}`);
        }
      } catch (prefixError: any) {
        console.error(`⚠️ [RESET] Erro ao deletar prefixo ${prefix}:`, prefixError);
        deleted[prefix] = 0;
      }
    }
    
    console.log(`✅ [RESET] Limpeza parcial concluída! Total deletado: ${totalDeleted} registros`);
    
    return c.json({
      success: true,
      message: `Limpeza parcial concluída! ${totalDeleted} registros deletados.`,
      total_deleted: totalDeleted,
      breakdown: deleted,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ [RESET] Erro na limpeza parcial:', error);
    return c.json({
      success: false,
      error: error.message,
    }, 500);
  }
});

/**
 * GET /make-server-67caf26a/reset/help
 * Mostra ajuda sobre como usar o reset
 */
resetRoutes.get('/help', (c) => {
  return c.json({
    title: 'RENDIZY - Database Reset API',
    description: 'API para resetar o banco de dados e remover dados de teste',
    endpoints: {
      'GET /reset/status': {
        description: 'Verifica quantos registros existem no banco',
        params: 'Nenhum',
        example: 'GET /make-server-67caf26a/reset/status',
      },
      'POST /reset/confirm': {
        description: 'LIMPA TODO o banco de dados (exceto organizações e usuários)',
        params: {
          confirmation: 'DELETE_ALL_DATA (obrigatório)',
          organizationId: 'ID da organização (obrigatório)',
        },
        example: {
          confirmation: 'DELETE_ALL_DATA',
          organizationId: 'ORG-xxx',
        },
        warning: '⚠️ AÇÃO IRREVERSÍVEL! Todos os dados serão perdidos.',
      },
      'POST /reset/partial': {
        description: 'Limpa apenas dados específicos',
        params: {
          prefixes: 'Array de prefixos a deletar',
          organizationId: 'ID da organização',
        },
        example: {
          prefixes: ['property:', 'listing:'],
          organizationId: 'ORG-xxx',
        },
      },
    },
    prefixes_available: PREFIXES_TO_DELETE,
    prefixes_protected: PREFIXES_TO_KEEP,
  });
});

export default resetRoutes;
