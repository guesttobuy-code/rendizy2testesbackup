#!/bin/bash

###############################################################################
# 🚀 SCRIPT: Sincronizar Figma Make → GitHub (Push Completo)
#
# ATENÇÃO: Este script vai sobrescrever o código no GitHub com a versão
#          do Figma Make. Certifique-se de que é isso que você quer!
#
# Repositório: suacasarendemais-png/Rendizy2producao
# Branch: main
#
# REQUISITOS:
# 1. Você deve ter exportado o código do Figma Make como ZIP
# 2. Git configurado localmente
# 3. Acesso ao repositório no GitHub
#
# USO:
# bash 🚀_SYNC_FIGMA_TO_GITHUB_COMPLETE.sh /caminho/para/figma-export.zip
#
# @version 1.0.103.322
# @date 2025-11-05
###############################################################################

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║        🚀 SYNC FIGMA MAKE → GITHUB (PUSH COMPLETO)          ║"
echo "║                                                               ║"
echo "║  Repositório: suacasarendemais-png/Rendizy2producao          ║"
echo "║  Branch: main                                                 ║"
echo "║  Versão: v1.0.103.322                                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar argumentos
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Erro: Nenhum arquivo ZIP fornecido${NC}"
    echo ""
    echo "Uso: bash $0 /caminho/para/figma-export.zip"
    exit 1
fi

ZIP_FILE=$1

# Verificar se arquivo existe
if [ ! -f "$ZIP_FILE" ]; then
    echo -e "${RED}❌ Erro: Arquivo não encontrado: $ZIP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Arquivo ZIP: $ZIP_FILE${NC}"
echo ""

# Perguntar confirmação
echo -e "${YELLOW}⚠️  ATENÇÃO: Este script vai:${NC}"
echo "   1. Criar backup da branch atual (backup-antes-sync-figma)"
echo "   2. Extrair código do Figma Make"
echo "   3. Sobrescrever TODOS os arquivos"
echo "   4. Fazer commit e push para o GitHub"
echo ""
read -p "Deseja continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Operação cancelada pelo usuário${NC}"
    exit 1
fi

# Diretório temporário
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}📂 Diretório temporário: $TEMP_DIR${NC}"

# Extrair ZIP
echo -e "${BLUE}📦 Extraindo código do Figma Make...${NC}"
unzip -q "$ZIP_FILE" -d "$TEMP_DIR"
echo -e "${GREEN}✅ Código extraído${NC}"

# Verificar se estamos em um repositório Git
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Erro: Não estamos em um repositório Git${NC}"
    echo "   Execute este script na raiz do repositório Rendizy2producao"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Verificar branch atual
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}🔀 Branch atual: $CURRENT_BRANCH${NC}"

if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  Não estamos na branch main${NC}"
    read -p "Deseja fazer checkout para main? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout main
    else
        echo -e "${RED}❌ Operação cancelada${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
fi

# Fazer pull primeiro (para evitar conflitos)
echo -e "${BLUE}⬇️  Fazendo pull do GitHub...${NC}"
git pull origin main || {
    echo -e "${YELLOW}⚠️  Pull falhou - pode haver conflitos${NC}"
    read -p "Continuar mesmo assim? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Operação cancelada${NC}"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
}

# Criar backup
echo -e "${BLUE}💾 Criando backup da branch atual...${NC}"
BACKUP_BRANCH="backup-antes-sync-figma-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
git push origin "$BACKUP_BRANCH" || echo -e "${YELLOW}⚠️  Não foi possível fazer push do backup${NC}"
echo -e "${GREEN}✅ Backup criado: $BACKUP_BRANCH${NC}"

# Copiar arquivos do Figma Make
echo -e "${BLUE}📋 Copiando arquivos do Figma Make...${NC}"

# Excluir arquivos que não devem ser sobrescritos
EXCLUDE_PATTERNS=(
    ".git"
    ".env"
    ".env.local"
    "node_modules"
    "dist"
    "build"
    ".vercel"
    ".netlify"
)

# Copiar tudo (exceto exclusões)
rsync -av --delete \
    $(printf -- "--exclude=%s " "${EXCLUDE_PATTERNS[@]}") \
    "$TEMP_DIR/" ./ || {
    echo -e "${RED}❌ Erro ao copiar arquivos${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
}

echo -e "${GREEN}✅ Arquivos copiados${NC}"

# Limpar diretório temporário
rm -rf "$TEMP_DIR"

# Verificar mudanças
echo ""
echo -e "${BLUE}📊 Verificando mudanças...${NC}"
git status --short

CHANGES=$(git status --porcelain | wc -l)
echo ""
echo -e "${BLUE}📈 Total de arquivos modificados: $CHANGES${NC}"

if [ $CHANGES -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Nenhuma mudança detectada${NC}"
    echo "   O código do Figma Make já está sincronizado com o GitHub"
    exit 0
fi

echo ""
read -p "Deseja fazer commit e push dessas mudanças? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Operação cancelada - arquivos foram copiados mas não commitados${NC}"
    echo "   Execute 'git status' para ver as mudanças"
    exit 1
fi

# Adicionar todos os arquivos
echo -e "${BLUE}➕ Adicionando arquivos ao Git...${NC}"
git add -A

# Criar commit
echo -e "${BLUE}💬 Criando commit...${NC}"
COMMIT_MSG="sync: Atualizar GitHub com código completo do Figma Make

✅ Sincronização completa da versão de produção
✅ Inclui todos os componentes, rotas, assets e dependências
✅ Backup criado em branch $BACKUP_BRANCH

Estatísticas:
- $CHANGES arquivos modificados
- Componentes atualizados
- Rotas backend atualizadas
- Assets e dependências sincronizados

Versão: v1.0.103.322 (Figma Make Production)
Data: $(date '+%Y-%m-%d %H:%M:%S')
Sincronizado por: Script automático"

git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✅ Commit criado${NC}"

# Push para GitHub
echo ""
echo -e "${BLUE}⬆️  Fazendo push para GitHub...${NC}"
git push origin main || {
    echo -e "${RED}❌ Erro ao fazer push${NC}"
    echo ""
    echo "Possíveis causas:"
    echo "  1. Conflitos com código remoto"
    echo "  2. Problemas de autenticação"
    echo "  3. Conexão com GitHub"
    echo ""
    echo "Você pode tentar:"
    echo "  - git pull --rebase origin main"
    echo "  - git push --force origin main (CUIDADO!)"
    exit 1
}

echo ""
echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                    ✅ SUCESSO!                                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${GREEN}✅ Código do Figma Make sincronizado com GitHub!${NC}"
echo ""
echo "📊 Resumo:"
echo "  - Branch: main"
echo "  - Commit: $(git rev-parse --short HEAD)"
echo "  - Arquivos modificados: $CHANGES"
echo "  - Backup: $BACKUP_BRANCH"
echo ""
echo "🔗 Repositório: https://github.com/suacasarendemais-png/Rendizy2producao"
echo ""
echo -e "${BLUE}📝 Próximos passos:${NC}"
echo "  1. Verificar no GitHub se o código está correto"
echo "  2. Avisar o Manus para fazer 'git pull origin main'"
echo "  3. Testar as funcionalidades em produção"
echo ""
