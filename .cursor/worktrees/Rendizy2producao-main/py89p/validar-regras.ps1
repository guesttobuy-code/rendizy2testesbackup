# ? VALIDAÇÃO DE REGRAS - RENDIZY
# 
# Este script valida se o código não viola regras estabelecidas
# Execute ANTES de cada commit
#
# Regras validadas:
# 1. localStorage/KV Store para dados permanentes
# 2. Múltiplos setInterval
# 3. CORS com credentials: true
# 4. Campos da Stays.net sem conversão (NOVO)

Write-Host "`n?? VALIDANDO REGRAS DO RENDIZY..." -ForegroundColor Cyan
Write-Host "=" * 60

$errors = @()
$warnings = @()

# ============================================================================
# REGRA 1: Campos da Stays.net sem conversão
# ============================================================================
Write-Host "`n?? Verificando nomenclatura de campos (Stays.net)..." -ForegroundColor Yellow

$staysNetPatterns = @(
    '_idlisting',
    '_idclient', 
    '_idreservation',
    '_idproperty',
    '_f_total',
    '_f_expected',
    '_i_maxGuests',
    '_i_rooms',
    '_i_beds',
    '_t_typeMeta',
    '_msdesc',
    '_mstitle',
    '_mcval'
)

$filesToCheck = Get-ChildItem -Path "supabase/functions/rendizy-server" -Recurse -Include "*.ts" | Where-Object { 
    $_.FullName -notmatch "mappers" -or $_.FullName -match "staysnet.*mapper"
}

foreach ($file in $filesToCheck) {
    $content = Get-Content $file.FullName -Raw
    
    # Verificar se não é um mapper (mappers podem ter campos da Stays.net)
    $isMapper = $file.FullName -match "mapper|staysnet.*mapper"
    
    foreach ($pattern in $staysNetPatterns) {
        if ($content -match $pattern) {
            # Se não for mapper, é erro
            if (-not $isMapper) {
                $errors += "? $($file.Name): Usa campo da Stays.net '$pattern' sem conversão"
            }
            # Se for mapper, verificar se está convertendo
            elseif ($content -match "function.*staysNet.*To.*Rendizy|function.*staysNet.*To.*Rendizy") {
                # OK - está em mapper de conversão
            }
            else {
                $warnings += "??  $($file.Name): Campo '$pattern' encontrado - verificar se está convertendo"
            }
        }
    }
}

# ============================================================================
# REGRA 2: localStorage para dados permanentes
# ============================================================================
Write-Host "`n?? Verificando localStorage..." -ForegroundColor Yellow

$localStorageFiles = Get-ChildItem -Path "RendizyPrincipal" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue

foreach ($file in $localStorageFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($content -match "localStorage\.(setItem|getItem)") {
        # Verificar se é para dados permanentes
        $permanentDataPatterns = @(
            "contacts",
            "conversations", 
            "messages",
            "reservations",
            "properties",
            "guests"
        )
        
        foreach ($pattern in $permanentDataPatterns) {
            if ($content -match "localStorage\.(setItem|getItem).*['`"]$pattern") {
                $errors += "? $($file.Name): localStorage para dados permanentes ('$pattern')"
            }
        }
    }
}

# ============================================================================
# REGRA 3: Múltiplos setInterval
# ============================================================================
Write-Host "`n?? Verificando setInterval..." -ForegroundColor Yellow

$chatFiles = Get-ChildItem -Path "RendizyPrincipal/components" -Recurse -Include "*Chat*.tsx","*WhatsApp*.tsx" -ErrorAction SilentlyContinue

foreach ($file in $chatFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    $setIntervalCount = ([regex]::Matches($content, "setInterval")).Count
    
    if ($setIntervalCount -gt 1) {
        $warnings += "??  $($file.Name): Múltiplos setInterval ($setIntervalCount) - considerar consolidar"
    }
}

# ============================================================================
# REGRA 4: CORS com credentials: true
# ============================================================================
Write-Host "`n?? Verificando CORS..." -ForegroundColor Yellow

$backendFiles = Get-ChildItem -Path "supabase/functions/rendizy-server" -Recurse -Include "*.ts" -ErrorAction SilentlyContinue

foreach ($file in $backendFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if ($content -match "origin.*\*.*credentials.*true|credentials.*true.*origin.*\*") {
        $errors += "? $($file.Name): CORS com origin: '*' e credentials: true (não permitido)"
    }
}

# ============================================================================
# RESULTADO
# ============================================================================
Write-Host "`n" + ("=" * 60)
Write-Host "?? RESULTADO DA VALIDAÇÃO" -ForegroundColor Cyan
Write-Host "=" * 60

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "`n? NENHUM PROBLEMA ENCONTRADO!" -ForegroundColor Green
    Write-Host "   Código está em conformidade com as regras estabelecidas." -ForegroundColor Green
    exit 0
}

if ($errors.Count -gt 0) {
    Write-Host "`n? ERROS ENCONTRADOS ($($errors.Count)):" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   $error" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    Write-Host "`n??  AVISOS ($($warnings.Count)):" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   $warning" -ForegroundColor Yellow
    }
}

Write-Host "`n?? Consulte:" -ForegroundColor Cyan
Write-Host "   - REGRAS_ESTABELECIDAS_REFERENCIA_RAPIDA.md" -ForegroundColor White
Write-Host "   - REGRA_NOMENCLATURA_STAYSNET.md" -ForegroundColor White
Write-Host "   - CHECKLIST_ANTES_DE_MUDAR_CODIGO.md" -ForegroundColor White

if ($errors.Count -gt 0) {
    Write-Host "`n? CORRIJA OS ERROS ANTES DE COMMITAR!" -ForegroundColor Red
    exit 1
}

Write-Host "`n??  Revise os avisos antes de commitar." -ForegroundColor Yellow
exit 0

