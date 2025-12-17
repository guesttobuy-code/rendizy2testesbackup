# Diagnostico: Backend retorna array vazio para /organizations
# Este script testa a rota diretamente e verifica logs

Write-Host "DIAGNOSTICO: Backend retorna array vazio" -ForegroundColor Yellow
Write-Host ""

# 1. Testar rota diretamente
Write-Host "1. Testando rota /organizations diretamente..." -ForegroundColor Cyan
Write-Host ""

$url = "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/organizations"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA1OTI2MDAsImV4cCI6MjA0NjE2ODYwMH0.8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ8qJ"

try {
    $response = Invoke-RestMethod -Uri $url -Method GET -Headers @{
        "Authorization" = "Bearer $anonKey"
        "Content-Type" = "application/json"
    } -ErrorAction Stop
    
    Write-Host "Resposta recebida:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.success) {
        $dataCount = if ($response.data) { $response.data.Count } else { 0 }
        if ($dataCount -eq 0) {
            Write-Host "PROBLEMA CONFIRMADO: Backend retorna array vazio!" -ForegroundColor Red
            Write-Host "   Total: $($response.total)" -ForegroundColor Red
            Write-Host ""
            Write-Host "Possiveis causas:" -ForegroundColor Yellow
            Write-Host "   1. Service Role Key nao configurada no Supabase"
            Write-Host "   2. RLS bloqueando mesmo com Service Role"
            Write-Host "   3. Query SQL nao encontra organizacoes"
            Write-Host "   4. Backend nao foi feito deploy com logs"
            Write-Host ""
        } else {
            Write-Host "SUCESSO: Backend retorna $dataCount organizacoes!" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "Erro ao fazer requisicao:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
}

Write-Host ""
Write-Host "2. PROXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Verificar logs do Supabase:" -ForegroundColor Yellow
Write-Host "      https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/logs/edge-functions"
Write-Host ""
Write-Host "   Filtrar por: 'listOrganizations' ou 'organizations'"
Write-Host ""
Write-Host "   Fazer deploy do backend com logs:" -ForegroundColor Yellow
Write-Host "      cd supabase/functions/rendizy-server"
Write-Host "      npx supabase functions deploy rendizy-server --no-verify-jwt"
Write-Host ""
Write-Host "   Verificar Service Role Key:" -ForegroundColor Yellow
Write-Host "      https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/settings/api"
Write-Host "      Verificar se SUPABASE_SERVICE_ROLE_KEY esta configurada nas Edge Functions"
Write-Host ""
