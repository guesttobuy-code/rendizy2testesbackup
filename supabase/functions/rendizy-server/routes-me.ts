/**
 * 👤 ROUTES-ME: Endpoints para o usuário logado gerenciar seu próprio perfil
 * v1.1.0 - 2026-01-26
 * 
 * ✅ PADRÃO VITORIOSO: Usar getSessionFromToken da utils-session.ts
 * 
 * Diferente de routes-users (admin only), este permite ao usuário:
 * - Atualizar seu avatar
 * - Atualizar nome, etc.
 */
import { Hono } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getSessionFromToken } from './utils-session.ts';

const app = new Hono();

const AVATAR_BUCKET = 'avatars';

// Garantir que o bucket de avatars existe
async function ensureAvatarBucketExists() {
  const supabase = getSupabaseClient();
  
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === AVATAR_BUCKET);
  
  if (!bucketExists) {
    console.log(`[routes-me] Criando bucket: ${AVATAR_BUCKET}`);
    const { error } = await supabase.storage.createBucket(AVATAR_BUCKET, {
      public: true, // Avatar precisa ser público
      fileSizeLimit: 1048576, // 1MB max
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    });
    
    if (error) {
      console.error('[routes-me] Erro ao criar bucket:', error);
      throw error;
    }
    console.log(`[routes-me] Bucket ${AVATAR_BUCKET} criado com sucesso!`);
  }
}

// Helper: Extrair user_id do token usando a função correta (sessions table)
async function getUserIdFromToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader) {
    console.log('[routes-me] Nenhum auth header fornecido');
    return null;
  }
  
  // Remover "Bearer " se presente (pode vir do Authorization header)
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    console.log('[routes-me] Token vazio após processamento');
    return null;
  }
  
  console.log('[routes-me] Token a validar:', token.substring(0, 20) + '...');
  console.log('[routes-me] Token length:', token.length);
  
  // ✅ PADRÃO VITORIOSO: Usar getSessionFromToken que busca na tabela sessions
  const session = await getSessionFromToken(token);
  
  if (!session) {
    console.warn('[routes-me] Sessão não encontrada ou expirada');
    return null;
  }
  
  console.log('[routes-me] Sessão válida! userId:', session.userId);
  return session.userId;
}

/**
 * 📸 PUT /me/avatar - Atualizar avatar do usuário logado
 * 
 * Body: { avatar_url: string | null }
 * 
 * Aceita:
 * - URL de imagem (https://...)
 * - Base64 data URI (data:image/...) - será convertido e salvo no Storage
 * - null (para remover)
 */
app.put('/avatar', async (c) => {
  console.log('[routes-me] PUT /avatar - Iniciando...');
  
  try {
    const authHeader = c.req.header('X-Auth-Token') || c.req.header('Authorization');
    console.log('[routes-me] Auth header presente:', !!authHeader);
    
    const userId = await getUserIdFromToken(authHeader);
    console.log('[routes-me] User ID:', userId);
    
    if (!userId) {
      return c.json({ success: false, error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    let { avatar_url } = body;
    
    console.log('[routes-me] avatar_url type:', typeof avatar_url);
    console.log('[routes-me] avatar_url length:', avatar_url?.length || 0);
    
    // Validar que é URL válida ou null
    if (avatar_url !== null && typeof avatar_url !== 'string') {
      return c.json({ success: false, error: 'avatar_url deve ser string ou null' }, 400);
    }
    
    const supabase = getSupabaseClient();
    
    // Se for base64, fazer upload para o Storage
    if (avatar_url && avatar_url.startsWith('data:image/')) {
      console.log('[routes-me] Processando base64 para upload...');
      
      try {
        // ✅ Garantir que o bucket existe antes de fazer upload
        await ensureAvatarBucketExists();
        
        // Extrair tipo e dados
        const matches = avatar_url.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          return c.json({ success: false, error: 'Formato base64 inválido' }, 400);
        }
        
        const [, imageType, base64Data] = matches;
        const fileName = `${userId}.${imageType}`; // Sem subpasta, direto no bucket
        
        // Converter base64 para Uint8Array
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log('[routes-me] Fazendo upload para Storage...', fileName);
        
        // Upload para o bucket de avatars
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(fileName, bytes, {
            contentType: `image/${imageType}`,
            upsert: true
          });
        
        if (uploadError) {
          console.error('[routes-me] Erro no upload:', uploadError);
          return c.json({ 
            success: false, 
            error: 'Erro ao fazer upload: ' + uploadError.message 
          }, 500);
        }
        
        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(fileName);
        
        // Adicionar timestamp para evitar cache
        avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
        console.log('[routes-me] URL do avatar:', avatar_url);
        
      } catch (uploadErr: any) {
        console.error('[routes-me] Erro ao processar imagem:', uploadErr);
        return c.json({ 
          success: false, 
          error: 'Erro ao processar imagem: ' + uploadErr.message 
        }, 500);
      }
    }
    
    // Atualizar avatar do usuário
    const { data, error } = await supabase
      .from('users')
      .update({ 
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, name, email, avatar_url')
      .single();
    
    if (error) {
      console.error('[routes-me] Erro ao atualizar avatar:', error);
      return c.json({ 
        success: false, 
        error: 'Erro ao atualizar avatar: ' + error.message 
      }, 500);
    }
    
    console.log(`[routes-me] ✅ Avatar atualizado para user ${userId}`);
    
    return c.json({ 
      success: true, 
      data: {
        id: data.id,
        name: data.name,
        email: data.email,
        avatar_url: data.avatar_url
      }
    });
    
  } catch (err: any) {
    console.error('[routes-me] Erro inesperado:', err);
    return c.json({ 
      success: false, 
      error: err.message || 'Erro interno' 
    }, 500);
  }
});

/**
 * 👤 GET /me - Retorna dados do usuário logado
 */
app.get('/', async (c) => {
  try {
    const authHeader = c.req.header('X-Auth-Token') || c.req.header('Authorization');
    const userId = await getUserIdFromToken(authHeader);
    
    if (!userId) {
      return c.json({ success: false, error: 'Não autenticado' }, 401);
    }
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, type, status, organization_id')
      .eq('id', userId)
      .single();
    
    if (error) {
      return c.json({ success: false, error: error.message }, 500);
    }
    
    return c.json({ success: true, data });
    
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

/**
 * 🔧 PATCH /me - Atualizar dados gerais do perfil
 * 
 * Body: { name?: string, avatar_url?: string | null }
 */
app.patch('/', async (c) => {
  try {
    const authHeader = c.req.header('X-Auth-Token') || c.req.header('Authorization');
    const userId = await getUserIdFromToken(authHeader);
    
    if (!userId) {
      return c.json({ success: false, error: 'Não autenticado' }, 401);
    }
    
    const body = await c.req.json();
    const { name, avatar_url } = body;
    
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return c.json({ success: false, error: 'Nome deve ter pelo menos 2 caracteres' }, 400);
      }
      updateData.name = name.trim();
    }
    
    if (avatar_url !== undefined) {
      // null é permitido (para remover)
      if (avatar_url !== null && typeof avatar_url !== 'string') {
        return c.json({ success: false, error: 'avatar_url deve ser string ou null' }, 400);
      }
      updateData.avatar_url = avatar_url;
    }
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, name, email, avatar_url')
      .single();
    
    if (error) {
      console.error('[routes-me] Erro ao atualizar perfil:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    
    console.log(`[routes-me] ✅ Perfil atualizado para user ${userId}`);
    
    return c.json({ success: true, data });
    
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

export default app;
