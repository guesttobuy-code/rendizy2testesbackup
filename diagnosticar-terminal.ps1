# Script de Diagnóstico - Problema de Output PowerShell no Cursor
Write-Host "=== DIAGNOSTICO TERMINAL CURSOR ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar PowerShell instalado
Write-Host "1. Verificando PowerShell instalado..." -ForegroundColor Yellow

$pwsh7 = Get-Command pwsh -ErrorAction SilentlyContinue
$ps5 = Get-Command powershell -ErrorAction SilentlyContinue

if ($pwsh7) {
    Write-Host "   ✅ PowerShell 7 encontrado: $($pwsh7.Source)" -ForegroundColor Green
    $pwsh7Version = & pwsh -Command '$PSVersionTable.PSVersion'
    Write-Host "   Versao: $pwsh7Version" -ForegroundColor Gray
} else {
    Write-Host "   ⚠️  PowerShell 7 NAO encontrado" -ForegroundColor Yellow
    Write-Host "   Baixar: https://aka.ms/powershell-release?tag=stable" -ForegroundColor Gray
}

if ($ps5) {
    Write-Host "   ✅ PowerShell 5.1 encontrado: $($ps5.Source)" -ForegroundColor Green
    $ps5Version = $PSVersionTable.PSVersion
    Write-Host "   Versao: $ps5Version" -ForegroundColor Gray
} else {
    Write-Host "   ❌ PowerShell 5.1 NAO encontrado" -ForegroundColor Red
}

Write-Host ""

# 2. Verificar configurações do Cursor
Write-Host "2. Verificando configuracoes do Cursor..." -ForegroundColor Yellow

$cursorSettingsPath = "$env:APPDATA\Cursor\User\settings.json"

if (Test-Path $cursorSettingsPath) {
    Write-Host "   ✅ Arquivo de configuracoes encontrado" -ForegroundColor Green
    Write-Host "   Caminho: $cursorSettingsPath" -ForegroundColor Gray
    
    try {
        $settings = Get-Content $cursorSettingsPath -Raw | ConvertFrom-Json
        
        if ($settings.'terminal.integrated.defaultProfile.windows') {
            Write-Host "   ✅ Terminal padrao configurado: $($settings.'terminal.integrated.defaultProfile.windows')" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Terminal padrao NAO configurado" -ForegroundColor Yellow
        }
        
        if ($settings.'terminal.integrated.profiles.windows') {
            Write-Host "   ✅ Perfis de terminal configurados" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Perfis de terminal NAO configurados" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "   ⚠️  Erro ao ler configuracoes: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  Arquivo de configuracoes NAO encontrado" -ForegroundColor Yellow
    Write-Host "   Caminho esperado: $cursorSettingsPath" -ForegroundColor Gray
}

Write-Host ""

# 3. Teste de output
Write-Host "3. Testando captura de output..." -ForegroundColor Yellow

$testOutput = "TESTE_$(Get-Date -Format 'yyyyMMddHHmmss')"
Write-Host "   Output de teste: $testOutput" -ForegroundColor Cyan
Write-Host "   Se voce ver esta mensagem, o output esta funcionando!" -ForegroundColor Green

Write-Host ""

# 4. Recomendações
Write-Host "4. RECOMENDACOES:" -ForegroundColor Yellow
Write-Host ""

if (-not $pwsh7) {
    Write-Host "   📥 INSTALAR PowerShell 7:" -ForegroundColor Cyan
    Write-Host "      https://aka.ms/powershell-release?tag=stable" -ForegroundColor White
    Write-Host ""
}

Write-Host "   ⚙️  CONFIGURAR Cursor:" -ForegroundColor Cyan
Write-Host "      1. Abrir: Ctrl + ," -ForegroundColor White
Write-Host "      2. Clicar no icone {} (abrir JSON)" -ForegroundColor White
Write-Host "      3. Adicionar configuracoes (ver CORRIGIR_OUTPUT_POWERSHELL.md)" -ForegroundColor White
Write-Host "      4. Reiniciar Cursor completamente" -ForegroundColor White
Write-Host ""

Write-Host "   🔄 REINICIAR Cursor:" -ForegroundColor Cyan
Write-Host "      Fechar TODAS as janelas e reabrir" -ForegroundColor White
Write-Host ""

Write-Host "=== FIM DO DIAGNOSTICO ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para mais detalhes, veja: CORRIGIR_OUTPUT_POWERSHELL.md" -ForegroundColor Gray


