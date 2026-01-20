#!/usr/bin/env node
/**
 * ============================================================================
 * VALIDATE EDGE FUNCTIONS - Pre-deploy validation
 * ============================================================================
 * 
 * Verifica Edge Functions antes do deploy para detectar problemas comuns:
 * 
 * 1. CORS Headers - x-auth-token deve estar na lista de allowed headers
 * 2. Auth Pattern - Deve usar sessions table, não supabase.auth.getUser()
 * 3. Response Headers - Todas respostas devem incluir CORS headers
 * 
 * USO:
 *   node scripts/validate-edge-functions.mjs [function-name]
 *   node scripts/validate-edge-functions.mjs calendar-rules-batch
 *   node scripts/validate-edge-functions.mjs --all
 * 
 * INTEGRAÇÃO COM DEPLOY:
 *   O script deploy-edge-function.ps1 chama este automaticamente
 * 
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FUNCTIONS_DIR = path.join(__dirname, '..', 'supabase', 'functions');

// ============================================================================
// VALIDATION RULES
// ============================================================================

const REQUIRED_CORS_HEADERS = [
  'x-auth-token',
  'authorization',
  'content-type',
  'apikey',
];

const DANGEROUS_PATTERNS = [
  {
    pattern: /supabase\.auth\.getUser\s*\(/g,
    message: '❌ ERRO: Usa supabase.auth.getUser() - tokens customizados não funcionam com isso!',
    suggestion: '✅ Use validateCustomToken() com tabela sessions ao invés',
    severity: 'error',
  },
  {
    pattern: /supabase\.auth\.getSession\s*\(/g,
    message: '❌ ERRO: Usa supabase.auth.getSession() - tokens customizados não funcionam!',
    suggestion: '✅ Use validateCustomToken() com tabela sessions ao invés',
    severity: 'error',
  },
];

const REQUIRED_PATTERNS = [
  {
    pattern: /Access-Control-Allow-Origin/i,
    message: '⚠️ AVISO: Não encontrado Access-Control-Allow-Origin',
    severity: 'warning',
  },
  {
    pattern: /Access-Control-Allow-Headers/i,
    message: '⚠️ AVISO: Não encontrado Access-Control-Allow-Headers',
    severity: 'warning',
  },
  {
    pattern: /req\.method\s*===?\s*['"]OPTIONS['"]/i,
    message: '⚠️ AVISO: Não encontrado handler para OPTIONS (preflight CORS)',
    severity: 'warning',
  },
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function extractCorsHeaders(content) {
  // Procura por Access-Control-Allow-Headers e extrai os valores
  const matches = content.matchAll(/['"]?Access-Control-Allow-Headers['"]?\s*[,:]\s*['"]([^'"]+)['"]/gi);
  const headers = new Set();
  
  for (const match of matches) {
    const headerList = match[1].toLowerCase().split(/\s*,\s*/);
    headerList.forEach(h => headers.add(h.trim()));
  }
  
  return headers;
}

function validateCorsHeaders(content, functionName) {
  const issues = [];
  const corsHeaders = extractCorsHeaders(content);
  
  if (corsHeaders.size === 0) {
    issues.push({
      severity: 'warning',
      message: `⚠️ [${functionName}] Nenhum CORS header encontrado`,
    });
    return issues;
  }
  
  for (const required of REQUIRED_CORS_HEADERS) {
    if (!corsHeaders.has(required)) {
      issues.push({
        severity: 'error',
        message: `❌ [${functionName}] CORS header faltando: "${required}"`,
        suggestion: `Adicione "${required}" em Access-Control-Allow-Headers`,
      });
    }
  }
  
  return issues;
}

function validateAuthPattern(content, functionName) {
  const issues = [];
  
  for (const dangerous of DANGEROUS_PATTERNS) {
    if (dangerous.pattern.test(content)) {
      issues.push({
        severity: dangerous.severity,
        message: `${dangerous.message} [${functionName}]`,
        suggestion: dangerous.suggestion,
      });
    }
  }
  
  return issues;
}

function validateRequiredPatterns(content, functionName) {
  const issues = [];
  
  for (const required of REQUIRED_PATTERNS) {
    if (!required.pattern.test(content)) {
      issues.push({
        severity: required.severity,
        message: `${required.message} [${functionName}]`,
      });
    }
  }
  
  return issues;
}

function validateFunction(functionDir) {
  const functionName = path.basename(functionDir);
  const indexPath = path.join(functionDir, 'index.ts');
  
  if (!fs.existsSync(indexPath)) {
    return {
      functionName,
      valid: false,
      issues: [{ severity: 'error', message: `❌ [${functionName}] index.ts não encontrado` }],
    };
  }
  
  const content = fs.readFileSync(indexPath, 'utf-8');
  const issues = [];
  
  // Run all validations
  issues.push(...validateCorsHeaders(content, functionName));
  issues.push(...validateAuthPattern(content, functionName));
  issues.push(...validateRequiredPatterns(content, functionName));
  
  const hasErrors = issues.some(i => i.severity === 'error');
  
  return {
    functionName,
    valid: !hasErrors,
    issues,
  };
}

function getAllFunctions() {
  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error('❌ Diretório de functions não encontrado:', FUNCTIONS_DIR);
    process.exit(1);
  }
  
  return fs.readdirSync(FUNCTIONS_DIR)
    .filter(name => {
      const fullPath = path.join(FUNCTIONS_DIR, name);
      return fs.statSync(fullPath).isDirectory() && 
             fs.existsSync(path.join(fullPath, 'index.ts'));
    });
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  let functionsToValidate = [];
  
  if (args.length === 0 || args.includes('--all')) {
    functionsToValidate = getAllFunctions();
  } else {
    functionsToValidate = args.filter(a => !a.startsWith('--'));
  }
  
  console.log('');
  console.log('🔍 VALIDATE EDGE FUNCTIONS - Pre-deploy Check');
  console.log('='.repeat(60));
  console.log('');
  
  let totalErrors = 0;
  let totalWarnings = 0;
  const results = [];
  
  for (const funcName of functionsToValidate) {
    const funcDir = path.join(FUNCTIONS_DIR, funcName);
    
    if (!fs.existsSync(funcDir)) {
      console.error(`❌ Function não encontrada: ${funcName}`);
      totalErrors++;
      continue;
    }
    
    const result = validateFunction(funcDir);
    results.push(result);
    
    const errors = result.issues.filter(i => i.severity === 'error');
    const warnings = result.issues.filter(i => i.severity === 'warning');
    
    totalErrors += errors.length;
    totalWarnings += warnings.length;
    
    if (result.issues.length === 0) {
      console.log(`✅ ${result.functionName} - OK`);
    } else {
      console.log(`\n📦 ${result.functionName}:`);
      for (const issue of result.issues) {
        console.log(`   ${issue.message}`);
        if (issue.suggestion) {
          console.log(`      → ${issue.suggestion}`);
        }
      }
    }
  }
  
  console.log('');
  console.log('='.repeat(60));
  console.log(`📊 RESUMO: ${functionsToValidate.length} functions, ${totalErrors} erros, ${totalWarnings} avisos`);
  console.log('');
  
  if (totalErrors > 0) {
    console.log('❌ VALIDAÇÃO FALHOU - Corrija os erros antes do deploy!');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('⚠️ VALIDAÇÃO OK COM AVISOS - Revise se necessário');
    process.exit(0);
  } else {
    console.log('✅ VALIDAÇÃO OK - Pronto para deploy!');
    process.exit(0);
  }
}

main();
