# 🧪 GUIA DE TESTES - Calendário V2

## 🚀 Como Testar

### 1. Acesse as duas versões:

```
✅ Versão Atual:     http://localhost:3000/calendario
🧪 Versão Teste:     http://localhost:3000/calendario-v2
```

### 2. Botão de Alternância

- Um botão flutuante aparecerá no canto inferior direito
- Clique para alternar entre as versões
- Compare o comportamento lado a lado

### 3. O que Testar

#### ⚡ Performance
```
1. Navegue para /calendario-v2
2. Aguarde carregamento inicial (~3s)
3. Navegue para outra rota (ex: /dashboard)
4. Volte para /calendario-v2
   ✅ Deve carregar INSTANTANEAMENTE (cache)
   
Comparar com /calendario que sempre demora 3s
```

#### 🔄 Cache Inteligente
```
1. Abra /calendario-v2
2. Observe os imóveis carregarem
3. Troque de view (Calendário → Lista → Timeline)
   ✅ Mudança instantânea (sem reload)
   
4. Abra DevTools Network (F12)
5. Veja que NÃO há novos requests
   ✅ Dados vêm do cache
```

#### 🐛 Debug Tools
```
1. Pressione: Shift + Ctrl + Q
2. React Query DevTools abrirá
3. Veja:
   - Queries ativas
   - Status do cache (fresh/stale)
   - Tempo desde última atualização
```

#### 📊 Comparação de Requests
```
Versão Atual (/calendario):
- Carrega tudo sempre
- 15-20 requests por navegação

Versão V2 (/calendario-v2):
- Primeira carga: ~5 requests
- Cargas seguintes: 0-2 requests (cache)
- Economia de ~80% de requests
```

### 4. Console Logs

#### Versão V2 mostra:
```
📊 [CalendarPage] Sincronizando propriedades: 5
✅ [useProperties] 5 imóveis carregados
📊 [CalendarPage] Sincronizando reservas: 10
```

### 5. Funcionalidades a Validar

#### ✅ Deve Funcionar Igual:
- [ ] Seleção de propriedades
- [ ] Filtros de data
- [ ] Criar nova reserva
- [ ] Criar bloqueio
- [ ] Navegação entre views
- [ ] Todas as interações visuais

#### ✅ Melhorias Esperadas:
- [ ] Carregamento mais rápido (2ª visita)
- [ ] Menos requests no Network tab
- [ ] Navegação mais fluida
- [ ] Menos re-renders

### 6. Red Flags (Reportar se acontecer)

❌ **Dados desatualizados:**
- Se criar reserva e não aparecer imediatamente
- Solução temporária: Force refresh (Ctrl+Shift+R)

❌ **Loading travado:**
- Se ficar carregando infinitamente
- Solução: Verificar console para erros

❌ **Erro de compilação:**
- Se houver erro TypeScript
- Reportar linha do erro

### 7. Métricas de Sucesso

#### Baseline (Versão Atual):
```
⏱️ Carregamento inicial:     3-5s
🔄 Reload ao voltar:          3-5s
📦 Requests por sessão:       15-20
💾 Cache:                     Não tem
```

#### Target (Versão V2):
```
⏱️ Carregamento inicial:     3s (primeira vez)
🔄 Reload ao voltar:          0.5s (cache) ⚡
📦 Requests por sessão:       5-8 (-70%) ✅
💾 Cache:                     5 minutos
```

### 8. Rollback (Se necessário)

```bash
# Se algo quebrar gravemente:
git stash

# Ou apenas use:
http://localhost:3000/calendario
# (versão antiga continua funcionando)
```

---

## 📞 Checklist de Validação

- [ ] Acessei /calendario-v2
- [ ] Botão de alternância apareceu
- [ ] Dados carregaram corretamente
- [ ] Cache funcionou (2ª visita rápida)
- [ ] DevTools abriram (Shift+Ctrl+Q)
- [ ] Funcionalidades principais funcionam
- [ ] Performance melhor que /calendario
- [ ] Zero mudanças visuais observadas

---

## 🎯 Próximos Passos

Após validação:
1. ✅ Se tudo OK → Substituir `/calendario` por CalendarPage
2. ❌ Se houver bugs → Reportar e manter `/calendario` como padrão
3. 🔄 Ajustes finos → Melhorar cache, queries, etc.

---

**Importante:** Versão atual (`/calendario`) permanece intacta e funcional. Zero risco!
