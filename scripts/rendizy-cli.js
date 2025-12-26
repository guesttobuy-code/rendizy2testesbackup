#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..');

function loadEnvFile() {
  const envLocalPath = path.join(repoRoot, '.env.local');
  const envExamplePath = path.join(repoRoot, '.env.example');

  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: false, quiet: true });
    return { loaded: true, path: envLocalPath, fallback: false };
  }

  if (fs.existsSync(envExamplePath)) {
    dotenv.config({ path: envExamplePath, override: false, quiet: true });
    return { loaded: true, path: envExamplePath, fallback: true };
  }

  return { loaded: false, path: null, fallback: false };
}

function maskPresence(name) {
  const val = process.env[name];
  if (!val) return 'NÃO';
  return 'SIM';
}

function getSupabaseUrl() {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    ''
  ).trim();
}

function getSupabaseKey(prefer) {
  if (prefer === 'service') {
    return (
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE ||
      ''
    ).trim();
  }

  return (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();
}

function getSupabaseKeySource(prefer) {
  if (prefer === 'service') {
    if ((process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()) return 'SUPABASE_SERVICE_ROLE_KEY';
    if ((process.env.SERVICE_ROLE_KEY || '').trim()) return 'SERVICE_ROLE_KEY';
    if ((process.env.SUPABASE_SERVICE_ROLE || '').trim()) return 'SUPABASE_SERVICE_ROLE';
    return '(nenhuma)';
  }

  if ((process.env.VITE_SUPABASE_ANON_KEY || '').trim()) return 'VITE_SUPABASE_ANON_KEY';
  if ((process.env.SUPABASE_ANON_KEY || '').trim()) return 'SUPABASE_ANON_KEY';
  return '(nenhuma)';
}

function getProjectRef() {
  return process.env.SUPABASE_PROJECT_REF || 'odcgnzfremrqnvtitpcc';
}

function printHelp() {
  console.log(`\nRendizy CLI (local)\n\nUso:\n  npm run cli -- <comando>\n\nComandos:\n  env                     Mostra presença das variáveis (sem valores)\n  supabase ping [anon|service]  Testa acesso ao endpoint REST do Supabase\n  supabase secrets         Mostra como setar SERVICE_ROLE_KEY no projeto\n\nExemplos:\n  npm run cli -- env\n  npm run cli -- supabase ping anon\n  npm run cli -- supabase ping service\n  npm run cli -- supabase secrets\n`);
}

async function supabasePing(mode) {
  const url = getSupabaseUrl();
  const prefer = mode === 'service' ? 'service' : 'anon';
  const key = getSupabaseKey(prefer);
  const keySource = getSupabaseKeySource(prefer);

  if (!url) {
    console.error('SUPABASE_URL/VITE_SUPABASE_URL não configurada.');
    process.exitCode = 2;
    return;
  }

  if (!key) {
    console.error(
      mode === 'service'
        ? 'SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY não configurada.'
        : 'SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY não configurada.'
    );
    process.exitCode = 2;
    return;
  }

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/`;

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json'
    }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Falha: HTTP ${res.status} ${res.statusText}`);
    console.error(`Detalhe: usando key de ${keySource} (length=${key.length})`);
    if (body) console.error(body.slice(0, 2000));
    process.exitCode = 2;
    return;
  }

  console.log(`OK: Conseguiu acessar ${endpoint}`);
}

function printEnvStatus(loadedInfo) {
  const loadedLine = loadedInfo.loaded
    ? `Carregou env de: ${loadedInfo.path}${loadedInfo.fallback ? ' (fallback)' : ''}`
    : 'Nenhum .env.local/.env.example encontrado (usando apenas variáveis do ambiente).';

  console.log(loadedLine);

  const resolvedUrl = getSupabaseUrl();
  const resolvedAnon = getSupabaseKey('anon');
  const resolvedService = getSupabaseKey('service');
  const urlHost = resolvedUrl ? new URL(resolvedUrl).host : '';

  console.log('\nSupabase (resolvido):');
  console.log(`- URL: ${resolvedUrl ? resolvedUrl : '(vazio)'}${urlHost ? ` (host: ${urlHost})` : ''}`);

  const looksJwt = (k) => {
    const parts = (k || '').split('.');
    return parts.length === 3 && k.startsWith('eyJ');
  };

  console.log('\nSupabase (presença/diagnóstico seguro):');
  console.log(`- SUPABASE_URL: ${maskPresence('SUPABASE_URL')} (fallback VITE_SUPABASE_URL=${maskPresence('VITE_SUPABASE_URL')})`);
  console.log(`- ANON key presente: ${resolvedAnon ? 'SIM' : 'NÃO'} | jwt-like: ${looksJwt(resolvedAnon) ? 'SIM' : 'NÃO'} | length: ${resolvedAnon ? resolvedAnon.length : 0}`);
  console.log(`- SERVICE key presente: ${resolvedService ? 'SIM' : 'NÃO'} | jwt-like: ${looksJwt(resolvedService) ? 'SIM' : 'NÃO'} | length: ${resolvedService ? resolvedService.length : 0}`);
  console.log(`- SUPABASE_PROJECT_REF: ${maskPresence('SUPABASE_PROJECT_REF')} (default=${getProjectRef()})`);
}

function printSecretsHowTo() {
  const projectRef = getProjectRef();

  console.log(`\nComo setar o secret no Supabase (sem vazar a chave):\n\n1) Garanta que sua chave esteja em .env.local como SUPABASE_SERVICE_ROLE_KEY=...\n2) Rode o comando abaixo (ele vai ler a chave do arquivo local).\n\nPowerShell (recomendado):\n  $val = (Select-String -Path .\\.env.local -Pattern 'SUPABASE_SERVICE_ROLE_KEY=(.*)' -AllMatches).Matches[0].Groups[1].Value\n  npx supabase secrets set SERVICE_ROLE_KEY=\"$val\" --project-ref ${projectRef}\n\nObservação: no código server-side aceitamos SERVICE_ROLE_KEY e SUPABASE_SERVICE_ROLE_KEY.\n`);
}

async function main() {
  const loadedInfo = loadEnvFile();

  const args = process.argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === '--help' || cmd === '-h' || cmd === 'help') {
    printHelp();
    return;
  }

  if (cmd === 'env') {
    printEnvStatus(loadedInfo);
    return;
  }

  if (cmd === 'supabase') {
    const sub = args[1];

    if (sub === 'ping') {
      const mode = args[2] === 'service' ? 'service' : 'anon';
      await supabasePing(mode);
      return;
    }

    if (sub === 'secrets') {
      printSecretsHowTo();
      return;
    }

    console.error('Subcomando inválido de supabase. Use: ping | secrets');
    process.exitCode = 2;
    return;
  }

  console.error('Comando inválido. Use: env | supabase');
  process.exitCode = 2;
}

await main();
