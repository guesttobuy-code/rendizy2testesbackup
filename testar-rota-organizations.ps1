# 🧪 Script para Testar Rota de Organizações
# Testa se o backend está retornando as 4 organizações

$projectId = "odcgnzfremrqnvtitpcc"
$url = "https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/organizations"

Write-Host "`n=== TESTE: Rota de Organizações ===" -ForegroundColor Green
Write-Host "📍 URL: $url" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers @{
        "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzY4MDAsImV4cCI6MjA0NjA1MjgwMH0.placeholder"
        "Content-Type" = "application/json"
    }
    
    Write-Host "✅ Resposta recebida!" -ForegroundColor Green
    Write-Host "📦 Success: $($response.success)" -ForegroundColor Cyan
    Write-Host "📊 Total: $($response.total)" -ForegroundColor Cyan
    Write-Host "📋 Organizações encontradas: $($response.data.Count)" -ForegroundColor Cyan
    Write-Host ""
    
    if ($response.success -and $response.data) {
        Write-Host "✅ DADOS ENCONTRADOS:" -ForegroundColor Green
        $response.data | ForEach-Object {
            Write-Host "  - $($_.name) (ID: $($_.id))" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Resposta sem sucesso ou sem dados" -ForegroundColor Red
        Write-Host "📦 Resposta completa:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 10
    }
} catch {
    Write-Host "❌ Erro ao testar rota:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Verifique:" -ForegroundColor Yellow
    Write-Host "  1. Backend está deployado?" -ForegroundColor Yellow
    Write-Host "  2. URL está correta?" -ForegroundColor Yellow
    Write-Host "  3. Token está válido?" -ForegroundColor Yellow
}

