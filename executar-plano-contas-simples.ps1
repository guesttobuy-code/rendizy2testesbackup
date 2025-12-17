# Executar SQL do plano de contas diretamente
$sqlFile = "supabase\migrations\20241124_plano_contas_imobiliaria_temporada.sql"
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "Executando SQL do plano de contas via Supabase..." -ForegroundColor Green

# Usar Supabase CLI para executar SQL
# Como o CLI nao tem comando direto, vamos usar a API REST
$projectRef = "odcgnzfremrqnvtitpcc"
$supabaseUrl = "https://$projectRef.supabase.co"

# Tentar executar via Supabase REST API usando service role key (single env var)
$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
}

# Executar SQL via RPC function (se existir) ou via Management API
# Vamos tentar executar diretamente via psql usando connection string
Write-Host "Tentando executar via Supabase Management API..." -ForegroundColor Yellow

# Como nao temos psql, vamos usar o Supabase CLI de forma diferente
# Vamos criar um arquivo temporario e usar supabase db push apenas para essa migration

Write-Host "Copiando migration para pasta temporaria..." -ForegroundColor Cyan
$tempDir = "temp_migrations"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null
Copy-Item $sqlFile -Destination "$tempDir\20241124_plano_contas_imobiliaria_temporada.sql"

Write-Host "Executando migration via Supabase CLI..." -ForegroundColor Green
Set-Location $tempDir
npx supabase db push --include-all --yes
Set-Location ..

Remove-Item $tempDir -Recurse -Force

Write-Host "Concluido!" -ForegroundColor Green

