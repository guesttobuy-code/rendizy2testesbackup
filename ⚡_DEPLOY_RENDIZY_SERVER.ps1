# ⚡ DEPLOY RENDIZY-SERVER
# ============================================================================
# Deploy da Edge Function consolidada (rendizy-server)
# Substitui completamente a function anuncio-ultimate obsoleta
#
# Versão: 1.0.103.332
# Data: 2025-12-13
# ============================================================================

Write-Host ""
Write-Host "⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡" -ForegroundColor Cyan
Write-Host "⚡  DEPLOY: RENDIZY-SERVER V1.0.103.332" -ForegroundColor Cyan
Write-Host "⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se Supabase CLI está instalado
Write-Host "🔍 Verificando Supabase CLI..." -ForegroundColor Yellow
$supabaseCli = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseCli) {
    Write-Host "❌ ERRO: Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "📦 Instale com: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI encontrado: $($supabaseCli.Version)" -ForegroundColor Green
Write-Host ""

# 2. Verificar se está logado
Write-Host "🔍 Verificando autenticação..." -ForegroundColor Yellow
$authCheck = supabase projects list 2>&1

if ($authCheck -like "*not logged in*" -or $authCheck -like "*error*") {
    Write-Host "❌ ERRO: Não está autenticado no Supabase!" -ForegroundColor Red
    Write-Host "🔐 Execute: supabase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Autenticado com sucesso!" -ForegroundColor Green
Write-Host ""

# 3. Navegar para a pasta do projeto
$projectPath = "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"
Write-Host "📂 Navegando para: $projectPath" -ForegroundColor Yellow
Set-Location $projectPath
Write-Host ""

# 4. Fazer deploy do rendizy-server
Write-Host "🚀 Iniciando deploy do rendizy-server..." -ForegroundColor Cyan
Write-Host "📦 Função: rendizy-server" -ForegroundColor White
Write-Host "🎯 Project: odcgnzfremrqnvtitpcc" -ForegroundColor White
Write-Host ""

npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌❌❌ ERRO NO DEPLOY ❌❌❌" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅✅✅ DEPLOY CONCLUÍDO COM SUCESSO! ✅✅✅" -ForegroundColor Green
Write-Host ""

# 5. Deletar functions obsoletas (se existirem)
Write-Host "🗑️ Verificando functions obsoletas..." -ForegroundColor Yellow
$functionsList = npx supabase functions list --project-ref odcgnzfremrqnvtitpcc 2>&1

$deleted = $false

if ($functionsList -match "anuncio-ultimate") {
    Write-Host "🗑️ Deletando: anuncio-ultimate" -ForegroundColor Yellow
    npx supabase functions delete anuncio-ultimate --project-ref odcgnzfremrqnvtitpcc
    Write-Host "✅ anuncio-ultimate deletada!" -ForegroundColor Green
    $deleted = $true
}

if ($functionsList -match "migrate-users") {
    Write-Host "🗑️ Deletando: migrate-users (temporária)" -ForegroundColor Yellow
    npx supabase functions delete migrate-users --project-ref odcgnzfremrqnvtitpcc
    Write-Host "✅ migrate-users deletada!" -ForegroundColor Green
    $deleted = $true
}

if (-not $deleted) {
    Write-Host "✅ Nenhuma function obsoleta encontrada" -ForegroundColor Green
}

Write-Host ""

Write-Host "📊 ROTAS DISPONÍVEIS:" -ForegroundColor Cyan
Write-Host "  GET    /rendizy-server/anuncios-ultimate/:id" -ForegroundColor White
Write-Host "  POST   /rendizy-server/anuncios-ultimate/create" -ForegroundColor White
Write-Host "  POST   /rendizy-server/anuncios-ultimate/save-field" -ForegroundColor White
Write-Host "  GET    /rendizy-server/anuncios-ultimate/lista" -ForegroundColor White
Write-Host ""
Write-Host "🌐 URL Base:" -ForegroundColor Cyan
Write-Host "  https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server" -ForegroundColor White
Write-Host ""
Write-Host "✅ Frontend já está configurado para usar essas rotas!" -ForegroundColor Green
Write-Host ""
