<#
.SYNOPSIS
    Script padrão de commit com verificação de código.
    REGRA: SEMPRE revisar antes de commitar.

.DESCRIPTION
    Este script executa verificações automáticas antes de permitir commit:
    1. Verifica erros de TypeScript (tsc --noEmit)
    2. Verifica erros de lint (se disponível)
    3. Mostra diff das alterações para revisão
    4. Pede confirmação antes de commitar

.PARAMETER Message
    Mensagem do commit (obrigatório)

.PARAMETER Files
    Arquivos específicos para add (opcional, default = todos os modificados)

.PARAMETER SkipCheck
    Pular verificações (NÃO RECOMENDADO - use apenas em emergências)

.PARAMETER Push
    Fazer push após commit

.EXAMPLE
    .\scripts\safe-commit.ps1 -Message "fix: calendar handlers"
    .\scripts\safe-commit.ps1 -Message "feat: new modal" -Files "App.tsx","components/MyModal.tsx" -Push
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    
    [Parameter(Mandatory=$false)]
    [string[]]$Files,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipCheck,
    
    [Parameter(Mandatory=$false)]
    [switch]$Push
)

$ErrorActionPreference = 'Stop'

# Cores para output
function Write-Step { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Write-OK { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

# Detectar diretório do repositório
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "  SAFE COMMIT - Revisar antes de commitar" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

Set-Location -LiteralPath $repoRoot

# 1. Verificar status do git
Write-Step "1. Verificando status do repositório"
$status = git status --porcelain
if (-not $status) {
    Write-Warn "Nenhuma alteração para commitar"
    exit 0
}

Write-Host "Arquivos modificados:"
git status --short

# 2. Verificar TypeScript (se não pulou verificação)
if (-not $SkipCheck) {
    Write-Step "2. Verificando erros de TypeScript"
    
    # Verificar se tsconfig existe
    if (Test-Path -LiteralPath (Join-Path $repoRoot "tsconfig.json")) {
        try {
            $tscOutput = npx tsc --noEmit 2>&1
            $tscExitCode = $LASTEXITCODE
            
            if ($tscExitCode -ne 0) {
                Write-Err "Erros de TypeScript encontrados:"
                $tscOutput | ForEach-Object { Write-Host $_ -ForegroundColor Red }
                Write-Host ""
                $confirm = Read-Host "Continuar mesmo com erros? (s/N)"
                if ($confirm -ne 's' -and $confirm -ne 'S') {
                    Write-Host "Commit cancelado." -ForegroundColor Yellow
                    exit 1
                }
            } else {
                Write-OK "Nenhum erro de TypeScript"
            }
        } catch {
            Write-Warn "Não foi possível executar tsc: $_"
        }
    } else {
        Write-Warn "tsconfig.json não encontrado, pulando verificação TypeScript"
    }
    
    # 3. Verificar ESLint (se disponível)
    Write-Step "3. Verificando ESLint"
    if (Test-Path -LiteralPath (Join-Path $repoRoot "node_modules/.bin/eslint")) {
        try {
            # Só verificar arquivos staged/modificados
            $filesToLint = if ($Files) { $Files } else { 
                git diff --name-only --cached | Where-Object { $_ -match '\.(ts|tsx|js|jsx)$' }
            }
            
            if ($filesToLint) {
                $eslintOutput = npx eslint $filesToLint --max-warnings=50 2>&1
                $eslintExitCode = $LASTEXITCODE
                
                if ($eslintExitCode -ne 0) {
                    Write-Warn "Avisos/erros de ESLint:"
                    $eslintOutput | Select-Object -First 30 | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
                } else {
                    Write-OK "ESLint passou"
                }
            } else {
                Write-OK "Nenhum arquivo .ts/.tsx para lint"
            }
        } catch {
            Write-Warn "Não foi possível executar eslint: $_"
        }
    } else {
        Write-Warn "ESLint não instalado, pulando verificação"
    }
} else {
    Write-Warn "Verificações puladas (--SkipCheck). USE COM CUIDADO!"
}

# 4. Mostrar diff resumido
Write-Step "4. Resumo das alterações"
git diff --stat

# 5. Mostrar diff detalhado (primeiros arquivos)
Write-Step "5. Preview das alterações (resumido)"
$changedFiles = git diff --name-only
$previewCount = [Math]::Min(3, $changedFiles.Count)

for ($i = 0; $i -lt $previewCount; $i++) {
    $file = $changedFiles[$i]
    Write-Host "`n--- $file ---" -ForegroundColor DarkCyan
    git diff --no-color -- $file | Select-Object -First 40
    if ((git diff --no-color -- $file | Measure-Object -Line).Lines -gt 40) {
        Write-Host "... (mais linhas omitidas)" -ForegroundColor DarkGray
    }
}

if ($changedFiles.Count -gt $previewCount) {
    Write-Host "`n... e mais $($changedFiles.Count - $previewCount) arquivo(s)" -ForegroundColor DarkGray
}

# 6. Confirmação
Write-Step "6. Confirmação"
Write-Host "Mensagem do commit: " -NoNewline
Write-Host $Message -ForegroundColor White

$confirm = Read-Host "`nRevisou as alterações? Deseja commitar? (s/N)"
if ($confirm -ne 's' -and $confirm -ne 'S') {
    Write-Host "Commit cancelado pelo usuário." -ForegroundColor Yellow
    exit 0
}

# 7. Executar commit
Write-Step "7. Executando commit"

if ($Files) {
    git add $Files
} else {
    git add -A
}

git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Err "Commit falhou!"
    exit 1
}

Write-OK "Commit realizado com sucesso!"
git --no-pager log -1 --oneline

# 8. Push (se solicitado)
if ($Push) {
    Write-Step "8. Fazendo push"
    git push
    
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Push realizado com sucesso!"
    } else {
        Write-Err "Push falhou!"
        exit 1
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  COMMIT SEGURO CONCLUÍDO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
