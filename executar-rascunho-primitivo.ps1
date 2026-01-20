# ============================================================================
# EXECUTAR RASCUNHO PRIMITIVO NO BANCO DE DADOS
# ============================================================================
# Este script cria um rascunho diretamente no banco usando Supabase CLI
# ============================================================================

Write-Host "🚀 Criando rascunho primitivo no banco de dados..." -ForegroundColor Cyan
Write-Host ""

# SQL para criar rascunho mínimo
$sql = @"
-- Criar rascunho mínimo (apenas campos obrigatórios)
INSERT INTO properties (
  id,
  organization_id,
  status,
  name,
  code,
  type,
  address_city,
  address_state,
  address_country,
  max_guests,
  pricing_base_price,
  pricing_currency,
  wizard_data,
  completion_percentage,
  completed_steps,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  NULL,
  'draft',
  'Rascunho Primitivo',
  'DRAFT-PRIMITIVO-' || to_char(now(), 'YYYYMMDDHH24MISS'),
  'loc_casa',
  'Rio de Janeiro',
  'RJ',
  'BR',
  1,
  0,
  'BRL',
  '{}'::jsonb,
  0,
  ARRAY[]::TEXT[],
  NOW(),
  NOW()
)
RETURNING 
  id,
  status,
  name,
  code,
  type,
  wizard_data,
  completion_percentage,
  created_at;
"@

# Salvar SQL em arquivo temporário
$tempFile = [System.IO.Path]::GetTempFileName() + ".sql"
$sql | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "📝 SQL criado em: $tempFile" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 SQL a ser executado:" -ForegroundColor Cyan
Write-Host $sql
Write-Host ""

# Executar via Supabase CLI
Write-Host "⚡ Executando SQL via Supabase CLI..." -ForegroundColor Cyan
Write-Host ""

try {
    # Executar SQL
    supabase db execute -f $tempFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ RASCUNHO CRIADO COM SUCESSO!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🔍 Verificando rascunho criado..." -ForegroundColor Cyan
        
        # Verificar se foi criado
        $verifySql = @"
SELECT 
  id,
  status,
  name,
  code,
  type,
  wizard_data,
  completion_percentage,
  completed_steps,
  created_at
FROM properties
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 1;
"@
        
        $verifyFile = [System.IO.Path]::GetTempFileName() + ".sql"
        $verifySql | Out-File -FilePath $verifyFile -Encoding UTF8
        
        supabase db execute -f $verifyFile
        
        Write-Host ""
        Write-Host "✅ Verificação concluída!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ ERRO ao executar SQL!" -ForegroundColor Red
        Write-Host "   Exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERRO: $_" -ForegroundColor Red
} finally {
    # Limpar arquivo temporário
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
    if (Test-Path $verifyFile) {
        Remove-Item $verifyFile -Force
    }
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
