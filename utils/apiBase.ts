// Base da API com possibilidade de override via .env (VITE_API_BASE_URL)
// Fallback: backend local para evitar CORS em desenvolvimento
const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL =
  (envBase && envBase.trim()) ||
  'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server';

export default API_BASE_URL;
