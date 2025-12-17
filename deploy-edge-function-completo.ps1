# Script completo para fazer deploy da Edge Function rendizy-server
Write-Host "=== Deploy da Edge Function rendizy-server ===" -ForegroundColor Green
Write-Host ""

# Navegar para o diretório do projeto
$projectRoot = "c:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP"
Set-Location $projectRoot

# Project ID do Supabase
$projectRef = "odcgnzfremrqnvtitpcc"

Write-Host "📋 Project ID: $projectRef" -ForegroundColor Cyan
Write-Host ""

# Verificar se Supabase CLI está disponível
Write-Host "🔍 Verificando Supabase CLI..." -ForegroundColor Yellow
$supabaseVersion = npx supabase --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale com: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
Write-Host ""

# Verificar se está autenticado
Write-Host "🔐 Verificando autenticação..." -ForegroundColor Yellow
$projects = npx supabase projects list 2>&1
if ($LASTEXITCODE -ne 0 -or $projects -match "not authenticated" -or $projects -match "login") {
    Write-Host "⚠️ Não autenticado. Fazendo login interativo..." -ForegroundColor Yellow
    Write-Host "   (Isso abrirá o navegador)" -ForegroundColor Gray
    npx supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro no login" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Autenticado" -ForegroundColor Green
Write-Host ""

# Linkar projeto se necessário
Write-Host "🔗 Verificando link do projeto..." -ForegroundColor Yellow
npx supabase link --project-ref $projectRef 2>&1 | Out-Null
Write-Host "✅ Projeto linkado" -ForegroundColor Green
Write-Host ""

# Navegar para o diretório das functions
Set-Location "$projectRoot\supabase\functions"

# Fazer deploy
Write-Host "🚀 Fazendo deploy da Edge Function rendizy-server..." -ForegroundColor Cyan
Write-Host "   Isso pode levar alguns minutos..." -ForegroundColor Gray
Write-Host ""

$deployOutput = npx supabase functions deploy rendizy-server --project-ref $projectRef 2>&1

# Mostrar output
Write-Host $deployOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host "   A rota /chat/channels/config agora está disponível em produção" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔗 URL da função:" -ForegroundColor Cyan
    Write-Host "   https://$projectRef.supabase.co/functions/v1/rendizy-server/chat/channels/config" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Erro no deploy" -ForegroundColor Red
    Write-Host "   Verifique os logs acima para mais detalhes" -ForegroundColor Yellow
    exit 1
}
