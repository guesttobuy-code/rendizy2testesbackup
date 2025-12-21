# Diagnóstico Anúncios Ultimate
$ErrorActionPreference = "Continue"

Write-Host "`n=== DIAGNÓSTICO ANÚNCIOS ULTIMATE ===" -ForegroundColor Cyan

# Carregar env
$envPath = ".\.env.local"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
        }
    }
}

$url = $env:VITE_SUPABASE_URL
$key = $env:SUPABASE_SERVICE_ROLE_KEY

Write-Host "`n1. Verificando tabela anuncios_ultimate..." -ForegroundColor Yellow

$headers = @{
    "apikey" = $key
    "Authorization" = "Bearer $key"
}

$endpoint = "$url/rest/v1/anuncios_ultimate"
$params = "select=id,status,organization_id,created_at,data"

try {
    $response = Invoke-RestMethod -Uri "${endpoint}?${params}" -Headers $headers -Method Get
    
    Write-Host "Total de registros: $($response.Count)" -ForegroundColor Green
    
    if ($response.Count -gt 0) {
        Write-Host "`nPrimeiros 5 anúncios:" -ForegroundColor Cyan
        $response | Select-Object -First 5 | ForEach-Object {
            $title = if ($_.data.title) { $_.data.title } else { "Sem título" }
            Write-Host "  ID: $($_.id)"
            Write-Host "  Título: $title"
            Write-Host "  Status: $($_.status)"
            Write-Host "  Org: $($_.organization_id)"
            Write-Host "  Data: $($_.created_at)"
            Write-Host ""
        }
    } else {
        Write-Host "⚠️  TABELA VAZIA - nenhum anúncio encontrado" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Criando anúncio de teste..." -ForegroundColor Yellow

$testData = @{
    organization_id = "00000000-0000-0000-0000-000000000001"
    user_id = "00000000-0000-0000-0000-000000000001"
    data = @{
        title = "TESTE - Diagnóstico $(Get-Date -Format 'HH:mm:ss')"
        guests = 4
        bedrooms = 2
    }
    status = "draft"
} | ConvertTo-Json -Depth 10

try {
    $headers["Prefer"] = "return=representation"
    $created = Invoke-RestMethod -Uri $endpoint -Headers $headers -Method Post -Body $testData -ContentType "application/json"
    
    Write-Host "✅ Anúncio criado!" -ForegroundColor Green
    Write-Host "  ID: $($created.id)"
    Write-Host "  Título: $($created.data.title)"
} catch {
    Write-Host "❌ Erro ao criar: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=================================`n" -ForegroundColor Cyan
