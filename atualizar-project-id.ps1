# ============================================================================
# 🔄 Script para Atualizar Project ID em Todos os Arquivos
# ============================================================================
# Substitui o Project ID antigo pelo novo em todos os arquivos do projeto
#
# Uso: .\atualizar-project-id.ps1 -ProjectIdAntigo "odcgnzfremrqnvtitpcc" -ProjectIdNovo "[NOVO_ID]"
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectIdAntigo = "odcgnzfremrqnvtitpcc",
    
    [Parameter(Mandatory=$true)]
    [string]$ProjectIdNovo
)

Write-Host "🔄 RENDIZY - Atualizar Project ID" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Antigo: $ProjectIdAntigo" -ForegroundColor Yellow
Write-Host "Novo:   $ProjectIdNovo" -ForegroundColor Green
Write-Host ""

$confirmar = Read-Host "Deseja continuar? (S/N)"
if ($confirmar -ne "S" -and $confirmar -ne "s") {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔍 Buscando arquivos..." -ForegroundColor Cyan

# Buscar todos os arquivos que contêm o Project ID antigo
$arquivos = Get-ChildItem -Path . -Recurse -File | Where-Object {
    $_.Extension -in @('.ts', '.tsx', '.js', '.jsx', '.md', '.ps1', '.json', '.toml') -and
    (Select-String -Path $_.FullName -Pattern $ProjectIdAntigo -Quiet)
}

Write-Host "📝 Encontrados $($arquivos.Count) arquivos para atualizar" -ForegroundColor Yellow
Write-Host ""

$atualizados = 0
foreach ($arquivo in $arquivos) {
    try {
        $conteudo = Get-Content -Path $arquivo.FullName -Raw -Encoding UTF8
        $conteudoNovo = $conteudo -replace $ProjectIdAntigo, $ProjectIdNovo
        
        if ($conteudo -ne $conteudoNovo) {
            Set-Content -Path $arquivo.FullName -Value $conteudoNovo -Encoding UTF8 -NoNewline
            Write-Host "✅ $($arquivo.FullName.Replace((Get-Location).Path + '\', ''))" -ForegroundColor Green
            $atualizados++
        }
    } catch {
        Write-Host "❌ Erro ao atualizar $($arquivo.FullName): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ ATUALIZAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Arquivos atualizados: $atualizados" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️ IMPORTANTE:" -ForegroundColor Yellow
Write-Host "1. Verificar se todas as substituições estão corretas" -ForegroundColor White
Write-Host "2. Atualizar variáveis de ambiente no Vercel" -ForegroundColor White
Write-Host "3. Atualizar secrets no Supabase (Edge Functions)" -ForegroundColor White
Write-Host "4. Testar login e funcionalidades" -ForegroundColor White
Write-Host ""

