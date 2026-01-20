// Script simples para testar autenticação
const https = require("https");
const url = require("url");

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente ausentes. Configure SUPABASE_URL e SUPABASE_ANON_KEY em .env.local');
  process.exit(1);
}

const apiUrl = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/rendizy-server/auth/me`;

// Token pode ser passado como argumento ou variável de ambiente
const token = process.argv[2] || process.env.RENDIZY_TOKEN;

if (!token) {
  console.log("❌ Token não fornecido!");
  console.log("");
  console.log("💡 Uso:");
  console.log("   node test-auth.js <seu-token>");
  console.log("   ou");
  console.log('   $env:RENDIZY_TOKEN="seu-token" ; node test-auth.js');
  console.log("");
  console.log("📝 Para obter o token:");
  console.log("   1. Abra http://localhost:5173/login no navegador");
  console.log("   2. Faça login");
  console.log("   3. Abra o console (F12)");
  console.log('   4. Execute: localStorage.getItem("rendizy-token")');
  console.log("   5. Copie o token e use no comando acima");
  process.exit(1);
}

console.log("🔍 Verificando autenticação...");
console.log("📡 URL:", apiUrl);
console.log("🔑 Token:", token.substring(0, 20) + "...");
console.log("");

const parsedUrl = url.parse(apiUrl);
const options = {
  hostname: parsedUrl.hostname,
  path: parsedUrl.path,
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "X-Auth-Token": token,
    apikey: SUPABASE_ANON_KEY,
  },
};

const req = https.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log("📊 Status:", res.statusCode);
    console.log("");

    try {
      const response = JSON.parse(data);

      if (res.statusCode === 200 && response.success) {
        console.log("✅ Autenticação VÁLIDA!");
        console.log("");
        console.log("👤 Dados do usuário:");
        console.log(JSON.stringify(response.data, null, 2));
      } else {
        console.log("❌ Autenticação INVÁLIDA");
        console.log("");
        console.log("Resposta:", JSON.stringify(response, null, 2));
      }
    } catch (e) {
      console.log("❌ Erro ao parsear resposta:", e.message);
      console.log("Resposta bruta:", data);
    }
  });
});

req.on("error", (error) => {
  console.log("❌ Erro na requisição:", error.message);
});

req.end();
