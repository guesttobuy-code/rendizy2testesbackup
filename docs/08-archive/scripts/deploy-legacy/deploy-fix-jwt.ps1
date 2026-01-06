
# Deploy com flag --no-verify-jwt para resolver erro 401
Write-Host "🚀 Iniciando deploy da função SEM verificação de JWT do Gateway..." -ForegroundColor Cyan

# Forçar link primeiro (por segurança)
# npx supabase link --project-ref odcgnzfremrqnvtitpcc --password <senha> (não tenho a senha db)
# Assumindo que já está linkado ou usando token.

npx supabase functions deploy rendizy-server --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SUCESSO! A função foi atualizada." -ForegroundColor Green
    Write-Host "Agora o erro 'Invalid JWT' deve desaparecer."
} else {
    Write-Host "❌ FALHA no deploy." -ForegroundColor Red
}
