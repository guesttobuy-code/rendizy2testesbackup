# Script para capturar status do Git e salvar em arquivo
$projectPath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"
Set-Location $projectPath

$outputFile = Join-Path $projectPath "git-status-output.txt"

# Capturar tudo em um arquivo
@"
=== STATUS DO GIT ===
"@ | Out-File -FilePath $outputFile -Encoding UTF8

git status | Out-File -FilePath $outputFile -Append -Encoding UTF8

@"

=== ULTIMOS 3 COMMITS ===
"@ | Out-File -FilePath $outputFile -Append -Encoding UTF8

git log --oneline -3 | Out-File -FilePath $outputFile -Append -Encoding UTF8

@"

=== REMOTE ===
"@ | Out-File -FilePath $outputFile -Append -Encoding UTF8

git remote -v | Out-File -FilePath $outputFile -Append -Encoding UTF8

@"

=== BRANCH ===
"@ | Out-File -FilePath $outputFile -Append -Encoding UTF8

git branch --show-current | Out-File -FilePath $outputFile -Append -Encoding UTF8

Write-Host "Status salvo em: $outputFile"


