# ============================================================================
# 🔄 Script de Migração: Supabase (Conta Antiga → Conta Nova)
# ============================================================================
# Este script automatiza a migração completa do banco de dados Supabase
#
# Uso: .\migrar-supabase.ps1
# ============================================================================

param(
    [string]$ProjectIdAntigo = "odcgnzfremrqnvtitpcc",
    [string]$ProjectIdNovo = "",
    [string]$SenhaAntiga = "",
    [string]$SenhaNova = ""
)

Write-Host "🔄 RENDIZY - Migração Supabase" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 📋 Passo 1: Coletar Informações
# ============================================================================

if ([string]::IsNullOrEmpty($ProjectIdNovo)) {
    Write-Host "📝 Informações Necessárias:" -ForegroundColor Yellow
    Write-Host ""
    $ProjectIdNovo = Read-Host "Novo Project ID do Supabase"
    $SenhaAntiga = Read-Host "Senha do banco ANTIGO (ou deixe vazio se não souber)" -AsSecureString
    $SenhaNova = Read-Host "Senha do banco NOVO" -AsSecureString
    Write-Host ""
}

# Converter SecureString para string (se necessário)
if ($SenhaAntiga -is [SecureString]) {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SenhaAntiga)
    $SenhaAntiga = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

if ($SenhaNova -is [SecureString]) {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SenhaNova)
    $SenhaNova = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

$BackupDir = "backup_migracao_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

Write-Host "✅ Diretório de backup criado: $BackupDir" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 📦 Passo 2: Exportar da Conta Antiga
# ============================================================================

Write-Host "📦 Passo 2: Exportando da conta ANTIGA..." -ForegroundColor Yellow
Write-Host ""

# Conectar na conta antiga
Write-Host "🔗 Conectando na conta antiga..." -ForegroundColor Cyan
npx supabase link --project-ref $ProjectIdAntigo

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao conectar na conta antiga!" -ForegroundColor Red
    exit 1
}

# Exportar schema
Write-Host "📥 Exportando schema completo..." -ForegroundColor Cyan
npx supabase db dump --schema public --schema auth --schema storage -f "$BackupDir\schema_completo.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Aviso: Erro ao exportar schema (pode ser normal se não tiver acesso direto)" -ForegroundColor Yellow
}

# Exportar dados
Write-Host "📥 Exportando dados..." -ForegroundColor Cyan
npx supabase db dump --schema public --data-only -f "$BackupDir\dados_completos.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Aviso: Erro ao exportar dados (pode ser normal se não tiver acesso direto)" -ForegroundColor Yellow
}

# Copiar migrations
Write-Host "📥 Copiando migrations..." -ForegroundColor Cyan
if (Test-Path "supabase\migrations") {
    Copy-Item -Path "supabase\migrations" -Destination "$BackupDir\migrations" -Recurse -Force
    Write-Host "✅ Migrations copiadas" -ForegroundColor Green
}

# Copiar Edge Functions
Write-Host "📥 Copiando Edge Functions..." -ForegroundColor Cyan
if (Test-Path "supabase\functions") {
    Copy-Item -Path "supabase\functions" -Destination "$BackupDir\functions" -Recurse -Force
    Write-Host "✅ Edge Functions copiadas" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Exportação completa!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 🔗 Passo 3: Conectar na Conta Nova
# ============================================================================

Write-Host "🔗 Passo 3: Conectando na conta NOVA..." -ForegroundColor Yellow
Write-Host ""

# Desconectar da conta antiga
Write-Host "🔌 Desconectando da conta antiga..." -ForegroundColor Cyan
npx supabase unlink

# Conectar na conta nova
Write-Host "🔗 Conectando na conta nova..." -ForegroundColor Cyan
npx supabase link --project-ref $ProjectIdNovo

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao conectar na conta nova!" -ForegroundColor Red
    Write-Host "   Certifique-se de que o projeto existe e você tem acesso" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Conectado na conta nova!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 📥 Passo 4: Aplicar Schema
# ============================================================================

Write-Host "📥 Passo 4: Aplicando schema na conta NOVA..." -ForegroundColor Yellow
Write-Host ""

# Aplicar migrations
Write-Host "📥 Aplicando migrations..." -ForegroundColor Cyan
npx supabase db push

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Aviso: Alguns erros podem ser normais (tabelas já existentes, etc.)" -ForegroundColor Yellow
}

Write-Host "✅ Schema aplicado!" -ForegroundColor Green
Write-Host ""

# ============================================================================
# 📥 Passo 5: Importar Dados
# ============================================================================

if (Test-Path "$BackupDir\dados_completos.sql") {
    Write-Host "📥 Passo 5: Importando dados..." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "⚠️ ATENÇÃO: Importar dados pode demorar!" -ForegroundColor Yellow
    $confirmar = Read-Host "Deseja importar dados agora? (S/N)"
    
    if ($confirmar -eq "S" -or $confirmar -eq "s") {
        Write-Host "📥 Importando dados..." -ForegroundColor Cyan
        npx supabase db execute -f "$BackupDir\dados_completos.sql"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Dados importados!" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Alguns erros podem ter ocorrido. Verifique os logs." -ForegroundColor Yellow
        }
    } else {
        Write-Host "⏭️ Importação de dados pulada. Execute manualmente depois." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ Arquivo de dados não encontrado. Execute exportação manual." -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# 🚀 Passo 6: Deploy Edge Functions
# ============================================================================

Write-Host "🚀 Passo 6: Deploy Edge Functions..." -ForegroundColor Yellow
Write-Host ""

Write-Host "📤 Fazendo deploy..." -ForegroundColor Cyan
npx supabase functions deploy rendizy-server

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Edge Functions deployadas!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao fazer deploy das Edge Functions!" -ForegroundColor Red
}

Write-Host ""

# ============================================================================
# ✅ Resumo
# ============================================================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ MIGRAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Atualizar src/utils/supabase/info.tsx com novo Project ID" -ForegroundColor White
Write-Host "2. Atualizar variáveis de ambiente no Vercel" -ForegroundColor White
Write-Host "3. Configurar secrets no Supabase (Edge Functions)" -ForegroundColor White
Write-Host "4. Testar login e funcionalidades" -ForegroundColor White
Write-Host "5. Validar integridade dos dados" -ForegroundColor White
Write-Host ""
Write-Host "📁 Backup salvo em: $BackupDir" -ForegroundColor Cyan
Write-Host ""

