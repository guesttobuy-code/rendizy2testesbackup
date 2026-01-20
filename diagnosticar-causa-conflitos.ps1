# Script de DIAGNÓSTICO COMPLETO para entender por que conflitos voltam

Write-Host "=== DIAGNÓSTICO: POR QUE CONFLITOS VOLTAM? ===" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL"

# 1. Verificar status do Git
Write-Host "1. STATUS DO GIT:" -ForegroundColor Yellow
try {
    Push-Location $projectPath
    $status = git status 2>&1
    Write-Host $status
} catch {
    Write-Host "  ❌ Erro ao verificar status: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host ""

# 2. Verificar se há merge em andamento
Write-Host "2. VERIFICAR MERGE EM ANDAMENTO:" -ForegroundColor Yellow
$mergeHead = Join-Path $projectPath ".git\MERGE_HEAD"
if (Test-Path $mergeHead) {
    Write-Host "  ⚠️  MERGE EM ANDAMENTO!" -ForegroundColor Red
    Write-Host "  Hash: $(Get-Content $mergeHead)" -ForegroundColor White
    Write-Host "  SOLUÇÃO: git merge --abort" -ForegroundColor Yellow
} else {
    Write-Host "  ✅ Nenhum merge em andamento" -ForegroundColor Green
}

Write-Host ""

# 3. Verificar branches
Write-Host "3. BRANCHES:" -ForegroundColor Yellow
try {
    Push-Location $projectPath
    $branches = git branch -a 2>&1
    Write-Host $branches
} catch {
    Write-Host "  ❌ Erro: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host ""

# 4. Verificar últimos commits
Write-Host "4. ÚLTIMOS 10 COMMITS:" -ForegroundColor Yellow
try {
    Push-Location $projectPath
    $log = git log --oneline --graph -10 2>&1
    Write-Host $log
} catch {
    Write-Host "  ❌ Erro: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host ""

# 5. Verificar configurações de merge
Write-Host "5. CONFIGURAÇÕES DE MERGE:" -ForegroundColor Yellow
try {
    Push-Location $projectPath
    $config = git config --list 2>&1 | Select-String "merge|pull|rebase"
    if ($config) {
        Write-Host $config
    } else {
        Write-Host "  ℹ️  Nenhuma configuração especial de merge" -ForegroundColor Cyan
    }
} catch {
    Write-Host "  ❌ Erro: $_" -ForegroundColor Red
} finally {
    Pop-Location
}

Write-Host ""

# 6. Verificar se há scripts fazendo git pull/merge
Write-Host "6. SCRIPTS COM GIT PULL/MERGE:" -ForegroundColor Yellow
$scripts = Get-ChildItem -Path $projectPath -Recurse -Include "*.ps1","*.sh","*.bat" -File | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.git*"
}
$found = $false
foreach ($script in $scripts) {
    $content = Get-Content $script.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match 'git pull' -or $content -match 'git merge' -or $content -match 'git rebase')) {
        $found = $true
        Write-Host "  ⚠️  $($script.Name)" -ForegroundColor Yellow
        $lines = $content -split "`n" | Select-String -Pattern "git (pull|merge|rebase)" | Select-Object -First 3
        foreach ($line in $lines) {
            Write-Host "    → $($line.Line.Trim())" -ForegroundColor White
        }
    }
}
if (-not $found) {
    Write-Host "  ✅ Nenhum script fazendo pull/merge automático" -ForegroundColor Green
}

Write-Host ""

# 7. Contar conflitos atuais
Write-Host "7. CONFLITOS ATUAIS:" -ForegroundColor Yellow
$rendizyPath = Join-Path $projectPath "RendizyPrincipal"
$conflictFiles = Get-ChildItem -Path $rendizyPath -Recurse -Include "*.tsx","*.ts","*.jsx","*.js" -File | Where-Object {
    $_.FullName -notlike "*node_modules*" -and
    $_.FullName -notlike "*\.git*" -and
    $_.FullName -notlike "*dist*"
} | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and ($content -match '<<<<<<< HEAD' -or $content -match '=======' -or $content -match '>>>>>>>')) {
        $_
    }
}

$conflictCount = ($conflictFiles | Measure-Object).Count
Write-Host "  Arquivos com conflitos: $conflictCount" -ForegroundColor $(if ($conflictCount -gt 0) { "Red" } else { "Green" })

if ($conflictCount -gt 0) {
    Write-Host ""
    Write-Host "  Arquivos críticos:" -ForegroundColor Yellow
    $critical = $conflictFiles | Where-Object { $_.Name -match "App\.tsx|AuthContext|ErrorBoundary" } | Select-Object -First 5
    foreach ($file in $critical) {
        Write-Host "    - $($file.Name)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "=== CONCLUSÃO ===" -ForegroundColor Cyan
Write-Host ""

if ($conflictCount -gt 0) {
    Write-Host "🚨 CONFLITOS DETECTADOS!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Execute: .\resolver-todos-conflitos.ps1" -ForegroundColor White
    Write-Host "  2. Verifique: .\prevenir-conflitos.ps1" -ForegroundColor White
    Write-Host "  3. Se conflitos voltarem, verifique:" -ForegroundColor White
    Write-Host "     - Há merge em andamento?" -ForegroundColor White
    Write-Host "     - Algum script fazendo pull automático?" -ForegroundColor White
    Write-Host "     - Commits foram feitos com conflitos?" -ForegroundColor White
} else {
    Write-Host "✅ Nenhum conflito encontrado!" -ForegroundColor Green
}
