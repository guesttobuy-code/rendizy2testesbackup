# ========================================
# DEPLOY: IMPORTAÇÃO STAYSNET CORRIGIDA
# ========================================
# Deploy do código corrigido com mapeamento completo dos 22 campos

Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 DEPLOY: IMPORTAÇÃO STAYSNET - CÓDIGO CORRIGIDO" -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Navegar para o diretório do projeto
$projectPath = "c:\Users\rafae\OneDrive\Desktop\Rendizyoficial-main arquivos mais atualizado do github 09 12 2025\Rendizyoficial-main"
Set-Location $projectPath

Write-Host "📁 Diretório: $projectPath" -ForegroundColor Gray
Write-Host ""

# Verificar se Supabase CLI está instalado
Write-Host "🔍 Verificando Supabase CLI..." -ForegroundColor Yellow
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instale com:" -ForegroundColor Yellow
    Write-Host "  npm install -g supabase" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Supabase CLI encontrado" -ForegroundColor Green
Write-Host ""

# Verificar se o arquivo corrigido existe
$functionFile = "supabase\functions\rendizy-server\import-staysnet-properties.ts"
if (-not (Test-Path $functionFile)) {
    Write-Host "❌ Arquivo não encontrado: $functionFile" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivo encontrado: $functionFile" -ForegroundColor Green
Write-Host ""

# Mostrar resumo das correções
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📋 CORREÇÕES APLICADAS (17 campos):" -ForegroundColor Yellow
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ✅ title: prop._mstitle.pt_BR" -ForegroundColor Green
Write-Host "  ✅ tipoPropriedade: prop._t_propertyTypeMeta._mstitle.pt_BR" -ForegroundColor Green
Write-Host "  ✅ tipoAcomodacao: prop.subtype" -ForegroundColor Green
Write-Host "  ✅ quartos: prop._i_rooms + String()" -ForegroundColor Green
Write-Host "  ✅ banheiros: prop._f_bathrooms + String()" -ForegroundColor Green
Write-Host "  ✅ camas: prop._i_beds + String()" -ForegroundColor Green
Write-Host "  ✅ capacidade: prop._i_maxGuests + String()" -ForegroundColor Green
Write-Host "  ✅ estado: prop.address.stateCode" -ForegroundColor Green
Write-Host "  ✅ coordinates: prop.latLng._f_lat/_f_lng" -ForegroundColor Green
Write-Host "  ✅ fotoPrincipal: prop._t_mainImageMeta.url (NOVO)" -ForegroundColor Green
Write-Host "  ✅ fotos: prop._t_imagesMeta" -ForegroundColor Green
Write-Host "  ✅ comodidades: prop._t_amenitiesMeta + extrair _mstitle" -ForegroundColor Green
Write-Host "  ✅ descricao: prop._msdesc.pt_BR + limpeza HTML" -ForegroundColor Green
Write-Host "  ✅ publicDescription: prop._msdesc multilíngue" -ForegroundColor Green
Write-Host "  ✅ ativo: String(prop.status === 'active') (NOVO)" -ForegroundColor Green
Write-Host "  ✅ anuncioId: createResult?.id (FIX CRÍTICO)" -ForegroundColor Magenta
Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Confirmar deploy
Write-Host "⚠️  ATENÇÃO: Deploy irá atualizar a Edge Function em PRODUÇÃO" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Deseja continuar? (S/N)"

if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host ""
    Write-Host "❌ Deploy cancelado pelo usuário" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 INICIANDO DEPLOY..." -ForegroundColor Green
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "Isso pode levar alguns minutos..." -ForegroundColor Yellow
Write-Host ""

# Fazer deploy da Edge Function
supabase functions deploy rendizy-server

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Limpar anúncios antigos (opcional):" -ForegroundColor White
    Write-Host "     Execute LIMPAR-TODOS-ANUNCIOS.sql no Supabase" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Testar importação via interface:" -ForegroundColor White
    Write-Host "     Acesse: http://localhost:3000/anuncios" -ForegroundColor Gray
    Write-Host "     Clique no botão 'Importar do StaysNet'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Validar resultado:" -ForegroundColor White
    Write-Host "     Execute VER-BETH-PERO-SIMPLES.sql para verificar campos" -ForegroundColor Gray
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "🎯 Esperado: 20 propriedades com 22 campos cada!" -ForegroundColor Magenta
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "❌ ERRO NO DEPLOY" -ForegroundColor Red
    Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Verifique os logs acima para mais detalhes" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Possíveis soluções:" -ForegroundColor Yellow
    Write-Host "  1. Verifique se está logado: supabase login" -ForegroundColor Gray
    Write-Host "  2. Verifique o projeto: supabase projects list" -ForegroundColor Gray
    Write-Host "  3. Re-link o projeto: supabase link" -ForegroundColor Gray
    Write-Host ""
}
