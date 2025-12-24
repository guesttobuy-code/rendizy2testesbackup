# REMOVER DUPLICATAS - Manter apenas os ORIGINAIS de teste
# IDs dos anúncios de TESTE (com reservas/bloqueios) - DEVEM SER MANTIDOS
$testIds = @(
    "3cabf06d-51c6-4e2b-b73e-520e018f1fce"  # teste 30 02
    "9f6cad48-42e9-4ed5-b766-82127a62dce2"  # Dona Rosa Botafogo ap 01
)

$URL = $env:SUPABASE_URL
$KEY = $env:SUPABASE_ANON_KEY

if (-not $URL) { throw "Missing env var SUPABASE_URL" }
if (-not $KEY) { throw "Missing env var SUPABASE_ANON_KEY" }

$h = @{ "apikey" = $KEY; "Prefer" = "return=minimal" }

Write-Host "`n🔍 REMOVENDO DUPLICATAS DOS ANÚNCIOS DE TESTE`n" -ForegroundColor Cyan

# Buscar todos os anúncios
$todos = Invoke-RestMethod -Uri "$URL/rest/v1/anuncios_drafts?select=id,title,data" -Headers @{ "apikey" = $KEY }

Write-Host "📊 Total antes: $($todos.Count)" -ForegroundColor White

$removidos = 0

# Para cada anúncio de teste
foreach ($testId in $testIds) {
    $test = $todos | Where-Object { $_.id -eq $testId }
    
    if (-not $test) {
        Write-Host "⚠️  Anúncio de teste $testId não encontrado!" -ForegroundColor Yellow
        continue
    }
    
    $titulo = $test.title
    Write-Host "`n📌 Verificando: $titulo" -ForegroundColor Cyan
    Write-Host "   ID Original (TESTE): $testId" -ForegroundColor Green
    
    # Buscar duplicatas com mesmo título
    $duplicatas = $todos | Where-Object { $_.title -eq $titulo -and $_.id -ne $testId }
    
    if ($duplicatas.Count -gt 0) {
        Write-Host "   🔴 Encontradas $($duplicatas.Count) duplicata(s) - REMOVENDO..." -ForegroundColor Red
        
        foreach ($dup in $duplicatas) {
            # Verificar se é migrado
            $isMigrado = $dup.data -and $dup.data.PSObject.Properties['migrated_from']
            $tipo = if ($isMigrado) { "MIGRADO" } else { "DUPLICATA" }
            
            Write-Host "      - Removendo $($dup.id) [$tipo]" -ForegroundColor Yellow
            
            try {
                $delUrl = "$env:URL/rest/v1/anuncios_drafts?id=eq.$($dup.id)"
                Invoke-RestMethod -Uri $delUrl -Headers $h -Method Delete | Out-Null
                Write-Host "      ✅ Removido" -ForegroundColor Green
                $removidos++
            } catch {
                Write-Host "      ❌ Erro: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "   ✅ Sem duplicatas" -ForegroundColor Green
    }
}

# Verificar total após remoção
$todosDepois = Invoke-RestMethod -Uri "$URL/rest/v1/anuncios_drafts?select=id" -Headers @{ "apikey" = $KEY }

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 RESULTADO:" -ForegroundColor Cyan
Write-Host "   Antes:    $($todos.Count)" -ForegroundColor White
Write-Host "   Depois:   $($todosDepois.Count)" -ForegroundColor White
Write-Host "   Removidos: $removidos" -ForegroundColor Yellow
Write-Host "   Esperado:  159" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Gray

if ($todosDepois.Count -eq 159) {
    Write-Host "✅ CORRETO! Total = 159 anúncios" -ForegroundColor Green
} else {
    Write-Host "⚠️  Total = $($todosDepois.Count) (esperado: 159)" -ForegroundColor Yellow
}
