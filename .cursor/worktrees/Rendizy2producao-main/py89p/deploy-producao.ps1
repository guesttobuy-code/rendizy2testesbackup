# 🚀 DEPLOY COMPLETO PARA PRODUÇÃO
# 
# Este script faz deploy do backend (Supabase) e frontend (GitHub/Vercel)

Write-Host "`n🚀 DEPLOY COMPLETO PARA PRODUÇÃO" -ForegroundColor Green
Write-Host "=" * 60

$ErrorActionPreference = "Stop"

# ============================================================================
# PASSO 1: VERIFICAR PRÉ-REQUISITOS
# ============================================================================
Write-Host "`n📋 PASSO 1: Verificando pré-requisitos..." -ForegroundColor Cyan

# Verificar Supabase CLI
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "✅ Supabase CLI encontrado: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "   Instale: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Verificar Git
try {
    $gitVersion = git --version 2>&1
    Write-Host "✅ Git encontrado: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git não encontrado!" -ForegroundColor Red
    exit 1
}

# ============================================================================
# PASSO 2: DEPLOY BACKEND (SUPABASE)
# ============================================================================
Write-Host "`n📦 PASSO 2: Fazendo deploy do backend (Supabase)..." -ForegroundColor Cyan

try {
    Write-Host "⏳ Fazendo login no Supabase..." -ForegroundColor Yellow
    # Nota: Se já estiver logado, isso pode falhar - ignorar erro
    supabase login 2>&1 | Out-Null
    
    Write-Host "⏳ Fazendo link do projeto..." -ForegroundColor Yellow
    # Nota: Se já estiver linkado, isso pode falhar - ignorar erro
    supabase link --project-ref make-server-67caf26a 2>&1 | Out-Null
    
    Write-Host "⏳ Fazendo deploy da função rendizy-server..." -ForegroundColor Yellow
    supabase functions deploy rendizy-server --project-ref make-server-67caf26a
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend deployado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erro no deploy do backend!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erro no deploy do backend: $_" -ForegroundColor Red
    Write-Host "   Verifique se está logado: supabase login" -ForegroundColor Yellow
    exit 1
}

# ============================================================================
# PASSO 3: COMMIT E PUSH (GITHUB)
# ============================================================================
Write-Host "`n📤 PASSO 3: Fazendo commit e push para GitHub..." -ForegroundColor Cyan

try {
    # Verificar se há mudanças
    $status = git status --porcelain
    if ($status) {
        Write-Host "⏳ Adicionando arquivos..." -ForegroundColor Yellow
        git add .
        
        Write-Host "⏳ Fazendo commit..." -ForegroundColor Yellow
        $commitMessage = "🚀 Deploy: Integração Stays.net completa - Importação de hóspedes, propriedades e reservas"
        git commit -m $commitMessage
        
        Write-Host "⏳ Fazendo push..." -ForegroundColor Yellow
        git push
        
        Write-Host "✅ Código enviado para GitHub com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  Nenhuma mudança para commitar." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro no Git: $_" -ForegroundColor Red
    Write-Host "   Verifique se há mudanças pendentes" -ForegroundColor Yellow
}

# ============================================================================
# PASSO 4: RESUMO
# ============================================================================
Write-Host "`n✅ DEPLOY CONCLUÍDO!" -ForegroundColor Green
Write-Host "`n📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Aguarde o deploy do Vercel (se configurado)" -ForegroundColor White
Write-Host "2. Teste a aplicação em produção" -ForegroundColor White
Write-Host "3. Verifique os logs do Supabase Functions" -ForegroundColor White
Write-Host "`n🔗 URLs:" -ForegroundColor Cyan
Write-Host "   Backend: https://make-server-67caf26a.supabase.co/functions/v1/rendizy-server" -ForegroundColor White
Write-Host "   Frontend: (verificar no Vercel/GitHub)" -ForegroundColor White

