#!/usr/bin/env node
/**
 * Script de Validação de Rotas Críticas
 * 
 * Verifica se todas as rotas críticas do WhatsApp ainda existem no código.
 * 
 * Uso:
 *   node scripts/check-critical-routes.js
 * 
 * Retorna código de saída:
 *   0 = Todas as rotas críticas encontradas
 *   1 = Alguma rota crítica está faltando
 */

const fs = require('fs');
const path = require('path');

// Rotas críticas que DEVEM existir
const CRITICAL_ROUTES = [
  {
    file: 'supabase/functions/rendizy-server/routes-chat.ts',
    routes: [
      "app.post('/channels/whatsapp/connect'",
      "app.post('/channels/whatsapp/status'",
      "app.post('/channels/whatsapp/disconnect'",
    ],
    description: 'Rotas WhatsApp em routes-chat.ts'
  },
  {
    file: 'supabase/functions/rendizy-server/routes-whatsapp-evolution.ts',
    routes: [
      "app.get('/rendizy-server/make-server-67caf26a/whatsapp/status'",
      "app.get('/rendizy-server/make-server-67caf26a/whatsapp/qr-code'",
      "app.post('/rendizy-server/make-server-67caf26a/whatsapp/disconnect'",
    ],
    description: 'Rotas WhatsApp em routes-whatsapp-evolution.ts'
  },
  {
    file: 'supabase/functions/rendizy-server/index.ts',
    routes: [
      'app.route("/rendizy-server/chat"',
      'whatsappEvolutionRoutes(app)',
    ],
    description: 'Registro de rotas no index.ts'
  },
];

const projectRoot = path.resolve(__dirname, '..');
let hasErrors = false;
const missingRoutes = [];

console.log('🔍 Verificando rotas críticas do WhatsApp...\n');

for (const { file, routes, description } of CRITICAL_ROUTES) {
  const filePath = path.join(projectRoot, file);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Arquivo não encontrado: ${file}`);
    hasErrors = true;
    missingRoutes.push(`${file} (arquivo não existe)`);
    continue;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const missing = [];
  
  for (const route of routes) {
    if (!content.includes(route)) {
      missing.push(route);
    }
  }
  
  if (missing.length > 0) {
    console.error(`❌ ${description}`);
    console.error(`   Rotas faltando:`);
    missing.forEach(route => {
      console.error(`     - ${route}`);
      missingRoutes.push(`${file}: ${route}`);
    });
    hasErrors = true;
  } else {
    console.log(`✅ ${description}`);
  }
}

console.log('');

if (hasErrors) {
  console.error('❌ ERRO: Algumas rotas críticas estão faltando!');
  console.error('');
  console.error('Rotas faltando:');
  missingRoutes.forEach(route => console.error(`  - ${route}`));
  console.error('');
  console.error('⚠️  NÃO FAÇA DEPLOY até corrigir estas rotas!');
  console.error('📖 Consulte: FUNCIONALIDADES_CRITICAS.md');
  process.exit(1);
} else {
  console.log('✅ Todas as rotas críticas foram encontradas!');
  console.log('✅ Seguro para fazer deploy.');
  process.exit(0);
}





