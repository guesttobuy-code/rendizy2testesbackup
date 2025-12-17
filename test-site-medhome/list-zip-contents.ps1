# Script para listar conteúdo do ZIP do Medhome
$projectId = 'odcgnzfremrqnvtitpcc'
$publicAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPFkbP7QC_hhiZwxUZbtnqVqQ'
$subdomain = 'medhome'

Write-Host "🔍 Buscando informações do site Medhome..." -ForegroundColor Cyan

# 1. Buscar informações do site
$siteUrl = "https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/client-sites/by-subdomain/${subdomain}"
try {
    $siteResponse = Invoke-RestMethod -Uri $siteUrl -Headers @{
        apikey = $publicAnonKey
        Authorization = "Bearer $publicAnonKey"
    }
    
    Write-Host "✅ Site encontrado!" -ForegroundColor Green
    Write-Host "📦 Archive Path: $($siteResponse.data.archivePath)" -ForegroundColor Yellow
    
    $archivePath = $siteResponse.data.archivePath
    
    # 2. Baixar ZIP do Supabase Storage
    Write-Host "`n📥 Baixando ZIP do Storage..." -ForegroundColor Cyan
    
    # Usar Supabase JS client via Node.js ou fazer download direto
    # Por enquanto, vamos apenas mostrar o caminho e pedir para verificar manualmente
    Write-Host "`n📋 Para verificar o conteúdo do ZIP:" -ForegroundColor Yellow
    Write-Host "   1. Acesse o Supabase Dashboard" -ForegroundColor White
    Write-Host "   2. Vá em Storage > client-sites" -ForegroundColor White
    Write-Host "   3. Baixe o arquivo: $archivePath" -ForegroundColor White
    Write-Host "   4. Extraia e verifique se existe:" -ForegroundColor White
    Write-Host "      - dist/assets/index-ChhK5BXo.js" -ForegroundColor Cyan
    Write-Host "      - dist/assets/index-lvFSWcOk.css" -ForegroundColor Cyan
    Write-Host "      - dist/index.html" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Resposta: $responseBody" -ForegroundColor Red
    }
}

