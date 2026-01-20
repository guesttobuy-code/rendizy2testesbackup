/**
 * Script para aplicar migration do módulo financeiro via Supabase Management API
 */

import https from 'https';
import fs from 'fs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configurações
const PROJECT_ID = 'odcgnzfremrqnvtitpcc';
const SUPABASE_URL = `https://${PROJECT_ID}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Ler migration SQL
const migrationPath = join(__dirname, '../../supabase/migrations/20241123_create_financeiro_tables.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('📄 Migration carregada:', migrationPath);
console.log('📊 Tamanho do SQL:', migrationSQL.length, 'caracteres');

// Função para executar SQL via REST API do Supabase
async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${PROJECT_ID}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

// Executar migration
async function main() {
  try {
    if (!SERVICE_ROLE_KEY) {
      console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não configurada');
      console.log('💡 Configure a variável de ambiente: export SUPABASE_SERVICE_ROLE_KEY=seu_token');
      process.exit(1);
    }

    console.log('🚀 Aplicando migration do módulo financeiro...');
    console.log('⏳ Isso pode levar alguns segundos...\n');

    // Dividir SQL em statements (separados por ;)
    // Mas na verdade, vamos executar tudo de uma vez
    const result = await executeSQL(migrationSQL);

    console.log('✅ Migration aplicada com sucesso!');
    console.log('📊 Resultado:', result);
    
    console.log('\n✅ Tabelas criadas:');
    console.log('  - financeiro_categorias');
    console.log('  - financeiro_centro_custos');
    console.log('  - financeiro_contas_bancarias');
    console.log('  - financeiro_lancamentos');
    console.log('  - financeiro_lancamentos_splits');
    console.log('  - financeiro_titulos');
    console.log('  - financeiro_linhas_extrato');
    console.log('  - financeiro_regras_conciliacao');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message);
    console.error('💡 Tente aplicar manualmente no SQL Editor do Supabase');
    process.exit(1);
  }
}

main();

