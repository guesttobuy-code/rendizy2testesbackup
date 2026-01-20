# Script para verificar site Medhome no KV Store via API
Write-Host "🔍 Verificando site Medhome no backend..." -ForegroundColor Cyan
Write-Host ""

$SUPABASE_URL = $env:SUPABASE_URL
$anonKey = $env:SUPABASE_ANON_KEY

if (-not $SUPABASE_URL) { throw "Missing env var SUPABASE_URL" }
if (-not $anonKey) { throw "Missing env var SUPABASE_ANON_KEY" }

$url = "$SUPABASE_URL/functions/v1/rendizy-server/make-server-67caf26a/client-sites/by-subdomain/medhome"

try {
    $response = Invoke-RestMethod -Uri $url -Method GET -Headers @{
        "Authorization" = "Bearer $anonKey"
        "Content-Type" = "application/json"
    } -ErrorAction Stop
    
    Write-Host "✅ Resposta recebida:" -ForegroundColor Green
    Write-Host ""
    Write-Host "Site Name: $($response.data.siteName)" -ForegroundColor Yellow
    Write-Host "Subdomain: $($response.data.subdomain)" -ForegroundColor Yellow
    Write-Host "Organization ID: $($response.data.organizationId)" -ForegroundColor Yellow
    Write-Host "Is Active: $($response.data.isActive)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📦 SiteCode:" -ForegroundColor Cyan
    if ($response.data.siteCode) {
        Write-Host "   ✅ Existe: SIM" -ForegroundColor Green
        Write-Host "   📏 Tamanho: $($response.data.siteCode.Length) caracteres" -ForegroundColor Green
        Write-Host "   📄 Preview (primeiros 200 chars):" -ForegroundColor Gray
        $previewLength = [Math]::Min(200, $response.data.siteCode.Length)
        Write-Host "   $($response.data.siteCode.Substring(0, $previewLength))..." -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Existe: NÃO" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "📁 ArchivePath:" -ForegroundColor Cyan
    if ($response.data.archivePath) {
        Write-Host "   ✅ Existe: SIM" -ForegroundColor Green
        Write-Host "   📄 Path: $($response.data.archivePath)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Existe: NÃO" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "📁 ArchiveUrl:" -ForegroundColor Cyan
    if ($response.data.archiveUrl) {
        Write-Host "   ✅ Existe: SIM" -ForegroundColor Green
        Write-Host "   🔗 URL: $($response.data.archiveUrl)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Existe: NÃO" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Erro ao fazer requisição:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
