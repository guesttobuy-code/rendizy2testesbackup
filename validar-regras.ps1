# 🔍 Script de Validação de Regras Estabelecidas
# Executa verificações automáticas antes de commitar

Write-Host "🔍 Validando regras estabelecidas..." -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# 1. Verificar uso de localStorage para dados permanentes
Write-Host "1. Verificando localStorage..." -ForegroundColor Yellow
$localStorageFiles = Get-ChildItem -Recurse -Include *.ts,*.tsx | Select-String -Pattern "localStorage\.setItem" | Where-Object { 
    $_.Line -notmatch "rendizy-token" -and 
    $_.Line -notmatch "cache:" -and
    $_.Line -notmatch "temp:" -and
    $_.Line -notmatch "process:" -and
    $_.Line -notmatch "lock:" -and
    $_.Line -notmatch "queue:"
}

if ($localStorageFiles) {
    $errors += "❌ localStorage usado para dados permanentes (viola REGRA_KV_STORE_VS_SQL.md)"
    foreach ($file in $localStorageFiles) {
        Write-Host "   ⚠️ $($file.Path):$($file.LineNumber) - $($file.Line.Trim())" -ForegroundColor Red
    }
} else {
    Write-Host "   ✅ Nenhum uso problemático de localStorage encontrado" -ForegroundColor Green
}

# 2. Verificar múltiplos setInterval no módulo de chat
Write-Host "`n2. Verificando setInterval no módulo de chat..." -ForegroundColor Yellow
# Focar apenas em arquivos relacionados ao chat
$chatFiles = Get-ChildItem -Recurse -Include *Chat*.tsx,*WhatsApp*.tsx,*Evolution*.tsx,*chat*.ts,*whatsapp*.ts -ErrorAction SilentlyContinue
$chatSetIntervals = $chatFiles | Select-String -Pattern "setInterval"

$allSetIntervals = (Get-ChildItem -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue | Select-String -Pattern "setInterval").Count

if ($chatSetIntervals.Count -gt 3) {
    $warnings += "⚠️ Múltiplos setInterval no módulo de chat ($($chatSetIntervals.Count)) - considerar consolidar em um serviço único"
    Write-Host "   ⚠️ $($chatSetIntervals.Count) setInterval encontrados no módulo de chat" -ForegroundColor Yellow
    Write-Host "   📋 Arquivos:" -ForegroundColor Cyan
    $chatSetIntervals | ForEach-Object { 
        Write-Host "      - $($_.Path):$($_.LineNumber)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ✅ Quantidade razoável de setInterval no chat ($($chatSetIntervals.Count))" -ForegroundColor Green
}

Write-Host "   ℹ️ Total de setInterval no projeto: $allSetIntervals" -ForegroundColor Gray

# 3. Verificar uso de KV Store para dados permanentes
Write-Host "`n3. Verificando KV Store..." -ForegroundColor Yellow
$kvStoreFiles = Get-ChildItem -Recurse -Include *.ts | Select-String -Pattern "kv\.set" | Where-Object {
    $_.Line -notmatch "cache:" -and
    $_.Line -notmatch "temp:" -and
    $_.Line -notmatch "process:" -and
    $_.Line -notmatch "lock:" -and
    $_.Line -notmatch "queue:"
}

if ($kvStoreFiles) {
    $errors += "❌ KV Store usado para dados permanentes (viola REGRA_KV_STORE_VS_SQL.md)"
    foreach ($file in $kvStoreFiles) {
        Write-Host "   ⚠️ $($file.Path):$($file.LineNumber) - $($file.Line.Trim())" -ForegroundColor Red
    }
} else {
    Write-Host "   ✅ Nenhum uso problemático de KV Store encontrado" -ForegroundColor Green
}

# 4. Verificar se X-Auth-Token está sendo usado no WhatsApp
Write-Host "`n4. Verificando X-Auth-Token no WhatsApp..." -ForegroundColor Yellow
# Buscar em arquivos que contêm "whatsapp" ou "evolution" no nome OU no conteúdo
$whatsappFiles = Get-ChildItem -Recurse -Include *whatsapp*,*evolution*,*Chat*.ts,*Chat*.tsx -ErrorAction SilentlyContinue | 
    Select-String -Pattern "X-Auth-Token"

# Também buscar em arquivos de serviços/API relacionados
$apiFiles = Get-ChildItem -Recurse -Include *whatsappChatApi.ts,*evolutionContactsService.ts,*api.ts -ErrorAction SilentlyContinue |
    Select-String -Pattern "X-Auth-Token"

$allWhatsappFiles = @($whatsappFiles) + @($apiFiles) | Where-Object { $_ -ne $null }

if ($allWhatsappFiles.Count -gt 0) {
    Write-Host "   ✅ X-Auth-Token está sendo usado ($($allWhatsappFiles.Count) ocorrências)" -ForegroundColor Green
} else {
    $warnings += "⚠️ X-Auth-Token não encontrado em arquivos WhatsApp - verificar se está sendo usado"
    Write-Host "   ⚠️ X-Auth-Token não encontrado" -ForegroundColor Yellow
}

# 5. Verificar se CORS está correto
Write-Host "`n5. Verificando CORS..." -ForegroundColor Yellow
# Buscar apenas em arquivos de configuração do servidor
$corsFiles = Get-ChildItem -Recurse -Include *index.ts,*server.ts -ErrorAction SilentlyContinue | 
    Select-String -Pattern "cors\(" -Context 0,5 | 
    Where-Object { 
        $_.Line -match "credentials.*true" -or 
        ($_.Context.PostContext -join "`n") -match "credentials.*true"
    }

if ($corsFiles) {
    $errors += "❌ credentials: true encontrado no CORS (viola SOLUCAO_SIMPLES_CORS_LOGIN_20251120.md)"
    foreach ($file in $corsFiles) {
        Write-Host "   ⚠️ $($file.Path):$($file.LineNumber) - Verificar configuração CORS" -ForegroundColor Red
    }
} else {
    Write-Host "   ✅ CORS está correto (sem credentials: true)" -ForegroundColor Green
}

# Resumo
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "📊 RESUMO DA VALIDAÇÃO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ Todas as verificações passaram!" -ForegroundColor Green
    exit 0
} else {
    if ($errors.Count -gt 0) {
        Write-Host "`n❌ ERROS ENCONTRADOS ($($errors.Count)):" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "   $error" -ForegroundColor Red
        }
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "`n⚠️ AVISOS ($($warnings.Count)):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   $warning" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n📚 Consulte:" -ForegroundColor Cyan
    Write-Host "   - CHECKLIST_ANTES_DE_MUDAR_CODIGO.md" -ForegroundColor Cyan
    Write-Host "   - REGRAS_ESTABELECIDAS_REFERENCIA_RAPIDA.md" -ForegroundColor Cyan
    Write-Host "   - Ligando os motores.md" -ForegroundColor Cyan
    
    exit 1
}

