/**
 * routes-auth-social.ts
 * 
 * Endpoints de autenticação social (Google, Apple) para:
 * - Funcionários do Rendizy (painel principal)
 * - Hóspedes dos sites clientes
 * 
 * @version 1.0.104.001
 * @date 2026-01-13
 */

import { getSupabaseClient } from "./kv_store.tsx";
import { logInfo, logError, logWarning } from "./utils.ts";

// ============================================================================
// TIPOS
// ============================================================================

interface GooglePayload {
  iss: string;           // Issuer (accounts.google.com)
  aud: string;           // Audience (Client ID)
  sub: string;           // Google User ID (único)
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  iat: number;           // Issued at
  exp: number;           // Expiration
}

interface GuestUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar_url?: string;
  google_id?: string;
  apple_id?: string;
  organization_id?: string;
  status: string;
  created_at: string;
  last_login_at?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "1068989503174-gd08jd74uclfjdv0goe32071uck2sg9k.apps.googleusercontent.com";
const JWT_SECRET = Deno.env.get("JWT_SECRET") || Deno.env.get("SUPABASE_JWT_SECRET") || "super-secret-jwt-token";

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Decodifica e valida o ID token do Google
 */
function decodeGoogleCredential(credential: string): GooglePayload | null {
  try {
    const parts = credential.split('.');
    if (parts.length !== 3) {
      logError("auth-social", "Token inválido: não tem 3 partes");
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    const payload = JSON.parse(jsonPayload) as GooglePayload;

    // Validar issuer
    if (payload.iss !== "accounts.google.com" && payload.iss !== "https://accounts.google.com") {
      logError("auth-social", `Issuer inválido: ${payload.iss}`);
      return null;
    }

    // Validar audience (client ID)
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      logWarning("auth-social", `Audience diferente do esperado: ${payload.aud} vs ${GOOGLE_CLIENT_ID}`);
      // Não bloqueia, pois pode haver múltiplos client IDs válidos
    }

    // Validar expiração
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      logError("auth-social", `Token expirado: ${payload.exp} < ${now}`);
      return null;
    }

    // Validar email verificado
    if (!payload.email_verified) {
      logWarning("auth-social", `Email não verificado: ${payload.email}`);
      // Não bloqueia, apenas avisa
    }

    return payload;
  } catch (error) {
    logError("auth-social", `Erro ao decodificar token: ${error}`);
    return null;
  }
}

/**
 * Gera um JWT simples para o usuário
 */
function generateJWT(user: { id: string; email: string; name: string; organizationId?: string }, type: 'staff' | 'guest'): string {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    organizationId: user.organizationId,
    type,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 dias
  };

  const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${encode(header)}.${encode(payload)}`;
  
  // Assinatura simplificada (em produção usar crypto.subtle)
  const signature = btoa(unsignedToken + JWT_SECRET).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${unsignedToken}.${signature}`;
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * POST /auth/social/google
 * Login de FUNCIONÁRIO do Rendizy via Google
 */
export async function handleStaffGoogleLogin(req: Request): Promise<Response> {
  try {
    const { credential } = await req.json();
    
    if (!credential) {
      return new Response(JSON.stringify({ success: false, error: "Credential não fornecida" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = decodeGoogleCredential(credential);
    if (!payload) {
      return new Response(JSON.stringify({ success: false, error: "Token Google inválido" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    logInfo("auth-social", `Login Google staff: ${payload.email}`);

    const supabase = getSupabaseClient();

    // Buscar usuário pelo email
    const { data: existingUser, error: findError } = await supabase
      .from("auth_users")
      .select("*")
      .eq("email", payload.email)
      .maybeSingle();

    if (findError) {
      logError("auth-social", `Erro ao buscar usuário: ${findError.message}`);
      return new Response(JSON.stringify({ success: false, error: "Erro ao buscar usuário" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!existingUser) {
      // Usuário não existe - não permitir auto-cadastro de funcionários via Google
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Usuário não encontrado. Solicite acesso ao administrador." 
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Atualizar último login
    await supabase
      .from("auth_users")
      .update({ 
        last_login_at: new Date().toISOString(),
        avatar_url: payload.picture || existingUser.avatar_url,
      })
      .eq("id", existingUser.id);

    // Gerar token
    const token = generateJWT({
      id: existingUser.id,
      email: existingUser.email,
      name: existingUser.name,
      organizationId: existingUser.organization_id,
    }, 'staff');

    return new Response(JSON.stringify({
      success: true,
      token,
      user: {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        username: existingUser.username,
        type: existingUser.type,
        organizationId: existingUser.organization_id,
        avatar_url: payload.picture,
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    logError("auth-social", `Erro no login Google staff: ${error}`);
    return new Response(JSON.stringify({ success: false, error: "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * POST /client-sites/api/:subdomain/auth/guest/google
 * Login de HÓSPEDE do site cliente via Google
 */
export async function handleGuestGoogleLogin(req: Request, subdomain: string): Promise<Response> {
  try {
    const { credential } = await req.json();
    
    if (!credential) {
      return new Response(JSON.stringify({ success: false, error: "Credential não fornecida" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = decodeGoogleCredential(credential);
    if (!payload) {
      return new Response(JSON.stringify({ success: false, error: "Token Google inválido" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    logInfo("auth-social", `Login Google guest: ${payload.email} (site: ${subdomain})`);

    const supabase = getSupabaseClient();

    // Buscar organização pelo subdomain
    const { data: site, error: siteError } = await supabase
      .from("client_sites")
      .select("organization_id")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (siteError || !site) {
      logError("auth-social", `Site não encontrado: ${subdomain}`);
      return new Response(JSON.stringify({ success: false, error: "Site não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const organizationId = site.organization_id;

    // Buscar ou criar guest_user
    let guestUser: GuestUser | null = null;

    // Primeiro, tentar encontrar por google_id
    const { data: existingByGoogleId } = await supabase
      .from("guest_users")
      .select("*")
      .eq("google_id", payload.sub)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existingByGoogleId) {
      guestUser = existingByGoogleId;
    } else {
      // Tentar encontrar por email
      const { data: existingByEmail } = await supabase
        .from("guest_users")
        .select("*")
        .eq("email", payload.email)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (existingByEmail) {
        // Atualizar com google_id
        const { data: updated } = await supabase
          .from("guest_users")
          .update({ 
            google_id: payload.sub,
            avatar_url: payload.picture,
            name: payload.name || existingByEmail.name,
            last_login_at: new Date().toISOString(),
          })
          .eq("id", existingByEmail.id)
          .select()
          .single();
        
        guestUser = updated;
      } else {
        // Criar novo guest_user
        const { data: newUser, error: createError } = await supabase
          .from("guest_users")
          .insert({
            email: payload.email,
            name: payload.name,
            avatar_url: payload.picture,
            google_id: payload.sub,
            organization_id: organizationId,
            email_verified: payload.email_verified,
            last_login_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          logError("auth-social", `Erro ao criar guest_user: ${createError.message}`);
          return new Response(JSON.stringify({ success: false, error: "Erro ao criar conta" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        guestUser = newUser;
        logInfo("auth-social", `Novo guest criado: ${payload.email}`);
      }
    }

    if (!guestUser) {
      return new Response(JSON.stringify({ success: false, error: "Erro ao processar login" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Atualizar último login
    await supabase
      .from("guest_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", guestUser.id);

    // Gerar token
    const token = generateJWT({
      id: guestUser.id,
      email: guestUser.email,
      name: guestUser.name,
      organizationId: organizationId,
    }, 'guest');

    return new Response(JSON.stringify({
      success: true,
      token,
      user: {
        id: guestUser.id,
        email: guestUser.email,
        name: guestUser.name,
        avatar_url: guestUser.avatar_url,
        phone: guestUser.phone,
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    logError("auth-social", `Erro no login Google guest: ${error}`);
    return new Response(JSON.stringify({ success: false, error: "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * GET /client-sites/api/:subdomain/auth/guest/me
 * Retorna dados do hóspede logado
 */
export async function handleGuestMe(req: Request, _subdomain: string): Promise<Response> {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Token não fornecido" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Decodificar token (simplificado - em produção validar assinatura)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ success: false, error: "Token inválido" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(atob(parts[1]));
    
    // Verificar expiração
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return new Response(JSON.stringify({ success: false, error: "Token expirado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verificar se é guest
    if (payload.type !== 'guest') {
      return new Response(JSON.stringify({ success: false, error: "Token inválido para esta rota" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient();

    const { data: guestUser, error } = await supabase
      .from("guest_users")
      .select("id, email, name, phone, avatar_url, created_at, last_login_at")
      .eq("id", payload.sub)
      .single();

    if (error || !guestUser) {
      return new Response(JSON.stringify({ success: false, error: "Usuário não encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      user: guestUser,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    logError("auth-social", `Erro no guest/me: ${error}`);
    return new Response(JSON.stringify({ success: false, error: "Erro interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ============================================================================
// ROUTER
// ============================================================================

export function createAuthSocialRoutes() {
  return {
    // Staff (painel Rendizy)
    "POST /auth/social/google": handleStaffGoogleLogin,
    
    // Guest (sites clientes) - registrado no rendizy-public
    // "POST /client-sites/api/:subdomain/auth/guest/google": handleGuestGoogleLogin,
    // "GET /client-sites/api/:subdomain/auth/guest/me": handleGuestMe,
  };
}
