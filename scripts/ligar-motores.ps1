<#
.SYNOPSIS
    Gera lista dos últimos 20 arquivos .md para contexto de novo chat
.DESCRIPTION
    Auxilia no processo de "Ligando os motores" identificando os arquivos
    mais recentes para a IA ler e se contextualizar.
.EXAMPLE
    .\scripts\ligar-motores.ps1
    .\scripts\ligar-motores.ps1 -Top 30
#>
param(
    [int]$Top = 20,
    [switch]$Clipboard,
    [switch]$Full
)

$ErrorActionPreference = "Stop"

# Detectar raiz do projeto
$scriptDir = Split-Path -Parent $PSScriptRoot
if (!(Test-Path (Join-Path $scriptDir "package.json"))) {
    $scriptDir = $PSScriptRoot
}
Set-Location -LiteralPath $scriptDir

Write-Host "`n🚀 LIGANDO OS MOTORES — Contexto para Novo Chat" -ForegroundColor Cyan
Write-Host "=" * 50

# 1. Últimos arquivos .md por data
Write-Host "`n📅 ÚLTIMOS $Top ARQUIVOS .MD (por data de modificação):" -ForegroundColor Yellow
$recentMd = Get-ChildItem -Path "." -Recurse -Filter "*.md" -File | 
    Where-Object { $_.FullName -notmatch "node_modules|\.git|offline_archives|\.vercel" } |
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First $Top

$recentMd | ForEach-Object {
    $relativePath = $_.FullName.Replace((Get-Location).Path + "\", "")
    $date = $_.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
    Write-Host "  $date  $relativePath" -ForegroundColor Gray
}

# 2. Changelogs
Write-Host "`n📋 CHANGELOGS ENCONTRADOS:" -ForegroundColor Yellow
$changelogs = Get-ChildItem -Path "." -Recurse -Filter "*changelog*.md" -File |
    Where-Object { $_.FullName -notmatch "node_modules|\.git|offline_archives" } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 10

$changelogs | ForEach-Object {
    $relativePath = $_.FullName.Replace((Get-Location).Path + "\", "")
    Write-Host "  $relativePath" -ForegroundColor Gray
}

# 3. Handoffs pendentes
Write-Host "`n🔄 HANDOFFS/PROMPTS PENDENTES:" -ForegroundColor Yellow
$handoffs = Get-ChildItem -Path ".." -Filter "_PROMPT_*.md" -File -ErrorAction SilentlyContinue
if ($handoffs) {
    $handoffs | ForEach-Object {
        Write-Host "  ⚠️  $($_.Name)" -ForegroundColor Red
    }
} else {
    Write-Host "  (nenhum encontrado)" -ForegroundColor DarkGray
}

# 4. Documentação core
Write-Host "`n📚 DOCUMENTAÇÃO CORE:" -ForegroundColor Yellow
$docsCount = (Get-ChildItem -Path "docs" -Recurse -Filter "*.md" -File -ErrorAction SilentlyContinue).Count
Write-Host "  docs/ contém $docsCount arquivos .md" -ForegroundColor Gray

# 5. Versão atual (tentar identificar)
Write-Host "`n🏷️  VERSÃO IDENTIFICADA:" -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json -ErrorAction SilentlyContinue
if ($packageJson -and $packageJson.version) {
    Write-Host "  v$($packageJson.version)" -ForegroundColor Green
} else {
    $latestChangelog = Get-ChildItem -Path "." -Recurse -Filter "CHANGELOG_V*.md" -File |
        Sort-Object Name -Descending |
        Select-Object -First 1
    if ($latestChangelog) {
        Write-Host "  $($latestChangelog.BaseName)" -ForegroundColor Green
    } else {
        Write-Host "  (não identificada)" -ForegroundColor DarkGray
    }
}

# 6. Git status resumido
Write-Host "`n📦 GIT STATUS:" -ForegroundColor Yellow
try {
    $branch = git branch --show-current 2>$null
    $status = git status --porcelain 2>$null | Measure-Object
    Write-Host "  Branch: $branch" -ForegroundColor Gray
    Write-Host "  Arquivos modificados: $($status.Count)" -ForegroundColor Gray
} catch {
    Write-Host "  (git não disponível)" -ForegroundColor DarkGray
}

Write-Host "`n" + "=" * 50
Write-Host "✅ Use 'Ligando os motores.md' para iniciar novo chat" -ForegroundColor Green

# Gerar output para clipboard se solicitado
if ($Clipboard) {
    $output = @"
# 🚀 Contexto Atual — $(Get-Date -Format "yyyy-MM-dd HH:mm")

## Últimos $Top arquivos .md:
$($recentMd | ForEach-Object { "- " + $_.FullName.Replace((Get-Location).Path + "\", "") } | Out-String)

## Changelogs recentes:
$($changelogs | ForEach-Object { "- " + $_.FullName.Replace((Get-Location).Path + "\", "") } | Out-String)

## Leia obrigatoriamente:
- docs/operations/SETUP_COMPLETO.md
- docs/README.md
- CHECKLIST_ANTES_DE_MUDAR_CODIGO.md
"@
    $output | Set-Clipboard
    Write-Host "📋 Copiado para clipboard!" -ForegroundColor Cyan
}
