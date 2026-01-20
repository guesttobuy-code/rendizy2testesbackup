# Script para criar ZIP com alterações desta sessão
$date = Get-Date -Format 'yyyyMMdd-HHmmss'
$zipName = "Rendizy-Alteracoes-$date.zip"
$downloadsPath = Join-Path $env:USERPROFILE "Downloads"
$zipPath = Join-Path $downloadsPath $zipName

# Arquivos criados/modificados nesta sessão
$files = @(
    'SCHEMA_ANALISE_COMPLETA.md',
    'SCHEMA_RESUMO_VISUAL.md',
    'SCHEMA_QUESTOES_PENDENTES.md',
    'PLANO_MIGRACAO_BACKEND.md',
    'RESUMO_SITUACAO_ATUAL.md',
    'ANALISE_MIDDLEWARE_CHATGPT.md',
    'RESUMO_IMPLEMENTACAO_PROTECTED_ROUTE.md',
    'ANALISE_TRIGGER_SIGNUP.md',
    'ANALISE_PROMPT_MULTI_TENANT.md',
    'RESUMO_ANALISES_CHATGPT.md',
    'src\components\ProtectedRoute.tsx'
)

# Verificar quais arquivos existem
$existingFiles = @()
foreach ($file in $files) {
    if (Test-Path $file) {
        $existingFiles += $file
        Write-Host "✓ $file"
    } else {
        Write-Host "✗ $file (não encontrado)"
    }
}

if ($existingFiles.Count -eq 0) {
    Write-Host "Nenhum arquivo encontrado para comprimir!"
    exit 1
}

# Criar ZIP
Write-Host "`nCriando ZIP: $zipPath"
Compress-Archive -Path $existingFiles -DestinationPath $zipPath -Force

Write-Host "`n✅ ZIP criado com sucesso!"
Write-Host "📦 Arquivo: $zipPath"
Write-Host "📊 Arquivos incluídos: $($existingFiles.Count)"



