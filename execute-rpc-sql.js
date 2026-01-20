import fs from 'node:fs';
import https from 'node:https';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (configure in .env.local).');
}

const fixSql = fs.readFileSync('./FIX_RPC_MANUAL.sql', 'utf8');

async function executeRPC() {
  console.log('🔧 Enviando RPC para executar SQL...\n');
  
  // Dividir SQL em múltiplas linhas para enviar via RPC
  const statements = fixSql.split(';').filter(s => s.trim()).map(s => s.trim() + ';');
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`[${i+1}/${statements.length}] Executando: ${statement.substring(0, 50)}...`);
    
    try {
      const payload = {
        p_sql: statement
      };
      
      const reqBody = JSON.stringify(payload);
      
      const options = {
        hostname: new URL(SUPABASE_URL).hostname,
        port: 443,
        path: '/rest/v1/rpc/exec_sql',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(reqBody),
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        }
      };
      
      const result = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            console.log(`   ✅ Status: ${res.statusCode}`);
            if (res.statusCode >= 400) {
              console.log(`   ❌ Error: ${data}`);
              resolve(false);
            } else {
              resolve(true);
            }
          });
        });
        
        req.on('error', err => {
          console.log(`   ❌ Error: ${err.message}`);
          resolve(false);
        });
        
        req.write(reqBody);
        req.end();
      });
      
      if (!result) {
        console.log('⚠️  Pulando para próximo statement...');
        continue;
      }
    } catch (err) {
      console.error(`   ❌ Erro: ${err.message}`);
    }
  }
  
  console.log('\n✅ Todos os statements foram enviados!');
}

executeRPC().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
