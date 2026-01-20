<#
.SYNOPSIS
    Deploy para Vercel em produção
.DESCRIPTION
    Faz deploy do projeto para Vercel production usando a CLI
#>
param(
    [switch]$Force,
    [switch]$Preview
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (!(Test-Path (Join-Path $root "package.json"))) {
    $root = Split-Path -Parent $PSScriptRoot
}
Set-Location -LiteralPath $root

Write-Host "`n=== Deploy Vercel ===" -ForegroundColor Cyan
Write-Host "Diretório: $root"

# Verificar se vercel CLI está disponível
$vercelCmd = Get-Command vercel -ErrorAction SilentlyContinue
if (!$vercelCmd) {
    Write-Host "Vercel CLI não encontrado, usando npx..." -ForegroundColor Yellow
    $vercelCmd = @("npx", "vercel")
} else {
    $vercelCmd = @("vercel")
}

function Invoke-Vercel {
    param([string[]]$Args)
    & $vercelCmd[0] @($vercelCmd[1..($vercelCmd.Length - 1)]) @Args
}

# Mostrar versão
Write-Host "`nVercel CLI:"
Invoke-Vercel -Args @("--version")

# Deploy
if ($Preview) {
    Write-Host "`n=== Deploy PREVIEW ===" -ForegroundColor Yellow
    & $vercelCmd
} else {
    Write-Host "`n=== Deploy PRODUCTION ===" -ForegroundColor Green
    if ($Force) {
        Invoke-Vercel -Args @("--prod", "--force")
    } else {
        Invoke-Vercel -Args @("--prod")
    }
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nOK: Deploy concluído com sucesso!" -ForegroundColor Green
} else {
    Write-Host "`nERRO: Deploy falhou com código $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
