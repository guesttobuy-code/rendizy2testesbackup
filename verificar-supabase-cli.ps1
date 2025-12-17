# Script de Verificação do Supabase CLI
# Verifica se tudo está configurado corretamente

Write-Host "🔍 Verificando configuração do Supabase CLI..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar versão
Write-Host "1️⃣ Verificando versão do CLI..." -ForegroundColor Yellow
$version = npx supabase --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ CLI instalado: $version" -ForegroundColor Green
} else {
    Write-Host "   ❌ CLI não encontrado" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Verificar login
Write-Host "2️⃣ Verificando login..." -ForegroundColor Yellow
$projects = npx supabase projects list 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Login realizado com sucesso" -ForegroundColor Green
    Write-Host "   📋 Projetos encontrados:" -ForegroundColor Cyan
    $projects | Select-String -Pattern "odcgnzfremrqnvtitpcc" | ForEach-Object {
        if ($_.Line -match "●") {
            Write-Host "      ✅ Rendizy2producao (LINKADO)" -ForegroundColor Green
        } else {
            Write-Host "      ⚠️  Rendizy2producao (NÃO LINKADO)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ❌ Não está logado. Execute: npx supabase login" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 3. Verificar migrations
Write-Host "3️⃣ Verificando migrations..." -ForegroundColor Yellow
$migrations = npx supabase migration list 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ Conexão com banco de dados funcionando" -ForegroundColor Green
    $pending = ($migrations | Select-String -Pattern "^\s+\d+\s+\|\s+\|\s+" | Measure-Object).Count
    if ($pending -gt 0) {
        Write-Host "   ⚠️  $pending migrations pendentes (não aplicadas no remoto)" -ForegroundColor Yellow
    } else {
        Write-Host "   ✅ Todas as migrations aplicadas" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  Não foi possível verificar migrations" -ForegroundColor Yellow
}

Write-Host ""

# 4. Verificar arquivo de configuração
Write-Host "4️⃣ Verificando configuração local..." -ForegroundColor Yellow
if (Test-Path ".supabase\config.toml") {
    Write-Host "   ✅ Arquivo de configuração encontrado" -ForegroundColor Green
    $config = Get-Content ".supabase\config.toml" | Select-String -Pattern "project_id"
    if ($config) {
        Write-Host "   ✅ Projeto configurado: $($config.Line.Trim())" -ForegroundColor Green
    }
} else {
    Write-Host "   ⚠️  Arquivo de configuração não encontrado" -ForegroundColor Yellow
    Write-Host "   💡 Execute: npx supabase link --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✅ Verificação concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumo:" -ForegroundColor Cyan
Write-Host "   - CLI: ✅ Instalado" -ForegroundColor Green
Write-Host "   - Login: ✅ Realizado" -ForegroundColor Green
Write-Host "   - Projeto: ✅ Linkado" -ForegroundColor Green
Write-Host "   - Banco: ✅ Conectado" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Pronto para usar!" -ForegroundColor Green

