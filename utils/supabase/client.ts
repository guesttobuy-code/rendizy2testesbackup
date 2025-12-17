/**
 * Singleton do Supabase Client
 * ✅ ARQUITETURA OAuth2 v1.0.103.1010: Evita múltiplas instâncias
 * 
 * Benefícios:
 * - Elimina warning de múltiplos GoTrueClient
 * - Estado único de sessão
 * - Evita corridas de storage
 */

import { createClient } from '@jsr/supabase__supabase-js';
import { projectId, publicAnonKey } from './info.tsx';

let supabaseClient: ReturnType<typeof createClient> | null = null;

/**
 * Obtém instância singleton do Supabase client
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = `https://${projectId}.supabase.co`;
    supabaseClient = createClient(supabaseUrl, publicAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
  }
  return supabaseClient;
}

/**
 * Reseta o singleton (útil para testes ou logout completo)
 */
export function resetSupabaseClient() {
  supabaseClient = null;
}
