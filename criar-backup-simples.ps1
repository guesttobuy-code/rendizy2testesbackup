$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "rendizy-backup-$timestamp.zip"
$destino = "..\$backupName"

Write-Host "Criando backup: $backupName"

# Criar arquivo temporário com lista de arquivos
$lista = @(
    "RendizyPrincipal\components\automations\*.tsx",
    "RendizyPrincipal\utils\api.ts",
    "supabase\functions\rendizy-server\routes-automations*.ts",
    "supabase\migrations\20241126*.sql",
    "*.md",
    "*.sql"
)

Compress-Archive -Path $lista -DestinationPath $destino -Force

Write-Host "✅ Backup criado: $backupName"

