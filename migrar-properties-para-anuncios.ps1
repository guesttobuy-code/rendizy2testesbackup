# ⚡ MIGRATION SCRIPT: properties → anuncios_drafts
# Migra todos os imóveis da tabela antiga (properties) para a nova (anuncios_drafts)
# Versão: v1.0.103.405
# Data: 20/12/2024

param(
    [switch]$DryRun = $false,  # Simula migração sem salvar
    [int]$Limit = 0            # Limite de registros (0 = todos)
)

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "⚡ MIGRATION: properties → anuncios_drafts" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Configuração
$env:SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
$env:SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ"
$org_id = "00000000-0000-0000-0000-000000000000"

# Headers para API REST (sem autenticação de usuário - usa RLS com org_id)
$headers = @{
    "apikey" = $env:SUPABASE_ANON_KEY
    "Authorization" = "Bearer $env:SUPABASE_ANON_KEY"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

Write-Host "`n📊 1. CONTANDO REGISTROS..." -ForegroundColor Cyan

# Contar properties
try {
    $countUrl = "$env:SUPABASE_URL/rest/v1/properties?select=id"
    $properties = Invoke-RestMethod -Uri $countUrl -Headers $headers -Method Get
    $totalProperties = $properties.Count
    Write-Host "✅ Total em properties: $totalProperties" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao contar properties: $_" -ForegroundColor Red
    exit 1
}

# Contar anuncios_drafts existentes
try {
    $countUrl = "$env:SUPABASE_URL/rest/v1/anuncios_drafts?select=id"
    $anuncios = Invoke-RestMethod -Uri $countUrl -Headers $headers -Method Get
    $totalAnuncios = $anuncios.Count
    Write-Host "✅ Total em anuncios_drafts (antes): $totalAnuncios" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Erro ao contar anuncios_drafts: $_" -ForegroundColor Yellow
    $totalAnuncios = 0
}

if ($totalProperties -eq 0) {
    Write-Host "`n✅ Nenhum registro para migrar!" -ForegroundColor Green
    exit 0
}

Write-Host "`n📥 2. BUSCANDO DADOS DE properties..." -ForegroundColor Cyan

$limitParam = if ($Limit -gt 0) { "&limit=$Limit" } else { "" }
$propertiesUrl = "$env:SUPABASE_URL/rest/v1/properties?select=*$limitParam"

try {
    $propertiesToMigrate = Invoke-RestMethod -Uri $propertiesUrl -Headers $headers -Method Get
    Write-Host "✅ $($propertiesToMigrate.Count) registros carregados" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao buscar properties: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔄 3. MIGRANDO REGISTROS..." -ForegroundColor Cyan

$success = 0
$errors = 0
$skipped = 0

foreach ($prop in $propertiesToMigrate) {
    $propName = if ($prop.name) { $prop.name } else { "Sem nome" }
    
    Write-Host "`n  📌 Migrando: $propName (ID: $($prop.id))" -ForegroundColor White
    
    # Montar estrutura anuncios_drafts
    $anuncio = @{
        id = $prop.id
        organization_id = if ($prop.organization_id) { $prop.organization_id } else { "00000000-0000-0000-0000-000000000000" }
        user_id = if ($prop.user_id) { $prop.user_id } else { "00000000-0000-0000-0000-000000000002" }
        status = "draft"
        completion_percentage = 50
        step_completed = 3
        title = $propName
        data = @{
            # Passo 1: Tipo de Imóvel
            propertyType = if ($prop.propertyType) { $prop.propertyType } else { "apartamento" }
            
            # Passo 2: Localização
            name = $propName
            address = if ($prop.address) { $prop.address } else { "" }
            city = if ($prop.city) { $prop.city } else { "" }
            state = if ($prop.state) { $prop.state } else { "" }
            country = if ($prop.country) { $prop.country } else { "Brasil" }
            zipCode = if ($prop.zipCode) { $prop.zipCode } else { "" }
            
            # Passo 3: Características
            bedrooms = if ($prop.bedrooms) { $prop.bedrooms } else { 0 }
            bathrooms = if ($prop.bathrooms) { $prop.bathrooms } else { 0 }
            maxGuests = if ($prop.maxGuests) { $prop.maxGuests } else { 1 }
            area = if ($prop.area) { $prop.area } else { 0 }
            
            # Passo 4: Comodidades
            amenities = if ($prop.amenities) { $prop.amenities } else { @() }
            
            # Passo 5: Preços
            basePrice = if ($prop.basePrice) { $prop.basePrice } else { 0 }
            cleaningFee = if ($prop.cleaningFee) { $prop.cleaningFee } else { 0 }
            
            # Fotos
            photos = if ($prop.photos) { $prop.photos } else { @() }
            
            # Metadados
            migrated_from = "properties"
            migrated_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
        } | ConvertTo-Json -Depth 10 -Compress
    } | ConvertTo-Json -Depth 10

    if ($DryRun) {
        Write-Host "    ✅ [DRY RUN] Seria inserido" -ForegroundColor Yellow
        $success++
        continue
    }

    # ✅ REGRA DE OURO: Verificar se JÁ EXISTE antes de inserir (evitar duplicatas)
    $checkUrl = "$env:SUPABASE_URL/rest/v1/anuncios_drafts?id=eq.$($prop.id)&select=id"
    $existing = Invoke-RestMethod -Uri $checkUrl -Headers $headers -ErrorAction SilentlyContinue
    
    if ($existing -and $existing.Count -gt 0) {
        Write-Host "    ⏭️  JÁ EXISTE - pulando (ID: $($prop.id))" -ForegroundColor Yellow
        $skipped++
        continue
    }
    
    # Inserir no anuncios_drafts
    try {
        $insertUrl = "$env:SUPABASE_URL/rest/v1/anuncios_drafts"
        $null = Invoke-RestMethod -Uri $insertUrl -Headers $headers -Method Post -Body $anuncio
        Write-Host "    ✅ Inserido com sucesso" -ForegroundColor Green
        $success++
    } catch {
        if ($_.Exception.Message -like "*duplicate*" -or $_.Exception.Message -like "*already exists*") {
            Write-Host "    ⏭️  Já existe (pulando)" -ForegroundColor Yellow
            $skipped++
        } else {
            Write-Host "    ❌ Erro: $_" -ForegroundColor Red
            $errors++
        }
    }
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 RESULTADO DA MIGRAÇÃO" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Sucesso:  $success" -ForegroundColor Green
Write-Host "⏭️  Pulados:  $skipped" -ForegroundColor Yellow
Write-Host "❌ Erros:    $errors" -ForegroundColor Red
Write-Host "📋 Total:    $($success + $skipped + $errors)" -ForegroundColor White

if ($DryRun) {
    Write-Host "`n⚠️  MODO DRY RUN - Nenhum dado foi salvo" -ForegroundColor Yellow
    Write-Host "💡 Execute sem -DryRun para realizar a migração" -ForegroundColor Cyan
}

Write-Host "`n✅ Migração concluída!`n" -ForegroundColor Green
