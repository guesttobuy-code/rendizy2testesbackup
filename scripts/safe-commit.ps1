<#
.SYNOPSIS
    Script padrão de commit com verificação de código e fluxo de branch/PR.
    REGRA: SEMPRE criar branch e revisar antes de commitar.

.DESCRIPTION
    Este script garante que mudanças NUNCA vão direto para main:
    1. Cria branch se especificada (RECOMENDADO)
    2. Verifica erros de TypeScript (tsc --noEmit)
    3. Verifica erros de lint (se disponível)
    4. Mostra diff das alterações para revisão
    5. Pede confirmação antes de commitar
    6. Opcionalmente faz merge para main após confirmação

.PARAMETER Message
    Mensagem do commit (obrigatório)

.PARAMETER Branch
    Nome da branch a criar (ex: feature/fix-blocks). SE NÃO ESPECIFICADO E ESTIVER NA MAIN, BLOQUEIA!

.PARAMETER Files
    Arquivos específicos para add (opcional, default = todos os modificados)

.PARAMETER SkipCheck
    Pular verificações (NÃO RECOMENDADO - use apenas em emergências)

.PARAMETER Push
    Fazer push após commit

.PARAMETER AllowMain
    Permitir commit direto na main (NÃO RECOMENDADO - use apenas em emergências)

.EXAMPLE
    .\scripts\safe-commit.ps1 -Branch "feature/fix-blocks" -Message "fix: calendar handlers"
    .\scripts\safe-commit.ps1 -Branch "chore/update-docs" -Message "docs: atualizar AI_RULES" -Push

.NOTES
    Mantido por: Equipe Rendizy
    Última atualização: 2026-01-09
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Message,
    
    [Parameter(Mandatory=$false)]
    [string]$Branch,
    
    [Parameter(Mandatory=$false)]
    [string[]]$Files,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipCheck,
    
    [Parameter(Mandatory=$false)]
    [switch]$Push,
    
    [Parameter(Mandatory=$false)]
    [switch]$AllowMain
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

# 0. Verificar branch atual e criar nova se necessário
$currentBranch = git branch --show-current
Write-Host "📍 Branch atual: $currentBranch" -ForegroundColor Cyan

if ($currentBranch -eq "main" -and -not $AllowMain) {
    if (-not $Branch) {
        Write-Err "❌ BLOQUEADO: Você está na main sem especificar -Branch!"
        Write-Host ""
        Write-Host "Por segurança, commits diretos na main são bloqueados." -ForegroundColor Yellow
        Write-Host "Use: .\safe-commit.ps1 -Branch 'feature/minha-mudanca' -Message '...'" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Se REALMENTE precisa commitar na main (emergência):" -ForegroundColor DarkGray
        Write-Host "  .\safe-commit.ps1 -AllowMain -Message '...'" -ForegroundColor DarkGray
        exit 1
    }
}

if ($Branch -and $currentBranch -ne $Branch) {
    Write-Step "0. Criando branch: $Branch"
    git checkout -b $Branch 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Branch já existe, fazendo checkout..." -ForegroundColor Yellow
        git checkout $Branch
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Falha ao criar/checkout branch $Branch"
            exit 1
        }
    }
    Write-OK "Agora em: $Branch"
}

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
    $currentBranchNow = git branch --show-current
    git push -u origin $currentBranchNow
    
    if ($LASTEXITCODE -eq 0) {
        Write-OK "Push realizado com sucesso!"
    } else {
        Write-Err "Push falhou!"
        exit 1
    }
    
    # Se estava em branch separada, perguntar sobre merge
    if ($currentBranchNow -ne "main") {
        Write-Host ""
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
        Write-Host "  📊 DIFF vs main" -ForegroundColor Yellow
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Yellow
        git diff main...$currentBranchNow --stat
        
        Write-Host ""
        $mergeConfirm = Read-Host "Deseja fazer merge para main agora? (s/N)"
        if ($mergeConfirm -eq 's' -or $mergeConfirm -eq 'S') {
            git checkout main
            git merge $currentBranchNow
            git push origin main
            Write-OK "Merge para main concluído!"
            
            $deleteBranch = Read-Host "Deletar branch local '$currentBranchNow'? (s/N)"
            if ($deleteBranch -eq 's' -or $deleteBranch -eq 'S') {
                git branch -d $currentBranchNow
                Write-Host "🗑️  Branch local deletada." -ForegroundColor DarkGray
            }
        } else {
            Write-Host ""
            Write-Host "⏸️  Merge adiado. Branch '$currentBranchNow' está salva no origin." -ForegroundColor Cyan
            Write-Host "Para fazer merge depois:" -ForegroundColor DarkGray
            Write-Host "  git checkout main && git merge $currentBranchNow && git push" -ForegroundColor DarkGray
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  COMMIT SEGURO CONCLUÍDO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green
