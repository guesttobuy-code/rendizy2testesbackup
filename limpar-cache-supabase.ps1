# Script para Limpar Cache do Supabase e Fazer Deploy
# Execute este script no PowerShell

Write-Host "Iniciando limpeza de cache e deploy do Supabase..." -ForegroundColor Cyan
Write-Host ""

# Caminho base do projeto
$projectPath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"
$supabasePath = Join-Path $projectPath "supabase"

# Verificar se a pasta supabase existe
if (-not (Test-Path $supabasePath)) {
    Write-Host "Erro: Pasta supabase nao encontrada em: $supabasePath" -ForegroundColor Red
    exit 1
}

# Mudar para o diretorio supabase
Set-Location $supabasePath
Write-Host "Diretorio atual: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# 1. Verificar codigo local (nao deve ter kv.set para org)
Write-Host "Verificando codigo local..." -ForegroundColor Yellow
$routesFile = Join-Path $supabasePath "functions\rendizy-server\routes-organizations.ts"
if (Test-Path $routesFile) {
    $hasKvSet = Select-String -Path $routesFile -Pattern "kv\.set.*org:" -Quiet
    if ($hasKvSet) {
        Write-Host "ATENCAO: Codigo local ainda contem kv.set para organizacoes!" -ForegroundColor Yellow
        Write-Host "   Remova o codigo antigo antes de fazer deploy." -ForegroundColor Yellow
    } else {
        Write-Host "Codigo local esta limpo (sem kv.set para org)" -ForegroundColor Green
    }
} else {
    Write-Host "Arquivo routes-organizations.ts nao encontrado" -ForegroundColor Yellow
}
Write-Host ""

# 2. Fazer deploy forcado
Write-Host "Fazendo deploy forcado do rendizy-server..." -ForegroundColor Cyan
Write-Host "   (Isso força recompilacao e limpa cache do Deno)" -ForegroundColor Gray
Write-Host ""

supabase functions deploy rendizy-server --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Deploy concluido com sucesso!" -ForegroundColor Green
    Write-Host ""
    
    # 4. Verificar logs (opcional)
    Write-Host "Deseja ver os logs recentes? (S/N)" -ForegroundColor Yellow
    $verLogs = Read-Host
    if ($verLogs -eq "S" -or $verLogs -eq "s") {
        Write-Host ""
        Write-Host "Ultimos logs do rendizy-server:" -ForegroundColor Cyan
        supabase functions logs rendizy-server --limit 10
    }
    
    Write-Host ""
    Write-Host "Processo concluido!" -ForegroundColor Green
    Write-Host "   Agora voce pode testar criar uma organizacao." -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Erro durante o deploy. Verifique os logs acima." -ForegroundColor Red
    exit 1
}

# Voltar para o diretorio original
Set-Location $projectPath
