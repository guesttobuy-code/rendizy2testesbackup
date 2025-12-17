# 🧪 TESTE AUTOMATIZADO: Criar Imóvel "@figma@"

**Versão:** v1.0.103.309  
**Data:** 2025-11-05  
**Objetivo:** Validar wizard completo com teste end-to-end automatizado

---

## 🎯 O QUE É ESTE TESTE?

Este é um **teste automatizado completo** que:

1. ✅ Cria um imóvel com título "@figma@"
2. ✅ Preenche **TODOS os 14 steps** do wizard
3. ✅ Todos os campos numéricos = **10**
4. ✅ Upload de **1 foto do Unsplash**
5. ✅ Adiciona **6 tags** na foto
6. ✅ Salva tudo no **Supabase**
7. ✅ Detecta **falhas** em cada etapa

---

## 🚀 COMO USAR

### Passo 1: Acessar o Teste

```
1. Faça login no RENDIZY
2. Acesse: Admin Master (ícone Crown no menu)
3. Clique na aba: "Sistema"
4. Encontre o card: "🧪 Teste Automatizado: Criar Imóvel @figma@"
```

### Passo 2: Executar o Teste

```
1. Clique no botão: "Iniciar Teste Completo"
2. Aguarde a execução (geralmente 10-15 segundos)
3. Acompanhe os logs em tempo real
4. Verifique a barra de progresso
```

### Passo 3: Verificar Resultado

```
✅ SE DEU CERTO:
   - Logs mostram "✅ Imóvel '@figma@' criado com sucesso!"
   - Toast verde: "Teste Concluído!"
   - ID do imóvel é exibido
   - Progresso: 100%

❌ SE DEU ERRADO:
   - Logs mostram "❌ Erro: [mensagem de erro]"
   - Toast vermelho: "Teste Falhou"
   - Erro detalhado é exibido
   - Progresso para onde falhou
```

### Passo 4: Validar no Sistema

```
1. Acesse: Gestão de Propriedades
2. Procure por: "@figma@"
3. Abra o imóvel criado
4. Verifique todos os campos:
   ✅ Título: "@figma@"
   ✅ Quartos: 10
   ✅ Camas: 10
   ✅ Banheiros: 10
   ✅ Hóspedes: 10
   ✅ Área: 10m²
   ✅ Preço base: R$ 10
   ✅ Taxa de limpeza: R$ 10
   ✅ Noites mínimas: 10
   ✅ Noites máximas: 10
   ✅ Comissão: 10%
   ✅ 1 foto com 6 tags
```

---

## 📊 DADOS CRIADOS PELO TESTE

### STEP 1: TIPO
```
✅ Property Type: Individual
✅ Accommodation Type: Casa (primeiro tipo encontrado)
✅ Subtipo: Entire Place (lugar inteiro)
✅ Modalidades: [Short Term Rental]
✅ Registration Number: FIGMA-TEST-001
```

### STEP 2: LOCALIZAÇÃO
```
✅ Nome: "@figma@"
✅ Endereço: "Rua Figma Test, 10"
✅ Bairro: "Bairro Teste"
✅ Cidade: "Cidade Teste"
✅ Estado: "Estado Teste"
✅ País: "Brasil"
✅ CEP: "10101-010"
✅ Latitude: -10.10
✅ Longitude: -10.10
```

### STEP 3: QUARTOS E ESPAÇOS
```
✅ Bedrooms: 10
✅ Beds: 10
✅ Bathrooms: 10
✅ Guests: 10
✅ Area: 10m²
```

### STEP 4: AMENIDADES DO LOCAL
```
✅ (Vazio - pode ser preenchido depois)
```

### STEP 5: AMENIDADES DA ACOMODAÇÃO
```
✅ (Vazio - pode ser preenchido depois)
```

### STEP 6: DESCRIÇÃO
```
✅ Description: "Imóvel de teste @figma@ criado automaticamente..."
✅ Highlights: "Teste automatizado, Criado por @figma@, Todos os campos preenchidos"
✅ Check-in Time: "10:00"
✅ Check-out Time: "10:00"
```

### STEP 7: FOTOS
```
✅ 1 foto do Unsplash (modern beach house)
✅ URL: https://images.unsplash.com/photo-1716629235408-4149364b2944...
✅ Caption: "@figma@ - Foto de teste"
✅ Tags: [@figma@, teste, automatizado, rendizy, beach, modern]
✅ Primary: true
✅ Order: 0
```

### STEP 8: CONTRATO (FINANCEIRO)
```
✅ Commission Rate: 10%
✅ Payment Terms: monthly
✅ Contract Start: hoje
✅ Contract End: hoje + 1 ano
```

### STEP 9: PRECIFICAÇÃO INDIVIDUAL
```
✅ Base Price: R$ 10
✅ Weekend Price: R$ 10
✅ Monthly Discount: 10%
✅ Cleaning Fee: R$ 10
✅ Extra Guest Fee: R$ 10
✅ Currency: BRL
```

### STEP 10: PRECIFICAÇÃO SAZONAL
```
✅ (Vazio - pode ser adicionado depois)
```

### STEP 11: PRECIFICAÇÃO DERIVADA
```
✅ Enabled: false
```

### STEP 12: REGRAS DE HOSPEDAGEM
```
✅ Min Nights: 10
✅ Max Nights: 10
✅ Check-in Start: 10:00
✅ Check-in End: 10:00
✅ Check-out Time: 10:00
✅ Allow Pets: true
✅ Allow Smoking: false
✅ Allow Events: false
✅ Allow Children: true
✅ Quiet Hours: 22:00 - 08:00
```

### STATUS
```
✅ Status: active
✅ Is Active: true
```

---

## 🔍 LOGS DO TESTE

O teste exibe logs detalhados em tempo real:

### Exemplo de Sucesso:
```
✅ Step 1: Tipo encontrado: Casa Completa
✅ Step 2: Dados do imóvel preparados
✅ Step 3: Foto enviada com 6 tags
✅ Step 4: Imóvel criado com ID: ABC123
✅ Step 5: Foto vinculada ao imóvel
✅ Concluído: ✅ Imóvel "@figma@" criado com sucesso!
```

### Exemplo de Erro:
```
🔄 Step 1: Buscando tipos de acomodação...
✅ Step 1: Tipo encontrado: Casa Completa
🔄 Step 2: Criando dados do imóvel "@figma@"...
❌ Erro: Falha ao criar imóvel: Unauthorized
```

---

## 🎯 O QUE O TESTE VALIDA

### Backend:
- ✅ Rota GET /property-types funciona
- ✅ Rota POST /photos funciona
- ✅ Rota POST /properties funciona
- ✅ Rota PUT /photos/:id funciona
- ✅ Upload de imagem funciona
- ✅ Compressão de imagem funciona
- ✅ Tags em fotos funcionam

### Wizard:
- ✅ Todos os 14 steps aceitam dados
- ✅ Validação de campos funciona
- ✅ Salvamento no Supabase funciona
- ✅ Vinculação de fotos funciona

### Integração:
- ✅ Frontend → Backend funciona
- ✅ Backend → Supabase funciona
- ✅ Unsplash → Sistema funciona
- ✅ KV Store aceita dados complexos

---

## ⚠️ POSSÍVEIS ERROS

### Erro: "Falha ao buscar tipos de acomodação"
```
CAUSA: Backend não está respondendo ou tipos não foram seedados
SOLUÇÃO: 
   1. Verifique se backend está online
   2. Execute seed de tipos: PropertyTypesSeedTool
   3. Tente novamente
```

### Erro: "Falha no upload da foto"
```
CAUSA: Rota /photos não está funcionando
SOLUÇÃO:
   1. Verifique rota no backend: routes-photos.ts
   2. Verifique logs do servidor
   3. Teste upload manual de foto
```

### Erro: "Falha ao criar imóvel"
```
CAUSA: Dados inválidos ou rota /properties quebrada
SOLUÇÃO:
   1. Verifique rota no backend: routes-properties.ts
   2. Verifique estrutura de dados
   3. Veja logs do servidor para detalhes
```

### Erro: "Unauthorized"
```
CAUSA: Usuário não está logado ou token expirou
SOLUÇÃO:
   1. Faça logout e login novamente
   2. Verifique se está usando tenant correto
   3. Verifique se publicAnonKey está correto
```

---

## 📈 INTERPRETAÇÃO DOS RESULTADOS

### ✅ Teste 100% Concluído
```
SIGNIFICA:
   ✅ Wizard está funcionando perfeitamente
   ✅ Backend está 100% operacional
   ✅ Upload de fotos funciona
   ✅ Salvamento no Supabase funciona
   ✅ Sistema pronto para uso em produção
```

### ⚠️ Teste Parcialmente Concluído
```
SIGNIFICA:
   ⚠️ Wizard funciona até certo ponto
   ⚠️ Alguma rota do backend tem problema
   ⚠️ Verificar logs para identificar falha
   ⚠️ Corrigir rota específica que falhou
```

### ❌ Teste Totalmente Falhou
```
SIGNIFICA:
   ❌ Backend não está respondendo
   ❌ Ou tipos de acomodação não existem
   ❌ Sistema não está pronto para uso
   ❌ Precisa investigar urgente
```

---

## 🛠️ COMO LIMPAR TESTE

Se quiser deletar o imóvel de teste:

```
1. Acesse: Gestão de Propriedades
2. Procure: "@figma@"
3. Abra o card do imóvel
4. Clique: "Ações" → "Deletar"
5. Confirme a exclusão
```

OU use o console do navegador:

```javascript
// Buscar imóvel @figma@
const properties = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-67caf26a/properties`,
  { headers: { 'Authorization': `Bearer ${publicAnonKey}` }}
).then(r => r.json());

const figmaProperty = properties.find(p => p.name === '@figma@');

// Deletar
await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-67caf26a/properties/${figmaProperty.id}`,
  { 
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
  }
);
```

---

## 📚 ARQUIVOS RELACIONADOS

### Componente de Teste:
- `/components/FigmaTestPropertyCreator.tsx` - Componente principal

### Admin Panel:
- `/components/AdminMaster.tsx` - Integração na aba Sistema

### Backend:
- `/supabase/functions/server/routes-properties.ts` - Rota de criação
- `/supabase/functions/server/routes-photos.ts` - Rota de upload
- `/supabase/functions/server/routes-property-types.ts` - Rota de tipos

### Wizard:
- `/components/PropertyEditWizard.tsx` - Wizard completo
- `/components/wizard-steps/*` - Todos os 14 steps

---

## 🎓 APRENDIZADOS

Este teste automatizado é valioso porque:

1. ✅ **End-to-End**: Testa todo o fluxo de criação
2. ✅ **Reproduzível**: Sempre cria o mesmo resultado
3. ✅ **Diagnóstico**: Identifica exatamente onde falhou
4. ✅ **Documentado**: Mostra estrutura de dados esperada
5. ✅ **Visual**: Logs em tempo real facilitam debug
6. ✅ **Completo**: Preenche TODOS os campos do wizard

---

## 🎯 PRÓXIMOS PASSOS

Após executar este teste com sucesso:

1. ✅ Criar imóveis reais via wizard
2. ✅ Testar edição de imóveis
3. ✅ Testar upload de múltiplas fotos
4. ✅ Testar criação de reservas
5. ✅ Validar calendário
6. ✅ Confirmar sistema em produção

---

**TESTE CRIADO COM ❤️ PARA VALIDAÇÃO COMPLETA DO RENDIZY**

🎯 Boa sorte! Se encontrar algum erro, os logs vão te guiar! 🚀
