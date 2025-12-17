# Script para corrigir imports quebrados do @radix-ui
$fixes = @{
    'avatar.tsx' = '@radix-ui/react-avatar'
    'accordion.tsx' = '@radix-ui/react-accordion'
    'alert-dialog.tsx' = '@radix-ui/react-alert-dialog'
    'aspect-ratio.tsx' = '@radix-ui/react-aspect-ratio'
    'breadcrumb.tsx' = '@radix-ui/react-slot'
    'checkbox.tsx' = '@radix-ui/react-checkbox'
    'collapsible.tsx' = '@radix-ui/react-collapsible'
    'context-menu.tsx' = '@radix-ui/react-context-menu'
    'dialog.tsx' = '@radix-ui/react-dialog'
    'dropdown-menu.tsx' = '@radix-ui/react-dropdown-menu'
    'form.tsx' = '@radix-ui/react-label'
    'hover-card.tsx' = '@radix-ui/react-hover-card'
    'menubar.tsx' = '@radix-ui/react-menubar'
    'navigation-menu.tsx' = '@radix-ui/react-navigation-menu'
    'popover.tsx' = '@radix-ui/react-popover'
    'radio-group.tsx' = '@radix-ui/react-radio-group'
    'scroll-area.tsx' = '@radix-ui/react-scroll-area'
    'select.tsx' = '@radix-ui/react-select'
    'sheet.tsx' = '@radix-ui/react-dialog'
    'sidebar.tsx' = '@radix-ui/react-slot'
    'slider.tsx' = '@radix-ui/react-slider'
    'switch.tsx' = '@radix-ui/react-switch'
    'toggle-group.tsx' = '@radix-ui/react-toggle-group'
    'toggle.tsx' = '@radix-ui/react-toggle'
}

$files = Get-ChildItem -Path "components\ui" -Filter "*.tsx" -File

foreach ($file in $files) {
    $fileName = $file.Name
    if ($fixes.ContainsKey($fileName)) {
        $content = Get-Content $file.FullName -Raw
        $original = $content
        $correctImport = $fixes[$fileName]
        
        # Corrigir imports quebrados
        $content = $content -replace "from '@radix-ui/'", "from '$correctImport'"
        $content = $content -replace 'from "@radix-ui/"', "from '$correctImport'"
        
        # Corrigir form.tsx que tem dois imports
        if ($fileName -eq 'form.tsx') {
            $content = $content -replace "import \{ Slot \} from '@radix-ui/react-label'", "import { Slot } from '@radix-ui/react-slot'"
        }
        
        if ($content -ne $original) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            Write-Host "Corrigido: $fileName -> $correctImport"
        }
    }
}

# Corrigir sonner nos arquivos restantes
$sonnerFiles = @(
    'components\RoomsManager.tsx',
    'components\AdminMasterFunctional.tsx',
    'components\WhatsAppFloatingButton.tsx',
    'components\ReservationsManagement.tsx',
    'components\SettingsManager.tsx',
    'components\wizard-steps\ContentRoomsStep.tsx',
    'components\PropertyTypesSeedTool.tsx',
    'components\PropertyEditWizard.tsx',
    'components\ConflictsDetectionDashboard.tsx'
)

foreach ($filePath in $sonnerFiles) {
    $fullPath = Join-Path (Get-Location) $filePath
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        $original = $content
        $content = $content -replace "from ['\""]sonner@[^'\""]+['\""]", "from 'sonner'"
        if ($content -ne $original) {
            Set-Content -Path $fullPath -Value $content -NoNewline
            Write-Host "Corrigido sonner: $filePath"
        }
    }
}

Write-Host "Concluido!"

