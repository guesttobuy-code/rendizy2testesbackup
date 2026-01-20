# ============================================================================
# VERIFICAR SE /properties/wizard ESTÁ SENDO USADO
# ============================================================================
# Script para verificar se o endpoint routes-property-wizard.ts está ativo
# ============================================================================

Write-Host "VERIFICANDO USO DO ENDPOINT /properties/wizard" -ForegroundColor Cyan
Write-Host ""

# Verificar no código do frontend
Write-Host "[1/3] Verificando no frontend..." -ForegroundColor Yellow
$frontendFiles = @(
    "RendizyPrincipal\components\PropertyEditWizard.tsx",
    "RendizyPrincipal\utils\api.ts",
    "RendizyPrincipal\pages\PropertyWizardPage.tsx"
)

$foundWizardEndpoint = $false
foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "properties/wizard|wizard.*create|wizard.*step") {
            Write-Host "  [ENCONTRADO] $file" -ForegroundColor Green
            $foundWizardEndpoint = $true
        }
    }
}

if (-not $foundWizardEndpoint) {
    Write-Host "  [NAO ENCONTRADO] Frontend nao usa /properties/wizard" -ForegroundColor Yellow
} else {
    Write-Host "  [ATENCAO] Frontend pode estar usando /properties/wizard" -ForegroundColor Red
}

Write-Host ""

# Verificar no backend
Write-Host "[2/3] Verificando no backend..." -ForegroundColor Yellow
$backendFile = "supabase\functions\rendizy-server\routes-property-wizard.ts"
if (Test-Path $backendFile) {
    Write-Host "  [EXISTE] $backendFile" -ForegroundColor Green
    
    # Contar ocorrências de property: sem temp:
    $content = Get-Content $backendFile -Raw
    $matches = [regex]::Matches($content, "property:\$|property:`${")
    Write-Host "  [OCORRENCIAS] property: sem temp: = $($matches.Count)" -ForegroundColor Cyan
} else {
    Write-Host "  [NAO EXISTE] Arquivo nao encontrado" -ForegroundColor Red
}

Write-Host ""

# Verificar no index.ts
Write-Host "[3/3] Verificando registro no index.ts..." -ForegroundColor Yellow
$indexFile = "supabase\functions\rendizy-server\index.ts"
if (Test-Path $indexFile) {
    $content = Get-Content $indexFile -Raw
    if ($content -match "properties/wizard|propertyWizardApp") {
        Write-Host "  [REGISTRADO] Endpoint esta registrado no index.ts" -ForegroundColor Green
    } else {
        Write-Host "  [NAO REGISTRADO] Endpoint nao esta registrado" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERRO] index.ts nao encontrado" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RECOMENDACAO:" -ForegroundColor Yellow
Write-Host ""
if ($foundWizardEndpoint) {
    Write-Host "  [APLICAR CORRECAO] Frontend usa o endpoint" -ForegroundColor Green
    Write-Host "  Adicionar prefixo temp: em routes-property-wizard.ts" -ForegroundColor White
} else {
    Write-Host "  [INVESTIGAR] Frontend nao usa o endpoint" -ForegroundColor Yellow
    Write-Host "  Problema pode estar em routes-properties.ts (SQL)" -ForegroundColor White
    Write-Host "  Verificar logs do backend para confirmar" -ForegroundColor White
}
Write-Host ""
