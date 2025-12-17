# 🧪 Testar Rota de Organizações Diretamente
# Simula requisição do frontend para ver resposta

$projectId = "odcgnzfremrqnvtitpcc"
$publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzY4MDAsImV4cCI6MjA0NjA1MjgwMH0.placeholder"
$url = "https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/organizations"

Write-Host "`n=== TESTE DIRETO: Rota de Organizações ===" -ForegroundColor Green
Write-Host "📍 URL: $url" -ForegroundColor Cyan
Write-Host ""

try {
    $headers = @{
        "Authorization" = "Bearer $publicAnonKey"
        "Content-Type" = "application/json"
    }
    
    Write-Host "📤 Enviando requisição..." -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers -ErrorAction Stop
    
    Write-Host "✅ Resposta recebida!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📦 Estrutura da Resposta:" -ForegroundColor Cyan
    Write-Host "   Success: $($response.success)" -ForegroundColor White
    Write-Host "   Total: $($response.total)" -ForegroundColor White
    Write-Host "   Data Count: $($response.data.Count)" -ForegroundColor White
    Write-Host ""
    
    if ($response.success -and $response.data) {
        Write-Host "✅ ORGANIZAÇÕES ENCONTRADAS:" -ForegroundColor Green
        Write-Host ""
        
        for ($i = 0; $i -lt $response.data.Count; $i++) {
            $org = $response.data[$i]
            Write-Host "   $($i + 1). $($org.name)" -ForegroundColor Yellow
            Write-Host "      ID: $($org.id)" -ForegroundColor Gray
            Write-Host "      Slug: $($org.slug)" -ForegroundColor Gray
            Write-Host "      Email: $($org.email)" -ForegroundColor Gray
            Write-Host "      Plan: $($org.plan)" -ForegroundColor Gray
            Write-Host "      Status: $($org.status)" -ForegroundColor Gray
            Write-Host ""
        }
        
        # Verificar se Medhome está na lista
        $medhome = $response.data | Where-Object { $_.name -like "*medhome*" -or $_.slug -like "*medhome*" }
        if ($medhome) {
            Write-Host "✅ MEDHOME ENCONTRADA!" -ForegroundColor Green
            Write-Host "   Nome: $($medhome.name)" -ForegroundColor Yellow
            Write-Host "   ID: $($medhome.id)" -ForegroundColor Yellow
            Write-Host "   Slug: $($medhome.slug)" -ForegroundColor Yellow
        } else {
            Write-Host "⚠️  MEDHOME NÃO ENCONTRADA na lista" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Resposta sem sucesso ou sem dados" -ForegroundColor Red
        Write-Host "📦 Resposta completa:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 10
    }
} catch {
    Write-Host "❌ Erro ao testar rota:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "📦 Resposta de erro:" -ForegroundColor Yellow
        Write-Host $responseBody -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "💡 Verifique:" -ForegroundColor Yellow
    Write-Host "  1. Backend está deployado?" -ForegroundColor White
    Write-Host "  2. URL está correta?" -ForegroundColor White
    Write-Host "  3. Token está válido?" -ForegroundColor White
    Write-Host "  4. RLS está configurado corretamente?" -ForegroundColor White
}

