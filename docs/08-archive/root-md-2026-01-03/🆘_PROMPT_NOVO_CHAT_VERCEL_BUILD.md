# 🆘 PROMPT PARA NOVO CHAT - DEBUG DEPLOY VERCEL (BUILD)

**Cole este prompt no novo chat do GitHub Copilot para continuar o trabalho:**

---

## 📌 Contexto

Estamos debugando o deploy no Vercel (branch `final-clean`) de um projeto Vite + React + Tailwind v4.

O Vercel estava falhando no build com:
- `Error [ERR_METHOD_NOT_IMPLEMENTED]: The resolveSync() method is not implemented`
- Mensagem: `failed to load config from /vercel/path0/vite.config.ts`

O log mostrava Node 22.x (`Node: v22.21.1`) e **não** havia mais `postcss.config.*`.

---

## ✅ O que foi consertado (últimos commits)

### 1) PostCSS/Tailwind
- Removido `postcss.config.*` do repo.
- Migrado Tailwind para o plugin oficial do Vite: `@tailwindcss/vite`.
- `package-lock.json` atualizado para refletir a nova dependência.

### 2) Causa raiz do erro `resolveSync()`
- O script `build` usava:
  - `node --require ./scripts/setup-crypto.js ...`
- Mas `scripts/setup-crypto.js` é **ESM** (usa `import crypto from 'node:crypto'`).
- No Node 22, `--require` força um caminho interno CJS→ESM (`importSyncForRequire` / `loadESMFromCJS`) que explode com `resolveSync()`.

✅ Fix aplicado:
- Trocar `--require` por `--import` no `npm run build`:
  - `node --import ./scripts/setup-crypto.js node_modules/vite/bin/vite.js build`

Commits relevantes (branch `final-clean`):
- Remoção PostCSS + Tailwind via Vite plugin + lockfile: `bcbaf5d` e anteriores
- Fix do resolveSync (`--import`): `86a8a78` (ou mais novo)

---

## 🎯 Objetivo do novo chat

1) Confirmar que o Vercel está clonando o commit correto (>= `86a8a78`).
2) Confirmar que o build passa.
3) Se aparecer um erro novo, identificar a nova causa raiz e corrigir com patch mínimo.

---

## 🔎 Checklist de validação no Vercel

No log do Vercel, confirme:
- `Branch: final-clean`
- `Commit: 86a8a78` (ou superior)
- `Node: v22.x`
- `postcss configs: []`

Se o build ainda falhar:
- Cole o trecho completo do erro + stacktrace.
- Cole as linhas imediatamente anteriores ao erro.

---

## 🧭 Onde mexer no repo

- Build script: `package.json`
- Preload crypto: `scripts/setup-crypto.js`
- Config do Vite: `vite.config.ts`

---

## 📝 Changelog

O changelog registra o fix:
- `CHANGELOG.md`
