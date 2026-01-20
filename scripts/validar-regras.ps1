# Validacao de regras pre-commit (ASCII encoding)
# Versao: 2.0 (20/12/2024)
# Verifica regras de ouro do RULES.md antes de permitir commit

Write-Host "`n=== VALIDACAO DE REGRAS RENDIZY ===" -ForegroundColor Cyan
Write-Host "Verificando conformidade com RULES.md...`n" -ForegroundColor Gray

$erros = 0

# REGRA 1: Detectar duplicatas de codigo fonte
Write-Host "[1/5] Verificando duplicatas de codigo fonte (.ts, .tsx, .js, .jsx)..." -ForegroundColor Yellow

$extensoes = @("*.ts", "*.tsx", "*.js", "*.jsx")
$arquivos = Get-ChildItem -Recurse -Include $extensoes |
    Where-Object { 
        $_.FullName -notmatch 'node_modules' -and 
        $_.FullName -notmatch 'dist' -and 
        $_.FullName -notmatch 'build' -and
        $_.FullName -notmatch '\.git' -and
        $_.FullName -notmatch 'archive' -and
        $_.FullName -notmatch 'offline_archives'
    }

$sufixosProibidos = @("-new", "-backup", "-old", "-fixed", "-copy", ".bak", ".backup")
$duplicatasCodigo = @()

foreach ($arquivo in $arquivos) {
    foreach ($sufixo in $sufixosProibidos) {
        if ($arquivo.Name -match $sufixo) {
            $duplicatasCodigo += $arquivo.FullName
        }
    }
}

if ($duplicatasCodigo.Count -gt 0) {
    Write-Host "  ERRO: Arquivos duplicados de codigo detectados:" -ForegroundColor Red
    foreach ($arq in $duplicatasCodigo) {
        Write-Host "    - $arq" -ForegroundColor Red
    }
    $erros++
} else {
    Write-Host "  OK: Nenhuma duplicata de codigo fonte" -ForegroundColor Green
}

# REGRA 2: Detectar documentos duplicados
Write-Host "`n[2/5] Verificando duplicatas de documentacao (.md)..." -ForegroundColor Yellow

$docsProibidos = @(
    "*RULES*v*.md", 
    "*RULES*-v*.md",
    "*RULES*_v*.md",
    "*Ligando*novo*.md",
    "*Ligando*corrigido*.md",
    "*Ligando*v*.md",
    "*README*NEW*.md",
    "*README*-new*.md"
)

$duplicatasDocs = @()
foreach ($padrao in $docsProibidos) {
    $encontrados = Get-ChildItem -Recurse -Include $padrao -File -ErrorAction SilentlyContinue |
        Where-Object { 
            $_.FullName -notmatch 'node_modules' -and 
            $_.FullName -notmatch '\.git' -and
            $_.FullName -notmatch 'archive' -and
            $_.FullName -notmatch 'offline_archives'
        }
    
    if ($encontrados) {
        $duplicatasDocs += $encontrados
    }
}

if ($duplicatasDocs.Count -gt 0) {
    Write-Host "  ERRO: Documentacao duplicada detectada:" -ForegroundColor Red
    foreach ($doc in $duplicatasDocs) {
        Write-Host "    - $($doc.FullName)" -ForegroundColor Red
    }
    $erros++
} else {
    Write-Host "  OK: Nenhuma documentacao duplicada" -ForegroundColor Green
}

# REGRA 3: Detectar arquivos temporarios nao-gitignored
Write-Host "`n[3/5] Verificando arquivos temporarios nao-gitignored..." -ForegroundColor Yellow

$temporarios = @("*.log", "*.tmp", "debug*", "test-*", "*.bak")
$tempNaoIgnorados = @()

foreach ($padrao in $temporarios) {
    $encontrados = Get-ChildItem -Recurse -Include $padrao -File -ErrorAction SilentlyContinue |
        Where-Object { 
            $_.FullName -notmatch 'node_modules' -and 
            $_.FullName -notmatch '\.git' -and
            $_.FullName -notmatch 'archive'
        }
    
    foreach ($arquivo in $encontrados) {
        $gitCheck = git check-ignore $arquivo.FullName 2>$null
        if (-not $gitCheck) {
            $tempNaoIgnorados += $arquivo.FullName
        }
    }
}

if ($tempNaoIgnorados.Count -gt 0) {
    Write-Host "  AVISO: Arquivos temporarios nao-gitignored encontrados:" -ForegroundColor Yellow
    foreach ($arq in $tempNaoIgnorados) {
        Write-Host "    - $arq" -ForegroundColor Yellow
    }
    Write-Host "  (Adicione ao .gitignore ou remova antes de commitar)" -ForegroundColor Gray
} else {
    Write-Host "  OK: Nenhum arquivo temporario desprotegido" -ForegroundColor Green
}

# REGRA 4: Verificar se CHANGELOG.md foi atualizado
Write-Host "`n[4/5] Verificando atualizacao do CHANGELOG.md..." -ForegroundColor Yellow

$arquivosModificados = git diff --name-only HEAD 2>$null
if ($arquivosModificados) {
    $temCodigoAlterado = $false
    foreach ($arquivo in $arquivosModificados) {
        if ($arquivo -match '\.(ts|tsx|js|jsx)$') {
            $temCodigoAlterado = $true
            break
        }
    }
    
    if ($temCodigoAlterado -and -not ($arquivosModificados -contains "CHANGELOG.md")) {
        Write-Host "  AVISO: Codigo foi alterado mas CHANGELOG.md nao foi atualizado" -ForegroundColor Yellow
        Write-Host "  (Recomendado: atualizar CHANGELOG.md com suas mudancas)" -ForegroundColor Gray
    } else {
        Write-Host "  OK: CHANGELOG.md em conformidade" -ForegroundColor Green
    }
} else {
    Write-Host "  OK: Nenhuma mudanca detectada" -ForegroundColor Green
}

# REGRA 5: Verificar estrutura de pastas obrigatoria
Write-Host "`n[5/5] Verificando estrutura de pastas obrigatoria..." -ForegroundColor Yellow

$pastasObrigatorias = @(
    "docs",
    "docs/01-setup",
    "docs/02-architecture",
    "docs/03-conventions",
    "docs/04-modules",
    "docs/05-operations",
    "docs/06-troubleshooting",
    "docs/07-sessions",
    "scripts"
)

$pastasFaltando = @()
foreach ($pasta in $pastasObrigatorias) {
    if (-not (Test-Path $pasta)) {
        $pastasFaltando += $pasta
    }
}

if ($pastasFaltando.Count -gt 0) {
    Write-Host "  ERRO: Pastas obrigatorias faltando:" -ForegroundColor Red
    foreach ($pasta in $pastasFaltando) {
        Write-Host "    - $pasta" -ForegroundColor Red
    }
    $erros++
} else {
    Write-Host "  OK: Estrutura de pastas completa" -ForegroundColor Green
}

# RESULTADO FINAL
Write-Host "`n======================================" -ForegroundColor Cyan

if ($erros -gt 0) {
    Write-Host "VALIDACAO FALHOU: $erros erro(s) encontrado(s)" -ForegroundColor Red
    Write-Host "`nCORRIJA os erros acima antes de commitar." -ForegroundColor Yellow
    Write-Host "Consulte RULES.md para mais detalhes.`n" -ForegroundColor Gray
    exit 1
} else {
    Write-Host "VALIDACAO OK: Pronto para commitar!" -ForegroundColor Green
    Write-Host "`nTodos os checks passaram com sucesso.`n" -ForegroundColor Gray
    exit 0
}
