# 🔍 Verificar TODAS as organizações em anuncios_ultimate
Write-Host "`n=== BUSCA COMPLETA POR TODAS ORGANIZAÇÕES ===" -ForegroundColor Cyan

$apiKey = $env:SUPABASE_SERVICE_ROLE_KEY
$projectUrl = "https://odcgnzfremrqnvtitpcc.supabase.co"

if (-not $apiKey) {
    Write-Host "❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não encontrada!" -ForegroundColor Red
    exit 1
}

Write-Host "`n1. Buscando TODOS os anúncios (sem filtro de org)..." -ForegroundColor Yellow

try {
    $headers = @{
        "apikey" = $apiKey
        "Authorization" = "Bearer $apiKey"
        "Content-Type" = "application/json"
    }
    
    # Buscar TODOS os registros criados nas últimas 2 horas
    $twoHoursAgo = (Get-Date).AddHours(-2).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $url = "$projectUrl/rest/v1/anuncios_ultimate?created_at=gte.$twoHoursAgo&select=id,organization_id,user_id,status,created_at,data->>title&order=created_at.desc"
    
    $response = Invoke-RestMethod -Uri $url -Method Get -Headers $headers
    
    Write-Host "✅ Total de anúncios criados nas últimas 2h: $($response.Count)" -ForegroundColor Green
    
    if ($response.Count -gt 0) {
        Write-Host "`nDetalhes dos anúncios recentes:" -ForegroundColor Cyan
        foreach ($anuncio in $response) {
            Write-Host "  ---" -ForegroundColor DarkGray
            Write-Host "  ID: $($anuncio.id)"
            Write-Host "  Organização: $($anuncio.organization_id)"
            Write-Host "  Usuário: $($anuncio.user_id)"
            Write-Host "  Título: $($anuncio.title)"
            Write-Host "  Status: $($anuncio.status)"
            Write-Host "  Criado: $($anuncio.created_at)"
        }
    } else {
        Write-Host "⚠️  Nenhum anúncio criado nas últimas 2 horas" -ForegroundColor Yellow
    }
    
    # Contar por organização
    Write-Host "`n2. Contagem por organização:" -ForegroundColor Yellow
    $url2 = "$projectUrl/rest/v1/anuncios_ultimate?select=organization_id,count"
    $countResponse = Invoke-RestMethod -Uri $url2 -Method Get -Headers $headers
    
    $orgGroups = $countResponse | Group-Object -Property organization_id
    foreach ($group in $orgGroups) {
        Write-Host "  Org $($group.Name): $($group.Count) anúncio(s)" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "❌ Erro na requisição: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Detalhes: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n=================================" -ForegroundColor Cyan
