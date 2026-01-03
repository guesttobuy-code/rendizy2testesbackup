# ⚠️ CAMPOS FALTANTES DO WIZARD

Este documento lista campos que existiam no wizard original (NovoAnuncio.WIZARD_DEPRECATED.tsx.bak) mas ainda não foram implementados no FormularioAnuncio.tsx ultimate.

**IMPORTANTE:** Estes placeholders e campos indicam funcionalidades importantes que precisam ser criadas no futuro.

---

## 📋 CAMPOS NÃO IMPLEMENTADOS

### **Step 06 - Amenidades da Acomodação**

#### 1. **Área em m² (area_m2)**
- **Descrição**: Metragem da acomodação em metros quadrados
- **Tipo**: Number input com toggle Sim/Não
- **Placeholder**: `"m²"`
- **Label**: "Área"
- **Hint**: "Qual a metragem da acomodação? Coloque apenas o número em metros quadrados"
- **@MODALIDADE**: `[TODAS]` - Relevante para aluguel e venda

```typescript
// Estado sugerido:
const [areaM2, setAreaM2] = useState<{enabled: boolean, value: string}>({
  enabled: false,
  value: ''
});
```

**Implementação no Wizard:**
```tsx
<Card>
  <CardContent className="pt-6">
    <div className="flex items-center gap-2">
      <Home className="h-5 w-5 text-blue-600" />
      <h3 className="font-semibold">Área</h3>
    </div>
    <p className="text-xs text-gray-500 mb-3">
      Qual a metragem da acomodação? Coloque apenas o número em metros quadrados
    </p>
    <div className="flex gap-2 mb-3">
      <Button variant={areaM2.enabled ? 'default' : 'outline'}>Sim</Button>
      <Button variant={!areaM2.enabled ? 'default' : 'outline'}>Não</Button>
    </div>
    {areaM2.enabled && (
      <Input
        type="number"
        placeholder="m²"
        value={areaM2.value}
        onChange={(e) => setAreaM2({ ...areaM2, value: e.target.value })}
      />
    )}
  </CardContent>
</Card>
```

---

#### 2. **Garagem Gratuita com Quantidade (garagem_gratuita)**
- **Descrição**: Indica se há garagem gratuita e quantas vagas
- **Tipo**: Toggle Sim/Não + Number input condicional
- **Placeholder**: `"Quantidade"`
- **Label**: "Garagem Gratuita"
- **@MODALIDADE**: `[TODAS]`

```typescript
// Estado sugerido:
const [garagemGratuita, setGaragemGratuita] = useState<{enabled: boolean, quantity: string}>({
  enabled: false,
  quantity: ''
});
```

**Implementação no Wizard:**
```tsx
<Card>
  <CardContent className="pt-6">
    <h3 className="font-semibold">Garagem Gratuita</h3>
    <div className="flex gap-2 mb-3">
      <Button variant={garagemGratuita.enabled ? 'default' : 'outline'}>Sim</Button>
      <Button variant={!garagemGratuita.enabled ? 'default' : 'outline'}>Não</Button>
    </div>
    {garagemGratuita.enabled && (
      <Input
        type="number"
        placeholder="Quantidade"
        value={garagemGratuita.quantity}
        onChange={(e) => setGaragemGratuita({ ...garagemGratuita, quantity: e.target.value })}
      />
    )}
  </CardContent>
</Card>
```

---

### **Step 03 - Cômodos e Espaços**

#### 3. **Tags de Cômodos Personalizadas**
- **Descrição**: Permite adicionar tags customizadas para cada cômodo (ex: "Suíte Master", "Quarto Infantil")
- **Tipo**: Input text para tags
- **Placeholder**: Não especificado no wizard, mas campo existe
- **@MODALIDADE**: `[TEMPORADA, RESIDENCIAL, VENDA]`

**Nota**: Atualmente o FormularioAnuncio tem apenas seleção de tipo de cômodo, mas não permite tags customizadas como "Suíte", "Quarto Infantil", etc.

---

### **Step 04 - Fotos**

#### 4. **Fotos do Entorno e Fachada**
- **Descrição**: Upload separado para fotos externas do imóvel
- **Hint no Wizard**: "Adicione fotos do entorno, fachada e áreas sociais do endereço. Arraste para reordenar"
- **@MODALIDADE**: `[TODAS]`

**Nota**: Atualmente existe apenas upload genérico de fotos, sem categorização entre internas/externas.

---

## 🔍 AMENIDADES DETALHADAS DO WIZARD

O wizard tinha lista expandida de amenidades com categorização. Algumas importantes:

### Amenidades de Propriedade (Property Amenities):
```javascript
[
  { id: 'area-comum', name: 'Área Comum', icon: '🏠', category: 'living' },
  { id: 'subarea', name: 'Subárea', icon: '🏗️', category: 'other' },
  // ... mais itens
]
```

### Tipos de Cômodos Sugeridos (Room Tags):
```javascript
[
  'Academia', 'Adega', 'Área Comum Externa', 'Área de Lazer', 'Área de Serviço',
  'Área de Compras', 'Área de estar', 'Área e instalações', 'Área para café / chá',
  'Sacada', 'Churrasqueira', 'Área Gourmet', 'Hidromassagem', 'Sauna',
  // ... mais itens
]
```

---

## 📝 PLACEHOLDERS IMPORTANTES JÁ IMPLEMENTADOS ✅

Estes placeholders do wizard **já foram preservados** no FormularioAnuncio:

### Step 01 - Básico:
- ✅ `title`: "Ex: Apartamento Copacabana 01"

### Step 02 - Localização:
- ✅ `estado`: "Rio de Janeiro"
- ✅ `siglaEstado`: "RJ"
- ✅ `cep`: "00000-000"
- ✅ `cidade`: (preenchido via API ViaCEP)
- ✅ `bairro`: (preenchido via API ViaCEP)
- ✅ `rua`: (preenchido via API ViaCEP)
- ✅ `numero`: "123"
- ✅ `complemento`: "Apto 201"
- ✅ `instrucoesAcesso`: "Ex: Informar ao porteiro o nome do proprietário..."

### Step 05 - Amenidades:
- ✅ Campo de busca: "Filtro para pesquisar na lista de amenidades"

### Step 06 - Amenidades da Acomodação:
- ✅ Campo de busca: "Filtro para pesquisar na lista de amenidades da acomodação"

### Step 07 - Descrições (Todos multi-line preservados):
- ✅ `sobreEspaco`: "O que torna seu espaço especial?\nO que contribuirá para que seus hóspedes se sintam confortáveis em sua acomodação?"
- ✅ `sobreAcesso`: "Seus hóspedes terão acesso liberado a todas as dependências da acomodação?\nSe for o caso, coloque também informações referentes à restrição do condomínio."
- ✅ `sobreAnfitriao`: "Como será a interação com o anfitrião durante a estada?\nHaverá contato em algum momento?"
- ✅ `descricaoBairro`: "Como é o bairro ou os arredores do seu anúncio?\nColoque sugestões sobre o que os hóspedes podem fazer por arredores do local."
- ✅ `infoLocomocao`: "Como chegar na propriedade?\nHá opções de transporte público? Estacionamento incluído no local ou nos arredores?\nQual a distância do seu anúncio em relação ao aeroporto ou as principais rodovias mais próximas?"

---

## 🎯 PRÓXIMOS PASSOS SUGERIDOS

### **Prioridade ALTA** 🔴

1. **Implementar campo área_m2** - Essencial para VENDA e útil para TEMPORADA/RESIDENCIAL
   - Adicionar no Step 06 após amenidades
   - Estado: `{enabled: boolean, value: string}`
   - Placeholder: "m²"

2. **Implementar campo garagem_gratuita com quantidade**
   - Adicionar no Step 06
   - Estado: `{enabled: boolean, quantity: string}`
   - Placeholder: "Quantidade"

### **Prioridade MÉDIA** 🟡

3. **Adicionar tags customizadas para cômodos** (Step 03)
   - Permitir adicionar texto livre como tags
   - Exemplos: "Suíte Master", "Quarto Infantil", "Home Office"

4. **Categorizar fotos** (Step 04)
   - Separar fotos internas vs externas
   - Hint específico para fotos de fachada/entorno

### **Prioridade BAIXA** 🟢

5. **Expandir lista de amenidades**
   - Adicionar categorização visual (icons)
   - Incluir amenidades faltantes do wizard original

---

## 📊 ESTATÍSTICAS

- **Placeholders Implementados**: ~15 campos ✅
- **Campos Faltantes Identificados**: 4 campos principais ⚠️
- **Prioridade Alta**: 2 campos (área_m2, garagem_gratuita)
- **Impacto**: Moderado (campos úteis mas não críticos para MVP)

---

## 🔖 TAGS DE REFERÊNCIA

- `#WIZARD_DEPRECATED`
- `#CAMPOS_FALTANTES`
- `#PLACEHOLDERS`
- `#TODO_FUTURO`
- `#AREA_M2`
- `#GARAGEM_GRATUITA`
- `#AMENIDADES_DETALHADAS`

---

**Última Atualização**: 2025-01-XX  
**Arquivo de Origem**: NovoAnuncio.WIZARD_DEPRECATED.tsx.bak (6,433 linhas)  
**Arquivo Destino**: FormularioAnuncio.tsx (4,768 linhas)
