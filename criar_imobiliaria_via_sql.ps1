# Script PowerShell para criar organização via SQL
# Executa o SQL diretamente no Supabase

$sql = @"
INSERT INTO organizations (
    id,
    name,
    slug,
    email,
    phone,
    plan,
    status,
    created_by,
    settings,
    billing,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Sua Casa Mobiliada',
    'rendizy_sua_casa_mobiliada',
    'suacasamobiliada@gmail.com',
    NULL,
    'enterprise',
    'active',
    'user_master_rendizy',
    '{"maxUsers": -1, "maxProperties": -1, "maxReservations": -1, "features": ["all"]}'::jsonb,
    '{"mrr": 0, "billingDate": 1}'::jsonb,
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO UPDATE
SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    plan = EXCLUDED.plan,
    status = EXCLUDED.status,
    updated_at = NOW()
RETURNING id, name, slug, email, plan, status;
"@

Write-Host "🚀 Executando SQL para criar organização..." -ForegroundColor Cyan
$result = npx supabase db execute --sql $sql 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Organização criada com sucesso!" -ForegroundColor Green
    Write-Host $result
} else {
    Write-Host "❌ Erro ao criar organização:" -ForegroundColor Red
    Write-Host $result
}

Write-Host "`n🔍 Verificando se foi criada..." -ForegroundColor Cyan
$verify = npx supabase db execute --sql "SELECT id, name, slug, email, plan, status, created_at FROM organizations WHERE email = 'suacasamobiliada@gmail.com' ORDER BY created_at DESC LIMIT 1;" 2>&1
Write-Host $verify
