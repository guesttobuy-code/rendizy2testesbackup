# ============================================================================
# CRIAR ZIP PARA DEPLOY - WhatsApp Correções
# ============================================================================
# 
# Este script cria um ZIP da pasta do backend para deploy no Supabase
# Salva na pasta Downloads
# 
# Uso: .\criar-zip-deploy.ps1
# ============================================================================

Write-Host "CRIANDO ZIP PARA DEPLOY - WhatsApp Correcoes" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Configurações
# ============================================================================

$BACKEND_FOLDER = "supabase\functions\rendizy-server"
$OUTPUT_FOLDER = "$env:USERPROFILE\Downloads"
$ZIP_NAME = "rendizy-server-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
$ZIP_PATH = Join-Path $OUTPUT_FOLDER $ZIP_NAME

# ============================================================================
# Passo 1: Verificar Pasta do Backend
# ============================================================================

Write-Host "Passo 1: Verificando pasta do backend..." -ForegroundColor Yellow
Write-Host ""

if (!(Test-Path $BACKEND_FOLDER)) {
    Write-Host "ERRO: Pasta do backend nao encontrada!" -ForegroundColor Red
    Write-Host "   Esperado: $BACKEND_FOLDER" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Pasta encontrada: $BACKEND_FOLDER" -ForegroundColor Green

# Verificar arquivos principais
$requiredFiles = @(
    "index.ts",
    "routes-whatsapp-evolution.ts",
    "routes-chat.ts",
    "evolution-credentials.ts"
)

Write-Host ""
Write-Host "Verificando arquivos principais..." -ForegroundColor DarkCyan

$missingFiles = @()
foreach ($file in $requiredFiles) {
    $filePath = Join-Path $BACKEND_FOLDER $file
    if (Test-Path $filePath) {
        Write-Host "   OK: $file" -ForegroundColor Green
    } else {
        Write-Host "   AVISO: $file (nao encontrado)" -ForegroundColor Yellow
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "AVISO: Alguns arquivos nao foram encontrados:" -ForegroundColor Yellow
    foreach ($file in $missingFiles) {
        Write-Host "   - $file" -ForegroundColor Yellow
    }
    Write-Host ""
    $continue = Read-Host "Continuar mesmo assim? (s/n)"
    if ($continue -ne "s" -and $continue -ne "S") {
        Write-Host "Operacao cancelada." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ============================================================================
# Passo 2: Listar Arquivos
# ============================================================================

Write-Host "Passo 2: Listando arquivos do backend..." -ForegroundColor Yellow
Write-Host ""

$files = Get-ChildItem -Path $BACKEND_FOLDER -Recurse -File | Where-Object {
    $_.FullName -notmatch 'node_modules' -and
    $_.FullName -notmatch '\.git' -and
    $_.FullName -notmatch '\.env' -and
    $_.FullName -notmatch '\.log' -and
    $_.FullName -notmatch '\.tmp'
}

$fileCount = $files.Count
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host "   Total de arquivos: $fileCount" -ForegroundColor Cyan
Write-Host "   Tamanho total: $totalSizeMB MB" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Passo 3: Verificar Pasta Downloads
# ============================================================================

Write-Host "Passo 3: Verificando pasta Downloads..." -ForegroundColor Yellow
Write-Host ""

if (!(Test-Path $OUTPUT_FOLDER)) {
    Write-Host "AVISO: Pasta Downloads nao encontrada. Criando..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $OUTPUT_FOLDER -Force | Out-Null
}

Write-Host "OK: Pasta encontrada: $OUTPUT_FOLDER" -ForegroundColor Green
Write-Host ""

# ============================================================================
# Passo 4: Criar ZIP
# ============================================================================

Write-Host "Passo 4: Criando ZIP..." -ForegroundColor Yellow
Write-Host ""

try {
    # Remover ZIP antigo se existir
    if (Test-Path $ZIP_PATH) {
        Write-Host "   Removendo ZIP antigo..." -ForegroundColor DarkCyan
        Remove-Item $ZIP_PATH -Force
    }

    Write-Host "   Compactando arquivos..." -ForegroundColor DarkCyan
    Write-Host "   Aguarde, isso pode levar alguns segundos..." -ForegroundColor DarkGray
    
    # Criar ZIP
    Compress-Archive -Path "$BACKEND_FOLDER\*" -DestinationPath $ZIP_PATH -Force -CompressionLevel Optimal
    
    Write-Host ""
    Write-Host "OK: ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERRO: Erro ao criar ZIP!" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# Passo 5: Informações do ZIP
# ============================================================================

Write-Host "Passo 5: Informacoes do ZIP criado" -ForegroundColor Yellow
Write-Host ""

$zipInfo = Get-Item $ZIP_PATH
$zipSizeMB = [math]::Round($zipInfo.Length / 1MB, 2)
$currentDate = Get-Date -Format "dd/MM/yyyy HH:mm:ss"

Write-Host "   Nome: $ZIP_NAME" -ForegroundColor Cyan
Write-Host "   Caminho: $ZIP_PATH" -ForegroundColor Cyan
Write-Host "   Tamanho: $zipSizeMB MB" -ForegroundColor Cyan
Write-Host "   Arquivos: $fileCount" -ForegroundColor Cyan
Write-Host "   Data: $currentDate" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# Resumo Final
# ============================================================================

Write-Host "================================================" -ForegroundColor Green
Write-Host "ZIP CRIADO COM SUCESSO!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ZIP salvo em: $OUTPUT_FOLDER" -ForegroundColor White
Write-Host "2. Nome do arquivo: $ZIP_NAME" -ForegroundColor White
Write-Host ""
Write-Host "3. Para fazer deploy no Supabase:" -ForegroundColor Yellow
Write-Host "   a) Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server" -ForegroundColor Gray
Write-Host "   b) Clique em Update Function ou Redeploy" -ForegroundColor Gray
Write-Host "   c) Faca upload do arquivo: $ZIP_NAME" -ForegroundColor Gray
Write-Host "   d) Clique em Deploy" -ForegroundColor Gray
Write-Host "   e) Aguarde 1-2 minutos" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Testar apos deploy:" -ForegroundColor Yellow
Write-Host "   https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/qr-code" -ForegroundColor Gray
Write-Host ""

Write-Host "Pronto para deploy!" -ForegroundColor Green
Write-Host ""

# Abrir pasta Downloads
$openFolder = Read-Host "Deseja abrir a pasta Downloads? (s/n)"
if ($openFolder -eq "s" -or $openFolder -eq "S") {
    Start-Process "explorer.exe" -ArgumentList $OUTPUT_FOLDER
}
