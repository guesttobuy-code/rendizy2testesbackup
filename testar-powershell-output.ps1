# Script para testar se o Auto consegue ler outputs do PowerShell
# Este script salva todos os outputs em um arquivo que o Auto pode ler

$outputFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\powershell-output.txt"

# Limpar arquivo anterior
"" | Out-File -FilePath $outputFile -Encoding UTF8

# Função para adicionar ao arquivo
function Write-ToFile {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp | $Message" | Out-File -FilePath $outputFile -Append -Encoding UTF8
}

Write-ToFile "=== TESTE DE CONEXÃO POWERSHELL ==="
Write-ToFile "Iniciado em: $(Get-Date)"

# Teste 1: Versão do PowerShell
Write-ToFile "`n--- Teste 1: Versão do PowerShell ---"
$psVersion = $PSVersionTable.PSVersion
Write-ToFile "PowerShell Version: $psVersion"

# Teste 2: Diretório atual
Write-ToFile "`n--- Teste 2: Diretório Atual ---"
$currentDir = Get-Location
Write-ToFile "Diretório: $currentDir"

# Teste 3: Node e NPM
Write-ToFile "`n--- Teste 3: Node e NPM ---"
try {
    $nodeVersion = node --version 2>&1 | Out-String
    Write-ToFile "Node: $nodeVersion"
} catch {
    Write-ToFile "Node: ERRO - $($_.Exception.Message)"
}

try {
    $npmVersion = npm --version 2>&1 | Out-String
    Write-ToFile "NPM: $npmVersion"
} catch {
    Write-ToFile "NPM: ERRO - $($_.Exception.Message)"
}

# Teste 4: Verificar se pasta do projeto existe
Write-ToFile "`n--- Teste 4: Verificar Pasta do Projeto ---"
$projectPath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\RendizyPrincipal"
if (Test-Path $projectPath) {
    Write-ToFile "✅ Pasta existe: $projectPath"
    $packageJson = Join-Path $projectPath "package.json"
    if (Test-Path $packageJson) {
        Write-ToFile "✅ package.json encontrado"
    } else {
        Write-ToFile "❌ package.json NÃO encontrado"
    }
} else {
    Write-ToFile "❌ Pasta NÃO existe: $projectPath"
}

# Teste 5: Tentar iniciar servidor (apenas verificar se comando funciona)
Write-ToFile "`n--- Teste 5: Verificar Comando npm run dev ---"
$devScript = "npm run dev"
Write-ToFile "Comando a executar: $devScript"
Write-ToFile "NOTA: Este script apenas verifica, não inicia o servidor"

Write-ToFile "`n=== TESTE CONCLUÍDO ==="
Write-ToFile "Finalizado em: $(Get-Date)"
Write-ToFile "`n✅ Arquivo salvo em: $outputFile"
Write-ToFile "O Auto pode ler este arquivo para ver os outputs"

# Garantir que arquivo foi criado
if (Test-Path $outputFile) {
    $fileSize = (Get-Item $outputFile).Length
    Write-ToFile "`n✅ Arquivo criado com sucesso! Tamanho: $fileSize bytes"
} else {
    Write-Host "❌ ERRO: Arquivo não foi criado!" -ForegroundColor Red
    # Tentar criar novamente
    "ERRO: Arquivo não foi criado na primeira tentativa" | Out-File -FilePath $outputFile -Encoding UTF8
}

# Mostrar no console também
Write-Host "`n✅ Teste concluído! Output salvo em:" -ForegroundColor Green
Write-Host $outputFile -ForegroundColor Cyan
Write-Host "`nO Auto pode ler este arquivo agora." -ForegroundColor Yellow

# Verificar conteúdo do arquivo
if (Test-Path $outputFile) {
    $content = Get-Content $outputFile -Raw
    Write-Host "`n📄 Conteúdo do arquivo (primeiras 10 linhas):" -ForegroundColor Cyan
    $content -split "`n" | Select-Object -First 10 | ForEach-Object { Write-Host $_ }
}
