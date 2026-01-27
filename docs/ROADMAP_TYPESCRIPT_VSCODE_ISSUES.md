# ROADMAP: Problemas TypeScript/VSCode - Templates Notificações

**Data:** 2026-01-27
**Status:** ⏳ Pendente Revisão

## Problema Identificado

O VS Code/TypeScript está reportando erro de módulo não encontrado para imports válidos:

```
Cannot find module './NotificationTemplateEditor' or its corresponding type declarations.
```

### Arquivos Afetados:
- `components/NotificationTemplatesPage.tsx` (linha 68)

### Arquivos Criados (que funcionam):
- `components/NotificationTemplateEditor.tsx` ✅
- `components/NotificationTemplatesPage.tsx` ✅
- `utils/api-notification-templates.ts` ✅
- `supabase/functions/rendizy-server/routes-notification-templates.ts` ✅

## Possíveis Causas

1. **Cache do TypeScript** - Servidor TS precisa reiniciar
2. **Cache do VS Code** - IDE precisa reiniciar
3. **Indexação pendente** - Arquivo muito recente
4. **Path mapping** - Problema com tsconfig paths (improvável, mesma pasta)

## Ações de Teste

### Reiniciar VS Code:
1. Fechar VS Code completamente
2. Abrir novamente
3. Verificar se erro persiste

### Reiniciar Servidor TypeScript (dentro do VS Code):
1. `Ctrl+Shift+P`
2. Digitar: "TypeScript: Restart TS Server"
3. Aguardar reindexação

### Limpar Cache manualmente:
```bash
# Remover cache do Vite
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue

# Remover cache do TypeScript (se existir)
Remove-Item -Recurse -Force .tscache -ErrorAction SilentlyContinue

# Reinstalar dependências (última opção)
npm ci
```

## Outros Erros de Import Transitórios

Estes erros também são provavelmente transitórios (arquivos Deno/Supabase):
- `npm:hono@4` - Módulo Deno, não frontend
- `./responses.ts` - Arquivo existe na mesma pasta
- `./auth.ts` - Arquivo existe na mesma pasta
- `jsr:@supabase/supabase-js@2` - Módulo Deno

## Verificação Pós-Reinício

Após reiniciar, verificar:
1. `NotificationTemplatesPage.tsx` não tem erros
2. `NotificationTemplateEditor.tsx` não tem erros
3. Navegação para `/notificacoes/templates` funciona
4. Modal de edição abre corretamente

## Resolução

- [ ] Reiniciar VS Code
- [ ] Se persistir: Executar "TypeScript: Restart TS Server"
- [ ] Se persistir: Limpar caches
- [ ] Se persistir: Verificar tsconfig.json

---

**Atualizado em:** 2026-01-27 05:30
