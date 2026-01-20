# ============================================================================
# Script de Configuração de Acessos
# Supabase CLI + GitHub
# ============================================================================

Write-Host "🔐 Configurando Acessos - Supabase CLI e GitHub" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 1. LOGIN NO SUPABASE CLI
# ============================================================================

Write-Host "📦 Supabase CLI Login" -ForegroundColor Yellow
Write-Host ""

# Opção 1: Se tiver token via variável de ambiente
if ($env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "✅ Token encontrado em variável de ambiente" -ForegroundColor Green
    Write-Host "Fazendo login com token..." -ForegroundColor Gray
    npx supabase login --token $env:SUPABASE_ACCESS_TOKEN
} 
# Opção 2: Se tiver token em arquivo (não versionado)
elseif (Test-Path ".env.local" -ErrorAction SilentlyContinue) {
    Write-Host "📄 Lendo token de .env.local..." -ForegroundColor Gray
    $envContent = Get-Content ".env.local" | Where-Object { $_ -match "SUPABASE_ACCESS_TOKEN" }
    if ($envContent) {
        $token = ($envContent -split "=")[1].Trim()
        if ($token) {
            Write-Host "✅ Token encontrado em .env.local" -ForegroundColor Green
            npx supabase login --token $token
        } else {
            Write-Host "⚠️ Token não encontrado em .env.local" -ForegroundColor Yellow
            Write-Host "Digite o token do Supabase:" -ForegroundColor Cyan
            $token = Read-Host -AsSecureString
            $tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))
            npx supabase login --token $tokenPlain
        }
    }
}
# Opção 3: Login interativo (abre navegador)
else {
    Write-Host "🌐 Iniciando login interativo (abrirá navegador)..." -ForegroundColor Cyan
    Write-Host "Ou pressione Ctrl+C e use: npx supabase login --token SEU_TOKEN" -ForegroundColor Gray
    npx supabase login
}

Write-Host ""
Write-Host "✅ Login no Supabase concluído!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 2. VERIFICAR STATUS SUPABASE
# ============================================================================

Write-Host "📊 Verificando status do Supabase..." -ForegroundColor Yellow
$linkStatus = npx supabase projects list 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Supabase CLI configurado com sucesso!" -ForegroundColor Green
    Write-Host ""
    # Verificar se está linkado com projeto
    $linked = npx supabase status 2>&1
    if ($linked -match "Linked") {
        Write-Host "✅ Projeto linkado" -ForegroundColor Green
    } else {
        Write-Host "📌 Para linkar o projeto, execute:" -ForegroundColor Yellow
        Write-Host "   npx supabase link --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️ Erro ao verificar status do Supabase" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# 3. CONFIGURAR GIT/GITHUB
# ============================================================================

Write-Host "🐙 Configurando Git/GitHub" -ForegroundColor Yellow
Write-Host ""

# Verificar remote atual
$remoteUrl = git remote get-url origin 2>&1
Write-Host "📍 Repositório remoto: $remoteUrl" -ForegroundColor Gray

# Verificar se precisa configurar credencial
$gitConfig = git config --global credential.helper 2>&1
if (-not $gitConfig -or $gitConfig -eq "") {
    Write-Host "⚠️ Helper de credenciais não configurado" -ForegroundColor Yellow
    Write-Host "Configurando credential helper..." -ForegroundColor Gray
    
    # Windows: usar manager-core
    git config --global credential.helper manager-core
    
    Write-Host "✅ Credential helper configurado" -ForegroundColor Green
}

# Opção 1: Token via variável de ambiente
if ($env:GITHUB_TOKEN) {
    Write-Host "✅ Token GitHub encontrado em variável de ambiente" -ForegroundColor Green
    
    # Configurar URL com token
    $repoUrl = $remoteUrl -replace "https://", "https://$env:GITHUB_TOKEN@"
    git remote set-url origin $repoUrl
    
    Write-Host "✅ URL do repositório atualizada com token" -ForegroundColor Green
}
# Opção 2: Token em arquivo
elseif (Test-Path ".env.local" -ErrorAction SilentlyContinue) {
    $envContent = Get-Content ".env.local" | Where-Object { $_ -match "GITHUB_TOKEN" }
    if ($envContent) {
        $token = ($envContent -split "=")[1].Trim()
        if ($token) {
            Write-Host "✅ Token encontrado em .env.local" -ForegroundColor Green
            $repoUrl = $remoteUrl -replace "https://", "https://$token@"
            git remote set-url origin $repoUrl
            Write-Host "✅ URL do repositório atualizada com token" -ForegroundColor Green
        }
    }
}
# Opção 3: Solicitar token
else {
    Write-Host "📝 Para configurar GitHub com token:" -ForegroundColor Cyan
    Write-Host "   1. Crie um Personal Access Token em: https://github.com/settings/tokens" -ForegroundColor Gray
    Write-Host "   2. Execute:" -ForegroundColor Gray
    Write-Host "      `$env:GITHUB_TOKEN='SEU_TOKEN'" -ForegroundColor Yellow
    Write-Host "      git remote set-url origin https://`$env:GITHUB_TOKEN@github.com/suacasarendemais-png/Rendizy2producao.git" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ou use o GitHub CLI:" -ForegroundColor Cyan
    Write-Host "   winget install GitHub.cli" -ForegroundColor Gray
    Write-Host "   gh auth login" -ForegroundColor Gray
}

Write-Host ""
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# 4. TESTAR CONEXÕES
# ============================================================================

Write-Host "🧪 Testando conexões..." -ForegroundColor Yellow
Write-Host ""

# Testar Supabase
Write-Host "📦 Testando Supabase..." -ForegroundColor Gray
$supabaseTest = npx supabase --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Supabase CLI: $supabaseTest" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao testar Supabase CLI" -ForegroundColor Red
}

# Testar Git
Write-Host "🐙 Testando Git..." -ForegroundColor Gray
$gitTest = git --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Git: $gitTest" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao testar Git" -ForegroundColor Red
}

# Testar GitHub (fetch sem fazer pull)
Write-Host "🌐 Testando conexão GitHub..." -ForegroundColor Gray
$githubTest = git ls-remote --heads origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Conexão GitHub OK" -ForegroundColor Green
} else {
    Write-Host "⚠️ Erro ao conectar GitHub (pode ser autenticação)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Configuração concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 RESUMO:" -ForegroundColor Cyan
Write-Host "   • Supabase CLI: Configurado" -ForegroundColor Gray
Write-Host "   • Git/GitHub: Configurado" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "   • Linkar projeto Supabase: npx supabase link --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor Gray
Write-Host "   • Ver logs: Use o Dashboard ou APIs do Supabase" -ForegroundColor Gray
Write-Host "   • Fazer push: git push (token será usado automaticamente)" -ForegroundColor Gray
Write-Host ""
