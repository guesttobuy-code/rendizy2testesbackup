# 🚀 COMECE AQUI: Reset + Teste do Wizard

## ✅ O QUE FOI FEITO

1. **✅ API de Reset do Banco** (`/supabase/functions/server/reset-database.ts`)
   - 3 endpoints: status, confirm, partial
   - Limpa TODOS os dados de teste
   - Preserva organização e usuários

2. **✅ Componente de Interface** (`/components/DatabaseResetTool.tsx`)
   - Interface visual para reset
   - Confirmação de segurança
   - Status e estatísticas

3. **✅ Guia Completo de Teste** (`/📋_GUIA_CADASTRO_IMOVEL_REAL.md`)
   - 17 steps detalhados
   - Checklist para cada step
   - Validações botão por botão
   - Template de bug report

4. **✅ Guia Rápido** (`/🎯_INICIO_RAPIDO_RESET_E_TESTE.md`)
   - Versão resumida (1h)
   - 3 passos simples
   - Foco no essencial

---

## 🎯 AÇÃO IMEDIATA (Escolha uma)

### OPÇÃO A: Reset via API (MAIS RÁPIDO - 30 segundos)

```bash
# 1. Obter seu Organization ID
# Faça login no sistema e veja no console do navegador (F12)
# Ou veja no localStorage: localStorage.getItem('organizationId')

# 2. Executar reset
curl -X POST "https://xqylmpglzcuxtjxxqmaa.supabase.co/functions/v1/make-server-67caf26a/reset/confirm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeWxtcGdsemN1eHRqeHhxbWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk4NjgxNjQsImV4cCI6MjA0NTQ0NDE2NH0.gSEWJDX4sPWGIglJNTpFEyO8uSTWzU_MgGOoVl6Y9Wg" \
  -d '{
    "confirmation": "DELETE_ALL_DATA",
    "organizationId": "SEU_ORG_ID_AQUI"
  }'
```

**Como obter o Organization ID:**
1. Faça login em: https://suacasaavenda.com.br
2. Abra F12 → Console
3. Digite: `localStorage.getItem('currentOrganization')`
4. Copie o `id` que aparecer

---

### OPÇÃO B: Reset via Interface Web (2 minutos)

**1. Adicione a rota ao sistema:**

Abra `/src/main.tsx` e adicione a linha de importação no topo:

```typescript
import DatabaseResetTool from './components/DatabaseResetTool';
```

Depois, dentro do `<Routes>`, adicione a rota:

```typescript
<Route path="/admin/reset-database" element={<DatabaseResetTool />} />
```

**2. Acesse a interface:**
```
https://suacasaavenda.com.br/admin/reset-database
```

**3. Siga os passos na tela:**
- Clique em "Verificar Status"
- Digite `DELETE_ALL_DATA`
- Clique em "DELETAR TODOS OS DADOS"
- Aguarde confirmação

---

## 📝 TESTE DO WIZARD (30-60 minutos)

### 1. Acesse o Wizard:
```
https://suacasaavenda.com.br/properties/new
```

### 2. Siga o fluxo dos 17 steps:

**BLOCO 1: CONTEÚDO (Steps 1-7)**
- ✅ Step 1: Tipo de Anúncio
- ✅ Step 2: Localização
- ✅ Step 3: Cômodos
- ✅ Step 4: Comodidades da Localização
- ✅ Step 5: Comodidades do Imóvel
- ✅ Step 6: Fotos
- ✅ Step 7: Descrição

**BLOCO 2: FINANCEIRO (Steps 8-12)**
- ✅ Step 8: Titular/Proprietário
- ✅ Step 9: Preços Locação/Venda
- ✅ Step 10: Taxas de Temporada
- ⚠️ Step 11: Precificação Individual (ATENÇÃO!)
- ✅ Step 12: Preços Derivados

**BLOCO 3: CONFIGURAÇÕES (Steps 13-17)**
- ✅ Step 13: Regras de Hospedagem
- ✅ Step 14: Configurações de Reserva
- ✅ Step 15: Tags e Grupos
- ✅ Step 16: iCal
- ✅ Step 17: Integrações OTAs

### 3. Valide cada botão:
- [ ] Botão "Voltar"
- [ ] Botão "Próximo"
- [ ] Botão "Salvar"
- [ ] Auto-save funcionando
- [ ] Validações de campos
- [ ] Mensagens de erro claras

---

## ⚠️ ATENÇÃO: STEP 11 (Tela em Branco)

Este step teve problemas. Se aparecer tela em branco:

### 1. Limpar Cache:
```bash
Ctrl+Shift+Delete → Limpar cache → Ctrl+F5
```

### 2. Verificar Console:
```bash
F12 → Console → Copiar TODOS os erros
```

### 3. Se não resolver:
Consulte:
- `/🎯_SOLUCAO_RAPIDA_STEP04.md`
- `/🧪_TESTE_STEP04_PASSO_A_PASSO.md`

---

## 📊 ARQUIVOS CRIADOS

### APIs Backend:
```
/supabase/functions/server/reset-database.ts
```

### Componentes:
```
/components/DatabaseResetTool.tsx
/components/wizard-steps/FinancialIndividualPricingStep.test.tsx (teste)
```

### Documentação:
```
/📋_GUIA_CADASTRO_IMOVEL_REAL.md (detalhado - 2h30min)
/🎯_INICIO_RAPIDO_RESET_E_TESTE.md (resumido - 1h)
/🚀_COMECE_AQUI_RESET_TESTE.md (este arquivo)
```

### Diagnóstico Step 04:
```
/🎯_SOLUCAO_RAPIDA_STEP04.md
/🧪_TESTE_STEP04_PASSO_A_PASSO.md
/DIAGNOSTICO_STEP04_FINANCEIRO.md
```

---

## 🐛 REPORTAR BUGS

Se encontrar problemas, envie:

### Template Rápido:
```
Step: [ número ]
Campo: [ nome ]
Problema: [ descrição ]
Console: [ copie erros do F12 ]
Screenshot: [ cole aqui ]
```

---

## ✅ CHECKLIST FINAL

Antes de começar:

- [ ] Banco resetado (via API ou interface)
- [ ] Dados do imóvel real preparados:
  - [ ] 5+ fotos
  - [ ] Endereço completo
  - [ ] Características (quartos, banheiros)
  - [ ] Preços
  - [ ] Regras
- [ ] Navegador atualizado
- [ ] Console aberto (F12)
- [ ] Tempo disponível (1-2h)

---

## 📞 PRÓXIMOS PASSOS

Após completar o teste:

1. **Se tudo funcionar:**
   ✅ Sistema pronto para produção!
   ✅ Pode começar a cadastrar imóveis reais

2. **Se encontrar bugs:**
   📋 Documente no formato de bug report
   📧 Envie com screenshots e console errors
   🔧 Aguarde correções

3. **Melhorias futuras:**
   - Importação em lote (CSV/Excel)
   - Integração com mais OTAs
   - Automações de preços
   - Relatórios avançados

---

## 🎉 RESULTADO ESPERADO

Ao final, você terá:

✅ Banco de dados limpo
✅ 1 imóvel real cadastrado completamente
✅ Todos os 17 steps validados
✅ Lista de bugs (se houver)
✅ Sistema 100% testado e pronto para uso

---

**⏰ Tempo total:** 1-2 horas
**📅 Data:** 03/11/2025 21:15 UTC-3
**🔖 Versão:** v1.0.103.267
**✅ Status:** Pronto para executar

---

## 🚀 COMECE AGORA!

**Escolha seu caminho:**

👉 **Via API:** Execute o curl acima
👉 **Via Interface:** Adicione a rota e acesse `/admin/reset-database`
👉 **Teste Completo:** Abra `/📋_GUIA_CADASTRO_IMOVEL_REAL.md`
👉 **Teste Rápido:** Abra `/🎯_INICIO_RAPIDO_RESET_E_TESTE.md`

---

**Boa sorte! 🎯**

*Se precisar de ajuda, envie screenshot + console errors*
