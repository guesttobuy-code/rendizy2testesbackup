# Script de teste manual para criação de anúncio de compra e venda
# Este script simula o preenchimento completo do formulário

Write-Host "🧪 TESTE MANUAL: Criar Anúncio de Compra e Venda" -ForegroundColor Cyan
Write-Host ""
Write-Host "INSTRUÇÕES:" -ForegroundColor Yellow
Write-Host "1. Abra o navegador em: http://localhost:5173/properties/new"
Write-Host "2. Siga os passos abaixo preenchendo cada campo:"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "PASSO 1: Tipo e Identificação" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ Tipo do local: Selecione 'Casa'"
Write-Host "  ✓ Tipo de acomodação: Selecione 'Casa'"
Write-Host "  ✓ Subtipo: Selecione 'Imóvel inteiro'"
Write-Host "  ✓ Modalidade: Marque APENAS 'Compra e venda'"
Write-Host "  ✓ Preço de Venda: Digite 500000"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "PASSO 2: Localização" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ Cidade: Digite 'Rio de Janeiro'"
Write-Host "  ✓ Estado: Selecione 'RJ'"
Write-Host "  ✓ Sigla do estado: Digite 'RJ'"
Write-Host "  ✓ CEP: Digite '20000-000' (opcional)"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "PASSO 3: Descrição" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ Título: Digite 'Casa à venda em Copacabana'"
Write-Host "  ✓ Descrição: Digite 'Excelente casa à venda'"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "PASSO FINANCEIRO: Preços Locação e Venda" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ Preço de Venda: Digite 500000"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "FINALIZAR" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✓ Clique em 'Finalizar' no último passo"
Write-Host "  ✓ Verifique se redirecionou para /properties"
Write-Host "  ✓ Verifique se o imóvel aparece na lista"
Write-Host ""
Write-Host "VERIFICAÇÕES:" -ForegroundColor Yellow
Write-Host "  - Passos irrelevantes devem estar ocultos"
Write-Host "  - Apenas 12 passos devem aparecer (não 17)"
Write-Host "  - Console do navegador deve mostrar logs de sucesso"
Write-Host ""
