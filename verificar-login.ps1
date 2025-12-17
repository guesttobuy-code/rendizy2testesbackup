# Script para verificar status de login no Supabase
# Verifica se há token salvo e testa autenticação

Write-Host "🔍 Verificando status de autenticação..." -ForegroundColor Cyan
Write-Host ""

# Ler configurações do projeto
$projectId = "odcgnzfremrqnvtitpcc"
$apiUrl = "https://$projectId.supabase.co/functions/v1/rendizy-server"

Write-Host "📡 URL da API: $apiUrl" -ForegroundColor Yellow
Write-Host ""

# Verificar se há token no localStorage (via Node.js)
Write-Host "🔑 Verificando token no localStorage..." -ForegroundColor Cyan

# Tentar ler token via Node.js (se disponível)
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCheck) {
    $tokenScript = @"
const fs = require('fs');
const path = require('path');

// Tentar ler do arquivo de configuração ou variável de ambiente
let token = process.env.RENDIZY_TOKEN;

if (!token) {
    console.log('❌ Token não encontrado em variáveis de ambiente');
    console.log('');
    console.log('💡 Para testar autenticação, você precisa:');
    console.log('   1. Fazer login no preview (http://localhost:5173/login)');
    console.log('   2. Copiar o token do localStorage (F12 → Application → Local Storage → rendizy-token)');
    console.log('   3. Executar: \$env:RENDIZY_TOKEN="seu-token-aqui"');
    console.log('   4. Executar este script novamente');
    process.exit(1);
}

console.log('✅ Token encontrado:', token.substring(0, 20) + '...');
console.log('');

// Testar autenticação
const https = require('https');
const url = require('url');

const apiUrl = 'https://$projectId.supabase.co/functions/v1/rendizy-server/auth/me';
const publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ';

const parsedUrl = url.parse(apiUrl);
const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.path,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer \${publicAnonKey}`,
        'X-Auth-Token': token,
        'apikey': publicAnonKey
    }
};

console.log('📡 Testando autenticação...');
console.log('   URL:', apiUrl);
console.log('');

const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('📊 Status da resposta:', res.statusCode);
        console.log('');
        
        try {
            const response = JSON.parse(data);
            
            if (res.statusCode === 200 && response.success) {
                console.log('✅ Autenticação VÁLIDA!' -ForegroundColor Green);
                console.log('');
                console.log('👤 Usuário:', JSON.stringify(response.data?.user || response.data, null, 2));
            } else {
                console.log('❌ Autenticação INVÁLIDA' -ForegroundColor Red);
                console.log('');
                console.log('Resposta:', JSON.stringify(response, null, 2));
            }
        } catch (e) {
            console.log('❌ Erro ao parsear resposta:', e.message);
            console.log('Resposta bruta:', data);
        }
    });
});

req.on('error', (error) => {
    console.log('❌ Erro na requisição:', error.message);
});

req.end();
"@

    $tempScript = [System.IO.Path]::GetTempFileName() + ".js"
    $tokenScript | Out-File -FilePath $tempScript -Encoding UTF8
    
    try {
        node $tempScript
    } catch {
        Write-Host "❌ Erro ao executar script Node.js: $_" -ForegroundColor Red
    } finally {
        Remove-Item $tempScript -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "⚠️ Node.js não encontrado. Instalando dependências..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Para verificar autenticação manualmente:" -ForegroundColor Cyan
    Write-Host "   1. Abra o preview: http://localhost:5173/login" -ForegroundColor White
    Write-Host "   2. Faça login" -ForegroundColor White
    Write-Host "   3. Abra o console do navegador (F12)" -ForegroundColor White
    Write-Host "   4. Execute: localStorage.getItem('rendizy-token')" -ForegroundColor White
    Write-Host "   5. Copie o token e teste no Postman/Insomnia:" -ForegroundColor White
    Write-Host "      GET $apiUrl/auth/me" -ForegroundColor Gray
    Write-Host "      Headers:" -ForegroundColor Gray
    Write-Host "        X-Auth-Token: <seu-token>" -ForegroundColor Gray
    Write-Host "        Authorization: Bearer <public-anon-key>" -ForegroundColor Gray
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
