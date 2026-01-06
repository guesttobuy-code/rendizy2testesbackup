# Deploy direto para GitHub - Script simples sem erros
$outputFile = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL\deploy-output.txt"
"" | Out-File -FilePath $outputFile -Encoding UTF8

function Log {
    param([string]$msg)
    $timestamp = Get-Date -Format "HH:mm:ss"
    "$timestamp | $msg" | Out-File -FilePath $outputFile -Append -Encoding UTF8
    Write-Host $msg
}

Log "=== DEPLOY GITHUB ==="
Set-Location "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"

# 1. Status
Log "1. Verificando status..."
$status = git status --porcelain 2>&1 | Out-String
Log "Status: $status"

# 2. Branch
Log "2. Verificando branch..."
$branch = git branch --show-current 2>&1 | Out-String
Log "Branch: $branch"

# 3. Remote
Log "3. Verificando remote..."
$remote = git remote get-url origin 2>&1 | Out-String
Log "Remote: $remote"

# 4. Adicionar arquivos
Log "4. Adicionando arquivos..."
git add -A 2>&1 | Out-Null
Log "Arquivos adicionados"

# 5. Commit
Log "5. Fazendo commit..."
$commitMsg = "feat: Deploy completo - Cadeados implementados + Correcoes"
$commitOut = git commit -m $commitMsg 2>&1 | Out-String
Log "Commit: $commitOut"

# 6. Push
Log "6. Fazendo push..."
$pushOut = git push origin main 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
    $pushOut = git push -u origin main 2>&1 | Out-String
}
Log "Push: $pushOut"

Log "=== CONCLUIDO ==="
Write-Host "Output salvo em: $outputFile" -ForegroundColor Cyan
