# Executar SQL diretamente via Supabase CLI usando psql
# Este script usa o Supabase CLI para obter a connection string e executar o SQL

$sqlFile = "supabase\migrations\20241124_plano_contas_imobiliaria_temporada.sql"

Write-Host "📖 Lendo arquivo SQL..." -ForegroundColor Cyan
$sqlContent = Get-Content $sqlFile -Raw

Write-Host "🔗 Obtendo connection string do Supabase..." -ForegroundColor Cyan

# Tentar obter connection string do Supabase
$projectRef = "odcgnzfremrqnvtitpcc"

# Usar Supabase CLI para executar SQL diretamente
# Vamos usar o método de executar SQL via API do Supabase

Write-Host "🚀 Executando SQL do plano de contas..." -ForegroundColor Green
Write-Host "📝 Arquivo: $sqlFile" -ForegroundColor Yellow

# Salvar SQL em arquivo temporário e executar via Supabase CLI
$tempFile = "temp_plano_contas.sql"
$sqlContent | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "✅ SQL salvo em arquivo temporário" -ForegroundColor Green
Write-Host "⚠️  Execute manualmente no SQL Editor do Supabase:" -ForegroundColor Yellow
Write-Host "   1. Acesse: https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Cyan
Write-Host "   2. Cole o conteúdo do arquivo: $tempFile" -ForegroundColor Cyan
Write-Host "   3. Clique em 'Run'" -ForegroundColor Cyan

# Tentar executar via Supabase Management API se tiver token
if ($env:SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "🔑 Service role key found, attempting to execute via API..." -ForegroundColor Cyan
    
    $headers = @{
        "Authorization" = "Bearer $env:SUPABASE_SERVICE_ROLE_KEY"
        "Content-Type" = "application/json"
        "apikey" = $env:SUPABASE_SERVICE_ROLE_KEY
    }
    
    $body = @{
        query = $sqlContent
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri "https://$projectRef.supabase.co/rest/v1/rpc/exec_sql" `
            -Method Post `
            -Headers $headers `
            -Body $body `
            -ErrorAction Stop
        
        Write-Host "✅ SQL executado com sucesso via API!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Não foi possível executar via API. Use o SQL Editor manualmente." -ForegroundColor Yellow
        Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️  Token não encontrado. Use o SQL Editor manualmente." -ForegroundColor Yellow
}

Write-Host "`n📋 Conteúdo do SQL está no arquivo: $tempFile" -ForegroundColor Cyan

