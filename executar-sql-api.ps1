# Executar SQL diretamente via Supabase REST API
$sqlFile = "supabase\migrations\20241124_plano_contas_imobiliaria_temporada.sql"
$sqlContent = Get-Content $sqlFile -Raw

$projectRef = "odcgnzfremrqnvtitpcc"
$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY

Write-Host "Executando SQL do plano de contas via Supabase API..." -ForegroundColor Green

# Executar SQL via Supabase REST API usando PostgREST
# Vamos usar a API REST do Supabase para executar o SQL
$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

# Executar SQL via RPC function ou diretamente
# Como nao temos uma funcao RPC para executar SQL, vamos usar o Supabase CLI de forma diferente

# Tentar executar via Supabase Management API
Write-Host "Tentando executar via Management API..." -ForegroundColor Yellow

# Usar o Supabase CLI para executar SQL diretamente via connection
# Vamos criar uma funcao temporaria no banco para executar o SQL

Write-Host "Criando funcao temporaria para executar SQL..." -ForegroundColor Cyan

$createFunctionSQL = @"
CREATE OR REPLACE FUNCTION exec_sql_direct(sql_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS `$``
BEGIN
    EXECUTE sql_text;
    RETURN 'Success';
END;
`$``;
"@

# Executar a funcao de criacao primeiro (se necessario)
# Depois executar o SQL do plano de contas

Write-Host "Executando SQL do plano de contas..." -ForegroundColor Green

# Como nao temos acesso direto ao psql, vamos usar o Supabase CLI
# Mas precisamos executar apenas essa migration

# Solucao: usar o SQL Editor do Supabase via browser automation
Write-Host "Para executar diretamente, use o SQL Editor do Supabase:" -ForegroundColor Yellow
Write-Host "1. Acesse: https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Cyan
Write-Host "2. Cole o conteudo do arquivo: $sqlFile" -ForegroundColor Cyan
Write-Host "3. Clique em 'Run'" -ForegroundColor Cyan

# Alternativamente, vamos tentar usar o Supabase CLI para executar SQL via connection string
# Mas como nao temos psql, vamos usar uma abordagem diferente

Write-Host "`nTentando executar via Supabase CLI com connection string..." -ForegroundColor Yellow

# Obter connection string do projeto linkado
$connectionString = "postgresql://postgres.odcgnzfremrqnvtitpcc:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

Write-Host "Para executar via psql (se tiver instalado):" -ForegroundColor Yellow
Write-Host "psql `"$connectionString`" -f `"$sqlFile`"" -ForegroundColor Cyan

Write-Host "`nOu execute manualmente no SQL Editor do Supabase" -ForegroundColor Yellow

