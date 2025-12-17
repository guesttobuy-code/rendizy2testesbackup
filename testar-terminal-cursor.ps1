# Script para testar se o terminal do Cursor está usando PowerShell 7
# Execute este script DENTRO do terminal do Cursor para verificar

$outputFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\teste-terminal-cursor.txt"

"" | Out-File -FilePath $outputFile -Encoding UTF8

function Write-ToFile {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp | $Message" | Out-File -FilePath $outputFile -Append -Encoding UTF8
}

Write-ToFile "=== TESTE DE TERMINAL DO CURSOR ==="
Write-ToFile "Execute este script DENTRO do terminal do Cursor"
Write-ToFile "Iniciado em: $(Get-Date)"
Write-ToFile ""

# 1. Verificar qual PowerShell está rodando
Write-ToFile "1. VERIFICANDO POWERSHELL ATUAL:"
Write-ToFile "   Versão: $($PSVersionTable.PSVersion)"
Write-ToFile "   Edição: $($PSVersionTable.PSEdition)"
Write-ToFile "   Caminho: $PSHome"
Write-ToFile "   Executável: $PSHOME\powershell.exe"
Write-ToFile ""

# 2. Verificar se é PowerShell 7
if ($PSVersionTable.PSEdition -eq "Core" -or $PSVersionTable.PSVersion.Major -ge 7) {
    Write-ToFile "   ✅ É POWERSHELL 7!"
    Write-ToFile "   Versão: $($PSVersionTable.PSVersion)"
} else {
    Write-ToFile "   ⚠️ É POWERSHELL 5.1 (Windows PowerShell)"
    Write-ToFile "   O Cursor ainda não está usando PowerShell 7"
    Write-ToFile "   Solução: Reinicie o Cursor completamente"
}
Write-ToFile ""

# 3. Verificar variáveis de ambiente
Write-ToFile "3. VARIÁVEIS DE AMBIENTE:"
Write-ToFile "   TERM_PROGRAM: $env:TERM_PROGRAM"
Write-ToFile "   TERM: $env:TERM"
Write-ToFile "   SHELL: $env:SHELL"
Write-ToFile ""

# 4. Testar comandos
Write-ToFile "4. TESTANDO COMANDOS:"
try {
    $nodeVersion = node --version 2>&1 | Out-String
    Write-ToFile "   Node: $nodeVersion"
} catch {
    Write-ToFile "   Node: ERRO"
}

try {
    $npmVersion = npm --version 2>&1 | Out-String
    Write-ToFile "   NPM: $npmVersion"
} catch {
    Write-ToFile "   NPM: ERRO"
}
Write-ToFile ""

Write-ToFile "=== TESTE CONCLUÍDO ==="
Write-ToFile "Finalizado em: $(Get-Date)"
Write-ToFile ""
Write-ToFile "✅ Se você está vendo PowerShell 7 (versão 7.x), está funcionando!"
Write-ToFile "⚠️ Se você está vendo PowerShell 5.1, reinicie o Cursor"

Write-Host "`n✅ Teste concluído! Output salvo em:" -ForegroundColor Green
Write-Host $outputFile -ForegroundColor Cyan
Write-Host "`nVerifique a versão acima. Se for 7.x, está OK!" -ForegroundColor Yellow
