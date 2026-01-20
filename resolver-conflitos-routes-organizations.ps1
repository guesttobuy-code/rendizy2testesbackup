# Script específico para resolver conflitos em routes-organizations.ts
# Mantém a versão HEAD (SQL direto)

Write-Host "=== RESOLVENDO CONFLITOS EM routes-organizations.ts ===" -ForegroundColor Cyan
Write-Host ""

$filePath = "C:\dev\RENDIZY PASTA OFICIAL\supabase\functions\rendizy-server\routes-organizations.ts"

if (-not (Test-Path $filePath)) {
    Write-Host "❌ Arquivo não encontrado: $filePath" -ForegroundColor Red
    exit 1
}

Write-Host "Lendo arquivo..." -ForegroundColor Yellow
$content = Get-Content $filePath -Raw

# Contar conflitos
$conflictCount = ([regex]::Matches($content, '<<<<<<< HEAD')).Count
Write-Host "Encontrados $conflictCount conflitos" -ForegroundColor Yellow
Write-Host ""

# Resolver conflitos mantendo HEAD
# Padrão: <<<<<<< HEAD ... ======= ... >>>>>>> hash
# Manter apenas a parte HEAD

$resolved = $content

# Remover todos os marcadores de conflito e manter apenas HEAD
# Primeiro, remover blocos ======= ... >>>>>>>
$resolved = $resolved -replace '(?s)=======.*?>>>>>>> [^\r\n]+', ''

# Depois, remover marcadores <<<<<<< HEAD
$resolved = $resolved -replace '<<<<<<< HEAD\r?\n?', ''

# Limpar linhas vazias duplicadas
$resolved = $resolved -replace '(\r?\n){3,}', "`r`n`r`n"

Write-Host "Salvando arquivo resolvido..." -ForegroundColor Yellow
Set-Content -Path $filePath -Value $resolved -NoNewline

Write-Host ""
Write-Host "✅ Conflitos resolvidos!" -ForegroundColor Green
Write-Host ""

# Verificar se ainda há conflitos
$remaining = ([regex]::Matches($resolved, '<<<<<<< HEAD|=======|>>>>>>>')).Count
if ($remaining -gt 0) {
    Write-Host "⚠️  Ainda há $remaining conflitos restantes. Resolva manualmente." -ForegroundColor Yellow
} else {
    Write-Host "✅ Nenhum conflito restante!" -ForegroundColor Green
}
