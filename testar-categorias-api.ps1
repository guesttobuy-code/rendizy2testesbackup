# Script para testar criação e listagem de categorias via API
$API_BASE = "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server"
$PUBLIC_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ"

# Obter token do localStorage (se disponível via browser)
# Por enquanto, vamos tentar sem token primeiro para ver o erro

Write-Host "📋 1. Listando categorias existentes..." -ForegroundColor Cyan
$listUrl = "$API_BASE/rendizy-server/make-server-67caf26a/financeiro/categorias"
$listHeaders = @{
    "Authorization" = "Bearer $PUBLIC_KEY"
    "Content-Type" = "application/json"
}

try {
    $listResponse = Invoke-RestMethod -Uri $listUrl -Method GET -Headers $listHeaders
    Write-Host "✅ Categorias encontradas:" -ForegroundColor Green
    $listResponse | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Erro ao listar: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n➕ 2. Criando categoria teste..." -ForegroundColor Cyan
$createUrl = "$API_BASE/rendizy-server/make-server-67caf26a/financeiro/categorias"
$createBody = @{
    codigo = "9.9.9"
    nome = "Categoria Teste API"
    tipo = "receita"
    natureza = "credora"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri $createUrl -Method POST -Headers $listHeaders -Body $createBody
    Write-Host "✅ Categoria criada:" -ForegroundColor Green
    $createResponse | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Erro ao criar: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host "`n📊 3. Listando TODAS as categorias após criação..." -ForegroundColor Cyan
try {
    $finalResponse = Invoke-RestMethod -Uri $listUrl -Method GET -Headers $listHeaders
    Write-Host "`n✅ LISTA COMPLETA DE CATEGORIAS:" -ForegroundColor Green
    $finalResponse | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ Erro ao listar final: $($_.Exception.Message)" -ForegroundColor Red
}

