# 🔧 Fix: Vercel Build - Could not resolve entry module "index.html"

## ❌ Problema

O Vercel estava falhando no build com o erro:
```
Could not resolve entry module "index.html".
```

## 🔍 Causa

O Vite não conseguia encontrar o arquivo `index.html` porque o `root` não estava configurado corretamente no `vite.config.ts`. Quando o Vercel executa o build dentro do diretório `RendizyPrincipal`, o Vite precisa saber onde está o `index.html`.

## ✅ Solução

Atualizei o `vite.config.ts` para especificar o `root` corretamente usando `__dirname`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: __dirname,
  // ... resto da configuração
});
```

## ✅ Verificação

- ✅ Build local funcionando: `npm run build` executado com sucesso
- ✅ Arquivo `index.html` encontrado
- ✅ Build gerado em `dist/` com sucesso

## 🚀 Próximos Passos

1. ✅ Commit feito: `fix: Configure Vite root directory for Vercel build`
2. ⏳ Aguardar deploy automático no Vercel
3. ✅ Verificar se o build passa no Vercel

## 📝 Arquivos Modificados

- `RendizyPrincipal/vite.config.ts`: Adicionado `root: __dirname` e imports necessários















