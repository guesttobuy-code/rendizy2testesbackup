# 📋 GUIA COMPLETO: Cadastro de Imóvel Real do Zero

## 🎯 OBJETIVO

Testar TODO o fluxo de cadastro de um imóvel real, validando **BOTÃO POR BOTÃO** cada funcionalidade do PropertyEditWizard.

---

## 🗑️ PASSO 1: RESET DO BANCO (5 minutos)

### 1.1 Acessar Ferramenta de Reset

**DUAS OPÇÕES:**

#### Opção A: Via API Direta (Recomendado)

```bash
# 1. Verificar status atual
curl -X GET "https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-67caf26a/reset/status" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# 2. Fazer reset completo
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-67caf26a/reset/confirm" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "confirmation": "DELETE_ALL_DATA",
    "organizationId": "SEU_ORG_ID"
  }'
```

#### Opção B: Via Interface Web

1. Adicione a rota no `AppRouter.tsx`:

```typescript
import DatabaseResetTool from './components/DatabaseResetTool';

// Adicionar rota:
<Route path="/admin/reset-database" element={<DatabaseResetTool />} />
```

2. Acesse: `https://suacasaavenda.com.br/admin/reset-database`
3. Clique em "Verificar Status"
4. Digite `DELETE_ALL_DATA` no campo
5. Clique em "DELETAR TODOS OS DADOS"

### ✅ RESULTADO ESPERADO

- ✅ Banco de dados limpo
- ✅ Sem propriedades, reservas, clientes
- ✅ Organização preservada
- ✅ Usuários preservados
- ✅ Redirecionamento para dashboard

---

## 📝 PASSO 2: PREPARAR DADOS DO IMÓVEL REAL (10 minutos)

Antes de iniciar, tenha em mãos:

### 📸 FOTOS
- [ ] **Mínimo 5 fotos** de alta qualidade
- [ ] Foto principal (fachada/área externa)
- [ ] Fotos de quartos
- [ ] Fotos de banheiros
- [ ] Fotos de áreas comuns
- [ ] Fotos de comodidades especiais

### 📍 LOCALIZAÇÃO
- [ ] **Endereço completo**
  - CEP
  - Rua/Avenida
  - Número
  - Complemento (opcional)
  - Bairro
  - Cidade
  - Estado
  - País

### 🏠 CARACTERÍSTICAS
- [ ] **Tipo de propriedade** (Apartamento, Casa, etc)
- [ ] **Categoria** (Residencial, Temporada, Comercial)
- [ ] **Quartos** (quantidade + detalhes)
- [ ] **Banheiros** (quantidade + tipo)
- [ ] **Área total** (m²)
- [ ] **Capacidade** (número de hóspedes)

### 💰 FINANCEIRO
- [ ] **Proprietário/Titular**
- [ ] **Comissão da imobiliária** (%)
- [ ] **Preço base por noite** (R$)
- [ ] **Taxa de limpeza** (R$)
- [ ] **Preços sazonais** (se houver)
- [ ] **Descontos por permanência** (semanal/mensal)

### 🛡️ REGRAS
- [ ] **Check-in** (horário)
- [ ] **Check-out** (horário)
- [ ] **Permite pets?**
- [ ] **Permite fumar?**
- [ ] **Permite festas/eventos?**
- [ ] **Estadia mínima** (noites)

---

## 🧪 PASSO 3: TESTAR WIZARD - BLOCO 1: CONTEÚDO (45 minutos)

### STEP 1: Tipo de Anúncio

**📍 ROTA:** `/properties/new` → Step 1

**🎯 O QUE TESTAR:**

1. **Seleção de Tipo**
   - [ ] Clicar em cada tipo (Apartamento, Casa, Flat, etc)
   - [ ] Verificar se o card fica destacado ao selecionar
   - [ ] Trocar de tipo várias vezes
   - [ ] Verificar se o último selecionado fica destacado

2. **Seleção de Categoria**
   - [ ] Selecionar "Residencial" - verificar campos
   - [ ] Selecionar "Temporada" - verificar campos
   - [ ] Selecionar "Comercial" - verificar campos
   - [ ] Voltar para "Temporada" (padrão para teste)

3. **Campos Básicos**
   - [ ] **Nome do Anúncio** - digitar nome real
   - [ ] **Código Interno** - auto-gerado ou manual
   - [ ] Verificar se aceita caracteres especiais
   - [ ] Verificar limite de caracteres

4. **Botão "Próximo"**
   - [ ] Clicar sem preencher - deve mostrar erro
   - [ ] Preencher e clicar - deve avançar para Step 2
   - [ ] Verificar se dados ficam salvos ao voltar

**✅ VALIDAÇÃO:**
```
✅ Tipo selecionado: [ ]
✅ Categoria selecionada: [ ]
✅ Nome preenchido: [ ]
✅ Código gerado: [ ]
✅ Avançou para Step 2: [ ]
✅ Dados salvos (voltar e verificar): [ ]
```

---

### STEP 2: Localização

**📍 ROTA:** `/properties/new` → Step 2

**🎯 O QUE TESTAR:**

1. **Busca de CEP**
   - [ ] Digitar CEP válido
   - [ ] Clicar em "Buscar CEP"
   - [ ] Verificar se preenche automaticamente:
     - [ ] Rua/Avenida
     - [ ] Bairro
     - [ ] Cidade
     - [ ] Estado
     - [ ] País

2. **Preenchimento Manual** (se CEP falhar)
   - [ ] **Rua/Avenida** - digitar manualmente
   - [ ] **Número** - adicionar número
   - [ ] **Complemento** - adicionar apto/bloco
   - [ ] **Bairro** - digitar bairro
   - [ ] **Cidade** - digitar cidade
   - [ ] **Estado** - selecionar dropdown
   - [ ] **País** - Brasil (padrão)

3. **Coordenadas GPS** (opcional)
   - [ ] Latitude - preencher se souber
   - [ ] Longitude - preencher se souber
   - [ ] Verificar se aceita números negativos
   - [ ] Verificar se aceita decimais

4. **Botões de Navegação**
   - [ ] Botão "Voltar" - volta para Step 1
   - [ ] Botão "Próximo" - avança para Step 3
   - [ ] Verificar se salva automaticamente

**✅ VALIDAÇÃO:**
```
✅ CEP buscado: [ ]
✅ Endereço preenchido: [ ]
✅ Campos obrigatórios OK: [ ]
✅ Navegação funciona: [ ]
✅ Auto-save funcionando: [ ]
```

---

### STEP 3: Cômodos e Espaços

**📍 ROTA:** `/properties/new` → Step 3

**🎯 O QUE TESTAR:**

1. **Quartos**
   - [ ] Clicar em "Adicionar Quarto"
   - [ ] Preencher:
     - [ ] Nome (ex: "Quarto Casal 1")
     - [ ] Tipo de cama (Casal, Solteiro, King)
     - [ ] Quantidade de camas
     - [ ] Número de hóspedes
   - [ ] Adicionar múltiplos quartos (testar 3-5 quartos)
   - [ ] Editar um quarto existente
   - [ ] Deletar um quarto
   - [ ] Verificar se a contagem atualiza

2. **Banheiros**
   - [ ] Campo numérico - digitar quantidade
   - [ ] Selecionar tipo:
     - [ ] Privativo
     - [ ] Compartilhado
     - [ ] Suíte
   - [ ] Verificar se aceita decimais (ex: 1.5)

3. **Capacidade Total**
   - [ ] Verificar se calcula automaticamente
   - [ ] Editar manualmente se necessário
   - [ ] Testar valores extremos (1, 50, 100)

4. **Área Total**
   - [ ] Digitar área em m²
   - [ ] Verificar se aceita decimais
   - [ ] Testar valores realistas (40-500 m²)

**✅ VALIDAÇÃO:**
```
✅ Adicionou quartos: [ ]
✅ Editou quarto: [ ]
✅ Deletou quarto: [ ]
✅ Banheiros configurados: [ ]
✅ Capacidade calculada: [ ]
✅ Área preenchida: [ ]
```

---

### STEP 4: Comodidades da Localização

**📍 ROTA:** `/properties/new` → Step 4

**🎯 O QUE TESTAR:**

1. **Categorias de Comodidades**
   - [ ] **Acesso e Transporte**
     - [ ] Aeroporto próximo
     - [ ] Estação de metrô
     - [ ] Ponto de ônibus
     - [ ] Estacionamento público
   
   - [ ] **Alimentação e Bebidas**
     - [ ] Restaurantes próximos
     - [ ] Supermercados
     - [ ] Padarias
     - [ ] Farmácias
   
   - [ ] **Lazer e Entretenimento**
     - [ ] Praia (distância)
     - [ ] Parques
     - [ ] Shopping centers
     - [ ] Cinemas/teatros
   
   - [ ] **Serviços**
     - [ ] Hospitais
     - [ ] Bancos
     - [ ] Correios

2. **Funcionalidades**
   - [ ] Selecionar múltiplas comodidades
   - [ ] Desselecionar uma comodidade
   - [ ] Usar busca para filtrar
   - [ ] Verificar se badges aparecem
   - [ ] Limpar seleção completa

3. **Distâncias** (se aplicável)
   - [ ] Adicionar distância em metros
   - [ ] Adicionar tempo de caminhada

**✅ VALIDAÇÃO:**
```
✅ Selecionou comodidades: [ ]
✅ Busca funcionou: [ ]
✅ Badges aparecem: [ ]
✅ Distâncias adicionadas: [ ]
```

---

### STEP 5: Comodidades do Imóvel

**📍 ROTA:** `/properties/new` → Step 5

**🎯 O QUE TESTAR:**

1. **Categorias de Amenidades**
   - [ ] **Essenciais**
     - [ ] Wi-Fi
     - [ ] Ar condicionado
     - [ ] Aquecimento
     - [ ] TV
   
   - [ ] **Cozinha**
     - [ ] Geladeira
     - [ ] Fogão
     - [ ] Micro-ondas
     - [ ] Máquina de café
     - [ ] Utensílios completos
   
   - [ ] **Área Externa**
     - [ ] Piscina
     - [ ] Churrasqueira
     - [ ] Jardim
     - [ ] Varanda
   
   - [ ] **Segurança**
     - [ ] Portaria 24h
     - [ ] Câmeras
     - [ ] Alarme
     - [ ] Cofre

2. **Seleção em Massa**
   - [ ] Selecionar todas de uma categoria
   - [ ] Desselecionar todas
   - [ ] Selecionar mix de categorias

3. **Destaques**
   - [ ] Marcar amenidades como "destaque"
   - [ ] Verificar se aparecem com estrela
   - [ ] Máximo de 5 destaques (testar limite)

**✅ VALIDAÇÃO:**
```
✅ Amenidades selecionadas: [ ]
✅ Destaques marcados (max 5): [ ]
✅ Categorias organizadas: [ ]
```

---

### STEP 6: Fotos

**📍 ROTA:** `/properties/new` → Step 6

**🎯 O QUE TESTAR:**

1. **Upload de Fotos**
   - [ ] Clicar em "Adicionar Fotos"
   - [ ] Selecionar 1 foto - aguardar upload
   - [ ] Verificar preview da foto
   - [ ] Selecionar múltiplas fotos de uma vez
   - [ ] Testar diferentes formatos:
     - [ ] JPG
     - [ ] PNG
     - [ ] WEBP
   - [ ] Testar diferentes tamanhos (pequeno, médio, grande)

2. **Organização**
   - [ ] **Drag & Drop** - arrastar fotos para reordenar
   - [ ] **Foto Principal** - marcar primeira como principal
   - [ ] **Trocar foto principal** - selecionar outra
   - [ ] Verificar se estrela ⭐ aparece na principal

3. **Edição**
   - [ ] Adicionar título/descrição em uma foto
   - [ ] Adicionar categoria (Quarto, Cozinha, etc)
   - [ ] Deletar uma foto
   - [ ] Confirmar exclusão

4. **Validações**
   - [ ] Tentar avançar sem fotos - deve alertar
   - [ ] Mínimo de 5 fotos recomendadas
   - [ ] Verificar se comprime fotos grandes
   - [ ] Verificar progresso de upload

**✅ VALIDAÇÃO:**
```
✅ Fotos enviadas: [ ] / 5 mínimo
✅ Foto principal marcada: [ ]
✅ Fotos reordenadas: [ ]
✅ Categorias adicionadas: [ ]
✅ Delete funcionou: [ ]
```

---

### STEP 7: Descrição

**📍 ROTA:** `/properties/new` → Step 7

**🎯 O QUE TESTAR:**

1. **Título do Anúncio**
   - [ ] Digitar título atrativo (50-100 caracteres)
   - [ ] Verificar contador de caracteres
   - [ ] Testar caracteres especiais
   - [ ] Testar emojis 🏠🌟

2. **Descrição Detalhada**
   - [ ] Escrever descrição completa (mínimo 200 caracteres)
   - [ ] Usar quebras de linha
   - [ ] Usar listas com bullet points
   - [ ] Destacar características únicas
   - [ ] Verificar preview da formatação

3. **Descrição Curta** (opcional)
   - [ ] Escrever resumo (até 150 caracteres)
   - [ ] Usar para destaque em listagens

4. **Tags/Palavras-chave**
   - [ ] Adicionar tags relevantes
   - [ ] Ex: "piscina", "pet-friendly", "vista-mar"
   - [ ] Máximo de 10 tags

5. **Idiomas** (se multi-idioma)
   - [ ] Português (obrigatório)
   - [ ] Inglês (opcional)
   - [ ] Espanhol (opcional)

**✅ VALIDAÇÃO:**
```
✅ Título preenchido: [ ]
✅ Descrição detalhada (200+ chars): [ ]
✅ Tags adicionadas: [ ]
✅ Preview OK: [ ]
```

---

## 🧪 PASSO 4: TESTAR WIZARD - BLOCO 2: FINANCEIRO (40 minutos)

### STEP 8: Configuração de Relacionamento

**📍 ROTA:** `/properties/new` → Step 8 (Financial)

**🎯 O QUE TESTAR:**

1. **Titular da Propriedade**
   - [ ] Selecionar proprietário existente OU
   - [ ] Clicar em "Novo Proprietário"
   - [ ] Preencher dados:
     - [ ] Nome completo
     - [ ] CPF/CNPJ
     - [ ] E-mail
     - [ ] Telefone
     - [ ] Endereço

2. **Modalidade Contratual**
   - [ ] **Administração** - imobiliária administra
   - [ ] **Locação** - aluguel longa duração
   - [ ] **Sublocação** - subloca de terceiro
   - [ ] Verificar campos condicionais para cada tipo

3. **Remuneração da Imobiliária**
   - [ ] Tipo de comissão:
     - [ ] Percentual (%) - testar 10-30%
     - [ ] Valor Fixo (R$) - testar valores
     - [ ] Misto - % + Fixo
   - [ ] Verificar cálculo do valor total

4. **Configurações de Comunicação**
   - [ ] Email do proprietário - preencher
   - [ ] Telefone do proprietário - preencher
   - [ ] WhatsApp - marcar se disponível
   - [ ] Preferência de contato

**✅ VALIDAÇÃO:**
```
✅ Proprietário cadastrado: [ ]
✅ Modalidade selecionada: [ ]
✅ Comissão configurada: [ ]
✅ Contatos preenchidos: [ ]
```

---

### STEP 9: Preços Locação e Venda

**📍 ROTA:** `/properties/new` → Step 9

**🎯 O QUE TESTAR:**

1. **Locação Residencial**
   - [ ] Valor do aluguel mensal (R$)
   - [ ] Valor do condomínio (R$)
   - [ ] IPTU mensal (R$)
   - [ ] Seguro incêndio (R$)
   - [ ] Total (cálculo automático)

2. **Venda**
   - [ ] Valor de venda (R$)
   - [ ] Aceita financiamento?
   - [ ] Aceita permuta?
   - [ ] Documentação regularizada?

3. **Moeda**
   - [ ] Selecionar BRL (padrão)
   - [ ] Testar USD
   - [ ] Testar EUR
   - [ ] Verificar se converte

**✅ VALIDAÇÃO:**
```
✅ Aluguel configurado: [ ]
✅ Venda configurada: [ ]
✅ Cálculos corretos: [ ]
```

---

### STEP 10: Configuração de Preço Temporada

**📍 ROTA:** `/properties/new` → Step 10

**🎯 O QUE TESTAR:**

1. **Modo de Configuração**
   - [ ] **Global** - herda configurações gerais
   - [ ] **Individual** - personalizado
   - [ ] Alternar entre os dois modos

2. **Taxas de Serviço** (se Individual)
   - [ ] **Taxa de Limpeza**
     - [ ] Valor (R$)
     - [ ] Quem paga: Hóspede / Proprietário / Dividido
     - [ ] Por reserva ou por hóspede
   
   - [ ] **Taxa de Pet**
     - [ ] Valor (R$)
     - [ ] Quem paga
     - [ ] Por pet ou fixa
   
   - [ ] **Serviços Extras**
     - [ ] Valor (R$)
     - [ ] Descrição

3. **Política de Depósito**
   - [ ] Valor do depósito/caução (R$)
   - [ ] Forma de pagamento
   - [ ] Prazo de devolução (dias)

4. **Descontos por Permanência**
   - [ ] Desconto semanal (% - ex: 10%)
   - [ ] Desconto mensal (% - ex: 20%)
   - [ ] Desconto longa temporada (% - ex: 30%)

**✅ VALIDAÇÃO:**
```
✅ Modo selecionado: [ ]
✅ Taxas configuradas: [ ]
✅ Descontos definidos: [ ]
✅ Depósito configurado: [ ]
```

---

### STEP 11: Precificação Individual de Temporada ⚠️ (PROBLEMA IDENTIFICADO)

**📍 ROTA:** `/properties/new` → Step 11

**🎯 O QUE TESTAR:**

1. **Modo de Precificação**
   - [ ] Clicar em "Global" - verificar conteúdo
     - [ ] ✅ Deve mostrar preview de configurações
     - [ ] ✅ Card com 4 itens listados
     - [ ] ✅ Alert azul com CTA
   - [ ] Clicar em "Individual" - verificar formulário
     - [ ] ✅ Deve mostrar formulário completo

2. **Preço Base** (se Individual)
   - [ ] Digitar preço por noite (R$)
   - [ ] Selecionar moeda (BRL/USD/EUR)
   - [ ] Verificar se aceita decimais

3. **Descontos por Permanência**
   - [ ] Ativar toggle "Descontos"
   - [ ] Desconto semanal (%)
   - [ ] Desconto mensal (%)
   - [ ] Verificar cálculo do preview

4. **Períodos Sazonais**
   - [ ] Ativar toggle "Períodos Sazonais"
   - [ ] Clicar em "Adicionar Período"
   - [ ] Preencher:
     - [ ] Nome (ex: "Alta Temporada")
     - [ ] Data início
     - [ ] Data fim
     - [ ] Preço por noite (R$)
     - [ ] Mínimo de noites
   - [ ] Adicionar múltiplos períodos
   - [ ] Editar um período
   - [ ] Deletar um período

5. **Preços por Dia da Semana**
   - [ ] Ativar toggle "Preços por Dia"
   - [ ] Preencher preço para cada dia:
     - [ ] Segunda a Quinta (semana)
     - [ ] Sexta a Sábado (fim de semana)
     - [ ] Domingo
   - [ ] Verificar se permite valores diferentes

6. **Datas Especiais**
   - [ ] Ativar toggle "Datas Especiais"
   - [ ] Clicar em "Adicionar Data"
   - [ ] Preencher:
     - [ ] Nome (ex: "Ano Novo")
     - [ ] Data específica
     - [ ] Preço (R$)
     - [ ] Mínimo de noites
   - [ ] Adicionar feriados/eventos importantes

**⚠️ VALIDAÇÃO CRÍTICA:**
```
✅ Modo Global mostra conteúdo: [ ]
✅ Modo Individual mostra formulário: [ ]
✅ NÃO está tela em branco: [ ]
✅ Períodos sazonais funcionam: [ ]
✅ Datas especiais funcionam: [ ]
```

**❌ SE TELA EM BRANCO:**
```
1. Abrir F12 → Console
2. Copiar TODOS os erros
3. Verificar se Sparkles está importado
4. Usar componente de teste (.test.tsx)
```

---

### STEP 12: Preços Derivados

**📍 ROTA:** `/properties/new` → Step 12

**🎯 O QUE TESTAR:**

1. **Preços por Número de Hóspedes**
   - [ ] Ativar toggle "Varia por hóspedes"
   - [ ] Definir máximo de hóspedes inclusos (ex: 2)
   - [ ] **Taxa por hóspede extra:**
     - [ ] Tipo: Percentual (%) ou Fixo (R$)
     - [ ] Valor
   - [ ] Verificar cálculo no preview

2. **Taxas para Crianças**
   - [ ] Ativar toggle "Cobrar por crianças"
   - [ ] **Tipo de cobrança:**
     - [ ] Por noite
     - [ ] Taxa única
   - [ ] **Faixas Etárias:**
     - [ ] Clicar em "Adicionar Faixa"
     - [ ] Idade mínima (ex: 0)
     - [ ] Idade máxima (ex: 2)
     - [ ] Taxa (R$ ou %)
     - [ ] Adicionar múltiplas faixas:
       - [ ] 0-2 anos (bebê)
       - [ ] 3-7 anos (criança)
       - [ ] 8-12 anos (pré-adolescente)

3. **Preview de Cálculo**
   - [ ] Verificar cálculo para cenários:
     - [ ] 2 adultos (preço base)
     - [ ] 4 adultos (base + 2 extras)
     - [ ] 2 adultos + 2 crianças

**✅ VALIDAÇÃO:**
```
✅ Taxa hóspede extra configurada: [ ]
✅ Faixas etárias criadas: [ ]
✅ Cálculos corretos: [ ]
✅ Preview atualiza: [ ]
```

---

## 🧪 PASSO 5: TESTAR WIZARD - BLOCO 3: CONFIGURAÇÕES (30 minutos)

### STEP 13: Regras de Hospedagem

**📍 ROTA:** `/properties/new` → Step 13 (Settings)

**🎯 O QUE TESTAR:**

1. **Check-in / Check-out**
   - [ ] **Check-in:**
     - [ ] Horário início (ex: 14:00)
     - [ ] Horário fim (ex: 22:00)
     - [ ] Check-in automático disponível?
     - [ ] Instruções especiais
   - [ ] **Check-out:**
     - [ ] Horário (ex: 11:00)
     - [ ] Checkout tardio disponível?
     - [ ] Taxa adicional (R$)

2. **Políticas de Reserva**
   - [ ] **Estadia Mínima:**
     - [ ] Dias de semana (noites)
     - [ ] Fins de semana (noites)
     - [ ] Alta temporada (noites)
   - [ ] **Estadia Máxima:**
     - [ ] Limite de noites (opcional)

3. **Regras da Casa**
   - [ ] **Pets:**
     - [ ] Permite? Sim/Não
     - [ ] Tipos permitidos (cão, gato)
     - [ ] Tamanho máximo
     - [ ] Taxa adicional
   - [ ] **Fumo:**
     - [ ] Permite? Sim/Não/Apenas áreas externas
   - [ ] **Festas/Eventos:**
     - [ ] Permite? Sim/Não/Com autorização
     - [ ] Limite de pessoas
   - [ ] **Crianças:**
     - [ ] Adequado para crianças?
     - [ ] Berço disponível?
     - [ ] Cadeira alta disponível?

4. **Políticas de Cancelamento**
   - [ ] **Tipo:**
     - [ ] Flexível (até 24h antes)
     - [ ] Moderada (até 5 dias antes)
     - [ ] Rígida (até 14 dias antes)
     - [ ] Super rígida (não reembolsável)
   - [ ] **Reembolso:**
     - [ ] Percentual por período
     - [ ] Taxa administrativa

**✅ VALIDAÇÃO:**
```
✅ Check-in/out configurado: [ ]
✅ Estadia mínima definida: [ ]
✅ Regras da casa OK: [ ]
✅ Política de cancelamento: [ ]
```

---

### STEP 14: Configurações de Reserva

**📍 ROTA:** `/properties/new` → Step 14

**🎯 O QUE TESTAR:**

1. **Aceitação de Reservas**
   - [ ] **Modo:**
     - [ ] Aceitar instantaneamente
     - [ ] Requer aprovação
     - [ ] Apenas cotação
   - [ ] **Antecedência Mínima:**
     - [ ] Horas (ex: 24h)
     - [ ] Dias (ex: 2 dias)
   - [ ] **Antecedência Máxima:**
     - [ ] Meses (ex: 12 meses)

2. **Disponibilidade**
   - [ ] **Sempre disponível** OU
   - [ ] **Períodos específicos:**
     - [ ] Data início
     - [ ] Data fim
     - [ ] Repetir anualmente?

3. **Bloqueios Automáticos**
   - [ ] **Bloquear dias entre reservas?**
     - [ ] Sim/Não
     - [ ] Quantidade de dias (ex: 1 dia)
   - [ ] **Bloquear períodos de manutenção?**
     - [ ] Recorrência mensal

**✅ VALIDAÇÃO:**
```
✅ Modo de aceite definido: [ ]
✅ Antecedências configuradas: [ ]
✅ Disponibilidade OK: [ ]
✅ Bloqueios configurados: [ ]
```

---

### STEP 15: Tags e Grupos

**📍 ROTA:** `/properties/new` → Step 15

**🎯 O QUE TESTAR:**

1. **Tags Personalizadas**
   - [ ] Clicar em "Adicionar Tag"
   - [ ] Digitar tag (ex: "Luxo")
   - [ ] Pressionar Enter
   - [ ] Adicionar múltiplas tags:
     - [ ] Categoria (Luxo, Econômico, etc)
     - [ ] Localização (Praia, Centro, etc)
     - [ ] Características (Vista Mar, Piscina, etc)
   - [ ] Remover uma tag

2. **Grupos de Propriedades**
   - [ ] Selecionar grupo existente OU
   - [ ] Criar novo grupo
   - [ ] Exemplos:
     - [ ] "Portfólio Premium"
     - [ ] "Condomínio X"
     - [ ] "Zona Sul"

3. **Status do Anúncio**
   - [ ] **Ativo** - disponível para reservas
   - [ ] **Inativo** - não aparece em buscas
   - [ ] **Rascunho** - ainda não publicado
   - [ ] **Manutenção** - temporariamente indisponível

**✅ VALIDAÇÃO:**
```
✅ Tags criadas: [ ]
✅ Grupo selecionado: [ ]
✅ Status definido: [ ]
```

---

### STEP 16: iCal e Sincronização

**📍 ROTA:** `/properties/new` → Step 16

**🎯 O QUE TESTAR:**

1. **Importar Calendário**
   - [ ] Clicar em "Adicionar Calendário"
   - [ ] Colar URL do iCal (Airbnb/Booking.com)
   - [ ] Nomear a integração
   - [ ] Definir frequência de sincronização:
     - [ ] Manual
     - [ ] A cada hora
     - [ ] A cada 6 horas
     - [ ] Diária
   - [ ] Salvar e testar sincronização

2. **Exportar Calendário**
   - [ ] Copiar URL do iCal do Rendizy
   - [ ] Instruções de uso em outras plataformas
   - [ ] Verificar se URL está ativa

3. **Gerenciar Integrações**
   - [ ] Ver lista de calendários conectados
   - [ ] Editar uma integração
   - [ ] Pausar sincronização
   - [ ] Remover integração

**✅ VALIDAÇÃO:**
```
✅ Calendário importado: [ ]
✅ URL exportação gerada: [ ]
✅ Sincronização testada: [ ]
```

---

### STEP 17: Integrações OTAs

**📍 ROTA:** `/properties/new` → Step 17

**🎯 O QUE TESTAR:**

1. **Booking.com**
   - [ ] Ativar integração
   - [ ] Inserir Property ID
   - [ ] Testar conexão
   - [ ] Sincronizar preços
   - [ ] Sincronizar disponibilidade

2. **Airbnb**
   - [ ] Ativar integração
   - [ ] OAuth ou API Key
   - [ ] Testar conexão

3. **Outras OTAs**
   - [ ] Expedia
   - [ ] Decolar
   - [ ] TripAdvisor

4. **Configurações de Sincronização**
   - [ ] Sincronizar preços automaticamente?
   - [ ] Sincronizar disponibilidade?
   - [ ] Sincronizar descrições?
   - [ ] Frequência de sync

**✅ VALIDAÇÃO:**
```
✅ OTA conectada: [ ]
✅ Sincronização testada: [ ]
✅ Configurações OK: [ ]
```

---

## 🎯 PASSO 6: FINALIZAÇÃO E SALVAMENTO (10 minutos)

### Salvar Propriedade

1. **Revisão Final**
   - [ ] Revisar todos os 17 steps
   - [ ] Verificar campos obrigatórios
   - [ ] Verificar alertas de validação

2. **Botão "Salvar"**
   - [ ] Clicar em "Salvar e Publicar"
   - [ ] Aguardar confirmação
   - [ ] Verificar toast de sucesso
   - [ ] Verificar redirecionamento

3. **Verificar Propriedade Salva**
   - [ ] Ir para "Propriedades"
   - [ ] Localizar o imóvel na lista
   - [ ] Abrir detalhes
   - [ ] Verificar se todos os dados estão corretos

4. **Testar Edição**
   - [ ] Clicar em "Editar"
   - [ ] Alterar um campo
   - [ ] Salvar
   - [ ] Verificar se alteração foi persistida

---

## ✅ CHECKLIST FINAL DE VALIDAÇÃO

### Funcionalidades Gerais

- [ ] **Auto-save** funcionando
- [ ] **Navegação** entre steps OK
- [ ] **Validações** de campos obrigatórios
- [ ] **Mensagens de erro** claras
- [ ] **Loading states** apropriados
- [ ] **Responsividade** mobile OK

### Dados Persistidos

- [ ] **Tipo e categoria** salvos
- [ ] **Localização** completa
- [ ] **Cômodos** salvos
- [ ] **Comodidades** salvas
- [ ] **Fotos** uploaded e ordenadas
- [ ] **Descrição** salva
- [ ] **Financeiro** configurado
- [ ] **Regras** salvas
- [ ] **Configurações** salvas

### Performance

- [ ] **Upload de fotos** < 10s
- [ ] **Salvamento** < 2s
- [ ] **Carregamento** de steps < 1s
- [ ] **Sem memory leaks**
- [ ] **Console sem erros críticos**

---

## 📊 RELATÓRIO DE BUGS

### Template de Bug Report

```markdown
## 🐛 BUG: [Título do Bug]

**📍 Localização:**
- Step: [ ]
- Campo/Componente: [ ]

**📝 Descrição:**
[Descreva o problema]

**🔄 Passos para Reproduzir:**
1. [ ]
2. [ ]
3. [ ]

**✅ Comportamento Esperado:**
[O que deveria acontecer]

**❌ Comportamento Atual:**
[O que está acontecendo]

**🖼️ Screenshots:**
[Cole aqui]

**💻 Console Errors:**
```
[Cole os erros do console]
```

**🌐 Ambiente:**
- Navegador: [ ]
- Versão: [ ]
- Sistema: [ ]
```

---

## 🎉 CONCLUSÃO

Após completar todos os testes, você terá:

✅ **Banco de dados limpo** sem dados fictícios
✅ **Imóvel real cadastrado** completamente
✅ **Todos os 17 steps validados** funcionalmente
✅ **Bugs identificados** e documentados
✅ **Relatório completo** de funcionalidades

---

**📅 Data:** 03/11/2025
**🔖 Versão:** v1.0.103.267
**⏱️ Tempo estimado:** 2h30min
**👤 Testador:** [Seu Nome]
**📋 Status:** [ ] Não iniciado [ ] Em andamento [ ] Concluído
