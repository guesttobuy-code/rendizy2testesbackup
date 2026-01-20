# Script para abrir Chrome com CDP habilitado
# Executa: .\ABRIR_CHROME_DEBUG.ps1

Write-Host ""
Write-Host "Abrindo Chrome com depuracao remota..." -ForegroundColor Cyan
Write-Host ""

# Caminho do Chrome (tenta varios caminhos comuns)
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chromeExe = $null
foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        $chromeExe = $path
        break
    }
}

if (-not $chromeExe) {
    Write-Host "ERRO: Chrome nao encontrado!" -ForegroundColor Red
    Write-Host "Instale em: https://www.google.com/chrome/" -ForegroundColor Yellow
    exit 1
}

# Verificar se ja tem Chrome rodando com CDP
$cdpProcess = Get-Process chrome -ErrorAction SilentlyContinue | 
    Where-Object { $_.CommandLine -like "*remote-debugging-port*" }

if ($cdpProcess) {
    Write-Host "OK: Chrome ja esta rodando com CDP na porta 9222" -ForegroundColor Green
    Write-Host "Pressione F5 no VS Code para conectar!" -ForegroundColor Yellow
    exit 0
}

# Fechar Chrome normal se estiver aberto
$chromeProcesses = Get-Process chrome -ErrorAction SilentlyContinue
if ($chromeProcesses) {
    Write-Host "Fechando Chrome existente..." -ForegroundColor Yellow
    $chromeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
}

# Abrir Chrome com CDP
Write-Host "Iniciando Chrome com CDP na porta 9222..." -ForegroundColor Green

$profilePath = Join-Path $PSScriptRoot ".chrome-debug-profile"
$chromeArgs = @(
    "--remote-debugging-port=9222",
    "--user-data-dir=$profilePath",
    "--disable-background-networking",
    "--disable-popup-blocking",
    "--no-first-run",
    "http://localhost:3000"
)

Start-Process -FilePath $chromeExe -ArgumentList $chromeArgs

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "Chrome aberto com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. Volte para o VS Code" -ForegroundColor White
Write-Host "  2. Pressione Ctrl+Shift+D" -ForegroundColor White
Write-Host "  3. Selecione: 'Anexar ao Chrome (CDP 9222)'" -ForegroundColor White
Write-Host "  4. Pressione F5" -ForegroundColor White
Write-Host ""
Write-Host "Agora todos os logs aparecem no Debug Console!" -ForegroundColor Yellow
Write-Host ""
