# Script para mover projeto para fora do OneDrive
Write-Host "=== MOVER PROJETO PARA FORA DO ONEDRIVE ===" -ForegroundColor Cyan
Write-Host ""

$sourcePath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"
$destPath = "C:\dev\RENDIZY PASTA OFICIAL"

Write-Host "Origem:  $sourcePath" -ForegroundColor Yellow
Write-Host "Destino: $destPath" -ForegroundColor Yellow
Write-Host ""

# Verificar se origem existe
if (-not (Test-Path $sourcePath)) {
    Write-Host "❌ Pasta origem não encontrada: $sourcePath" -ForegroundColor Red
    exit 1
}

# Verificar se destino já existe
if (Test-Path $destPath) {
    Write-Host "⚠️  Pasta destino já existe!" -ForegroundColor Yellow
    $overwrite = Read-Host "Sobrescrever? (S/N)"
    if ($overwrite -ne "S" -and $overwrite -ne "s") {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
        exit 0
    }
    Write-Host "Removendo pasta destino existente..." -ForegroundColor Yellow
    Remove-Item -Path $destPath -Recurse -Force -ErrorAction SilentlyContinue
}

# Criar diretório destino
Write-Host ""
Write-Host "Criando diretório destino..." -ForegroundColor Cyan
if (-not (Test-Path "C:\dev")) {
    New-Item -Path "C:\dev" -ItemType Directory -Force | Out-Null
    Write-Host "✅ Diretório C:\dev criado" -ForegroundColor Green
}

Write-Host ""
Write-Host "Movendo projeto... (isso pode demorar alguns minutos)" -ForegroundColor Yellow
Write-Host "⏳ Aguarde..." -ForegroundColor Cyan

try {
    # Mover pasta
    Move-Item -Path $sourcePath -Destination $destPath -Force -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✅ PROJETO MOVIDO COM SUCESSO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Nova localização: $destPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "=== PRÓXIMOS PASSOS ===" -ForegroundColor Yellow
    Write-Host "1. Feche o Cursor completamente" -ForegroundColor White
    Write-Host "2. Abra o Cursor novamente" -ForegroundColor White
    Write-Host "3. Abra o workspace em: $destPath" -ForegroundColor White
    Write-Host "4. Execute: cd '$destPath\RendizyPrincipal' && npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Agora o projeto está fora do OneDrive e os conflitos não devem voltar!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO ao mover: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "- Arquivos estão sendo usados por outro programa" -ForegroundColor White
    Write-Host "- Permissões insuficientes" -ForegroundColor White
    Write-Host ""
    Write-Host "SOLUÇÃO:" -ForegroundColor Cyan
    Write-Host "1. Feche o Cursor e todos os programas que usam os arquivos" -ForegroundColor White
    Write-Host "2. Execute este script novamente" -ForegroundColor White
    Write-Host "OU" -ForegroundColor Yellow
    Write-Host "Mova manualmente pelo Windows Explorer:" -ForegroundColor White
    Write-Host "  - Corte a pasta 'RENDIZY PASTA OFICIAL'" -ForegroundColor White
    Write-Host "  - Cole em C:\dev\" -ForegroundColor White
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
