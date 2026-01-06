# REGRAS CANÔNICAS DO RENDIZY

> **Este documento é a fonte de verdade. Nenhuma exceção é permitida.**

---

## 🔴 REGRA #1: O RENDIZY PROPÕE, EXTERNOS SEGUEM

O Rendizy define o padrão/contrato. Sites externos (Bolt.new, ferramentas de IA, qualquer terceiro) **DEVEM** se adaptar ao nosso padrão.

- ✅ Rendizy publica a API, o formato, os tipos, as convenções
- ✅ Sites externos leem nossa documentação e implementam conforme especificado
- ❌ **NUNCA** adaptamos código Rendizy para "aceitar" código de terceiros
- ❌ **NUNCA** fazemos "remendos" ou "patches" em runtime para corrigir erros de terceiros
- ❌ **NUNCA** criamos compatibilidade retroativa com implementações erradas

**Se o site externo está errado, a correção é no PROMPT/DOCUMENTAÇÃO do Rendizy, para que a próxima geração venha correta.**

---

## 🔴 REGRA #2: PROMPT PROPOSITIVO, NÃO REATIVO

O prompt de geração de sites é **propositivo** — ele dita as regras, não sugere.

- ✅ O prompt usa linguagem imperativa: "FAÇA", "USE", "IMPLEMENTE"
- ✅ O prompt especifica tipos, formatos, convenções exatas
- ✅ O prompt inclui anti-patterns explícitos: "NUNCA faça X"
- ❌ O prompt NÃO pergunta, NÃO sugere, NÃO deixa margem para interpretação

---

## 🔴 REGRA #3: ZERO TOLERÂNCIA COM DESVIOS

Se um site gerado não funciona:

1. **Identificar** o desvio do padrão (o que o site fez errado)
2. **Documentar** no prompt/catalog para prevenir recorrência
3. **Regenerar** o site com o prompt atualizado
4. ❌ **NUNCA** adaptar o Rendizy para "aceitar" o erro

---

## 🔴 REGRA #4: CONTRATO É LEI

Os endpoints, tipos e formatos documentados em `catalog.ts` e no prompt são **imutáveis** após publicação.

- Mudanças são **aditivas** (novos campos opcionais, novos endpoints)
- Campos existentes **NUNCA** mudam de tipo ou semântica
- Se precisa quebrar compatibilidade, cria-se **nova versão** do contrato

---

## 🔴 REGRA #5: FONTE DE VERDADE

| Assunto | Fonte de Verdade |
|---------|------------------|
| API pública para sites | `catalog.ts` |
| Prompt de geração | `ClientSitesManager.tsx` |
| Regras canônicas | Este arquivo (`Rules.md`) |
| Tipos TypeScript | Arquivos `.d.ts` e interfaces no código |

**Conflitos são resolvidos consultando a fonte de verdade, não adaptando código.**

---

## 📋 CHECKLIST PARA DESENVOLVEDORES (HUMANOS E IA)

Antes de fazer qualquer mudança:

- [ ] A mudança está no RENDIZY propondo padrão, ou está adaptando Rendizy a terceiro?
- [ ] Se for adaptar Rendizy a terceiro → **PARE. Corrija o prompt/docs.**
- [ ] A mudança é propositiva (dita regra) ou reativa (aceita variação)?
- [ ] O contrato existente está sendo respeitado (sem quebra)?

---

## 🤖 NOTA PARA IA ASSISTENTE

**LEIA ISTO ANTES DE QUALQUER AÇÃO:**

1. Você NUNCA deve sugerir patches/remendos no código Rendizy para "aceitar" código externo
2. Se o site gerado tem bug, a correção é SEMPRE no prompt/documentação
3. O fluxo correto é: prompt corrigido → site regenerado → funciona
4. Nunca sugira "adaptar o backend para aceitar formato X do Bolt"
5. O Rendizy é o padrão. Ponto final.

---

*Última atualização: 2026-01-05*
*Versão: 1.1*

---

## 📚 DOCUMENTOS RELACIONADOS

| Documento | Descrição |
|-----------|-----------|
| [AI_RULES.md](../.github/AI_RULES.md) | Regras específicas para AI/Copilot - Zonas Críticas do código |
| [.cursorrules](../.cursorrules) | Regras para Cursor/Copilot (formato compacto) |
