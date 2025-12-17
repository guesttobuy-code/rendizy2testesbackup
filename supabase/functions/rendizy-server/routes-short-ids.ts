/**
 * RENDIZY - Short IDs Routes
 * 
 * Rotas para gerenciamento de IDs curtos de propriedades
 * 
 * @version 1.0.103.271
 * @date 2025-11-04
 */

import { Hono } from 'npm:hono';
import {
  generateShortId,
  checkShortIdExists,
  getPropertyByShortId,
  validateShortIdFormat,
  listTenantShortIds,
  migrateToShortId,
  getShortIdStats,
  ID_PREFIXES,
} from './short-id-generator.ts';

const app = new Hono();

/**
 * POST /make-server-67caf26a/short-ids/generate
 * Gera um novo Short ID
 * 
 * Body: { type: 'location' | 'property', tenantId: string }
 */
app.post('/generate', async (c) => {
  try {
    const body = await c.req.json();
    const { type, tenantId } = body;

    if (!type || !tenantId) {
      return c.json(
        { success: false, error: 'type e tenantId são obrigatórios' },
        400
      );
    }

    if (!['location', 'property'].includes(type)) {
      return c.json(
        { success: false, error: 'type deve ser "location" ou "property"' },
        400
      );
    }

    const prefix = type === 'location' ? 'LOCATION' : 'PROPERTY';
    const shortId = await generateShortId(prefix as keyof typeof ID_PREFIXES, tenantId);

    console.log(`✅ Short ID gerado via API: ${shortId}`);

    return c.json({
      success: true,
      data: {
        shortId,
        type,
        tenantId,
      },
    });
  } catch (error: any) {
    console.error('❌ Erro ao gerar Short ID:', error);
    return c.json(
      {
        success: false,
        error: 'Erro ao gerar Short ID',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /make-server-67caf26a/short-ids/check/:shortId
 * Verifica se Short ID existe
 * 
 * Query: tenantId
 */
app.get('/check/:shortId', async (c) => {
  try {
    const shortId = c.req.param('shortId');
    const tenantId = c.req.query('tenantId');

    if (!tenantId) {
      return c.json(
        { success: false, error: 'tenantId é obrigatório' },
        400
      );
    }

    if (!validateShortIdFormat(shortId)) {
      return c.json(
        { success: false, error: 'Formato de Short ID inválido' },
        400
      );
    }

    const exists = await checkShortIdExists(shortId, tenantId);

    return c.json({
      success: true,
      data: {
        shortId,
        exists,
      },
    });
  } catch (error: any) {
    console.error('❌ Erro ao verificar Short ID:', error);
    return c.json(
      {
        success: false,
        error: 'Erro ao verificar Short ID',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /make-server-67caf26a/short-ids/:shortId
 * Busca propriedade por Short ID
 * 
 * Query: tenantId
 */
app.get('/:shortId', async (c) => {
  try {
    const shortId = c.req.param('shortId');
    const tenantId = c.req.query('tenantId');

    if (!tenantId) {
      return c.json(
        { success: false, error: 'tenantId é obrigatório' },
        400
      );
    }

    if (!validateShortIdFormat(shortId)) {
      return c.json(
        { success: false, error: 'Formato de Short ID inválido' },
        400
      );
    }

    const property = await getPropertyByShortId(shortId, tenantId);

    if (!property) {
      return c.json(
        { success: false, error: 'Short ID não encontrado' },
        404
      );
    }

    return c.json({
      success: true,
      data: property,
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar por Short ID:', error);
    return c.json(
      {
        success: false,
        error: 'Erro ao buscar Short ID',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /make-server-67caf26a/short-ids
 * Lista todos os Short IDs do tenant
 * 
 * Query: tenantId
 */
app.get('/', async (c) => {
  try {
    const tenantId = c.req.query('tenantId');

    if (!tenantId) {
      return c.json(
        { success: false, error: 'tenantId é obrigatório' },
        400
      );
    }

    const shortIds = await listTenantShortIds(tenantId);

    return c.json({
      success: true,
      data: shortIds,
      count: shortIds.length,
    });
  } catch (error: any) {
    console.error('❌ Erro ao listar Short IDs:', error);
    return c.json(
      {
        success: false,
        error: 'Erro ao listar Short IDs',
        details: error.message,
      },
      500
    );
  }
});

/**
 * POST /make-server-67caf26a/short-ids/migrate
 * Migra ID longo (UUID) para Short ID
 * 
 * Body: { longId: string, type: 'location' | 'property', tenantId: string }
 */
app.post('/migrate', async (c) => {
  try {
    const body = await c.req.json();
    const { longId, type, tenantId } = body;

    if (!longId || !type || !tenantId) {
      return c.json(
        { success: false, error: 'longId, type e tenantId são obrigatórios' },
        400
      );
    }

    if (!['location', 'property'].includes(type)) {
      return c.json(
        { success: false, error: 'type deve ser "location" ou "property"' },
        400
      );
    }

    const shortId = await migrateToShortId(longId, type, tenantId);

    console.log(`✅ Migração concluída: ${longId} -> ${shortId}`);

    return c.json({
      success: true,
      data: {
        oldId: longId,
        newId: shortId,
        type,
      },
    });
  } catch (error: any) {
    console.error('❌ Erro ao migrar ID:', error);
    return c.json(
      {
        success: false,
        error: 'Erro ao migrar ID',
        details: error.message,
      },
      500
    );
  }
});

/**
 * GET /make-server-67caf26a/short-ids/stats
 * Estatísticas de Short IDs do tenant
 * 
 * Query: tenantId
 */
app.get('/stats', async (c) => {
  try {
    const tenantId = c.req.query('tenantId');

    if (!tenantId) {
      return c.json(
        { success: false, error: 'tenantId é obrigatório' },
        400
      );
    }

    const stats = await getShortIdStats(tenantId);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('❌ Erro ao gerar estatísticas:', error);
    return c.json(
      {
        success: false,
        error: 'Erro ao gerar estatísticas',
        details: error.message,
      },
      500
    );
  }
});

/**
 * POST /make-server-67caf26a/short-ids/validate
 * Valida formato de Short ID
 * 
 * Body: { shortId: string }
 */
app.post('/validate', async (c) => {
  try {
    const body = await c.req.json();
    const { shortId } = body;

    if (!shortId) {
      return c.json(
        { success: false, error: 'shortId é obrigatório' },
        400
      );
    }

    const isValid = validateShortIdFormat(shortId);

    return c.json({
      success: true,
      data: {
        shortId,
        isValid,
        format: isValid ? 'válido' : 'inválido',
      },
    });
  } catch (error: any) {
    console.error('❌ Erro ao validar Short ID:', error);
    return c.json(
      {
        success: false,
        error: 'Erro ao validar Short ID',
        details: error.message,
      },
      500
    );
  }
});

export default app;
