# Script para testar se o Auto consegue se conectar ao PowerShell 7
# Salva outputs em arquivo para o Auto ler

$outputFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\teste-conexao-pwsh7.txt"

"" | Out-File -FilePath $outputFile -Encoding UTF8

function Write-ToFile {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp | $Message" | Out-File -FilePath $outputFile -Append -Encoding UTF8
}

Write-ToFile "=== TESTE DE CONEXÃO POWERSHELL 7 ==="
Write-ToFile "Iniciado em: $(Get-Date)"
Write-ToFile ""

# 1. Verificar qual PowerShell está rodando
Write-ToFile "1. VERIFICANDO POWERSHELL ATUAL:"
Write-ToFile "   Versão: $($PSVersionTable.PSVersion)"
Write-ToFile "   Edição: $($PSVersionTable.PSEdition)"
Write-ToFile "   Caminho: $PSHome"
Write-ToFile ""

# 2. Tentar executar PowerShell 7
Write-ToFile "2. TENTANDO EXECUTAR POWERSHELL 7:"
$pwshPath = Get-Command pwsh -ErrorAction SilentlyContinue
if ($pwshPath) {
    Write-ToFile "   ✅ PowerShell 7 encontrado: $($pwshPath.Source)"
    
    # Executar comando no PowerShell 7
    $pwshVersion = & pwsh -Command '$PSVersionTable.PSVersion.ToString()' 2>&1
    $pwshEdition = & pwsh -Command '$PSVersionTable.PSEdition' 2>&1
    
    Write-ToFile "   Versão PowerShell 7: $pwshVersion"
    Write-ToFile "   Edição: $pwshEdition"
} else {
    Write-ToFile "   ❌ PowerShell 7 NÃO encontrado!"
    Write-ToFile "   Instale do site: https://aka.ms/powershell-release"
}
Write-ToFile ""

# 3. Testar comandos básicos
Write-ToFile "3. TESTANDO COMANDOS BÁSICOS:"
Write-ToFile "   Diretório atual: $(Get-Location)"
Write-ToFile "   Usuário: $env:USERNAME"
Write-ToFile "   Computador: $env:COMPUTERNAME"
Write-ToFile ""

# 4. Testar Node e NPM
Write-ToFile "4. TESTANDO NODE E NPM:"
try {
    $nodeVersion = node --version 2>&1 | Out-String
    Write-ToFile "   Node: $nodeVersion"
} catch {
    Write-ToFile "   Node: ERRO - $($_.Exception.Message)"
}

try {
    $npmVersion = npm --version 2>&1 | Out-String
    Write-ToFile "   NPM: $npmVersion"
} catch {
    Write-ToFile "   NPM: ERRO - $($_.Exception.Message)"
}
Write-ToFile ""

# 5. Testar Git
Write-ToFile "5. TESTANDO GIT:"
try {
    $gitVersion = git --version 2>&1 | Out-String
    Write-ToFile "   Git: $gitVersion"
} catch {
    Write-ToFile "   Git: ERRO - $($_.Exception.Message)"
}
Write-ToFile ""

# 6. Verificar se Auto consegue ler este arquivo
Write-ToFile "6. TESTE DE LEITURA:"
Write-ToFile "   Se o Auto conseguir ler este arquivo, a conexão está funcionando!"
Write-ToFile "   Arquivo: $outputFile"
Write-ToFile ""

Write-ToFile "=== TESTE CONCLUÍDO ==="
Write-ToFile "Finalizado em: $(Get-Date)"
Write-ToFile ""
Write-ToFile "✅ Se o Auto conseguir ler este arquivo, a conexão está OK!"

Write-Host "`n✅ Teste concluído! Output salvo em:" -ForegroundColor Green
Write-Host $outputFile -ForegroundColor Cyan
Write-Host "`nO Auto pode ler este arquivo para verificar a conexão." -ForegroundColor Yellow
