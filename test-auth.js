// Script simples para testar autenticação
const https = require("https");
const url = require("url");

const projectId = "odcgnzfremrqnvtitpcc";
const apiUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/auth/me`;
const publicAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ";

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
    Authorization: `Bearer ${publicAnonKey}`,
    "X-Auth-Token": token,
    apikey: publicAnonKey,
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
