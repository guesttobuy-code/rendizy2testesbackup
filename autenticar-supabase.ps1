# Script para autenticar no Supabase CLI e fazer deploy

Write-Host "=== AUTENTICACAO SUPABASE CLI ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se está autenticado
Write-Host "1. Verificando autenticacao..." -ForegroundColor Yellow
$authStatus = npx supabase status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "   Nao autenticado. Fazendo login..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Siga as instrucoes no navegador que abrir..." -ForegroundColor Cyan
    Write-Host ""
    
    npx supabase login
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Login realizado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   Erro no login. Tente manualmente:" -ForegroundColor Red
        Write-Host "   npx supabase login" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "   Ja autenticado!" -ForegroundColor Green
}

Write-Host ""

# 2. Verificar se projeto está linkado
Write-Host "2. Verificando projeto linkado..." -ForegroundColor Yellow
$projectRef = "odcgnzfremrqnvtitpcc"

$linkStatus = npx supabase status 2>&1
if ($linkStatus -notmatch $projectRef) {
    Write-Host "   Projeto nao linkado. Linkando..." -ForegroundColor Yellow
    npx supabase link --project-ref $projectRef
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   Projeto linkado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "   Erro ao linkar projeto. Tente manualmente:" -ForegroundColor Red
        Write-Host "   npx supabase link --project-ref $projectRef" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "   Projeto ja linkado!" -ForegroundColor Green
}

Write-Host ""

# 3. Verificar status
Write-Host "3. Status do projeto:" -ForegroundColor Yellow
npx supabase status

Write-Host ""

# 4. Fazer deploy
Write-Host "4. Fazendo deploy do backend..." -ForegroundColor Yellow
Write-Host ""

$currentDir = Get-Location
$deployDir = Join-Path $currentDir "supabase\functions\rendizy-server"

if (Test-Path $deployDir) {
    Set-Location $deployDir
    Write-Host "   Diretorio: $deployDir" -ForegroundColor Cyan
    Write-Host ""
    
    npx supabase functions deploy rendizy-server --no-verify-jwt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "   Deploy realizado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "   Proximos passos:" -ForegroundColor Cyan
        Write-Host "   1. Recarregar pagina no frontend"
        Write-Host "   2. Verificar logs do Supabase:"
        Write-Host "      https://supabase.com/dashboard/project/$projectRef/logs/edge-functions"
        Write-Host "   3. Filtrar por: 'listOrganizations'"
    } else {
        Write-Host ""
        Write-Host "   Erro no deploy. Verifique os logs acima." -ForegroundColor Red
    }
    
    Set-Location $currentDir
} else {
    Write-Host "   Erro: Diretorio nao encontrado: $deployDir" -ForegroundColor Red
    Write-Host "   Certifique-se de estar na raiz do projeto." -ForegroundColor Yellow
}

Write-Host ""

