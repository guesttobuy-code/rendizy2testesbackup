<#
Script para fazer deploy do frontend (Git)

Objetivos:
- Rodar sem prompts interativos
- Evitar commitar arquivos não rastreados por acidente
- Detectar automaticamente repo root, remote e branch

Uso:
    .\deploy-frontend.ps1 [-Message "..."] [-IncludeUntracked]
#>

[CmdletBinding()]
param(
    [string]$Message = 'chore: Atualização automática do frontend',
    [switch]$IncludeUntracked
)

$ErrorActionPreference = 'Stop'

function Resolve-RepoRoot {
    param([Parameter(Mandatory = $true)][string]$StartPath)

    if (-not (Test-Path -LiteralPath $StartPath)) {
        throw "Path não existe: $StartPath"
    }

    $top = $null
    try {
        $top = (git -C $StartPath rev-parse --show-toplevel 2>$null)
    } catch {
        $top = $null
    }
    if (-not $top) {
        throw "Não achei um repositório Git em/abaixo de: $StartPath"
    }
    return $top.Trim()
}

function Resolve-DefaultRemote {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)

    $remotes = @((git -C $RepoRoot remote) 2>$null)
    if (-not $remotes -or $remotes.Count -eq 0) {
        throw 'Nenhum remote configurado (git remote)'
    }
    if ($remotes -contains 'origin') { return 'origin' }
    return $remotes[0]
}

function Resolve-DefaultBranch {
    param([Parameter(Mandatory = $true)][string]$RepoRoot)

    $hasMain = $false
    try {
        git -C $RepoRoot show-ref --verify --quiet refs/heads/main
        $hasMain = ($LASTEXITCODE -eq 0)
    } catch { $hasMain = $false }

    if ($hasMain) { return 'main' }
    $current = (git -C $RepoRoot branch --show-current).Trim()
    if (-not $current) { throw 'Não consegui detectar branch atual' }
    return $current
}

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-RepoRoot -StartPath $scriptPath
$remote = Resolve-DefaultRemote -RepoRoot $repoRoot
$branch = Resolve-DefaultBranch -RepoRoot $repoRoot

Write-Host "`nDeploy do Frontend (Git → Deploy automático)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Verifica se há mudanças
Write-Host "Verificando mudanças..." -ForegroundColor Yellow
$status = git -C $repoRoot status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "Nenhuma mudança para commitar." -ForegroundColor Yellow
    Write-Host "Verificando se precisa fazer push...`n" -ForegroundColor Gray
    
    # Verifica se há commits locais não enviados
    git -C $repoRoot fetch $remote 2>&1 | Out-Null
    $localCommits = git -C $repoRoot log "$remote/$branch"..HEAD --oneline 2>&1
    if ([string]::IsNullOrWhiteSpace($localCommits)) {
        Write-Host "Repositório já está sincronizado.`n" -ForegroundColor Green
        exit 0
    }
} else {
    $untracked = @((git -C $repoRoot status --porcelain=v1) | Where-Object { $_ -match '^\?\?' })
    if ($untracked.Count -gt 0 -and -not $IncludeUntracked) {
        Write-Host "Foram encontrados arquivos NÃO rastreados (??)." -ForegroundColor Yellow
        Write-Host "Por segurança, este script não faz commit deles automaticamente." -ForegroundColor Yellow
        Write-Host "Se quiser incluir, rode com -IncludeUntracked." -ForegroundColor Gray
        Write-Host "\nUntracked (primeiros 20):" -ForegroundColor Gray
        $untracked | Select-Object -First 20 | ForEach-Object { Write-Host $_ }
        exit 1
    }

    Write-Host "Adicionando mudanças..." -ForegroundColor Yellow
    if ($IncludeUntracked) {
        git -C $repoRoot add -A
    } else {
        # Apenas mudanças em arquivos já rastreados
        git -C $repoRoot add -u
    }

    Write-Host "Fazendo commit..." -ForegroundColor Yellow
    git -C $repoRoot commit -m $Message
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao fazer commit.`n" -ForegroundColor Red
        exit 1
    }
}

# Faz push
Write-Host "Enviando para remote '$remote' branch '$branch'..." -ForegroundColor Yellow
git -C $repoRoot push $remote $branch

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeploy do frontend concluído com sucesso!" -ForegroundColor Green
    Write-Host "Seu pipeline (ex: Vercel) deve atualizar em seguida.`n" -ForegroundColor Gray
    exit 0
}

Write-Host "`nErro ao fazer push.`n" -ForegroundColor Red
exit 1

