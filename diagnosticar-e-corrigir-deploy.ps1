# Script para diagnosticar e corrigir problemas de deploy
# Múltiplas soluções aplicadas automaticamente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTICO E CORRECAO DE DEPLOY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"
$baseDir = Get-Location
$rendizyDir = Join-Path $baseDir "RendizyPrincipal"

# ============================================================================
# PASSO 1: VERIFICAR ESTRUTURA
# ============================================================================
Write-Host "`n[1/8] Verificando estrutura..." -ForegroundColor Yellow

if (-not (Test-Path $rendizyDir)) {
    Write-Host "ERRO: Pasta RendizyPrincipal nao encontrada!" -ForegroundColor Red
    exit 1
}

Write-Host "OK: Pasta RendizyPrincipal encontrada" -ForegroundColor Green

# Verificar se módulo de automações existe
$automationsModule = Join-Path $rendizyDir "components\automations\AutomationsModule.tsx"
if (-not (Test-Path $automationsModule)) {
    Write-Host "ERRO: AutomationsModule.tsx nao encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "OK: AutomationsModule.tsx encontrado" -ForegroundColor Green

# ============================================================================
# PASSO 2: VERIFICAR GIT
# ============================================================================
Write-Host "`n[2/8] Verificando Git..." -ForegroundColor Yellow

try {
    $gitStatus = git status --porcelain 2>&1
    $automationsInGit = git ls-files "RendizyPrincipal/components/automations/" 2>&1
    
    if ($automationsInGit.Count -eq 0) {
        Write-Host "AVISO: Arquivos de automações podem nao estar no Git" -ForegroundColor Yellow
        Write-Host "Adicionando arquivos ao Git..." -ForegroundColor Cyan
        
        git add "RendizyPrincipal/components/automations/*"
        git add "RendizyPrincipal/App.tsx"
        git add "RendizyPrincipal/utils/api.ts"
        git commit -m "feat: Adicionar modulo de automacoes para deploy" 2>&1 | Out-Null
        
        Write-Host "OK: Arquivos adicionados ao Git" -ForegroundColor Green
    } else {
        Write-Host "OK: Arquivos de automações estão no Git" -ForegroundColor Green
    }
} catch {
    Write-Host "AVISO: Erro ao verificar Git: $_" -ForegroundColor Yellow
}

# ============================================================================
# PASSO 3: VERIFICAR DEPENDENCIAS
# ============================================================================
Write-Host "`n[3/8] Verificando dependências..." -ForegroundColor Yellow

Push-Location $rendizyDir

if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependências..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERRO: Falha ao instalar dependências!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

Write-Host "OK: Dependências instaladas" -ForegroundColor Green

# ============================================================================
# PASSO 4: TESTAR BUILD LOCAL
# ============================================================================
Write-Host "`n[4/8] Testando build local..." -ForegroundColor Yellow

# Limpar build anterior
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force
    Write-Host "Build anterior removido" -ForegroundColor Cyan
}

# Fazer build
Write-Host "Executando build..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Build local falhou!" -ForegroundColor Red
    Write-Host "Verifique os erros acima" -ForegroundColor Yellow
    Pop-Location
    exit 1
}

# Verificar se index.html foi criado
if (-not (Test-Path "dist\index.html")) {
    Write-Host "ERRO: dist/index.html nao foi criado!" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "OK: Build local bem-sucedido!" -ForegroundColor Green
$buildSize = (Get-ChildItem "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Tamanho do build: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Cyan

Pop-Location

# ============================================================================
# PASSO 5: CORRIGIR VERCEL.JSON
# ============================================================================
Write-Host "`n[5/8] Corrigindo vercel.json..." -ForegroundColor Yellow

$vercelJsonRoot = Join-Path $baseDir "vercel.json"
$vercelJsonRendizy = Join-Path $rendizyDir "vercel.json"

# Verificar qual vercel.json existe
if (Test-Path $vercelJsonRendizy) {
    Write-Host "OK: vercel.json encontrado em RendizyPrincipal" -ForegroundColor Green
    
    # Copiar para raiz se não existir ou atualizar
    $vercelContent = Get-Content $vercelJsonRendizy -Raw
    $vercelObj = $vercelContent | ConvertFrom-Json
    
    # Garantir que aponta para dist
    if ($vercelObj.outputDirectory -ne "dist") {
        Write-Host "Corrigindo outputDirectory para 'dist'..." -ForegroundColor Cyan
        $vercelObj.outputDirectory = "dist"
        $vercelObj | ConvertTo-Json -Depth 10 | Set-Content $vercelJsonRendizy
    }
    
    # Copiar para raiz
    Copy-Item $vercelJsonRendizy $vercelJsonRoot -Force
    Write-Host "OK: vercel.json atualizado na raiz" -ForegroundColor Green
} else {
    Write-Host "AVISO: vercel.json nao encontrado em RendizyPrincipal" -ForegroundColor Yellow
}

# ============================================================================
# PASSO 6: VERIFICAR IMPORTS NO APP.TSX
# ============================================================================
Write-Host "`n[6/8] Verificando imports no App.tsx..." -ForegroundColor Yellow

$appTsx = Join-Path $rendizyDir "App.tsx"
$appContent = Get-Content $appTsx -Raw

if ($appContent -match "AutomationsModule") {
    Write-Host "OK: AutomationsModule importado no App.tsx" -ForegroundColor Green
    
    if ($appContent -match "/automacoes/\*") {
        Write-Host "OK: Rota /automacoes/* encontrada" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Rota /automacoes/* pode estar faltando" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERRO: AutomationsModule nao encontrado no App.tsx!" -ForegroundColor Red
    Write-Host "Adicione: import { AutomationsModule } from './components/automations/AutomationsModule';" -ForegroundColor Yellow
}

# ============================================================================
# PASSO 7: PREPARAR PARA DEPLOY
# ============================================================================
Write-Host "`n[7/8] Preparando para deploy..." -ForegroundColor Yellow

# Verificar se Vercel CLI está instalado
try {
    $vercelVersion = vercel --version 2>&1
    Write-Host "OK: Vercel CLI encontrado: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "AVISO: Vercel CLI nao encontrado" -ForegroundColor Yellow
    Write-Host "Instale com: npm install -g vercel" -ForegroundColor Cyan
}

# ============================================================================
# PASSO 8: OPCOES DE DEPLOY
# ============================================================================
Write-Host "`n[8/8] Opcoes de deploy disponiveis:" -ForegroundColor Yellow
Write-Host ""
Write-Host "OPCAO 1: Deploy via Vercel CLI (recomendado)" -ForegroundColor Cyan
Write-Host "  cd RendizyPrincipal" -ForegroundColor White
Write-Host "  vercel --prod --force" -ForegroundColor White
Write-Host ""
Write-Host "OPCAO 2: Push forçado no GitHub" -ForegroundColor Cyan
Write-Host "  git push --force origin main" -ForegroundColor White
Write-Host ""
Write-Host "OPCAO 3: Deploy manual do dist" -ForegroundColor Cyan
Write-Host "  cd RendizyPrincipal" -ForegroundColor White
Write-Host "  vercel --prod --cwd ." -ForegroundColor White
Write-Host ""

# Perguntar se quer fazer deploy agora
$deployNow = Read-Host "Deseja fazer deploy agora via Vercel CLI? (S/N)"

if ($deployNow -eq "S" -or $deployNow -eq "s") {
    Push-Location $rendizyDir
    
    Write-Host "`nIniciando deploy..." -ForegroundColor Cyan
    vercel --prod --force
    
    Pop-Location
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "DIAGNOSTICO CONCLUIDO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "PR proximos passos:" -ForegroundColor Yellow
Write-Host "1. Verifique o dashboard do Vercel" -ForegroundColor White
Write-Host "2. Confirme que Root Directory esta como 'RendizyPrincipal'" -ForegroundColor White
Write-Host "3. Limpe o cache no Vercel (Redeploy sem cache)" -ForegroundColor White
Write-Host "4. Verifique os logs de build no Vercel" -ForegroundColor White
Write-Host ""










