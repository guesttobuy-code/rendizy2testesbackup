# Teste para verificar se conseguimos capturar outputs
$testFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\teste-captura.txt"

"=== TESTE DE CAPTURA DE OUTPUTS ===" | Out-File $testFile -Encoding UTF8
"Data: $(Get-Date)" | Out-File $testFile -Append -Encoding UTF8
"" | Out-File $testFile -Append -Encoding UTF8

# Teste 1: Comando simples
"1. Teste comando simples:" | Out-File $testFile -Append -Encoding UTF8
$result1 = Get-Date
$result1 | Out-File $testFile -Append -Encoding UTF8
"" | Out-File $testFile -Append -Encoding UTF8

# Teste 2: Git status
"2. Teste git status:" | Out-File $testFile -Append -Encoding UTF8
$result2 = git status 2>&1 | Out-String
$result2 | Out-File $testFile -Append -Encoding UTF8
"" | Out-File $testFile -Append -Encoding UTF8

# Teste 3: PowerShell version
"3. Teste PowerShell version:" | Out-File $testFile -Append -Encoding UTF8
$result3 = $PSVersionTable.PSVersion
$result3 | Out-File $testFile -Append -Encoding UTF8
"" | Out-File $testFile -Append -Encoding UTF8

"=== TESTE CONCLUIDO ===" | Out-File $testFile -Append -Encoding UTF8

Write-Host "Teste concluído! Arquivo: $testFile" -ForegroundColor Green
