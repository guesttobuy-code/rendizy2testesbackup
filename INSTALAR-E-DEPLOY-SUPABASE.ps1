# ========================================
# INSTALAR SUPABASE CLI E FAZER DEPLOY
# ========================================

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔧 INSTALAÇÃO E DEPLOY: SUPABASE CLI" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Navegar para o diretório do projeto
$projectPath = "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"
Set-Location $projectPath

# ========================================
# PASSO 1: INSTALAR SUPABASE CLI
# ========================================
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📦 PASSO 1: INSTALAR SUPABASE CLI" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se npm está instalado
$npmInstalled = Get-Command npm -ErrorAction SilentlyContinue

if (-not $npmInstalled) {
    Write-Host "❌ NPM não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale o Node.js:" -ForegroundColor Yellow
    Write-Host "  1. Baixe: https://nodejs.org/" -ForegroundColor Gray
    Write-Host "  2. Instale a versão LTS" -ForegroundColor Gray
    Write-Host "  3. Reinicie o PowerShell" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ NPM encontrado: $(npm -v)" -ForegroundColor Green
Write-Host ""

# Verificar se Supabase CLI já está instalado
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if ($supabaseInstalled) {
    Write-Host "✅ Supabase CLI já instalado: $(supabase -v)" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "📥 Instalando Supabase CLI globalmente..." -ForegroundColor Yellow
    Write-Host "   (Isso pode levar alguns minutos)" -ForegroundColor Gray
    Write-Host ""
    
    npm install -g supabase
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Erro ao instalar Supabase CLI" -ForegroundColor Red
        Write-Host ""
        Write-Host "Tente manualmente:" -ForegroundColor Yellow
        Write-Host "  npm install -g supabase" -ForegroundColor White
        Write-Host ""
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Supabase CLI instalado com sucesso!" -ForegroundColor Green
    Write-Host ""
}

# ========================================
# PASSO 2: LOGIN NO SUPABASE
# ========================================
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔐 PASSO 2: LOGIN NO SUPABASE" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se já está logado
Write-Host "🔍 Verificando login..." -ForegroundColor Gray
$projectsList = supabase projects list 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Já logado no Supabase!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⚠️  Não está logado no Supabase" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host "📋 OBTER TOKEN DO SUPABASE:" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  1. Acesse: https://supabase.com/dashboard/account/tokens" -ForegroundColor White
    Write-Host "  2. Clique em 'Generate new token'" -ForegroundColor White
    Write-Host "  3. Dê um nome: 'Rendizy Deploy CLI'" -ForegroundColor White
    Write-Host "  4. Copie o token gerado" -ForegroundColor White
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
    Write-Host ""
    
    # Solicitar token
    $token = Read-Host "Cole o token aqui (ou pressione Enter para login interativo)"
    
    if ($token) {
        Write-Host ""
        Write-Host "🔑 Fazendo login com token..." -ForegroundColor Yellow
        supabase login --token $token
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "❌ Erro ao fazer login com token" -ForegroundColor Red
            Write-Host ""
            Write-Host "Verifique se o token está correto" -ForegroundColor Yellow
            Write-Host ""
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "🌐 Abrindo navegador para login..." -ForegroundColor Yellow
        Write-Host "   (Complete o login no navegador)" -ForegroundColor Gray
        Write-Host ""
        
        supabase login
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "❌ Erro ao fazer login" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "✅ Login realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
}

# ========================================
# PASSO 3: LISTAR PROJETOS
# ========================================
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 PASSO 3: PROJETOS DISPONÍVEIS" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

supabase projects list

Write-Host ""

# ========================================
# PASSO 4: LINKAR PROJETO
# ========================================
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🔗 PASSO 4: LINKAR PROJETO" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verificar se já está linkado
if (Test-Path ".supabase/config.toml") {
    Write-Host "✅ Projeto já linkado" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⚠️  Projeto não linkado" -ForegroundColor Yellow
    Write-Host ""
    
    $projectRef = Read-Host "Digite o PROJECT_REF do projeto (ou pressione Enter para usar: odcgnzfremrqnvtitpcc)"
    
    if (-not $projectRef) {
        $projectRef = "odcgnzfremrqnvtitpcc"
    }
    
    Write-Host ""
    Write-Host "🔗 Linkando projeto: $projectRef..." -ForegroundColor Yellow
    Write-Host ""
    
    supabase link --project-ref $projectRef
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Erro ao linkar projeto" -ForegroundColor Red
        Write-Host ""
        Write-Host "Verifique se o PROJECT_REF está correto" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    
    Write-Host ""
    Write-Host "✅ Projeto linkado com sucesso!" -ForegroundColor Green
    Write-Host ""
}

# ========================================
# PASSO 5: FAZER DEPLOY
# ========================================
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 PASSO 5: DEPLOY DA EDGE FUNCTION" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "📦 Fazendo deploy de: rendizy-server" -ForegroundColor White
Write-Host "   (Isso pode levar alguns minutos...)" -ForegroundColor Gray
Write-Host ""

supabase functions deploy rendizy-server

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎉 CÓDIGO CORRIGIDO AGORA ESTÁ EM PRODUÇÃO!" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "📊 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Testar importação via interface:" -ForegroundColor White
    Write-Host "     - Acesse a interface de anúncios" -ForegroundColor Gray
    Write-Host "     - Clique em 'Importar do StaysNet'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Validar resultado no banco:" -ForegroundColor White
    Write-Host "     - Execute VER-BETH-PERO-SIMPLES.sql" -ForegroundColor Gray
    Write-Host "     - Verifique se 22 campos foram salvos" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Conferir total de propriedades:" -ForegroundColor White
    Write-Host "     SELECT COUNT(*) FROM anuncios_ultimate" -ForegroundColor Gray
    Write-Host "     WHERE data->'externalIds'->>'staysnet_property_id' IS NOT NULL;" -ForegroundColor Gray
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "🎯 Esperado: 20 propriedades × 22 campos = SUCESSO TOTAL!" -ForegroundColor Magenta
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "❌ ERRO NO DEPLOY" -ForegroundColor Red
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Verifique os logs acima para detalhes" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Possíveis soluções:" -ForegroundColor Yellow
    Write-Host "  1. Verificar se o projeto está correto: supabase projects list" -ForegroundColor Gray
    Write-Host "  2. Re-linkar projeto: supabase link --project-ref SEU_REF" -ForegroundColor Gray
    Write-Host "  3. Verificar permissões da conta no Supabase" -ForegroundColor Gray
    Write-Host ""
}
