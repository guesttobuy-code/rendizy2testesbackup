# ============================================================================
# INICIAR SERVIDOR FRONTEND - RENDIZY
# Data: 03/12/2025
# Descricao: Inicia o servidor de desenvolvimento Vite na porta 5173
# ============================================================================

Write-Host "Iniciando servidor frontend..." -ForegroundColor Cyan
Write-Host ""

# Navegar para o diretorio do frontend
$frontendDir = "RendizyPrincipal"
if (-not (Test-Path $frontendDir)) {
    Write-Host "ERRO: Diretorio $frontendDir nao encontrado!" -ForegroundColor Red
    Write-Host "   Certifique-se de estar na raiz do projeto" -ForegroundColor Yellow
    exit 1
}

Set-Location $frontendDir

# Verificar se node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "AVISO: Dependencias nao instaladas. Instalando..." -ForegroundColor Yellow
    Write-Host "   Isso pode levar alguns minutos..." -ForegroundColor Gray
    Write-Host ""
    
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "   ERRO ao instalar dependencias!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "   Dependencias instaladas com sucesso!" -ForegroundColor Green
} else {
    Write-Host "Dependencias ja instaladas" -ForegroundColor Green
}

Write-Host ""

# Verificar se package.json existe
if (-not (Test-Path "package.json")) {
    Write-Host "ERRO: package.json nao encontrado!" -ForegroundColor Red
    exit 1
}

# Verificar se porta 5173 esta em uso
$porta = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if ($porta) {
    Write-Host "AVISO: Porta 5173 ja esta em uso!" -ForegroundColor Yellow
    Write-Host "   O servidor pode estar rodando em outra janela" -ForegroundColor Gray
    Write-Host "   Ou feche o processo que esta usando a porta" -ForegroundColor Gray
    Write-Host ""
    $continuar = Read-Host "Deseja continuar mesmo assim? (s/N)"
    if ($continuar -ne "s" -and $continuar -ne "S") {
        Write-Host "Operacao cancelada." -ForegroundColor Yellow
        exit
    }
    Write-Host ""
}

# Iniciar servidor
Write-Host "===============================================================" -ForegroundColor Green
Write-Host "   SERVIDOR INICIANDO..." -ForegroundColor Green
Write-Host "===============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "URL: http://localhost:5173 (ou proxima porta disponivel)" -ForegroundColor Yellow
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Gray
Write-Host ""
Write-Host "NOTA: Se a porta 5173 estiver em uso, o Vite usara a proxima porta disponivel" -ForegroundColor Gray
Write-Host "      (ex: 5174, 5175, etc.)" -ForegroundColor Gray
Write-Host ""
Write-Host "Configuracao:" -ForegroundColor Cyan
Write-Host "   - Frontend: http://localhost:5173 (ou porta mostrada acima)" -ForegroundColor Gray
Write-Host "   - Backend: Edge Functions (Supabase ONLINE)" -ForegroundColor Gray
Write-Host "   - Banco: odcgnzfremrqnvtitpcc.supabase.co" -ForegroundColor Gray
Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# Executar npm run dev
npm run dev
