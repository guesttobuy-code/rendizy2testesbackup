# Script para resolver conflitos em TODOS os módulos de uma vez
# Remove marcadores de conflito mantendo versão HEAD

Write-Host "=== RESOLVENDO CONFLITOS EM TODOS OS MÓDULOS ===" -ForegroundColor Red
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL\RendizyPrincipal"
$files = @(
    "components\properties\PropertiesModule.tsx",
    "components\locations\LocationsModule.tsx",
    "components\guests\GuestsModule.tsx",
    "components\dashboard\DashboardModule.tsx",
    "components\chat\ChatModule.tsx",
    "components\calendar\CalendarModule.tsx",
    "components\WhatsAppIntegration.tsx",
    "components\TenantManagement.tsx",
    "components\SettingsManager.tsx",
    "components\GlobalSettingsManager.tsx",
    "components\CreateUserModal.tsx",
    "components\CreateOrganizationModal.tsx",
    "components\BulkPricingManager.tsx",
    "components\AdminMasterFunctional.tsx"
)

$fixedCount = 0

foreach ($file in $files) {
    $fullPath = Join-Path $projectPath $file
    if (Test-Path $fullPath) {
        try {
            $content = [System.IO.File]::ReadAllText($fullPath, [System.Text.Encoding]::UTF8)
            
            if ($content -match '^<<<<<<< HEAD') {
                Write-Host "  Resolvendo: $file" -ForegroundColor Yellow
                
                # Processar linha por linha
                $lines = $content -split "`r?`n"
                $cleanLines = @()
                $inConflict = $false
                $keepLines = $true
                
                foreach ($line in $lines) {
                    if ($line -match '^<<<<<<< HEAD') {
                        $inConflict = $true
                        $keepLines = $true
                        continue
                    }
                    if ($line -match '^=======') {
                        $keepLines = $false
                        continue
                    }
                    if ($line -match '^>>>>>>>') {
                        $inConflict = $false
                        $keepLines = $true
                        continue
                    }
                    
                    if ($inConflict) {
                        if ($keepLines) {
                            $cleanLines += $line
                        }
                    } else {
                        $cleanLines += $line
                    }
                }
                
                $newContent = $cleanLines -join "`n"
                
                # Limpar qualquer marcador restante
                $newContent = $newContent -replace '(?m)^<<<<<<< HEAD.*?\r?\n', ''
                $newContent = $newContent -replace '(?m)^=======.*?\r?\n', ''
                $newContent = $newContent -replace '(?m)^>>>>>>>.*?\r?\n', ''
                
                [System.IO.File]::WriteAllText($fullPath, $newContent, [System.Text.Encoding]::UTF8)
                $fixedCount++
                Write-Host "    ✅ OK" -ForegroundColor Green
            }
        } catch {
            Write-Host "    ❌ Erro: $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Arquivos corrigidos: $fixedCount" -ForegroundColor Green
Write-Host ""

if ($fixedCount -gt 0) {
    Write-Host "✅ CONFLITOS RESOLVIDOS!" -ForegroundColor Green
} else {
    Write-Host "✅ Nenhum conflito encontrado!" -ForegroundColor Green
}
