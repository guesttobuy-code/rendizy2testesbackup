# =============================================================================
# RENDIZY - Execute SQL no Supabase via Management API
# Uso: .\scripts\Run-SupabaseSql.ps1 -SqlFile "path/to/file.sql"
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SqlFile
)

# Carregar credenciais do .env.local
$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_ACCESS_TOKEN = $env:SUPABASE_ACCESS_TOKEN
$SUPABASE_DB_PASSWORD = $env:SUPABASE_DB_PASSWORD

if (-not $SUPABASE_ACCESS_TOKEN) {
    Write-Error "SUPABASE_ACCESS_TOKEN não encontrado no .env.local"
    exit 1
}

# Extrair project ref do URL
$projectRef = ($SUPABASE_URL -replace 'https://' -replace '\.supabase\.co' -replace '/')

Write-Host "=== Executando SQL no Supabase ===" -ForegroundColor Cyan
Write-Host "Projeto: $projectRef"
Write-Host "Arquivo: $SqlFile"

if (-not (Test-Path $SqlFile)) {
    Write-Error "Arquivo SQL não encontrado: $SqlFile"
    exit 1
}

$sqlContent = Get-Content $SqlFile -Raw

# Via Supabase Management API (https://supabase.com/docs/reference/api/sql)
$headers = @{
    "Authorization" = "Bearer $SUPABASE_ACCESS_TOKEN"
    "Content-Type" = "application/json"
}

# URL da Management API para executar SQL
$apiUrl = "https://api.supabase.com/v1/projects/$projectRef/database/query"

$body = @{
    query = $sqlContent
} | ConvertTo-Json -Depth 10

Write-Host "`nExecutando..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $apiUrl -Method POST -Headers $headers -Body $body
    Write-Host "`n✅ SQL executado com sucesso!" -ForegroundColor Green
    
    if ($response) {
        Write-Host "`nResultado:"
        $response | ConvertTo-Json -Depth 5
    }
} catch {
    Write-Host "`n❌ Erro ao executar SQL:" -ForegroundColor Red
    $errorResponse = $_.ErrorDetails.Message
    if ($errorResponse) {
        Write-Host $errorResponse
    } else {
        Write-Host $_.Exception.Message
    }
    exit 1
}
