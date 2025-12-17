# Script para criar ZIP com alterações para GitHub
# Data: 06/11/2025

$workspacePath = "C:\Users\rafae\Downloads\Rendizy2producao-main github 15 11 2025\Rendizy2producao-main"
$downloadsPath = "C:\Users\rafae\Downloads"
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipName = "Rendizy_Alteracoes_$timestamp.zip"
$zipPath = Join-Path $downloadsPath $zipName

# Lista de arquivos criados/modificados
$files = @(
    "SCHEMA_ANALISE_COMPLETA.md",
    "SCHEMA_RESUMO_VISUAL.md",
    "SCHEMA_QUESTOES_PENDENTES.md",
    "PLANO_MIGRACAO_BACKEND.md",
    "RESUMO_SITUACAO_ATUAL.md",
    "ANALISE_MIDDLEWARE_CHATGPT.md",
    "RESUMO_IMPLEMENTACAO_PROTECTED_ROUTE.md",
    "ANALISE_TRIGGER_SIGNUP.md",
    "ANALISE_PROMPT_MULTI_TENANT.md",
    "RESUMO_ANALISES_CHATGPT.md",
    "PROMPT_CONTEXTO_COMPLETO_SESSAO.md",
    "src\components\ProtectedRoute.tsx"
)

Write-Host "📦 Criando ZIP com alterações..." -ForegroundColor Cyan
Write-Host "📍 Origem: $workspacePath" -ForegroundColor Gray
Write-Host "📍 Destino: $zipPath" -ForegroundColor Gray
Write-Host ""

# Verificar quais arquivos existem
$filesToZip = @()
foreach ($file in $files) {
    $fullPath = Join-Path $workspacePath $file
    if (Test-Path $fullPath) {
        $filesToZip += $fullPath
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $file (não encontrado)" -ForegroundColor Yellow
    }
}

if ($filesToZip.Count -eq 0) {
    Write-Host "❌ Nenhum arquivo encontrado para compactar!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Compactando $($filesToZip.Count) arquivo(s)..." -ForegroundColor Cyan

# Criar ZIP
try {
    Compress-Archive -Path $filesToZip -DestinationPath $zipPath -Force
    Write-Host ""
    Write-Host "✅ ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host "📁 Arquivo: $zipPath" -ForegroundColor Cyan
    Write-Host "📊 Tamanho: $([math]::Round((Get-Item $zipPath).Length / 1KB, 2)) KB" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🚀 Pronto para fazer push no GitHub!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "❌ Erro ao criar ZIP: $_" -ForegroundColor Red
    exit 1
}

