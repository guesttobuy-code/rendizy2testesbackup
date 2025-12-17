# ============================================================================
# Script para Configurar Tokens (Usando tokens fornecidos)
# Supabase CLI + GitHub
# ============================================================================

Write-Host "🔐 Configurando Tokens - Supabase CLI e GitHub" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 1. CONFIGURAR TOKENS
# ============================================================================

# GitHub Token
# Set your GitHub token in your environment or CI; do NOT hardcode tokens in this script.
# $env:GITHUB_TOKEN = "ghp_your_token_here"

# Supabase Access Token / Service Role
# Do not hardcode the service role key here. Use the root `.env.local` and ensure
# `SUPABASE_SERVICE_ROLE_KEY` is set. This script will use the environment value if present.
# $env:SUPABASE_ACCESS_TOKEN = "sb_secret_example"

Write-Host "✅ Tokens configurados como variáveis de ambiente" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 2. CONFIGURAR GITHUB
# ============================================================================

Write-Host "🐙 Configurando GitHub..." -ForegroundColor Yellow

# Configurar remote com token
git remote set-url origin "https://$env:GITHUB_TOKEN@github.com/guesttobuy-code/Rendizyoficial.git"

Write-Host "✅ Remote do GitHub configurado com token" -ForegroundColor Green

# Testar conexão
Write-Host "🧪 Testando conexão GitHub..." -ForegroundColor Gray
$gitTest = git ls-remote --heads origin main 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Conexão GitHub OK" -ForegroundColor Green
} else {
    Write-Host "⚠️ Erro ao testar GitHub: $gitTest" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 3. CONFIGURAR SUPABASE CLI
# ============================================================================

Write-Host "📦 Configurando Supabase CLI..." -ForegroundColor Yellow

# Fazer login com token
Write-Host "🔐 Fazendo login no Supabase..." -ForegroundColor Gray
$loginResult = npx supabase login --token $env:SUPABASE_ACCESS_TOKEN 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Login no Supabase OK" -ForegroundColor Green
} else {
    Write-Host "⚠️ Login resultou em: $loginResult" -ForegroundColor Yellow
    Write-Host "💡 O token pode ser um Secret Key, não um Access Token" -ForegroundColor Cyan
    Write-Host "💡 Para login no CLI, você precisa de um Access Token de: https://supabase.com/dashboard/account/tokens" -ForegroundColor Cyan
}

Write-Host ""

# Verificar projetos
Write-Host "🧪 Verificando projetos..." -ForegroundColor Gray
$projects = npx supabase projects list 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Projetos encontrados:" -ForegroundColor Green
    Write-Host $projects
} else {
    Write-Host "⚠️ Erro ao listar projetos: $projects" -ForegroundColor Yellow
    Write-Host "💡 Pode ser necessário fazer login interativo: npx supabase login" -ForegroundColor Cyan
}

Write-Host ""

# ============================================================================
# 4. LINKAR PROJETO SUPABASE (se login OK)
# ============================================================================

Write-Host "🔗 Tentando linkar projeto Supabase..." -ForegroundColor Yellow

# Verificar se já está linkado
$status = npx supabase status 2>&1
if ($status -match "Linked" -or $status -match "odcgnzfremrqnvtitpcc") {
    Write-Host "✅ Projeto já está linkado" -ForegroundColor Green
} else {
    Write-Host "📌 Linkando projeto..." -ForegroundColor Gray
    $linkResult = npx supabase link --project-ref odcgnzfremrqnvtitpcc 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Projeto linkado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Erro ao linkar: $linkResult" -ForegroundColor Yellow
    }
}

Write-Host ""

# ============================================================================
# 5. RESUMO
# ============================================================================

Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 RESUMO:" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ GitHub:" -ForegroundColor Green
Write-Host "   • Token configurado" -ForegroundColor Gray
Write-Host "   • Remote atualizado" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Supabase:" -ForegroundColor Green
Write-Host "   • Token configurado" -ForegroundColor Gray
Write-Host "   • Login tentado" -ForegroundColor Gray
Write-Host ""
Write-Host "📝 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Testar GitHub:" -ForegroundColor Yellow
Write-Host "   git push" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Verificar Supabase:" -ForegroundColor Yellow
Write-Host "   npx supabase projects list" -ForegroundColor Gray
Write-Host "   npx supabase link --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Se o login do Supabase falhar, use:" -ForegroundColor Yellow
Write-Host "   npx supabase login" -ForegroundColor Gray
Write-Host "   (abre navegador para autenticação)" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️ IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   • Tokens estão configurados apenas para esta sessão" -ForegroundColor Gray
Write-Host "   • Para tornar permanente, configure variáveis de ambiente do Windows" -ForegroundColor Gray
Write-Host "   • NUNCA commite tokens no Git!" -ForegroundColor Gray
Write-Host ""

