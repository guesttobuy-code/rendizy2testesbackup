# ============================================================================
# SALVAR RASCUNHO VIA API - SCRIPT SIMPLIFICADO
# ============================================================================
# Uso: .\salvar-rascunho.ps1 -Token "seu_token"
# OU: $env:AUTH_TOKEN = "seu_token"; .\salvar-rascunho.ps1
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Token = ""
)

$SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
$FUNCTION_URL = "$SUPABASE_URL/functions/v1/rendizy-server/properties"

# Tentar obter token de várias fontes
if (-not $Token -or $Token.Trim() -eq "") {
    $Token = $env:AUTH_TOKEN
}

if (-not $Token -or $Token.Trim() -eq "") {
    Write-Host ""
    Write-Host "❌ ERRO: Token não fornecido!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Use uma das opções:" -ForegroundColor Yellow
    Write-Host "  1. .\salvar-rascunho.ps1 -Token 'seu_token'" -ForegroundColor Cyan
    Write-Host "  2. `$env:AUTH_TOKEN = 'seu_token'; .\salvar-rascunho.ps1" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "🚀 SALVANDO RASCUNHO VIA API" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Token configurado: $($Token.Substring(0, [Math]::Min(20, $Token.Length)))..." -ForegroundColor Green
Write-Host ""

# Payload MÍNIMO - apenas status draft
$payload = @{
    status = "draft"
} | ConvertTo-Json -Compress

Write-Host "📤 Payload: $payload" -ForegroundColor Cyan
Write-Host "⚡ URL: $FUNCTION_URL" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "⏳ Enviando requisição..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $FUNCTION_URL `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Auth-Token" = $Token
        } `
        -Body $payload `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "✅ SUCESSO! Rascunho criado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📥 Resposta completa:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.success -and $response.data -and $response.data.id) {
        $rascunhoId = $response.data.id
        Write-Host "✅ ID do rascunho: $rascunhoId" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔍 Query SQL para encontrar:" -ForegroundColor Yellow
        Write-Host "SELECT id, status, name, code, type, created_at" -ForegroundColor White
        Write-Host "FROM properties" -ForegroundColor White
        Write-Host "WHERE id = '$rascunhoId';" -ForegroundColor White
        Write-Host ""
        Write-Host "Ou execute: encontrar-rascunho-criado.sql" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "⚠️  Resposta não contém ID do rascunho" -ForegroundColor Yellow
        Write-Host "Estrutura da resposta:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 10
    }
    
} catch {
    Write-Host ""
    Write-Host "ERRO ao salvar rascunho!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status HTTP: $statusCode" -ForegroundColor Red
        
        # Tentar ler o corpo da resposta de erro
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
            
            if ($responseBody) {
                Write-Host ""
                Write-Host "Detalhes do erro (corpo da resposta):" -ForegroundColor Red
                try {
                    $errorJson = $responseBody | ConvertFrom-Json
                    $errorJson | ConvertTo-Json -Depth 10
                } catch {
                    Write-Host $responseBody
                }
            }
        } catch {
            # Ignorar se não conseguir ler o stream
        }
    }
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalhes do erro:" -ForegroundColor Red
        try {
            $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
            $errorJson | ConvertTo-Json -Depth 10
        } catch {
            Write-Host $_.ErrorDetails.Message
        }
    }
    
    Write-Host ""
    Write-Host "Dicas:" -ForegroundColor Yellow
    Write-Host "  - Verifique se o token esta correto" -ForegroundColor White
    Write-Host "  - Verifique se esta logado no sistema" -ForegroundColor White
    Write-Host "  - Verifique os logs do backend" -ForegroundColor White
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
