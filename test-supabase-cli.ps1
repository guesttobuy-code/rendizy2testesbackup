# ============================================================================
# SCRIPT: Testar Supabase CLI e mostrar comandos disponíveis
# ============================================================================

Write-Host "🔍 Verificando Supabase CLI..." -ForegroundColor Cyan
Write-Host ""

# Tentar diferentes formas de encontrar o CLI
$cliFound = $false
$cliPath = $null

# 1. Tentar comando direto
Write-Host "1️⃣ Tentando comando direto: supabase" -ForegroundColor Yellow
try {
    $result = & supabase --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Encontrado! Versão: $result" -ForegroundColor Green
        $cliFound = $true
        $cliPath = "supabase"
    }
} catch {
    Write-Host "   ❌ Não encontrado" -ForegroundColor Red
}

# 2. Tentar via npx
if (-not $cliFound) {
    Write-Host "2️⃣ Tentando via npx: npx supabase" -ForegroundColor Yellow
    try {
        $result = & npx --yes supabase --version 2>&1
        if ($LASTEXITCODE -eq 0 -or $result -match "version") {
            Write-Host "   ✅ Encontrado via npx!" -ForegroundColor Green
            $cliFound = $true
            $cliPath = "npx --yes supabase"
        }
    } catch {
        Write-Host "   ❌ Não encontrado via npx" -ForegroundColor Red
    }
}

# 3. Tentar encontrar no PATH
if (-not $cliFound) {
    Write-Host "3️⃣ Procurando no PATH..." -ForegroundColor Yellow
    $whereResult = & where.exe supabase 2>&1
    if ($whereResult -and $whereResult -notmatch "INFO:") {
        Write-Host "   ✅ Encontrado em: $whereResult" -ForegroundColor Green
        $cliFound = $true
        $cliPath = $whereResult
    } else {
        Write-Host "   ❌ Não encontrado no PATH" -ForegroundColor Red
    }
}

# Mostrar resultado final
Write-Host ""
if ($cliFound) {
    Write-Host "✅ CLI encontrado! Usando: $cliPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Comandos disponíveis:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   Ver logs:" -ForegroundColor Yellow
    Write-Host "   $cliPath logs --service edge-function --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor White
    Write-Host ""
    Write-Host "   Autenticar:" -ForegroundColor Yellow
    Write-Host "   $cliPath login" -ForegroundColor White
    Write-Host ""
    Write-Host "   Listar projetos:" -ForegroundColor Yellow
    Write-Host "   $cliPath projects list" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 SOLUÇÕES:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   1️⃣ Instalar via npm:" -ForegroundColor Cyan
    Write-Host "      npm install -g supabase" -ForegroundColor White
    Write-Host ""
    Write-Host "   2️⃣ Ou usar via npx (sem instalar):" -ForegroundColor Cyan
    Write-Host "      npx --yes supabase logs --service edge-function --project-ref odcgnzfremrqnvtitpcc" -ForegroundColor White
    Write-Host ""
    Write-Host "   3️⃣ Ou acessar dashboard diretamente:" -ForegroundColor Cyan
    Write-Host "      https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server/logs" -ForegroundColor White
    Write-Host ""
}

# Testar comando de logs se CLI foi encontrado
if ($cliFound) {
    Write-Host "🧪 Testando comando de logs..." -ForegroundColor Cyan
    if ($cliPath -eq "npx --yes supabase") {
        $testLogs = & npx --yes supabase logs --service edge-function --project-ref odcgnzfremrqnvtitpcc --limit 5 2>&1
    } else {
        $testLogs = & supabase logs --service edge-function --project-ref odcgnzfremrqnvtitpcc --limit 5 2>&1
    }
    
    if ($LASTEXITCODE -eq 0 -or $testLogs) {
        Write-Host "   ✅ Comando de logs funcionando!" -ForegroundColor Green
        Write-Host "   Primeiros logs:" -ForegroundColor Gray
        $testLogs | Select-Object -First 3 | ForEach-Object { Write-Host "   $_" -ForegroundColor DarkGray }
    } else {
        Write-Host "   ⚠️ Comando de logs pode precisar de autenticação" -ForegroundColor Yellow
        Write-Host "   Execute: $cliPath login" -ForegroundColor Cyan
    }
}

