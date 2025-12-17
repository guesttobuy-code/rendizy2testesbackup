# Script para fazer deploy da Edge Function rendizy-server
Write-Host "=== Deploy da Edge Function rendizy-server ===" -ForegroundColor Green

# Navegar para o diretório do projeto
Set-Location "c:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP"

# Verificar se Supabase CLI está instalado
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instale com: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green

# Fazer deploy da Edge Function
Write-Host "`n🚀 Fazendo deploy da Edge Function rendizy-server..." -ForegroundColor Cyan
Write-Host "Isso pode levar alguns minutos..." -ForegroundColor Yellow

supabase functions deploy rendizy-server

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deploy concluído com sucesso!" -ForegroundColor Green
    Write-Host "A rota /chat/channels/config agora deve estar disponível" -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Erro no deploy" -ForegroundColor Red
    Write-Host "Verifique os logs acima para mais detalhes" -ForegroundColor Yellow
}
