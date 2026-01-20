# ============================================================================
# CONFIGURAR GITHUB - Token e Credenciais
# ============================================================================
# Uso: .\login-github.ps1
#   Ou: .\login-github.ps1 -Token "seu_token_aqui"
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Token
)

Write-Host "`n🐙 CONFIGURAR GITHUB" -ForegroundColor Cyan
Write-Host "=" * 40 -ForegroundColor Cyan
Write-Host ""

# Verificar Git config
$gitUser = git config user.name 2>&1
$gitEmail = git config user.email 2>&1

if (-not $gitUser) {
    $gitUserInput = Read-Host "Digite seu nome de usuário do GitHub"
    git config --global user.name $gitUserInput
    Write-Host "✅ Nome configurado: $gitUserInput" -ForegroundColor Green
}

if (-not $gitEmail) {
    $gitEmailInput = Read-Host "Digite seu email do GitHub"
    git config --global user.email $gitEmailInput
    Write-Host "✅ Email configurado: $gitEmailInput" -ForegroundColor Green
}

# Configurar token
if ($Token) {
    # Salvar token como variável de ambiente (sessão atual)
    $env:GH_TOKEN = $Token
    $env:GITHUB_TOKEN = $Token
    
    # Configurar Git para usar token
    Write-Host "`n🔐 Configurando Git para usar token..." -ForegroundColor Yellow
    
    # Verificar remote
    $remoteUrl = git remote get-url origin 2>&1
    if ($remoteUrl -and $remoteUrl -match "github.com") {
        # Extrair usuário e repo
        if ($remoteUrl -match "github.com[/:]([^/]+)/([^/]+?)(\.git)?$") {
            $username = $Matches[1]
            $repo = $Matches[2]
            
            # Atualizar remote para incluir token
            $newUrl = "https://${Token}@github.com/${username}/${repo}.git"
            git remote set-url origin $newUrl
            
            Write-Host "✅ Remote configurado com token!" -ForegroundColor Green
            Write-Host "   URL: https://github.com/${username}/${repo}.git" -ForegroundColor White
        }
    }
    
    # Salvar token no helper de credenciais (opcional)
    $saveCredential = Read-Host "`nSalvar token no helper de credenciais? (s/n)"
    if ($saveCredential -eq "s" -or $saveCredential -eq "S") {
        git config --global credential.helper store
        
        # Criar arquivo de credenciais manualmente
        $credentialPath = "$env:USERPROFILE\.git-credentials"
        $credentialLine = "https://${Token}@github.com`n"
        Add-Content -Path $credentialPath -Value $credentialLine -Force
        
        Write-Host "✅ Token salvo no helper de credenciais!" -ForegroundColor Green
    }
    
    Write-Host "`n✅ Token configurado para esta sessão!" -ForegroundColor Green
    Write-Host "   Variáveis de ambiente:" -ForegroundColor White
    Write-Host "   - GH_TOKEN" -ForegroundColor Cyan
    Write-Host "   - GITHUB_TOKEN" -ForegroundColor Cyan
    
} else {
    Write-Host ""
    Write-Host "Para usar token automaticamente:" -ForegroundColor White
    Write-Host "  1. Crie um token em: https://github.com/settings/tokens" -ForegroundColor Cyan
    Write-Host "  2. Execute: .\login-github.ps1 -Token 'seu_token'" -ForegroundColor Cyan
    Write-Host ""
    
    $tokenInput = Read-Host "Digite seu token do GitHub (ou Enter para pular)"
    if ($tokenInput) {
        $env:GH_TOKEN = $tokenInput
        $env:GITHUB_TOKEN = $tokenInput
        
        # Configurar remote com token
        $remoteUrl = git remote get-url origin 2>&1
        if ($remoteUrl -and $remoteUrl -match "github.com") {
            if ($remoteUrl -match "github.com[/:]([^/]+)/([^/]+?)(\.git)?$") {
                $username = $Matches[1]
                $repo = $Matches[2]
                $newUrl = "https://${tokenInput}@github.com/${username}/${repo}.git"
                git remote set-url origin $newUrl
                Write-Host "✅ Remote configurado com token!" -ForegroundColor Green
            }
        }
    }
}

# Verificar acesso
Write-Host "`n🔍 Testando acesso ao GitHub..." -ForegroundColor Yellow
$remoteUrl = git remote get-url origin 2>&1
if ($remoteUrl) {
    Write-Host "   Repositório remoto: $remoteUrl" -ForegroundColor White
    
    $testAccess = git ls-remote origin 2>&1 | Select-Object -First 1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Acesso ao GitHub funcionando!" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Pode precisar autenticar no próximo push" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Nenhum repositório remoto configurado" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host ""

