# 🗑️ ARQUIVOS PARA DELETAR DA RAIZ
## Lista de verificação pós-migração

> **ATENÇÃO:** Deletar estes arquivos APENAS após confirmar que foram movidos para `/docs/`  
> **Status:** ⏳ Aguardando confirmação  

---

## 📋 **LISTA COMPLETA (64 arquivos)**

### Changelogs (7):
- [ ] `/CHANGELOG_V1.0.7.md`
- [ ] `/CHANGELOG_v1.0.14_OVERBOOKING_DETECTION.md`
- [ ] `/CHANGELOG_v1.0.15_DASHBOARD_CONFLICT_ALERT.md`
- [ ] `/ATUALIZACAO_v1.0.8.md`
- [ ] `/ATUALIZACAO_v1.0.9.md`
- [ ] `/ATUALIZACAO_v1.0.11.md`
- [ ] `/ATUALIZACAO_v1.0.40_TOOLTIP_BUSCA.md`

### Fixes (12):
- [ ] `/CORRECAO_PRECO_v1.0.10.md`
- [ ] `/SOLUCAO_FINAL_CANCELAMENTO_v1.0.23.md`
- [ ] `/CORRECAO_ERRO_v1.0.25.md`
- [ ] `/VISUAL_FIX_SPACING_v1.0.26.md`
- [ ] `/SOLUCAO_DEFINITIVA_SPACING_v1.0.28.md`
- [ ] `/CORRECAO_PROPERTY_NOT_FOUND_v1.0.33.md`
- [ ] `/CORRECAO_DEFINITIVA_v1.0.34.md`
- [ ] `/CORRECAO_FINAL_v1.0.36.md`
- [ ] `/CORRECAO_413_COMPRESSION_v1.0.46.md`
- [ ] `/FIX_ENV_VARS_v1.0.46.md`
- [ ] `/FIX_ADDRESS_v1.0.48.md`
- [ ] `/FIX_DIALOG_WARNING_v1.0.49.md`

### Implementações (5 novos):
- [ ] `/INTEGRACAO_COMPLETA_CANCELAMENTO_v1.0.24.md`
- [ ] `/FUNCIONALIDADE_EDICAO_RESERVA_v1.0.25.md`
- [ ] `/CODIGOS_CURTOS_v1.0.38.md`
- [ ] `/BUSCA_INTELIGENTE_v1.0.42.md`
- [ ] `/DRAG_SELECTION_GUIDE_v1.0.43.md`
- [ ] `/IMPLEMENTACAO_FOTOS_v1.0.45.md` ← Já existe em /docs/, pode deletar
- [ ] `/IMPLEMENTACAO_LOCATIONS_ACCOMMODATIONS_v1.0.47.md` ← Já existe em /docs/, pode deletar

### Testes (21):
- [ ] `/TESTE_MODAL_v1.0.7.md`
- [ ] `/TESTE_RAPIDO_v1.0.8.txt`
- [ ] `/TESTE_v1.0.9.txt`
- [ ] `/TESTE_v1.0.10.txt`
- [ ] `/TESTE_MODAL_CANCELAMENTO_v1.0.22.md`
- [ ] `/TESTE_IMEDIATO_v1.0.23.md`
- [ ] `/TESTE_AGORA_CANCELAMENTO.md`
- [ ] `/TESTE_CRIACAO_RESERVA.md`
- [ ] `/TESTE_CRIAR_RESERVA_v1.0.37.md`
- [ ] `/TESTE_DRAG_RESERVA_AGORA.md`
- [ ] `/TESTE_EDICAO_AGORA.md`
- [ ] `/TESTE_BUSCA_AVANCADA_v1.0.44.md`
- [ ] `/TESTE_UPLOAD_FOTOS_v1.0.45.md`
- [ ] `/PRONTO_PARA_TESTAR_v1.0.45.md`
- [ ] `/TESTE_LOCATIONS_v1.0.47.md`
- [ ] `/PRONTO_TESTAR_v1.0.47.md`
- [ ] `/TESTE_AGORA.md`
- [ ] `/TESTE_RESERVA_OUTUBRO_2025.md`
- [ ] `/GUIA_RAPIDO_TESTE.md`
- [ ] `/INSTRUCOES_TESTE.txt`
- [ ] `/APLICAR_CODIGOS_CURTOS_AGORA.md`

### Guias (3):
- [ ] `/GUIA_CRIAR_RESERVA_CALENDARIO.md`
- [ ] `/COMO_EXPORTAR_DO_FIGMA_MAKE.md`
- [ ] `/INSTRUCOES_REORGANIZACAO_MODAL_v1.0.11.md`

### Debug (2):
- [ ] `/DEBUG_INFO.md`
- [ ] `/DEBUG_UPLOAD_FOTOS.md`

### Propostas (3):
- [ ] `/MOCKUP_PROPOSTA_v1.0.30.md`
- [ ] `/PROPOSTA_HORAS_v1.0.30.md`
- [ ] `/CONCEITO_HORAS_CALENDARIO.md`

### Resumos (2):
- [ ] `/RESUMO_v1.0.7.md`
- [ ] `/BOM_DIA_RESUMO.md`

### Roadmap (1):
- [ ] `/ROADMAP_FUNCIONALIDADES_PENDENTES.md`

### Logs (3):
- [ ] `/TRABALHO_NOTURNO_LOG.md`
- [ ] `/FORCE_REBUILD_LOG.md`
- [ ] `/log_desenvolvimento_rendizy.md`

### Diversos (3):
- [ ] `/API_DOCUMENTATION.md`
- [ ] `/PROJETO_LIMPO_E_CORRIGIDO.md`
- [ ] `/Attributions.md`

---

## ✅ **MANTER NA RAIZ (NÃO DELETAR)**

- ✅ `LOG_ATUAL.md`
- ✅ `INDICE_DOCUMENTACAO.md`
- ✅ `PROXIMAS_IMPLEMENTACOES.md`
- ✅ `README.md`
- ✅ `App.tsx`
- ✅ `CACHE_BUSTER.ts`
- ✅ `package.json`
- ✅ `tsconfig.json`
- ✅ `vite.config.ts`
- ✅ `index.html`
- ✅ `BUILD_VERSION.txt`

---

## 🎯 **INSTRUÇÃO DE EXECUÇÃO**

**APÓS** confirmar que todos os arquivos foram movidos para `/docs/`:

```bash
# Deletar changelogs
rm CHANGELOG_V1.0.7.md
rm CHANGELOG_v1.0.14_OVERBOOKING_DETECTION.md
rm CHANGELOG_v1.0.15_DASHBOARD_CONFLICT_ALERT.md
rm ATUALIZACAO_v1.0.8.md
rm ATUALIZACAO_v1.0.9.md
rm ATUALIZACAO_v1.0.11.md
rm ATUALIZACAO_v1.0.40_TOOLTIP_BUSCA.md

# Deletar fixes (12 arquivos)
rm CORRECAO_*.md
rm SOLUCAO_*.md
rm FIX_*.md
rm VISUAL_FIX_*.md

# Deletar implementações (5 arquivos)
rm INTEGRACAO_*.md
rm FUNCIONALIDADE_*.md
rm CODIGOS_CURTOS_*.md
rm BUSCA_INTELIGENTE_*.md
rm DRAG_SELECTION_*.md
rm IMPLEMENTACAO_*.md

# Deletar testes (21 arquivos)
rm TESTE_*.md
rm TESTE_*.txt
rm PRONTO_*.md
rm GUIA_RAPIDO_TESTE.md
rm INSTRUCOES_TESTE.txt
rm APLICAR_CODIGOS_CURTOS_AGORA.md

# Deletar guias (3 arquivos)
rm GUIA_CRIAR_RESERVA_CALENDARIO.md
rm COMO_EXPORTAR_DO_FIGMA_MAKE.md
rm INSTRUCOES_REORGANIZACAO_MODAL_v1.0.11.md

# Deletar debug (2 arquivos)
rm DEBUG_*.md

# Deletar propostas (3 arquivos)
rm MOCKUP_PROPOSTA_*.md
rm PROPOSTA_HORAS_*.md
rm CONCEITO_HORAS_CALENDARIO.md

# Deletar resumos (2 arquivos)
rm RESUMO_v1.0.7.md
rm BOM_DIA_RESUMO.md

# Deletar roadmap (1 arquivo)
rm ROADMAP_FUNCIONALIDADES_PENDENTES.md

# Deletar logs (3 arquivos)
rm TRABALHO_NOTURNO_LOG.md
rm FORCE_REBUILD_LOG.md
rm log_desenvolvimento_rendizy.md

# Deletar diversos (3 arquivos)
rm API_DOCUMENTATION.md
rm PROJETO_LIMPO_E_CORRIGIDO.md
rm Attributions.md
```

---

## ⚠️ **ATENÇÃO**

**NÃO executar estes comandos até:**
1. ✅ Confirmar que todos os arquivos foram copiados para `/docs/`
2. ✅ Validar que os arquivos em `/docs/` estão íntegros
3. ✅ Fazer backup do projeto
4. ✅ Confirmar visualmente no Figma Make

---

**Status:** ⏳ Lista criada, aguardando migração completa
