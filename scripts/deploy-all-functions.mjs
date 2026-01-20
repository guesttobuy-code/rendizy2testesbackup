#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🚀 DEPLOY ALL FUNCTIONS - Script Blindado                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Este script faz deploy de TODAS as Edge Functions do projeto.               ║
 * ║  Use quando quiser garantir que tudo está atualizado.                        ║
 * ║                                                                              ║
 * ║  📋 ADR: docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md                 ║
 * ║                                                                              ║
 * ║  Uso: npm run deploy:all                                                     ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { execSync } from 'node:child_process';

const PROJECT_REF = 'odcgnzfremrqnvtitpcc';

// Ordem importa! Primeiro o servidor principal, depois os dependentes
const FUNCTIONS_TO_DEPLOY = [
  // Servidores principais (não dependem de outras funções)
  'rendizy-server',
  'rendizy-public',
  
  // Funções que IMPORTAM código de rendizy-server
  'staysnet-webhook-receiver',
  'staysnet-webhooks-cron',
  'staysnet-properties-sync-cron',
  
  // Funções independentes
  'calendar-rules-batch',
];

console.log('');
console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║  🚀 DEPLOY ALL - Deploy de todas as Edge Functions               ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('📋 ADR: docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md');
console.log('');
console.log(`Total de funções: ${FUNCTIONS_TO_DEPLOY.length}`);
console.log('');

let success = 0;
let failed = 0;
const failedFunctions = [];

for (let i = 0; i < FUNCTIONS_TO_DEPLOY.length; i++) {
  const fn = FUNCTIONS_TO_DEPLOY[i];
  console.log(`\n[${i + 1}/${FUNCTIONS_TO_DEPLOY.length}] 🔄 Deployando ${fn}...`);
  
  try {
    execSync(
      `supabase functions deploy ${fn} --project-ref ${PROJECT_REF}`,
      { 
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'pipe'],
        timeout: 120000
      }
    );
    
    console.log(`[${i + 1}/${FUNCTIONS_TO_DEPLOY.length}] ✅ ${fn} - OK`);
    success++;
  } catch (error) {
    console.error(`[${i + 1}/${FUNCTIONS_TO_DEPLOY.length}] ❌ ${fn} - FALHOU!`);
    failed++;
    failedFunctions.push(fn);
  }
}

console.log('');
console.log('═'.repeat(70));
console.log('');
console.log('📊 RESULTADO FINAL:');
console.log(`   ✅ Sucesso: ${success}/${FUNCTIONS_TO_DEPLOY.length}`);
console.log(`   ❌ Falhas:  ${failed}/${FUNCTIONS_TO_DEPLOY.length}`);

if (failedFunctions.length > 0) {
  console.log('');
  console.log('   Funções que falharam:');
  failedFunctions.forEach(f => console.log(`     - ${f}`));
}

console.log('');

if (failed > 0) {
  console.log('⚠️  ATENÇÃO: Alguns deploys falharam!');
  process.exit(1);
}

console.log('🎉 Todos os deploys realizados com sucesso!');
console.log('');
console.log('📋 Dashboard: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions');
console.log('');
