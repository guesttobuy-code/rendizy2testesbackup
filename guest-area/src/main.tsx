import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Extrair parâmetros da URL
const params = new URLSearchParams(window.location.search);
const siteSlug = params.get('slug') || params.get('subdomain') || '';
const legacyToken = params.get('t') || '';

// Cores do tema
const primaryColor = params.get('primary') ? decodeURIComponent(params.get('primary')!) : '#3B82F6';
const secondaryColor = params.get('secondary') ? decodeURIComponent(params.get('secondary')!) : '#10B981';
const accentColor = params.get('accent') ? decodeURIComponent(params.get('accent')!) : '#F59E0B';

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
    };
  }
}

window.GUEST_AREA_CONFIG = {
  supabaseUrl: 'https://odcgnzfremrqnvtitpcc.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzMTI3NTgsImV4cCI6MjA1OTg4ODc1OH0.groS5xEMGrPCBHBN0MgMZGSAb1Nd3tPp2DrDRRMzVT8',
  siteSlug,
  googleClientId: '1068989503174-gd08jd74uclfjdv0goe32071uck2sg9k.apps.googleusercontent.com',
  primaryColor,
  secondaryColor,
  accentColor,
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
