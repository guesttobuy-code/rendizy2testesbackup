# Fix rapido para Git Push - Token na URL
# Baseado na solucao que funcionou antes (GIT_CREDENTIAL_FIXED.md)

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

Write-Host "Configurando Git Push..." -ForegroundColor Cyan

# 1. Configurar remote com token na URL
$remoteUrl = "https://${Token}@github.com/guesttobuy-code/Rendizyoficial.git"
git remote set-url origin $remoteUrl

# 2. Desabilitar credential manager local
git config --local --unset credential.helper 2>$null

# 3. Testar
Write-Host "Testando conexao..." -ForegroundColor Yellow
git ls-remote origin HEAD > $null 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK! Configurado e funcionando." -ForegroundColor Green
    Write-Host "Agora pode fazer: git push" -ForegroundColor Cyan
} else {
    Write-Host "Token pode estar invalido. Verifique." -ForegroundColor Yellow
}

