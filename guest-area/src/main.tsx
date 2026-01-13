import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Extrair parâmetros da URL
const params = new URLSearchParams(window.location.search);
const subdomain = params.get('subdomain') || '';
const token = params.get('t') || localStorage.getItem('rendizy_guest_token') || '';

// Aplicar tema via CSS variables
try {
  const themeParam = params.get('theme');
  if (themeParam) {
    const theme = JSON.parse(decodeURIComponent(themeParam));
    const root = document.documentElement;
    if (theme.primaryColor) root.style.setProperty('--primary', theme.primaryColor);
    if (theme.secondaryColor) root.style.setProperty('--secondary', theme.secondaryColor);
    if (theme.accentColor) root.style.setProperty('--accent', theme.accentColor);
    if (theme.fontFamily) root.style.setProperty('--font-family', theme.fontFamily);
  }
} catch (e) {
  console.warn('Erro ao aplicar tema:', e);
}

// Configuração global
declare global {
  interface Window {
    GUEST_AREA_CONFIG: {
      subdomain: string;
      token: string;
      apiBase: string;
    };
  }
}

window.GUEST_AREA_CONFIG = {
  subdomain,
  token,
  apiBase: 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/client-sites/api',
};

// Salvar token se veio via URL (para persistir)
if (token && !localStorage.getItem('rendizy_guest_token')) {
  localStorage.setItem('rendizy_guest_token', token);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
