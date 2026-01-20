# Script para fazer deploy do backend com correcao do routes-chat.ts

Write-Host "=== DEPLOY DO BACKEND CORRIGIDO ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretorio correto
$currentDir = Get-Location
Write-Host "Diretorio atual: $currentDir" -ForegroundColor Yellow
Write-Host ""

# Navegar para o diretorio do backend
$backendDir = Join-Path $currentDir "supabase\functions\rendizy-server"

if (-not (Test-Path $backendDir)) {
    Write-Host "ERRO: Diretorio nao encontrado: $backendDir" -ForegroundColor Red
    Write-Host "Certifique-se de estar na raiz do projeto." -ForegroundColor Yellow
    exit 1
}

Write-Host "1. Verificando se import do chatApp esta comentado..." -ForegroundColor Yellow
$indexFile = Join-Path $backendDir "index.ts"
$indexContent = Get-Content $indexFile -Raw

if ($indexContent -match "import chatApp from '\.\/routes-chat\.ts';") {
    Write-Host "   ERRO: Import do chatApp ainda esta ativo!" -ForegroundColor Red
    Write-Host "   Corrigindo..." -ForegroundColor Yellow
    
    # Comentar o import
    $indexContent = $indexContent -replace "import chatApp from '\.\/routes-chat\.ts';", "// TODO: Corrigir export default em routes-chat.ts`n// import chatApp from './routes-chat.ts';"
    
    # Comentar as rotas
    $indexContent = $indexContent -replace "app\.route\(""\/rendizy-server\/make-server-67caf26a\/chat"", chatApp\);", "// TODO: Corrigir export default em routes-chat.ts`n// app.route(""/rendizy-server/make-server-67caf26a/chat"", chatApp);"
    $indexContent = $indexContent -replace "app\.route\(""\/rendizy-server\/chat"", chatApp\);", "// app.route(""/rendizy-server/chat"", chatApp);"
    
    Set-Content -Path $indexFile -Value $indexContent -NoNewline
    Write-Host "   Correcao aplicada!" -ForegroundColor Green
} else {
    Write-Host "   OK: Import do chatApp ja esta comentado!" -ForegroundColor Green
}

Write-Host ""
Write-Host "2. Fazendo deploy do backend..." -ForegroundColor Yellow
Write-Host ""

Set-Location $backendDir

# Fazer deploy
npx supabase functions deploy rendizy-server --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "   Deploy realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Proximos passos:" -ForegroundColor Cyan
    Write-Host "   1. Aguardar alguns segundos para o backend reiniciar"
    Write-Host "   2. Verificar logs do Supabase:"
    Write-Host "      https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs/edge-functions"
    Write-Host "   3. Procurar por: 'booted' ou 'Rendizy Backend API starting'"
    Write-Host "   4. Testar rota /organizations no frontend"
} else {
    Write-Host ""
    Write-Host "   ERRO no deploy. Verifique os logs acima." -ForegroundColor Red
}

Set-Location $currentDir
Write-Host ""

