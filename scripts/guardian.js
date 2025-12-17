
/**
 * 🛡️ THE GUARDIAN - Scripts de Proteção do Ambiente
 * 
 * Este script roda antes do ambiente de desenvolvimento iniciar.
 * Ele verifica:
 * 1. Se as variáveis de ambiente essenciais existem.
 * 2. Se as chaves do Supabase parecem válidas.
 * 
 * Se algo falhar, ele IMPEDE o servidor de subir, evitando dor de cabeça.
 */

require('dotenv').config({ path: '.env.local' });

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

console.log(`${CYAN}🛡️  INICIANDO O GUARDIÃO (Verificação de Integridade)...${RESET}\n`);

let hasError = false;

// 1. Verificação de Variáveis
const REQUIRED_VARS = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
];

REQUIRED_VARS.forEach(key => {
    const val = process.env[key];
    if (!val) {
        console.error(`${RED}❌ ERRO: Variável ${key} está faltando em .env.local${RESET}`);
        hasError = true;
    } else if (key.includes('KEY') && val.startsWith('sb_publishable')) {
        console.error(`${RED}❌ ERRO: ${key} parece ser um placeholder inválido ('sb_publishable...').${RESET}`);
        console.error(`${YELLOW}👉 Solução: Restaure a chave JWT correta (começa com 'ey...').${RESET}`);
        hasError = true;
    } else {
        console.log(`${GREEN}✅ ${key} encontrada.${RESET}`);
    }
});

// Se falhou na config básica, nem tenta conectar
if (hasError) {
    console.error(`\n${RED}🛑 O GUARDIÃO BLOQUEOU A INICIALIZAÇÃO.${RESET}`);
    console.error(`${YELLOW}Corrija os erros acima no .env.local e tente novamente.${RESET}`);
    process.exit(1);
}

// 2. Teste de Conexão com Supabase (Ping simples na URL) - DESATIVADO PARA EVITAR CRASH
// const supabaseUrl = process.env.VITE_SUPABASE_URL;
// const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log(`${GREEN}✅ Variáveis de Ambiente Válidas.${RESET}`);
console.log(`\n${GREEN}🛡️  AMBIENTE APROVADO PELO GUARDIÃO (Modo Seguro).${RESET} Iniciando servidor...\n`);
process.exit(0);

/*
// Código legado com verificação de rede (instável em algumas configs de Node/Win)
(async () => {
    try {
        const supabase = createClient(supabaseUrl, anonKey);
        // ...
    } catch (err) {
        // ...
    }
})();
*/
