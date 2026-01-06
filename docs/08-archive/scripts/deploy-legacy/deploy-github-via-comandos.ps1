# Deploy GitHub usando sistema de outputs centralizado
$outputFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\powershell-outputs.txt"
Set-Location "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"

function Executar {
    param([string]$cmd, [string]$desc)
    $ts = Get-Date -Format "HH:mm:ss"
    "`n[$ts] $desc" | Out-File $outputFile -Append -Encoding UTF8
    "Comando: $cmd" | Out-File $outputFile -Append -Encoding UTF8
    "---" | Out-File $outputFile -Append -Encoding UTF8
    $result = Invoke-Expression $cmd 2>&1 | Out-String
    $result | Out-File $outputFile -Append -Encoding UTF8
    "Exit: $LASTEXITCODE" | Out-File $outputFile -Append -Encoding UTF8
    Write-Host "[$ts] $desc" -ForegroundColor Cyan
    return $result
}

"=== DEPLOY GITHUB $(Get-Date) ===" | Out-File $outputFile -Append -Encoding UTF8

Executar "git status" "1. Status do Git"
Executar "git branch --show-current" "2. Branch atual"
Executar "git remote get-url origin" "3. Remote configurado"
Executar "git add -A" "4. Adicionando arquivos"
Executar 'git commit -m "feat: Deploy completo - Cadeados + Correcoes"' "5. Commit"
Executar "git push origin master" "6. Push para GitHub"

if ($LASTEXITCODE -ne 0) {
    Executar "git push -u origin master" "6b. Push com upstream"
}

"=== DEPLOY CONCLUIDO ===" | Out-File $outputFile -Append -Encoding UTF8
Write-Host "`n✅ Deploy concluído! Outputs salvos em:" -ForegroundColor Green
Write-Host $outputFile -ForegroundColor Cyan
