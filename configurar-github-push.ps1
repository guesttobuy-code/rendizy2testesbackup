# ============================================================================
# Configurar GitHub Push - Autenticacao via Token na URL
# ============================================================================
# Configura o Git para fazer push sem pedir autenticacao, usando token na URL
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [string]$Token
)

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   CONFIGURAR GITHUB PUSH - AUTENTICACAO VIA CLI" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# PASSO 1: Verificar Git
Write-Host "PASSO 1: Verificando Git..." -ForegroundColor Yellow
try {
    $gitVersion = git --version 2>&1
    Write-Host "   OK: Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "   ERRO: Git nao esta instalado!" -ForegroundColor Red
    exit 1
}
Write-Host ""

# PASSO 2: Verificar Remote Atual
Write-Host "PASSO 2: Verificando remote atual..." -ForegroundColor Yellow
$currentRemote = git remote get-url origin 2>$null

if (-not $currentRemote) {
    Write-Host "   ERRO: Nenhum remote 'origin' encontrado!" -ForegroundColor Red
    Write-Host "   Configure o remote primeiro:" -ForegroundColor Yellow
    Write-Host "      git remote add origin https://github.com/guesttobuy-code/Rendizyoficial.git" -ForegroundColor White
    exit 1
}

Write-Host "   Remote atual:" -ForegroundColor Cyan
# Ocultar token na exibicao
$remoteSeguro = $currentRemote
if ($currentRemote -like "*ghp_*") {
    $remoteSeguro = $currentRemote -replace "ghp_[^@]+", "ghp_***"
}
Write-Host "      $remoteSeguro" -ForegroundColor Gray
Write-Host ""

# Extrair repositorio da URL atual
$username = "guesttobuy-code"
$repo = "Rendizyoficial"

if ($currentRemote -like "*github.com*") {
    $parts = $currentRemote -split "/"
    foreach ($part in $parts) {
        if ($part -like "*github.com*") {
            $idx = [array]::IndexOf($parts, $part)
            if ($idx -ge 0 -and ($idx + 1) -lt $parts.Length) {
                $username = $parts[$idx + 1] -replace "@.*", ""
                if (($idx + 2) -lt $parts.Length) {
                    $repo = $parts[$idx + 2] -replace "\.git$", ""
                }
            }
        }
    }
}

Write-Host "   Repositorio: $username/$repo" -ForegroundColor Cyan
Write-Host ""

# PASSO 3: Obter ou Usar Token
Write-Host "PASSO 3: Configurando token..." -ForegroundColor Yellow

# Verificar se token ja esta na URL
$tokenNaUrl = $null
if ($currentRemote -like "*ghp_*") {
    $startIdx = $currentRemote.IndexOf("ghp_")
    if ($startIdx -ge 0) {
        $endIdx = $currentRemote.IndexOf("@", $startIdx)
        if ($endIdx -gt $startIdx) {
            $tokenNaUrl = $currentRemote.Substring($startIdx, $endIdx - $startIdx)
            Write-Host "   Token encontrado na URL atual" -ForegroundColor Green
        }
    }
}

# Se nao foi passado token como parametro, pedir ao usuario
if (-not $Token) {
    if ($tokenNaUrl) {
        Write-Host "   Token atual na URL: $($tokenNaUrl.Substring(0, [Math]::Min(20, $tokenNaUrl.Length)))..." -ForegroundColor Cyan
        $usarTokenAtual = Read-Host "   Usar token atual? (S/N - N para configurar novo)"
        if ($usarTokenAtual -eq "S" -or $usarTokenAtual -eq "s") {
            $Token = $tokenNaUrl
        }
    }
    
    if (-not $Token) {
        Write-Host ""
        Write-Host "   Para obter um novo token:" -ForegroundColor Yellow
        Write-Host "      1. Acesse: https://github.com/settings/tokens/new" -ForegroundColor White
        Write-Host "      2. Nome: 'Rendizy Push'" -ForegroundColor White
        Write-Host "      3. Escopo: marque 'repo' (acesso completo)" -ForegroundColor White
        Write-Host "      4. Clique em 'Generate token'" -ForegroundColor White
        Write-Host "      5. COPIE o token (so aparece uma vez!)" -ForegroundColor White
        Write-Host ""
        $Token = Read-Host "   Cole o token aqui (ghp_...)"
        
        if ([string]::IsNullOrWhiteSpace($Token)) {
            Write-Host "   ERRO: Token nao fornecido!" -ForegroundColor Red
            exit 1
        }
        
        # Validar formato do token
        if (-not $Token.StartsWith("ghp_")) {
            Write-Host "   AVISO: Formato do token pode estar incorreto (deve comecar com 'ghp_')" -ForegroundColor Yellow
            $continuar = Read-Host "   Continuar mesmo assim? (S/N)"
            if ($continuar -ne "S" -and $continuar -ne "s") {
                exit 1
            }
        }
    }
}

Write-Host "   OK: Token configurado: $($Token.Substring(0, [Math]::Min(20, $Token.Length)))..." -ForegroundColor Green
Write-Host ""

# PASSO 4: Configurar Remote com Token
Write-Host "PASSO 4: Configurando remote com token..." -ForegroundColor Yellow

$novoRemote = "https://${Token}@github.com/${username}/${repo}.git"

Write-Host "   Atualizando remote..." -ForegroundColor Cyan
git remote set-url origin $novoRemote

if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK: Remote atualizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "   ERRO: Erro ao atualizar remote" -ForegroundColor Red
    exit 1
}
Write-Host ""

# PASSO 5: Desabilitar Git Credential Manager (para usar token da URL)
Write-Host "PASSO 5: Configurando credential helper..." -ForegroundColor Yellow

# Remover credential helpers globais que podem interferir
Write-Host "   Removendo credential helpers globais..." -ForegroundColor Cyan
git config --global --unset-all credential.helper 2>$null

# Configurar para este repositorio usar 'store' (salva credenciais localmente)
Write-Host "   Configurando credential helper local como 'store'..." -ForegroundColor Cyan
git config --local credential.helper store

# Tambem configurar para nao usar manager-core
git config --local --unset credential.https://dev.azure.com.usehttppath 2>$null

Write-Host "   OK: Credential helper configurado!" -ForegroundColor Green
Write-Host ""

# PASSO 6: Testar Conexao
Write-Host "PASSO 6: Testando conexao com GitHub..." -ForegroundColor Yellow

Write-Host "   Testando ls-remote..." -ForegroundColor Cyan
$testResult = git ls-remote origin HEAD 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   OK: Conexao funcionando! Token valido." -ForegroundColor Green
    Write-Host "   Branch HEAD encontrada" -ForegroundColor Cyan
} else {
    Write-Host "   AVISO: Teste de conexao falhou:" -ForegroundColor Yellow
    Write-Host "   $testResult" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Possiveis causas:" -ForegroundColor Yellow
    Write-Host "      - Token expirado ou invalido" -ForegroundColor White
    Write-Host "      - Token sem permissao 'repo'" -ForegroundColor White
    Write-Host "      - Repositorio nao existe ou sem acesso" -ForegroundColor White
    Write-Host ""
    Write-Host "   Tente fazer um push para validar:" -ForegroundColor Cyan
    Write-Host "      git push origin main" -ForegroundColor White
}
Write-Host ""

# RESUMO
Write-Host "============================================================" -ForegroundColor Green
Write-Host "   CONFIGURACAO CONCLUIDA!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Configuracao:" -ForegroundColor Yellow
Write-Host "   Remote: https://github.com/${username}/${repo}.git" -ForegroundColor White
Write-Host "   Token: $($Token.Substring(0, [Math]::Min(20, $Token.Length)))..." -ForegroundColor White
Write-Host "   Credential Helper: store (local)" -ForegroundColor White
Write-Host ""

Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "   1. Testar push: git push origin main" -ForegroundColor White
Write-Host "   2. Ou simplesmente: git push" -ForegroundColor White
Write-Host ""

Write-Host "Se ainda pedir autenticacao:" -ForegroundColor Cyan
Write-Host "   - O token pode ter expirado" -ForegroundColor White
Write-Host "   - Execute este script novamente com um novo token" -ForegroundColor White
Write-Host "   - Ou use: .\configurar-github-push.ps1 -Token 'seu-novo-token'" -ForegroundColor White
Write-Host ""

Write-Host "Obter novo token: https://github.com/settings/tokens/new" -ForegroundColor Cyan
Write-Host ""
