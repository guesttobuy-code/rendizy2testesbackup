# Script simples para mover projeto para fora do OneDrive
Write-Host "=== MOVENDO PROJETO PARA FORA DO ONEDRIVE ===" -ForegroundColor Cyan
Write-Host ""

$sourcePath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"
$destPath = "C:\dev\RENDIZY PASTA OFICIAL"

Write-Host "Origem:  $sourcePath" -ForegroundColor Yellow
Write-Host "Destino: $destPath" -ForegroundColor Yellow
Write-Host ""

# Verificar se origem existe
if (-not (Test-Path $sourcePath)) {
    Write-Host "❌ ERRO: Pasta origem não encontrada!" -ForegroundColor Red
    Write-Host "   Verifique se o caminho está correto." -ForegroundColor Yellow
    pause
    exit 1
}

# Verificar se destino já existe
if (Test-Path $destPath) {
    Write-Host "⚠️  ATENÇÃO: A pasta destino já existe!" -ForegroundColor Yellow
    Write-Host "   $destPath" -ForegroundColor White
    Write-Host ""
    $overwrite = Read-Host "Deseja sobrescrever? (S/N)"
    if ($overwrite -ne "S" -and $overwrite -ne "s") {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
        pause
        exit 0
    }
    Write-Host "Removendo pasta destino existente..." -ForegroundColor Yellow
    Remove-Item -Path $destPath -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Criar diretório C:\dev se não existir
Write-Host ""
Write-Host "Criando diretório C:\dev..." -ForegroundColor Cyan
if (-not (Test-Path "C:\dev")) {
    try {
        New-Item -Path "C:\dev" -ItemType Directory -Force | Out-Null
        Write-Host "✅ Diretório C:\dev criado" -ForegroundColor Green
    } catch {
        Write-Host "❌ ERRO ao criar C:\dev: $_" -ForegroundColor Red
        Write-Host "   Execute o PowerShell como Administrador" -ForegroundColor Yellow
        pause
        exit 1
    }
} else {
    Write-Host "✅ Diretório C:\dev já existe" -ForegroundColor Green
}

# Mover pasta
Write-Host ""
Write-Host "Movendo projeto..." -ForegroundColor Yellow
Write-Host "⏳ Isso pode demorar alguns minutos. Aguarde..." -ForegroundColor Cyan
Write-Host ""

try {
    Move-Item -Path $sourcePath -Destination $destPath -Force -ErrorAction Stop
    
    Write-Host ""
    Write-Host "✅✅✅ PROJETO MOVIDO COM SUCESSO! ✅✅✅" -ForegroundColor Green
    Write-Host ""
    Write-Host "Nova localização: $destPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "=== PRÓXIMOS PASSOS ===" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Feche o Cursor completamente (se estiver aberto)" -ForegroundColor White
    Write-Host "2. Abra o Cursor novamente" -ForegroundColor White
    Write-Host "3. Abra o workspace em: $destPath" -ForegroundColor White
    Write-Host "4. Execute: cd '$destPath\RendizyPrincipal' && npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "🎉 Agora o projeto está FORA do OneDrive!" -ForegroundColor Green
    Write-Host "   Os conflitos não devem mais aparecer!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO ao mover: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "- Arquivos estão sendo usados (feche o Cursor e outros programas)" -ForegroundColor White
    Write-Host "- Permissões insuficientes (execute como Administrador)" -ForegroundColor White
    Write-Host "- OneDrive ainda está sincronizando" -ForegroundColor White
    Write-Host ""
    Write-Host "SOLUÇÃO MANUAL:" -ForegroundColor Cyan
    Write-Host "1. Feche TODOS os programas (Cursor, VS Code, etc)" -ForegroundColor White
    Write-Host "2. Abra o Windows Explorer" -ForegroundColor White
    Write-Host "3. Navegue até: C:\Users\rafae\OneDrive\Desktop" -ForegroundColor White
    Write-Host "4. Corte a pasta 'RENDIZY PASTA OFICIAL' (Ctrl+X)" -ForegroundColor White
    Write-Host "5. Cole em C:\dev\ (Ctrl+V)" -ForegroundColor White
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
