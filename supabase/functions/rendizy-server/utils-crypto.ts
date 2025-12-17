import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_PROJECT_REF } from './utils-env.ts';
/**
 * Utilidades de criptografia simétrica para dados sensíveis (ex.: API keys).
 * Usa AES-GCM com chave derivada de variável de ambiente.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getCryptoKey() {
  // Tentar múltiplas variáveis de ambiente possíveis
  const secret = Deno.env.get('AI_PROVIDER_SECRET') 
    || Deno.env.get('RENDAI_SECRET')
    || Deno.env.get('ENCRYPTION_SECRET')
    || SUPABASE_SERVICE_ROLE_KEY; // Fallback para service role key se disponível
  
  if (!secret) {
    // Se não houver secret configurado, usar uma chave padrão baseada no projeto
    // Isso permite que funcione mesmo sem configurar a variável
    const fallbackSecret = SUPABASE_URL || 'rendizy-default-encryption-key-2024';
    console.warn('[Crypto] ⚠️ AI_PROVIDER_SECRET não configurado, usando fallback. Configure a variável para produção.');
    const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(fallbackSecret));
    return crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  const keyMaterial = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
}

function bufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptSensitive(payload: string): Promise<string> {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(payload),
  );
  return `${bufferToBase64(iv.buffer)}:${bufferToBase64(encrypted)}`;
}

export async function decryptSensitive(encoded: string): Promise<string> {
  const [ivB64, dataB64] = encoded.split(':');
  if (!ivB64 || !dataB64) {
    throw new Error('Formato de dado criptografado inválido');
  }

  const key = await getCryptoKey();
  const iv = new Uint8Array(base64ToBuffer(ivB64));
  const encrypted = base64ToBuffer(dataB64);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted,
  );
  return decoder.decode(decrypted);
}
