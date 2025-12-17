# 🎯 INÍCIO RÁPIDO: Reset do Banco + Teste Completo

## ⚡ 3 PASSOS SIMPLES

### 1️⃣ RESET DO BANCO (2 minutos)

**Via API (Mais Rápido):**

```bash
# Substitua os valores:
# YOUR_ORG_ID = ID da sua organização (ex: ORG-xxx)

curl -X POST "https://xqylmpglzcuxtjxxqmaa.supabase.co/functions/v1/make-server-67caf26a/reset/confirm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxeWxtcGdsemN1eHRqeHhxbWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjk4NjgxNjQsImV4cCI6MjA0NTQ0NDE2NH0.gSEWJDX4sPWGIglJNTpFEyO8uSTWzU_MgGOoVl6Y9Wg" \
  -d '{
    "confirmation": "DELETE_ALL_DATA",
    "organizationId": "SEU_ORG_ID_AQUI"
  }'
```

**Via Interface Web (Alternativa):**

1. Adicione ao `AppRouter.tsx`:
```typescript
import DatabaseResetTool from './components/DatabaseResetTool';
<Route path="/admin/reset" element={<DatabaseResetTool />} />
```

2. Acesse: `https://suacasaavenda.com.br/admin/reset`
3. Digite: `DELETE_ALL_DATA`
4. Clique em "DELETAR TODOS OS DADOS"

---

### 2️⃣ CADASTRAR IMÓVEL REAL (30 minutos)

**Acesse:**
```
https://suacasaavenda.com.br/properties/new
```

**Siga o wizard:**

1. ✅ **Step 1** - Tipo de Anúncio (Apartamento, Casa, etc)
2. ✅ **Step 2** - Localização (endereço completo)
3. ✅ **Step 3** - Cômodos (quartos, banheiros)
4. ✅ **Step 4** - Comodidades da Localização
5. ✅ **Step 5** - Comodidades do Imóvel
6. ✅ **Step 6** - Fotos (mínimo 5)
7. ✅ **Step 7** - Descrição
8. ✅ **Step 8** - Titular/Proprietário
9. ✅ **Step 9** - Preços Locação/Venda
10. ✅ **Step 10** - Taxas de Temporada
11. ✅ **Step 11** - Precificação Individual ⚠️
12. ✅ **Step 12** - Preços Derivados
13. ✅ **Step 13** - Regras de Hospedagem
14. ✅ **Step 14** - Configurações de Reserva
15. ✅ **Step 15** - Tags e Grupos
16. ✅ **Step 16** - iCal
17. ✅ **Step 17** - Integrações OTAs

---

### 3️⃣ VALIDAR FUNCIONALIDADES (30 minutos)

**Teste cada botão/campo:**

✅ **Navegação:**
- [ ] Botão "Voltar"
- [ ] Botão "Próximo"
- [ ] Botão "Salvar"

✅ **Inputs:**
- [ ] Campos de texto
- [ ] Campos numéricos
- [ ] Seletores (dropdowns)
- [ ] Toggles/switches
- [ ] Date pickers

✅ **Upload:**
- [ ] Upload de fotos
- [ ] Drag & drop
- [ ] Reordenação
- [ ] Delete

✅ **Validações:**
- [ ] Campos obrigatórios
- [ ] Formatos (CEP, CPF, etc)
- [ ] Limites (min/max)
- [ ] Mensagens de erro

---

## 🐛 SE ENCONTRAR BUGS

### Bug Report Rápido:

```markdown
**Step:** [ número ]
**Campo:** [ nome do campo ]
**Problema:** [ descrição breve ]
**Console Error:** [ copie o erro ]
```

---

## 📊 ARQUIVOS DE APOIO

1. **`/components/DatabaseResetTool.tsx`**
   - Componente para reset via interface

2. **`/supabase/functions/server/reset-database.ts`**
   - API de reset do banco

3. **`/📋_GUIA_CADASTRO_IMOVEL_REAL.md`**
   - Guia detalhado passo a passo (2h30min)

4. **`/🧪_TESTE_STEP04_PASSO_A_PASSO.md`**
   - Diagnóstico específico do Step 04

5. **`/🎯_SOLUCAO_RAPIDA_STEP04.md`**
   - Soluções para tela em branco

---

## 🔍 FOCOS DE ATENÇÃO

### ⚠️ STEP 11 (Precificação Individual)

Este step teve problema de "tela em branco". Verifique:

1. **Modo Global** deve mostrar:
   - ✅ Card de seleção Global/Individual
   - ✅ Preview de configurações (4 itens)
   - ✅ Alert azul com CTA

2. **Modo Individual** deve mostrar:
   - ✅ Formulário completo
   - ✅ Preço base
   - ✅ Períodos sazonais
   - ✅ Datas especiais

**Se aparecer tela em branco:**
```
F12 → Console → Copiar erros → Enviar
```

---

## ✅ CHECKLIST RÁPIDO

Antes de começar:

- [ ] Banco de dados resetado
- [ ] Dados do imóvel real em mãos:
  - [ ] Endereço completo
  - [ ] 5+ fotos de qualidade
  - [ ] Características (quartos, banheiros)
  - [ ] Preços (locação/venda/temporada)
  - [ ] Regras (check-in, pets, etc)
- [ ] Navegador atualizado
- [ ] Console aberto (F12)
- [ ] Rede estável

---

## 🎯 OBJETIVO FINAL

Ao terminar, você terá:

✅ Banco limpo (sem dados fictícios)
✅ 1 imóvel real cadastrado completamente
✅ Todos os 17 steps testados
✅ Bugs identificados e documentados
✅ Sistema pronto para produção

---

## 📞 SUPORTE

**Se precisar de ajuda:**

1. Verifique o console (F12)
2. Consulte os guias de diagnóstico
3. Envie bug report com:
   - Screenshot
   - Console errors
   - Step onde ocorreu

---

**⏰ Tempo total:** ~1 hora
**📅 Data:** 03/11/2025
**🔖 Versão:** v1.0.103.267
**✅ Status:** Pronto para teste

---

## 🚀 COMECE AGORA!

```bash
# Passo 1: Reset
curl -X POST [URL_RESET]

# Passo 2: Cadastrar
Abra: https://suacasaavenda.com.br/properties/new

# Passo 3: Testar
F12 → Console → Validar cada step
```

**Boa sorte! 🎉**
