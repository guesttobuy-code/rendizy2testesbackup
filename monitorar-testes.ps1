# Script para monitorar logs durante testes
$logFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\teste-criacao-imobiliaria.txt"

"" | Out-File $logFile -Encoding UTF8

function Log {
    param([string]$msg)
    $ts = Get-Date -Format "HH:mm:ss"
    "[$ts] $msg" | Out-File $logFile -Append -Encoding UTF8
    Write-Host "[$ts] $msg" -ForegroundColor Cyan
}

Log "=== MONITORAMENTO DE TESTE - CRIAÇÃO DE IMOBILIÁRIA ==="
Log "Iniciado em: $(Get-Date)"
Log ""
Log "INSTRUÇÕES:"
Log "1. Abra o navegador em http://localhost:5173"
Log "2. Acesse Admin Master"
Log "3. Clique em 'Criar Nova Imobiliária'"
Log "4. Preencha os dados e clique em 'Criar no Supabase'"
Log "5. Me informe quando terminar para eu ler este arquivo"
Log ""
Log "Monitorando..."

# Verificar se servidor está rodando
$serverRunning = Test-NetConnection -ComputerName localhost -Port 5173 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($serverRunning) {
    Log "✅ Servidor Vite está rodando na porta 5173"
} else {
    Log "⚠️ Servidor Vite NÃO está rodando na porta 5173"
    Log "Execute: cd RendizyPrincipal && npm run dev"
}

Log ""
Log "Aguardando você testar..."
Log "Quando terminar, me avise para eu ler este arquivo: $logFile"

Write-Host "`n📝 Log sendo salvo em: $logFile" -ForegroundColor Green
Write-Host "Quando terminar o teste, me avise!" -ForegroundColor Yellow
