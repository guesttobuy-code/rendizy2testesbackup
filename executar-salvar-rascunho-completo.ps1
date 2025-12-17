# ============================================================================
# EXECUTAR SALVAR RASCUNHO COMPLETO - AUTOMATIZADO
# ============================================================================
# Este script obtém o token do navegador e salva o rascunho automaticamente
# ============================================================================

$SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/rendizy-server/properties"

Write-Host "🚀 SALVANDO RASCUNHO FORÇADO VIA API (AUTOMATIZADO)" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# PASSO 1: Obter token do localStorage do navegador
# ============================================================================
Write-Host "📋 PASSO 1: Obtendo token do navegador..." -ForegroundColor Yellow

# Criar arquivo HTML temporário para obter token via JavaScript
$htmlFile = "$env:TEMP\get-token.html"
$htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>Obter Token</title>
</head>
<body>
    <script>
        const token = localStorage.getItem('rendizy-token');
        if (token) {
            // Escrever token em arquivo temporário
            const fs = require('fs');
            const path = require('path');
            const tokenFile = path.join(require('os').tmpdir(), 'rendizy-token.txt');
            fs.writeFileSync(tokenFile, token);
            console.log('Token obtido e salvo em:', tokenFile);
        } else {
            console.log('Token não encontrado no localStorage');
        }
    </script>
</body>
</html>
"@

# Método alternativo: usar Chrome DevTools Protocol ou pedir ao usuário
Write-Host "⚠️  Não é possível acessar localStorage diretamente via PowerShell." -ForegroundColor Yellow
Write-Host ""
Write-Host "Por favor, execute no console do navegador (F12):" -ForegroundColor Cyan
Write-Host "   localStorage.getItem('rendizy-token')" -ForegroundColor White
Write-Host ""
Write-Host "Depois cole o token aqui:" -ForegroundColor Cyan
$AUTH_TOKEN = Read-Host "Token"

if (-not $AUTH_TOKEN -or $AUTH_TOKEN.Trim() -eq "") {
    Write-Host "❌ ERRO: Token não fornecido!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Token obtido: $($AUTH_TOKEN.Substring(0, [Math]::Min(20, $AUTH_TOKEN.Length)))..." -ForegroundColor Green
Write-Host ""

# ============================================================================
# PASSO 2: Configurar token
# ============================================================================
Write-Host "📋 PASSO 2: Configurando token..." -ForegroundColor Yellow
$env:AUTH_TOKEN = $AUTH_TOKEN
Write-Host "✅ Token configurado na variável de ambiente" -ForegroundColor Green
Write-Host ""

# ============================================================================
# PASSO 3: Executar script de salvar rascunho
# ============================================================================
Write-Host "📋 PASSO 3: Executando script de salvar rascunho..." -ForegroundColor Yellow
Write-Host ""

# Payload MÍNIMO - apenas status draft
$payload = @{
    status = "draft"
} | ConvertTo-Json -Compress

Write-Host "📤 Payload enviado: $payload" -ForegroundColor Cyan
Write-Host ""

# Fazer requisição
Write-Host "⚡ Enviando requisição POST para: $FUNCTION_URL" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $FUNCTION_URL `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Auth-Token" = $AUTH_TOKEN
        } `
        -Body $payload `
        -ErrorAction Stop

    Write-Host "✅ SUCESSO! Rascunho criado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📥 Resposta completa:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.success -and $response.data -and $response.data.id) {
        $rascunhoId = $response.data.id
        Write-Host "✅ ID do rascunho: $rascunhoId" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔍 Query SQL para encontrar o rascunho:" -ForegroundColor Yellow
        Write-Host "SELECT id, status, name, code, type, created_at" -ForegroundColor White
        Write-Host "FROM properties" -ForegroundColor White
        Write-Host "WHERE id = '$rascunhoId';" -ForegroundColor White
        Write-Host ""
        Write-Host "Ou execute o arquivo: encontrar-rascunho-criado.sql" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Resposta não contém ID do rascunho" -ForegroundColor Yellow
        Write-Host "Resposta recebida:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 10
    }
    
} catch {
    Write-Host "❌ ERRO ao salvar rascunho!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Erro:" -ForegroundColor Red
    $_.Exception.Message
    Write-Host ""
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalhes do erro:" -ForegroundColor Red
        try {
            $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorJson | ConvertTo-Json -Depth 10
        } catch {
            Write-Host $_.ErrorDetails.Message
        }
    }
    
    if ($_.Exception.Response) {
        Write-Host "Status HTTP: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "✅ PROCESSO CONCLUÍDO" -ForegroundColor Green
