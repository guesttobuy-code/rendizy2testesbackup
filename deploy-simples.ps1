# Script simples de deploy - salva tudo em arquivo
$log = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\deploy-log.txt"
Set-Location "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"

"=== DEPLOY GITHUB $(Get-Date) ===" | Out-File $log

"1. Status:" | Out-File $log -Append
git status 2>&1 | Out-File $log -Append

"`n2. Branch:" | Out-File $log -Append
git branch --show-current 2>&1 | Out-File $log -Append

"`n3. Remote:" | Out-File $log -Append
git remote get-url origin 2>&1 | Out-File $log -Append

"`n4. Adicionando arquivos..." | Out-File $log -Append
git add -A 2>&1 | Out-File $log -Append

"`n5. Commit..." | Out-File $log -Append
git commit -m "feat: Deploy completo" 2>&1 | Out-File $log -Append

"`n6. Push..." | Out-File $log -Append
git push origin main 2>&1 | Out-File $log -Append
if ($LASTEXITCODE -ne 0) {
    git push -u origin main 2>&1 | Out-File $log -Append
}

"`n=== CONCLUIDO ===" | Out-File $log -Append
Write-Host "Log salvo em: $log"
