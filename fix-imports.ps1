# Script para corrigir imports invalidos
$files = Get-ChildItem -Path . -Recurse -Filter "*.tsx" -File
$files += Get-ChildItem -Path . -Recurse -Filter "*.ts" -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Corrigir sonner
    $content = $content -replace "from ['\""]sonner@[^'\""]+['\""]", "from 'sonner'"
    
    # Corrigir @radix-ui
    $content = $content -replace "from ['\""]@radix-ui/([^@'\""]+)@[^'\""]+['\""]", "from '@radix-ui/$1'"
    
    # Corrigir next-themes
    $content = $content -replace "from ['\""]next-themes@[^'\""]+['\""]", "from 'next-themes'"
    
    # Corrigir figma:asset
    $content = $content -replace "from ['\""]figma:asset/[^'\""]+['\""]", "from '/assets/57eefd69a2e74079e948ce1356622b7f42644fd5.png'"
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Corrigido: $($file.FullName)"
    }
}

Write-Host "Concluido!"

