import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Guest Area (cápsula): config e tema vêm via URL e são persistidos localmente
// para evitar quebra quando o usuário acessa /guest-area/#/login sem query params.
// Nunca usar token/admin aqui. Sessão do hóspede é via BFF/cookie httpOnly.
// Extrair parâmetros da URL
const params = new URLSearchParams(window.location.search);
const slugParam = params.get('slug') || params.get('subdomain') || '';
const legacyToken = params.get('t') || '';

// Persistência local (usada apenas para detectar troca de tenant)
const storedSlug = (() => {
  try {
    return localStorage.getItem('rendizy_guest_site_slug') || '';
  } catch {
    return '';
  }
})();

const siteSlug = slugParam || '';
if (slugParam) {
  try {
    if (storedSlug && storedSlug !== slugParam) {
      localStorage.removeItem('rendizy_guest');
      localStorage.removeItem('rendizy_guest_token');
      localStorage.removeItem('rendizy_guest_profile');
    }
    localStorage.setItem('rendizy_guest_site_slug', slugParam);
  } catch {}
}

// Cores do tema (persistidas)
const storedPrimary = (() => {
  try {
    return localStorage.getItem('rendizy_guest_primary') || '';
  } catch {
    return '';
  }
})();
const storedSecondary = (() => {
  try {
    return localStorage.getItem('rendizy_guest_secondary') || '';
  } catch {
    return '';
  }
})();
const storedAccent = (() => {
  try {
    return localStorage.getItem('rendizy_guest_accent') || '';
  } catch {
    return '';
  }
})();

const primaryColor = params.get('primary')
  ? decodeURIComponent(params.get('primary')!)
  : (storedPrimary || '#3B82F6');
const secondaryColor = params.get('secondary')
  ? decodeURIComponent(params.get('secondary')!)
  : (storedSecondary || '#10B981');
const accentColor = params.get('accent')
  ? decodeURIComponent(params.get('accent')!)
  : (storedAccent || '#F59E0B');

if (params.get('primary')) {
  try { localStorage.setItem('rendizy_guest_primary', primaryColor); } catch {}
}
if (params.get('secondary')) {
  try { localStorage.setItem('rendizy_guest_secondary', secondaryColor); } catch {}
}
if (params.get('accent')) {
  try { localStorage.setItem('rendizy_guest_accent', accentColor); } catch {}
}

// Aplicar tema via CSS variables
const root = document.documentElement;
root.style.setProperty('--primary', primaryColor);
root.style.setProperty('--secondary', secondaryColor);
root.style.setProperty('--accent', accentColor);

// Configuração global unificada
declare global {
  interface Window {
    GUEST_AREA_CONFIG: {
      supabaseUrl: string;
      supabaseAnonKey: string;
      siteSlug: string;
      googleClientId: string;
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      siteUrl?: string; // URL do site do cliente (domínio customizado ou fallback)
    };
  }
}

// Calcular siteUrl baseado no domínio customizado ou fallback
const siteUrl = siteSlug 
  ? `https://rendizy2testesbackup.vercel.app/site/${siteSlug}/` 
  : undefined;

window.GUEST_AREA_CONFIG = {
  supabaseUrl: 'https://odcgnzfremrqnvtitpcc.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTI3NTgsImV4cCI6MjA1OTg4ODc1OH0.groS5xEMGrPCBHBN0MgMZGSAb1Nd3tPp2DrDRRMzVT8',
  siteSlug,
  googleClientId: '1068989503174-gd08jd74uclfjdv0goe32071uck2sg9k.apps.googleusercontent.com',
  primaryColor,
  secondaryColor,
  accentColor,
  siteUrl,
};

// Salvar token se veio via URL (para persistir)
if (legacyToken && siteSlug) {
  // Migração: converte token legacy (URL/localStorage antigo) em cookie httpOnly
  fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: legacyToken, siteSlug }),
  })
    .then(async (r) => {
      const j = await r.json().catch(() => null);
      if (j?.success && j?.user) {
        try {
          localStorage.setItem('rendizy_guest', JSON.stringify(j.user));
        } catch {}
      }
    })
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
