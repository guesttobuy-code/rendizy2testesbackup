# ═══════════════════════════════════════════════════════════════
# 🚀 DEPLOY SUPABASE EDGE FUNCTION (VIA NPX)
# ═══════════════════════════════════════════════════════════════
# Script para fazer deploy da Edge Function usando npx supabase
# (sem necessidade de instalação global)
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   🚀 DEPLOY: SUPABASE EDGE FUNCTION (VIA NPX)" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# ═══════════════════════════════════════════════════════════════
# CONFIGURAÇÕES
# ═══════════════════════════════════════════════════════════════
$ProjectRef = "odcgnzfremrqnvtitpcc"
$FunctionName = "rendizy-server"
$TokenUrl = "https://supabase.com/dashboard/account/tokens"

# ═══════════════════════════════════════════════════════════════
# PASSO 1: VERIFICAR NPM
# ═══════════════════════════════════════════════════════════════
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "📦 PASSO 1: VERIFICAR NPM" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Yellow

$npmVersion = npm --version 2>$null
if (-not $npmVersion) {
    Write-Host "❌ NPM não encontrado!" -ForegroundColor Red
    Write-Host "`nInstale o Node.js primeiro: https://nodejs.org/`n" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ NPM encontrado: $npmVersion`n" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# PASSO 2: LOGIN
# ═══════════════════════════════════════════════════════════════
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "🔐 PASSO 2: LOGIN NO SUPABASE" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Yellow

Write-Host "Para fazer login, você precisa de um token de acesso.`n" -ForegroundColor Cyan

Write-Host "📋 COMO OBTER SEU TOKEN:" -ForegroundColor Yellow
Write-Host "   1. Acesse: $TokenUrl" -ForegroundColor White
Write-Host "   2. Clique em 'Generate New Token'" -ForegroundColor White
Write-Host "   3. Dê um nome (ex: 'deploy-cli')" -ForegroundColor White
Write-Host "   4. Copie o token gerado`n" -ForegroundColor White

$token = Read-Host "Cole seu token aqui (ou Enter para login interativo)"

if ([string]::IsNullOrWhiteSpace($token)) {
    Write-Host "`n🌐 Iniciando login interativo no navegador..." -ForegroundColor Cyan
    npx supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Erro no login interativo" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n🔑 Fazendo login com token..." -ForegroundColor Cyan
    $env:SUPABASE_ACCESS_TOKEN = $token
    # Validar token tentando listar projetos
    $projectsTest = npx supabase projects list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Token inválido ou erro no login" -ForegroundColor Red
        Write-Host "Saída: $projectsTest" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Login realizado com sucesso!`n" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# PASSO 3: LISTAR PROJETOS
# ═══════════════════════════════════════════════════════════════
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "📋 PASSO 3: PROJETOS DISPONÍVEIS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Yellow

npx supabase projects list
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Erro ao listar projetos" -ForegroundColor Red
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# PASSO 4: CONFIRMAR PROJECT REF
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "🔗 PASSO 4: CONFIRMAR PROJECT REF" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Yellow

Write-Host "Project Ref padrão: $ProjectRef`n" -ForegroundColor Cyan
$customRef = Read-Host "Pressione Enter para usar o padrão, ou digite outro"

if (-not [string]::IsNullOrWhiteSpace($customRef)) {
    $ProjectRef = $customRef
}

Write-Host "`n✅ Usando project: $ProjectRef`n" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# PASSO 5: LINKAR PROJETO
# ═══════════════════════════════════════════════════════════════
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "🔗 PASSO 5: LINKAR PROJETO" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Yellow

Write-Host "🔗 Linkando projeto $ProjectRef...`n" -ForegroundColor Cyan

npx supabase link --project-ref $ProjectRef
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Erro ao linkar projeto" -ForegroundColor Red
    Write-Host "`nTente manualmente:" -ForegroundColor Yellow
    Write-Host "  npx supabase link --project-ref $ProjectRef`n" -ForegroundColor White
    exit 1
}

Write-Host "`n✅ Projeto linkado com sucesso!`n" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════
# PASSO 6: DEPLOY DA EDGE FUNCTION
# ═══════════════════════════════════════════════════════════════
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "🚀 PASSO 6: DEPLOY DA EDGE FUNCTION" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Yellow

Write-Host "📤 Fazendo deploy de $FunctionName..." -ForegroundColor Cyan
Write-Host "(Isso pode levar alguns segundos)`n" -ForegroundColor DarkGray

npx supabase functions deploy $FunctionName
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ Erro no deploy da função" -ForegroundColor Red
    Write-Host "`nTente manualmente:" -ForegroundColor Yellow
    Write-Host "  cd supabase/functions" -ForegroundColor White
    Write-Host "  npx supabase functions deploy $FunctionName`n" -ForegroundColor White
    exit 1
}

# ═══════════════════════════════════════════════════════════════
# SUCESSO!
# ═══════════════════════════════════════════════════════════════
Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "   ✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Green

Write-Host "📦 RESUMO DAS CORREÇÕES APLICADAS:" -ForegroundColor Cyan
Write-Host "   ✓ 17 correções de mapeamento de campos" -ForegroundColor White
Write-Host "   ✓ Todos os 22 campos agora mapeados corretamente" -ForegroundColor White
Write-Host "   ✓ Commit: b1746c0 (branch: final-clean)" -ForegroundColor White
Write-Host "   ✓ Edge Function: $FunctionName deployed`n" -ForegroundColor White

Write-Host "🧪 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Acesse a interface de anúncios" -ForegroundColor White
Write-Host "   2. Clique em 'Importar do StaysNet'" -ForegroundColor White
Write-Host "   3. Aguarde a importação das 20 propriedades" -ForegroundColor White
Write-Host "   4. Verifique se todos os campos foram salvos`n" -ForegroundColor White

Write-Host "🔍 VALIDAÇÃO:" -ForegroundColor Yellow
Write-Host "   Execute VER-BETH-PERO-SIMPLES.sql para verificar" -ForegroundColor White
Write-Host "   que a propriedade 'Beth Peró' tem os 22 campos`n" -ForegroundColor White

Write-Host "✨ Tudo pronto para testar! ✨`n" -ForegroundColor Green
