# Script para executar comandos e salvar outputs no arquivo central
# Uso: .\executar-comando.ps1 "comando a executar"

param(
    [Parameter(Mandatory=$true)]
    [string]$Comando,
    
    [string]$Descricao = ""
)

$outputFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\powershell-outputs.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Adicionar separador
"`n" | Out-File $outputFile -Append -Encoding UTF8
"========================================" | Out-File $outputFile -Append -Encoding UTF8
"[$timestamp] $Descricao" | Out-File $outputFile -Append -Encoding UTF8
"Comando: $Comando" | Out-File $outputFile -Append -Encoding UTF8
"----------------------------------------" | Out-File $outputFile -Append -Encoding UTF8

# Executar comando e capturar output
try {
    $output = Invoke-Expression $Comando 2>&1 | Out-String
    $output | Out-File $outputFile -Append -Encoding UTF8
    $exitCode = $LASTEXITCODE
    "Exit Code: $exitCode" | Out-File $outputFile -Append -Encoding UTF8
} catch {
    "ERRO: $($_.Exception.Message)" | Out-File $outputFile -Append -Encoding UTF8
    $exitCode = 1
}

"========================================" | Out-File $outputFile -Append -Encoding UTF8

# Mostrar no console também
Write-Host "Output salvo em: $outputFile" -ForegroundColor Cyan
return $output
