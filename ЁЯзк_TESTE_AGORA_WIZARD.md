# 🧪 TESTE AGORA - Wizard Completo

**Versão:** v1.0.103.264  
**Data:** 03 NOV 2025  
**Tempo estimado:** 5 minutos

---

## 🎯 OBJETIVO

Testar se o backend completo está funcionando e se você consegue navegar pelo wizard sem erros.

---

## ✅ PREPARAÇÃO (1 minuto)

### **1. Verifique que você está no dashboard:**
```
URL deve ser: http://localhost:5173/
ou
Se está em "Not Found", clique no botão laranja no canto direito 🏠
```

### **2. Acesse Locais e Anúncios:**
```
1. Sidebar esquerda
2. Clique em "Locais e Anúncios"
3. Deve abrir a lista de imóveis
```

---

## 🧪 TESTE 1: Criar Novo Imóvel (2 minutos)

### **Passo 1: Iniciar wizard**
```
1. Clique em "+ Nova Acomodação"
2. Wizard deve abrir
3. Deve mostrar Step 1: "Tipo e Identificação"
```

### **Passo 2: Preencher Step 1**
```
✏️ Nome interno: "Teste Backend Completo"
✏️ Código: "TEST001"
✏️ Tipo de imóvel: Apartamento
✏️ Tipo de anúncio: Lugar inteiro
✏️ Modalidade: [x] Aluguel por temporada

✅ Clique em "Próximo"
```

### **Passo 3: Preencher Step 2**
```
✏️ País: Brasil
✏️ Estado: RJ
✏️ Cidade: Rio de Janeiro
✏️ Bairro: Copacabana
✏️ Rua: Av. Atlântica
✏️ Número: 1500

✅ Clique em "Próximo"
```

### **Passo 4: Navegar steps financeiros**
```
1. Clique em "Financeiro" no menu lateral
2. Deve abrir Step 8: "Configuração de Relacionamento"
3. ⚠️ IMPORTANTE: Verifique se a página carrega SEM erro
```

### **Passo 5: Testar Step 8 (o que causava erro)**
```
✏️ Data de Cadastro: Selecione uma data
[x] É sublocação?: Não
[x] Contrato exclusivo?: Sim

✅ Clique em "Próximo"
```

### **Passo 6: Testar Step 11 (Precificação)**
```
1. Vá para Step 11: "Precificação Individual"
2. ✏️ Preço base por noite: 500
3. ✏️ Moeda: BRL
4. ✅ Clique em "Próximo"
```

### **Passo 7: Salvar**
```
1. Clique em "Salvar" ou "Finalizar"
2. ✅ Deve salvar sem erro
3. ✅ Deve voltar para lista de imóveis
4. ✅ Deve mostrar toast: "Propriedade criada com sucesso!"
```

---

## 🧪 TESTE 2: Editar Imóvel (2 minutos)

### **Passo 1: Abrir imóvel criado**
```
1. Na lista de imóveis
2. Encontre "Teste Backend Completo"
3. Clique em "Editar" (ícone de lápis)
4. Wizard deve abrir com os dados salvos
```

### **Passo 2: Navegar para Step 11**
```
1. Menu lateral → "Financeiro"
2. Clique em "Precificação Individual de Temporada"
3. ✅ Deve mostrar o preço 500 que você digitou antes
```

### **Passo 3: Atualizar campo**
```
✏️ Preço base por noite: Mude para 600
✅ Clique em "Salvar"
```

### **Passo 4: Verificar atualização**
```
1. Feche o wizard
2. Abra novamente o mesmo imóvel
3. Vá para Step 11
4. ✅ Deve mostrar 600 (valor atualizado)
```

---

## ✅ CHECKLIST DE SUCESSO

Marque [x] conforme você completa:

### **Criação:**
- [ ] Wizard abre sem erro
- [ ] Step 1 funciona
- [ ] Step 2 funciona
- [ ] Steps financeiros carregam (8-12)
- [ ] Step 11 aceita preço base
- [ ] Salva sem erro
- [ ] Toast de sucesso aparece
- [ ] Volta para lista de imóveis

### **Edição:**
- [ ] Wizard abre com dados salvos
- [ ] Navega entre steps sem erro
- [ ] Step 11 mostra preço salvo
- [ ] Atualiza preço com sucesso
- [ ] Fecha e reabre mantém dados

### **Backend:**
- [ ] Nenhum erro no console do navegador (F12)
- [ ] Nenhum erro 404
- [ ] Não vai para página "Not Found"
- [ ] AutoSave funciona (ícone no canto)

---

## 🐛 SE ALGO DER ERRADO

### **Erro 1: Wizard vai para "Not Found"**
```
CAUSA: Rota inexistente ou erro de navegação
SOLUÇÃO:
1. Clique no botão laranja 🏠 (canto inferior direito)
2. Volte para dashboard
3. Tente novamente
4. Se persistir, reporte o erro
```

### **Erro 2: Campos não salvam**
```
CAUSA: Possível erro no backend
SOLUÇÃO:
1. Abra Console (F12)
2. Veja se há erros em vermelho
3. Copie o erro
4. Reporte com screenshot
```

### **Erro 3: Step 11 não aceita preço**
```
CAUSA: Possível validação incorreta
SOLUÇÃO:
1. Tente valor numérico puro: 500
2. Não use R$, vírgula ou ponto
3. Apenas números inteiros
```

### **Erro 4: Console mostra erro 500**
```
CAUSA: Erro no backend ao salvar
SOLUÇÃO:
1. Copie o erro completo
2. Veja a aba "Network" no F12
3. Encontre a request que deu erro
4. Copie o response body
5. Reporte o erro completo
```

---

## 📊 LOGS ÚTEIS

### **Antes de testar, abra o Console:**
```
1. Pressione F12
2. Vá para aba "Console"
3. Deixe aberto durante os testes
```

### **O que você deve ver:**
```
✅ [INFO] Creating property...
✅ [INFO] Property created: prop_xxx
✅ [INFO] Updating property: prop_xxx
✅ [INFO] Property updated: prop_xxx
```

### **O que NÃO deve ver:**
```
❌ 404 Not Found
❌ 500 Internal Server Error
❌ ValidationError: ...
❌ Failed to fetch
```

---

## 🎯 TESTE AVANÇADO (Opcional - 3 minutos)

Se quiser testar TODOS os campos novos:

### **1. Cômodos (Step 3):**
```
1. Vá para Step 3: "Cômodos"
2. Adicione um quarto
3. Configure tipo de cama, amenidades
4. Salve
5. ✅ Deve salvar array de rooms
```

### **2. Descrição (Step 7):**
```
1. Vá para Step 7: "Descrição"
2. Adicione destaques: "Vista mar", "Wi-Fi"
3. Preencha regras da casa
4. Salve
5. ✅ Deve salvar highlights
```

### **3. Configurações Sazonais (Step 10):**
```
1. Vá para Step 10: "Configuração de preço temporada"
2. Configure taxa de limpeza: R$ 150
3. Configure taxa de pet: R$ 50
4. Salve
5. ✅ Deve salvar seasonalPricing
```

### **4. Preços Avançados (Step 11):**
```
1. Vá para Step 11
2. Ative "Períodos Sazonais"
3. Adicione período: "Verão 2025"
4. Configure preço: R$ 800
5. Salve
6. ✅ Deve salvar advancedPricing
```

### **5. Preços Derivados (Step 12):**
```
1. Vá para Step 12: "Preços Derivados"
2. Ative "Preço varia por hóspedes"
3. Configure taxa por hóspede extra: R$ 50
4. Salve
5. ✅ Deve salvar derivedPricing
```

### **6. Regras (Step 13):**
```
1. Vá para Step 13: "Regras de Hospedagem"
2. Configure check-in: 15:00
3. Configure check-out: 11:00
4. Marque [x] Aceita pets
5. Salve
6. ✅ Deve salvar rules
```

---

## 📝 RELATÓRIO DE TESTE

### **Após testar, preencha:**

```
TESTE REALIZADO EM: [DATA/HORA]
NAVEGADOR: [Chrome/Firefox/Safari]
VERSÃO: v1.0.103.264

RESULTADOS:
[ ] ✅ Todos os testes passaram
[ ] ⚠️ Alguns testes falharam (especifique abaixo)
[ ] ❌ Muitos erros (descreva abaixo)

OBSERVAÇÕES:
_______________________________________
_______________________________________
_______________________________________

ERROS ENCONTRADOS:
_______________________________________
_______________________________________
_______________________________________
```

---

## 🎉 SUCESSO!

Se todos os testes passaram:

```
✅ Backend está 100% funcional
✅ Wizard navega sem erros
✅ Dados são salvos corretamente
✅ Dados são carregados corretamente
✅ AutoSave funciona
✅ Merge profundo funciona

🎯 SISTEMA PRONTO PARA USO!
```

---

## 🔄 PRÓXIMO PASSO

Se tudo funcionou:
1. ✅ Use o sistema normalmente
2. ✅ Preencha imóveis reais
3. ✅ Teste todos os steps
4. ✅ Reporte qualquer comportamento estranho

Se algo falhou:
1. 🐛 Copie os logs do console
2. 🐛 Tire screenshots do erro
3. 🐛 Descreva exatamente o que fez
4. 🐛 Reporte para correção

---

**TEMPO TOTAL DE TESTE:** 5-10 minutos  
**DIFICULDADE:** ⭐ Fácil  
**VERSÃO:** v1.0.103.264  
**DATA:** 03 NOV 2025

**BOA SORTE! 🚀**
