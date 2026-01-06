# Script para verificar se o deploy foi aplicado
Write-Host "🔍 Verificando se código está no arquivo local..." -ForegroundColor Cyan

$filePath = "supabase\functions\rendizy-server\routes-properties.ts"
$content = Get-Content $filePath -Raw

if ($content -match "BODY COMPLETO") {
    Write-Host "✅ Código encontrado no arquivo local!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📤 Fazendo deploy para Supabase..." -ForegroundColor Yellow
    npx supabase functions deploy rendizy-server
    Write-Host ""
    Write-Host "✅ Deploy concluído!" -ForegroundColor Green
} else {
    Write-Host "❌ Código NÃO encontrado no arquivo local!" -ForegroundColor Red
    Write-Host "   Verifique se as alterações foram salvas." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Para verificar no Supabase Dashboard:" -ForegroundColor Cyan
Write-Host "   1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server" -ForegroundColor White
Write-Host "   2. Clique em 'View Source' ou 'Edit'" -ForegroundColor White
Write-Host "   3. Procure por: 'BODY COMPLETO'" -ForegroundColor White
Write-Host ""
