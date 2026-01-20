# Script de Teste Manual - Sistema de Rascunhos
# Simula criação de rascunho e verifica se aparece na lista

Write-Host "🧪 TESTE: Sistema de Rascunhos" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar se há rascunhos no banco
Write-Host "1️⃣ Verificando rascunhos no banco..." -ForegroundColor Yellow

# 2. Criar rascunho via API
Write-Host "2️⃣ Criando rascunho de teste..." -ForegroundColor Yellow

$draftData = @{
    name = "Rascunho Teste - Casa Compra e Venda"
    code = "DRAFT-TEST-$(Get-Date -Format 'yyyyMMddHHmmss')"
    type = "loc_casa"
    status = "draft"
    modalities = @("buy_sell")
    contentType = @{
        propertyTypeId = "loc_casa"
        accommodationTypeId = "acc_casa"
        modalidades = @("buy_sell")
        propertyType = "individual"
    }
    address = @{
        city = "Rio de Janeiro"
        state = "RJ"
        country = "BR"
    }
    maxGuests = 4
    bedrooms = 2
    beds = 2
    bathrooms = 1
    basePrice = 0
    currency = "BRL"
    wizardData = @{
        contentType = @{
            modalidades = @("buy_sell")
            propertyType = "individual"
        }
    }
    completionPercentage = 10
    completedSteps = @("content-type")
} | ConvertTo-Json -Depth 10

Write-Host "📤 Dados do rascunho:" -ForegroundColor Green
Write-Host $draftData
Write-Host ""

Write-Host "✅ Script criado. Execute manualmente no navegador:" -ForegroundColor Green
Write-Host "1. Abra Console (F12)" -ForegroundColor White
Write-Host "2. Execute:" -ForegroundColor White
Write-Host ""
Write-Host 'fetch("/rendizy-server/make-server-67caf26a/properties", {' -ForegroundColor Cyan
Write-Host '  method: "POST",' -ForegroundColor Cyan
Write-Host '  headers: { "Content-Type": "application/json" },' -ForegroundColor Cyan
Write-Host '  body: JSON.stringify(' -ForegroundColor Cyan
Write-Host $draftData -ForegroundColor Yellow
Write-Host '  )' -ForegroundColor Cyan
Write-Host '}).then(r => r.json()).then(console.log)' -ForegroundColor Cyan
