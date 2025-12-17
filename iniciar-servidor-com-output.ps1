# Script para iniciar o servidor Vite e salvar outputs em arquivo
# O Auto pode ler este arquivo para ver os logs do servidor

$outputFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\servidor-output.txt"
$projectPath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\RendizyPrincipal"

# Limpar arquivo anterior
"" | Out-File -FilePath $outputFile -Encoding UTF8

function Write-ToFile {
    param([string]$Message)
    $timestamp = Get-Date -Format "HH:mm:ss"
    "[$timestamp] $Message" | Out-File -FilePath $outputFile -Append -Encoding UTF8
}

Write-ToFile "=== INICIANDO SERVIDOR VITE ==="
Write-ToFile "Pasta do projeto: $projectPath"
Write-ToFile "Iniciado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Verificar se pasta existe
if (-not (Test-Path $projectPath)) {
    Write-ToFile "❌ ERRO: Pasta do projeto não existe!"
    Write-Host "❌ ERRO: Pasta do projeto não existe!" -ForegroundColor Red
    exit 1
}

# Mudar para pasta do projeto
Set-Location $projectPath
Write-ToFile "✅ Mudou para pasta: $(Get-Location)"

# Verificar se package.json existe
if (-not (Test-Path "package.json")) {
    Write-ToFile "❌ ERRO: package.json não encontrado!"
    Write-Host "❌ ERRO: package.json não encontrado!" -ForegroundColor Red
    exit 1
}

Write-ToFile "✅ package.json encontrado"
Write-ToFile "🚀 Iniciando: npm run dev"
Write-ToFile "--- LOGS DO SERVIDOR (abaixo) ---"
Write-ToFile ""

# Mostrar no console
Write-Host "`n🚀 Iniciando servidor Vite..." -ForegroundColor Cyan
Write-Host "📝 Logs sendo salvos em: $outputFile" -ForegroundColor Yellow
Write-Host "`nAguardando servidor iniciar...`n" -ForegroundColor Green

# Iniciar servidor e capturar TODOS os outputs (stdout e stderr)
# Usar Start-Process para rodar em background e capturar outputs
$process = Start-Process -FilePath "npm" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory $projectPath `
    -NoNewWindow `
    -PassThru `
    -RedirectStandardOutput "$outputFile.temp" `
    -RedirectStandardError "$outputFile.error"

# Aguardar um pouco para ver se inicia
Start-Sleep -Seconds 3

# Verificar se processo está rodando
if ($process.HasExited) {
    Write-ToFile "❌ ERRO: Processo terminou imediatamente (código: $($process.ExitCode))"
    if (Test-Path "$outputFile.error") {
        $errorContent = Get-Content "$outputFile.error" -Raw
        Write-ToFile "Erro capturado: $errorContent"
    }
} else {
    Write-ToFile "✅ Processo iniciado (PID: $($process.Id))"
    Write-ToFile "Servidor deve estar rodando em http://localhost:5173"
}

# Ler e anexar outputs ao arquivo principal
if (Test-Path "$outputFile.temp") {
    $tempContent = Get-Content "$outputFile.temp" -Raw
    Add-Content -Path $outputFile -Value $tempContent -Encoding UTF8
}

if (Test-Path "$outputFile.error") {
    $errorContent = Get-Content "$outputFile.error" -Raw
    Add-Content -Path $outputFile -Value "`n--- ERROS ---`n$errorContent" -Encoding UTF8
}

Write-ToFile "`n=== SERVIDOR INICIADO ==="
Write-ToFile "Arquivo de log: $outputFile"
Write-ToFile "O Auto pode ler este arquivo para ver os outputs do servidor"

Write-Host "`n✅ Servidor iniciado!" -ForegroundColor Green
Write-Host "📝 Logs salvos em: $outputFile" -ForegroundColor Cyan
Write-Host "🌐 Acesse: http://localhost:5173" -ForegroundColor Yellow
Write-Host "`n💡 DICA: O Auto pode ler o arquivo $outputFile para ver os logs" -ForegroundColor Magenta
