const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE';

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
        hostname: 'odcgnzfremrqnvtitpcc.supabase.co',
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
