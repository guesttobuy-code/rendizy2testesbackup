# 🛡️ Deploy completo com pull antes do push
# ⚠️ ATUALIZADO: Agora verifica conflitos antes de fazer pull
$log = "C:\dev\RENDIZY PASTA OFICIAL\powershell-outputs.txt"
Set-Location "C:\dev\RENDIZY PASTA OFICIAL"

# PASSO 0: VERIFICAR CONFLITOS ANTES DE QUALQUER OPERAÇÃO (OBRIGATÓRIO)
Write-Host "🔍 Verificando conflitos de merge ANTES de fazer pull..." -ForegroundColor Cyan
Write-Host ""

$verifyScript = Join-Path $PWD "verificar-antes-deploy.ps1"
if (Test-Path $verifyScript) {
    & $verifyScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "🚨 ERRO: CONFLITOS DE MERGE DETECTADOS!" -ForegroundColor Red
        Write-Host ""
        Write-Host "⚠️  NÃO É POSSÍVEL FAZER PULL COM CONFLITOS!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Execute para corrigir:" -ForegroundColor Yellow
        Write-Host "  .\resolver-todos-conflitos-definitivo.ps1" -ForegroundColor White
        Write-Host ""
        exit 1
    }
} else {
    Write-Host "⚠️  Script de verificação não encontrado. Continuando sem verificação..." -ForegroundColor Yellow
    Write-Host ""
}

function Executar {
    param([string]$cmd, [string]$desc)
    $ts = Get-Date -Format "HH:mm:ss"
    "`n[$ts] $desc" | Out-File $log -Append -Encoding UTF8
    "Comando: $cmd" | Out-File $log -Append -Encoding UTF8
    "---" | Out-File $log -Append -Encoding UTF8
    $result = Invoke-Expression $cmd 2>&1 | Out-String
    $result | Out-File $log -Append -Encoding UTF8
    "Exit: $LASTEXITCODE" | Out-File $log -Append -Encoding UTF8
    Write-Host "[$ts] $desc" -ForegroundColor Cyan
    return $result
}

Write-Host "=== DEPLOY COMPLETO COM PULL ===" -ForegroundColor Cyan

# 1. Verificar branch
$branch = git branch --show-current
if ($branch -eq "master") {
    Write-Host "Renomeando master para main..." -ForegroundColor Yellow
    git branch -m master main
    $branch = "main"
}

# 2. Adicionar arquivos
Executar "git add -A" "1. Adicionando arquivos"

# 3. Commit (se houver mudanças)
$status = git status --porcelain
if ($status) {
    Executar 'git commit -m "feat: Deploy completo - Cadeados + Scripts PowerShell"' "2. Commit"
} else {
    "[$(Get-Date -Format 'HH:mm:ss')] Nenhuma mudança para commitar" | Out-File $log -Append -Encoding UTF8
    Write-Host "Nenhuma mudança para commitar" -ForegroundColor Gray
}

# 4. Pull primeiro (integrar mudanças remotas)
Executar "git pull origin $branch --allow-unrelated-histories --no-edit" "3. Pull (integrar mudanças remotas)"

# 5. Push
Executar "git push -u origin $branch" "4. Push para GitHub"

Write-Host "`n✅ Deploy concluído! Log: $log" -ForegroundColor Green
