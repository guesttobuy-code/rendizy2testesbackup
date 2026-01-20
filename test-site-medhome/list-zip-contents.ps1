# Script para listar conteúdo do ZIP do Medhome
$SUPABASE_URL = $env:SUPABASE_URL
$publicAnonKey = $env:SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $publicAnonKey) { throw "Missing env var SUPABASE_ANON_KEY" }

$projectId = ([uri]$SUPABASE_URL).Host.Split('.')[0]
$subdomain = 'medhome'

Write-Host "🔍 Buscando informações do site Medhome..." -ForegroundColor Cyan

# 1. Buscar informações do site
$siteUrl = "$SUPABASE_URL/functions/v1/rendizy-server/make-server-67caf26a/client-sites/by-subdomain/${subdomain}"
try {
    $siteResponse = Invoke-RestMethod -Uri $siteUrl -Headers @{
        apikey = $publicAnonKey
        Authorization = "Bearer $publicAnonKey"
    }
    
    Write-Host "✅ Site encontrado!" -ForegroundColor Green
    Write-Host "📦 Archive Path: $($siteResponse.data.archivePath)" -ForegroundColor Yellow
    
    $archivePath = $siteResponse.data.archivePath
    
    # 2. Baixar ZIP do Supabase Storage
    Write-Host "`n📥 Baixando ZIP do Storage..." -ForegroundColor Cyan
    
    # Usar Supabase JS client via Node.js ou fazer download direto
    # Por enquanto, vamos apenas mostrar o caminho e pedir para verificar manualmente
    Write-Host "`n📋 Para verificar o conteúdo do ZIP:" -ForegroundColor Yellow
    Write-Host "   1. Acesse o Supabase Dashboard" -ForegroundColor White
    Write-Host "   2. Vá em Storage > client-sites" -ForegroundColor White
    Write-Host "   3. Baixe o arquivo: $archivePath" -ForegroundColor White
    Write-Host "   4. Extraia e verifique se existe:" -ForegroundColor White
    Write-Host "      - dist/assets/index-ChhK5BXo.js" -ForegroundColor Cyan
    Write-Host "      - dist/assets/index-lvFSWcOk.css" -ForegroundColor Cyan
    Write-Host "      - dist/index.html" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta: $responseBody" -ForegroundColor Red
    }
}

