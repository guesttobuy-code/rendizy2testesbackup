# ============================================================================
# SCRIPT: Buscar Logs do Supabase (Versão Simples)
# ============================================================================

param(
    [int]$Limit = 50,
    [string]$Filter = ""
)

$ProjectRef = "odcgnzfremrqnvtitpcc"
$FunctionName = "rendizy-server"

Write-Host "🔍 Buscando logs do Supabase..." -ForegroundColor Cyan
Write-Host "   Projeto: $ProjectRef" -ForegroundColor Gray
Write-Host "   Função: $FunctionName" -ForegroundColor Gray
Write-Host ""

# Tentar com npx (projeto já deve estar linkado)
# Primeiro tenta com projeto linkado, se não funcionar usa --project-ref
$command = "npx supabase functions logs $FunctionName --limit $Limit"

if ($Filter) {
    Write-Host "   Filtrando por: $Filter" -ForegroundColor Gray
}

Write-Host "   Executando: $command" -ForegroundColor DarkGray
Write-Host ""

# Executar comando e mostrar resultado
Invoke-Expression $command 2>&1 | ForEach-Object {
    $line = $_
    
    # Aplicar filtro se fornecido
    if ($Filter -and $line -notmatch $Filter) {
        return
    }
    
    # Colorir por tipo
    if ($line -match "ERROR|❌|Erro|Error") {
        Write-Host $line -ForegroundColor Red
    } elseif ($line -match "WARNING|⚠️|Aviso|Warning") {
        Write-Host $line -ForegroundColor Yellow
    } elseif ($line -match "INFO|ℹ️|Info") {
        Write-Host $line -ForegroundColor Cyan
    } elseif ($line -match "✅|SUCCESS|Success") {
        Write-Host $line -ForegroundColor Green
    } elseif ($line -match "POST|GET|PUT|DELETE|PATCH") {
        Write-Host $line -ForegroundColor Magenta
    } elseif ($line -match "🔐|auth|login|rppt") {
        Write-Host $line -ForegroundColor Blue
    } else {
        Write-Host $line
    }
}

