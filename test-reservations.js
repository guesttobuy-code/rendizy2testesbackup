// 🧪 Script de teste para /reservations
// Execute: node test-reservations.js

const http = require('http');

console.log('🧪 Testando http://localhost:3000/reservations...\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/reservations',
  method: 'GET',
  headers: {
    'User-Agent': 'Test-Script/1.0'
  }
};

const req = http.request(options, (res) => {
  console.log(`✅ Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, JSON.stringify(res.headers, null, 2));
  console.log('\n📦 Resposta:\n');
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    // Se for HTML, mostra apenas primeiras linhas
    if (res.headers['content-type']?.includes('html')) {
      const lines = data.split('\n').slice(0, 30);
      console.log(lines.join('\n'));
      console.log('\n... (HTML truncado)\n');
      
      // Busca por elementos importantes
      console.log('🔍 Verificações:');
      console.log('  ✓ Contém <div id="root">:', data.includes('<div id="root">'));
      console.log('  ✓ Contém scripts:', data.includes('<script'));
      console.log('  ✓ Tamanho:', data.length, 'bytes');
    } else {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Erro:', error.message);
  console.log('\n⚠️  Certifique-se de que o servidor está rodando com: npm run dev');
});

req.end();
