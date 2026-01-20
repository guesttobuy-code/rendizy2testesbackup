#!/usr/bin/env node
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  🚀 DEPLOY WEBHOOKS - Script Blindado                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                              ║
 * ║  Este script faz deploy de TODAS as funções relacionadas a webhooks          ║
 * ║  para garantir que estejam sempre sincronizadas.                             ║
 * ║                                                                              ║
 * ║  📋 ADR: docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md                 ║
 * ║                                                                              ║
 * ║  Funções deployadas:                                                         ║
 * ║    1. rendizy-server (servidor principal)                                    ║
 * ║    2. staysnet-webhook-receiver (recebe webhooks em tempo real)              ║
 * ║    3. staysnet-webhooks-cron (processa webhooks pendentes via cron)          ║
 * ║                                                                              ║
 * ║  Uso: npm run deploy:webhooks                                                ║
 * ║                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { execSync } from 'node:child_process';

const PROJECT_REF = 'odcgnzfremrqnvtitpcc';

const FUNCTIONS_TO_DEPLOY = [
  'rendizy-server',
  'staysnet-webhook-receiver',
  'staysnet-webhooks-cron',
];

console.log('');
console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║  🚀 DEPLOY WEBHOOKS - Iniciando deploy sincronizado              ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('📋 ADR: docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md');
console.log('');
console.log('Funções a serem deployadas:');
FUNCTIONS_TO_DEPLOY.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
console.log('');

let success = 0;
let failed = 0;

for (const fn of FUNCTIONS_TO_DEPLOY) {
  console.log(`\n🔄 Deployando ${fn}...`);
  
  try {
    const output = execSync(
      `supabase functions deploy ${fn} --project-ref ${PROJECT_REF}`,
      { 
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'pipe'],
        timeout: 120000 // 2 minutos timeout
      }
    );
    
    console.log(`✅ ${fn} - Deploy OK`);
    success++;
  } catch (error) {
    console.error(`❌ ${fn} - FALHOU!`);
    console.error(`   Erro: ${error.message}`);
    failed++;
  }
}

console.log('');
console.log('═'.repeat(70));
console.log('');
console.log('📊 RESULTADO DO DEPLOY:');
console.log(`   ✅ Sucesso: ${success}/${FUNCTIONS_TO_DEPLOY.length}`);
console.log(`   ❌ Falhas:  ${failed}/${FUNCTIONS_TO_DEPLOY.length}`);
console.log('');

if (failed > 0) {
  console.log('⚠️  ATENÇÃO: Alguns deploys falharam!');
  console.log('   Verifique os erros acima e tente novamente.');
  console.log('');
  process.exit(1);
}

console.log('🎉 Todos os deploys realizados com sucesso!');
console.log('');
console.log('📋 Verifique no dashboard:');
console.log('   https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions');
console.log('');
console.log('   Todas as funções devem ter a mesma data de UPDATED_AT.');
console.log('');
