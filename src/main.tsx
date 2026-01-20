import React from 'react';
// @codex@ Backend Wizard v1.0.103.264 - 03 NOV 2025 - 200+ campos implementados
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { AuthProvider } from './contexts/AuthContext';
import { queryClient } from '../lib/queryClient';
import './styles/globals.css';

console.log('🚀 Iniciando aplicação Rendizy v1.0.103.57...');
console.log('🔥 Build: 20251029-1700 - Fixed AuthProvider + WhatsApp Diagnostics');
console.log('📍 Root element:', document.getElementById('root'));

const root = document.getElementById('root');
if (!root) {
  console.error('❌ Elemento root não encontrado!');
} else {
  console.log('✅ Elemento root encontrado, renderizando App...');
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
  console.log('✅ App renderizado com sucesso!');
}
