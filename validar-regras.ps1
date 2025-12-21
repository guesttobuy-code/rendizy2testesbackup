# 🔍 Script de Validação de Regras Estabelecidas
# Executa verificações automáticas antes de commitar

Write-Host "🔍 Validando regras estabelecidas..." -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# 1. Verificar uso de localStorage para dados permanentes
Write-Host "1. Verificando localStorage..." -ForegroundColor Yellow
$localStorageFiles = Get-ChildItem -Recurse -Include *.ts,*.tsx -ErrorAction SilentlyContinue | Where-Object {
    Select-String -Pattern "localStorage\.setItem" -Path $_.FullName -ErrorAction SilentlyContinue | Where-Object { 
        $_.Line -notmatch "rendizy-token" -and 
        $_.Line -notmatch "cache:" -and
        $_.Line -notmatch "temp:" -and
        $_.Line -notmatch "process:" -and
        $_.Line -notmatch "lock:" -and
        $_.Line -notmatch "queue:"
    }
}

if ($localStorageFiles) {
    $errors += "Erro: localStorage usado para dados permanentes (viola REGRA_KV_STORE_VS_SQL.md)"
    foreach ($file in $localStorageFiles) {
        Write-Host "   Aviso em $($file.Path)" -ForegroundColor Red
    }
} else {
    Write-Host "   OK: Nenhum uso problematico de localStorage encontrado" -ForegroundColor Green
}

# 2. Verificar multiplos setInterval no modulo de chat
Write-Host "`n2. Verificando setInterval no modulo de chat..." -ForegroundColor Yellow
# Focar apenas em arquivos relacionados ao chat
$chatFiles = @(Get-ChildItem -Recurse -Include *Chat*.tsx,*WhatsApp*.tsx,*Evolution*.tsx,*chat*.ts,*whatsapp*.ts -ErrorAction SilentlyContinue)
$chatSetIntervals = @()
foreach ($file in $chatFiles) {
    $found = Select-String -Pattern "setInterval" -Path $file.FullName -ErrorAction SilentlyContinue
    if ($found) {
        $chatSetIntervals += $found
    }
}

if ($chatSetIntervals.Count -gt 3) {
    $warnings += "Aviso: Multiplos setInterval no modulo de chat ($($chatSetIntervals.Count)) - considerar consolidar"
    Write-Host "   Aviso: $($chatSetIntervals.Count) setInterval encontrados no modulo de chat" -ForegroundColor Yellow
} else {
    Write-Host "   OK: Quantidade razoavel de setInterval no chat ($($chatSetIntervals.Count))" -ForegroundColor Green
}

# 3. Verificar uso de KV Store para dados permanentes
Write-Host "`n3. Verificando KV Store..." -ForegroundColor Yellow
$kvStoreFiles = @()
$files = @(Get-ChildItem -Recurse -Include *.ts -ErrorAction SilentlyContinue)
foreach ($file in $files) {
    $found = Select-String -Pattern "kv\.set" -Path $file.FullName -ErrorAction SilentlyContinue | Where-Object {
        $_.Line -notmatch "cache:" -and
        $_.Line -notmatch "temp:" -and
        $_.Line -notmatch "process:" -and
        $_.Line -notmatch "lock:" -and
        $_.Line -notmatch "queue:"
    }
    if ($found) {
        $kvStoreFiles += $found
    }
}

if ($kvStoreFiles) {
    $errors += "Erro: KV Store usado para dados permanentes (viola REGRA_KV_STORE_VS_SQL.md)"
    foreach ($file in $kvStoreFiles) {
        Write-Host "   Aviso em $($file.Path)" -ForegroundColor Red
    }
} else {
    Write-Host "   OK: Nenhum uso problematico de KV Store encontrado" -ForegroundColor Green
}

# 4. Verificar se X-Auth-Token esta sendo usado no WhatsApp
Write-Host "`n4. Verificando X-Auth-Token no WhatsApp..." -ForegroundColor Yellow
# Buscar em arquivos que contem "whatsapp" ou "evolution" no nome
$whatsappFiles = @()
$files = @(Get-ChildItem -Recurse -Include "*whatsapp*","*evolution*","*Chat*.ts","*Chat*.tsx" -ErrorAction SilentlyContinue)
foreach ($file in $files) {
    $found = Select-String -Pattern "X-Auth-Token" -Path $file.FullName -ErrorAction SilentlyContinue
    if ($found) {
        $whatsappFiles += $found
    }
}

if ($whatsappFiles.Count -gt 0) {
    Write-Host "   OK: X-Auth-Token esta sendo usado ($($whatsappFiles.Count) ocorrencias)" -ForegroundColor Green
} else {
    $warnings += "Aviso: X-Auth-Token nao encontrado em arquivos WhatsApp - verificar se esta sendo usado"
    Write-Host "   Aviso: X-Auth-Token nao encontrado" -ForegroundColor Yellow
}

# 5. Verificar se CORS esta correto
Write-Host "`n5. Verificando CORS..." -ForegroundColor Yellow
# Buscar apenas em arquivos de configuracao do servidor
$corsFiles = @()
$files = @(Get-ChildItem -Recurse -Include "index.ts","server.ts" -ErrorAction SilentlyContinue)
foreach ($file in $files) {
    $found = Select-String -Pattern "cors\(" -Path $file.FullName -ErrorAction SilentlyContinue | Where-Object {
        $_.Line -match "credentials.*true"
    }
    if ($found) {
        $corsFiles += $found
    }
}

if ($corsFiles) {
    $errors += "Erro: credentials: true encontrado no CORS (viola SOLUCAO_SIMPLES_CORS_LOGIN_20251120.md)"
    foreach ($file in $corsFiles) {
        Write-Host "   Aviso em $($file.Path)" -ForegroundColor Red
    }
} else {
    Write-Host "   OK: CORS esta correto (sem credentials: true)" -ForegroundColor Green
}

# Resumo
Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "Resumo da Validacao" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "OK: Todas as verificacoes passaram!" -ForegroundColor Green
    exit 0
} else {
    if ($errors.Count -gt 0) {
        Write-Host "`nERROS ENCONTRADOS ($($errors.Count)):" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "   $error" -ForegroundColor Red
        }
    }
    
    if ($warnings.Count -gt 0) {
        Write-Host "`nAVISOS ($($warnings.Count)):" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "   $warning" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`nConsulte:" -ForegroundColor Cyan
    Write-Host "   - CHECKLIST_ANTES_DE_MUDAR_CODIGO.md" -ForegroundColor Cyan
    Write-Host "   - REGRAS_ESTABELECIDAS_REFERENCIA_RAPIDA.md" -ForegroundColor Cyan
    Write-Host "   - Ligando os motores.md" -ForegroundColor Cyan
    
    exit 1
}

