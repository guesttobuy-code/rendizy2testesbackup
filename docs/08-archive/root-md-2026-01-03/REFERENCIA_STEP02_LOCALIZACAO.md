# 📍 REFERÊNCIA: Step 02 - Localização
## Análise do código existente em LocationsAndListings.tsx

---

## 🎯 ARQUITETURA ATUAL (Ultimate - Funcionando)

### ✅ Padrão de Salvamento Campo-por-Campo
```typescript
// 1. Estado local para cada campo
const [campo, setCampo] = useState('');

// 2. Handler com tracking de mudanças
const handleChange = (value) => {
  setCampo(value);
  setHasUnsavedChanges(true);
};

// 3. Salvamento via RPC save_anuncio_field
const saveCampo = async () => {
  await fetch('/anuncios-ultimate/save-field', {
    method: 'POST',
    body: JSON.stringify({
      anuncio_id: anuncioId,
      field: 'nome_campo',
      value: campo
    })
  });
};
```

### ✅ Validações no Frontend
- Checkpoints sequenciais antes de salvar
- Whitelists para valores permitidos
- Feedback visual de campos obrigatórios
- Toast de sucesso/erro após cada operação

### ✅ Carregamento de Dados
```typescript
// Parse inteligente para tipos diferentes
if (Array.isArray(anuncio.data.campo)) {
  setCampo(anuncio.data.campo);
} else if (typeof anuncio.data.campo === 'string') {
  try {
    setCampo(JSON.parse(anuncio.data.campo));
  } catch {
    setCampo([]);
  }
}
```

---

## 📋 CAMPOS IDENTIFICADOS NO SISTEMA ATUAL

### 🏠 **Informações Básicas**
```typescript
// 1. Nome do Local
name: string (obrigatório)
placeholder: "Ex: Edifício Copacabana Palace"
observação: "Código gerado automaticamente (ex: EDI001)"

// 2. Mostrar número do prédio
showBuildingNumber: boolean (default: true)
tipo: Switch
finalidade: "Ocultar dá mais privacidade"

// 3. Descrição
description: string (opcional)
tipo: Textarea
rows: 2
placeholder: "Descrição do local..."
```

---

### 📮 **Endereço Completo**

```typescript
address: {
  // País (fixo por enquanto)
  country: "Brasil" (fixo)
  
  // Rua/Avenida
  street: string (obrigatório)
  placeholder: "Av. Atlântica"
  
  // Número
  number: string (obrigatório)
  placeholder: "1702"
  
  // Bairro
  neighborhood: string (obrigatório)
  placeholder: "Copacabana"
  
  // Cidade
  city: string (obrigatório)
  placeholder: "Rio de Janeiro"
  
  // Estado
  state: string (obrigatório)
  maxLength: 2
  placeholder: "RJ"
  transform: toUpperCase
  
  // CEP
  zipCode: string (obrigatório)
  placeholder: "22021-001"
  formato: "XXXXX-XXX"
}
```

**🔥 FUNCIONALIDADE CRÍTICA FALTANDO:**
- ❌ Busca automática de endereço por CEP (ViaCEP API)
- ❌ Validação de formato de CEP
- ❌ Auto-preenchimento de cidade, estado, bairro

---

### 🚪 **Acesso ao Prédio**

```typescript
buildingAccess: {
  // Tipo de Acesso
  type: "portaria" | "código" | "livre" | "outro"
  default: "portaria"
  tipo: Select dropdown
  
  // Instruções de Acesso
  instructions: string (opcional)
  tipo: Textarea
  rows: 2
  placeholder: "Instruções para acessar o prédio..."
  
  // Possui Elevador
  hasElevator: boolean
  default: true
  tipo: Switch
  
  // Possui Estacionamento
  hasParking: boolean
  default: false
  tipo: Switch
  
  // Tipo de Estacionamento (condicional)
  parkingType?: "gratuito" | "pago" | "rotativo"
  default: "gratuito"
  habilitado: apenas se hasParking === true
  tipo: Select dropdown
}
```

**🎨 UX INTELIGENTE:**
- Campo `parkingType` desabilitado quando `hasParking` === false
- Handler `onCheckedChange` no Switch ativa/desativa dynamicamente

---

### 🏊 **Amenidades Compartilhadas**

```typescript
sharedAmenities: string[] (array de IDs)

// Opções comuns:
- piscina
- academia
- salao_festas
- churrasqueira
- playground
- sauna
- quadra_esportes
- bicicletario
```

**❗ IMPORTANTE:** No código atual, este campo é inicializado como `[]` vazio, mas não há interface para selecioná-los no modal.

---

## 🆚 COMPARAÇÃO: Atual vs Ultimate

### ❌ Sistema Atual (LocationsAndListings)
- Modal único com FormData
- Salva tudo de uma vez (submit do form)
- Dados enviados como objeto complexo
- Não há persistência parcial
- Reload completo após criar

### ✅ Sistema Ultimate (Novo Padrão)
- Wizard multi-step
- Salva campo-por-campo via RPC
- Dados salvos em JSONB no PostgreSQL
- Persistência automática após cada campo
- Reload apenas do estado necessário
- Tracking de mudanças não salvas

---

## 🎯 IMPLEMENTAÇÃO RECOMENDADA PARA ULTIMATE

### **Campos que devem existir no Step 02:**

```typescript
// Estados necessários
const [pais, setPais] = useState('Brasil');
const [estado, setEstado] = useState('');
const [siglaEstado, setSiglaEstado] = useState('');
const [cep, setCep] = useState('');
const [cidade, setCidade] = useState('');
const [bairro, setBairro] = useState('');
const [rua, setRua] = useState('');
const [numero, setNumero] = useState('');
const [complemento, setComplemento] = useState(''); // ADICIONAR
const [mostrarNumero, setMostrarNumero] = useState(true);

// Acesso ao prédio
const [tipoAcesso, setTipoAcesso] = useState('portaria');
const [instrucoesAcesso, setInstrucoesAcesso] = useState('');
const [possuiElevador, setPossuiElevador] = useState(true);
const [possuiEstacionamento, setPossuiEstacionamento] = useState(false);
const [tipoEstacionamento, setTipoEstacionamento] = useState('gratuito');

// Características (já implementado parcialmente)
const [caracteristicas, setCaracteristicas] = useState({
  estacionamento: false, // MIGRAR para possuiEstacionamento
  internet_cabo: false,
  internet_wifi: false,
  // ADICIONAR:
  piscina: false,
  academia: false,
  salao_festas: false,
  churrasqueira: false,
  playground: false
});
```

---

## 🚀 FUNCIONALIDADES CRÍTICAS A IMPLEMENTAR

### 1️⃣ **Busca de CEP (ViaCEP)**
```typescript
const buscarCep = async (cep: string) => {
  // Limpar formatação
  const cepLimpo = cep.replace(/\D/g, '');
  
  if (cepLimpo.length !== 8) return;
  
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await res.json();
    
    if (!data.erro) {
      setRua(data.logradouro);
      setBairro(data.bairro);
      setCidade(data.localidade);
      setSiglaEstado(data.uf);
      setEstado(getEstadoNome(data.uf)); // Helper
      setHasUnsavedChanges(true);
    }
  } catch (error) {
    toast.error('Erro ao buscar CEP');
  }
};
```

### 2️⃣ **Validação de CEP**
```typescript
const validarCep = (cep: string): boolean => {
  const regex = /^\d{5}-?\d{3}$/;
  return regex.test(cep);
};
```

### 3️⃣ **Formatação Automática de CEP**
```typescript
const formatarCep = (value: string): string => {
  const numeros = value.replace(/\D/g, '');
  if (numeros.length <= 5) return numeros;
  return `${numeros.slice(0, 5)}-${numeros.slice(5, 8)}`;
};
```

### 4️⃣ **Mapa Integrado**
```typescript
// Opção 1: Google Maps Embed API
<iframe
  src={`https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${endereco}`}
  width="100%"
  height="400"
/>

// Opção 2: Leaflet (open source)
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
```

---

## 📸 **Upload de Fotos do Endereço**

### Campos necessários:
```typescript
const [fotosEndereco, setFotosEndereco] = useState<File[]>([]);

// Salvar como:
field: 'fotos_endereco'
value: JSON.stringify(fotosEndereco.map(f => f.name))

// Ou upload direto no Supabase Storage:
const uploadFoto = async (file: File) => {
  const { data, error } = await supabase.storage
    .from('anuncios')
    .upload(`${anuncioId}/endereco/${file.name}`, file);
  
  return data?.path;
};
```

---

## ⚙️ ORDEM DE SALVAMENTO RECOMENDADA

```typescript
const saveAllStep2Fields = async () => {
  // Validações
  if (!cep) return toast.error('CEP obrigatório');
  if (!rua) return toast.error('Rua obrigatória');
  if (!numero) return toast.error('Número obrigatório');
  if (!cidade) return toast.error('Cidade obrigatória');
  if (!siglaEstado) return toast.error('Estado obrigatório');
  
  // Salvar campos individuais
  await saveCampo('pais', pais);
  await saveCampo('estado', estado);
  await saveCampo('sigla_estado', siglaEstado);
  await saveCampo('cep', cep);
  await saveCampo('cidade', cidade);
  await saveCampo('bairro', bairro);
  await saveCampo('rua', rua);
  await saveCampo('numero', numero);
  await saveCampo('complemento', complemento);
  await saveCampo('mostrar_numero', String(mostrarNumero));
  
  // Acesso ao prédio
  await saveCampo('tipo_acesso', tipoAcesso);
  await saveCampo('instrucoes_acesso', instrucoesAcesso);
  await saveCampo('possui_elevador', String(possuiElevador));
  await saveCampo('possui_estacionamento', String(possuiEstacionamento));
  await saveCampo('tipo_estacionamento', tipoEstacionamento);
  
  // Características (como JSON)
  await saveCampo('caracteristicas', JSON.stringify(caracteristicas));
  
  toast.success('Localização salva!');
  setHasUnsavedChanges(false);
};
```

---

## 🎨 MELHORIAS DE UX A IMPLEMENTAR

### 1. **Busca automática ao digitar CEP**
```typescript
useEffect(() => {
  if (cep.length === 9) { // formato: 12345-678
    buscarCep(cep);
  }
}, [cep]);
```

### 2. **Indicador visual de campos auto-preenchidos**
```typescript
{cepBuscado && (
  <Badge variant="success">
    <Check className="w-3 h-3 mr-1" />
    Auto-preenchido
  </Badge>
)}
```

### 3. **Botão "Buscar CEP" manual**
```typescript
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={() => buscarCep(cep)}
>
  <Search className="w-4 h-4 mr-2" />
  Buscar
</Button>
```

### 4. **Preview do endereço formatado**
```typescript
<Card>
  <CardHeader>
    <CardTitle className="text-sm">Endereço Completo</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-700 dark:text-gray-300">
      {rua}, {numero} {complemento && `- ${complemento}`}<br/>
      {bairro} - {cidade}/{siglaEstado}<br/>
      CEP: {cep}
    </p>
  </CardContent>
</Card>
```

---

## 🔥 PRIORIDADES DE IMPLEMENTAÇÃO

### ✅ Já Implementado:
- Estados base para campos de endereço
- Características (estacionamento, internet cabo/wifi)
- Upload de fotos (área drag & drop)
- Layout responsivo (grid formulário + mapa)

### 🚧 Para Implementar AGORA:
1. **Busca de CEP via ViaCEP**
2. **Complemento** (campo faltando)
3. **Tipo de Acesso** (dropdown)
4. **Instruções de Acesso** (textarea)
5. **Possui Elevador** (switch)
6. **Possui Estacionamento** (switch + tipo condicional)

### 🎯 Para Implementar DEPOIS:
1. Mapa interativo (Google Maps ou Leaflet)
2. Upload real de fotos (Supabase Storage)
3. Amenidades compartilhadas (piscina, academia, etc)
4. Validação de formato de endereço
5. Geocoding (lat/lng do endereço)

---

## 📦 ESTRUTURA FINAL NO JSONB

```json
{
  "title": "Casa de Praia",
  "tipo_local": "casa",
  "tipo_acomodacao": "casa",
  "subtype": "entire_place",
  "modalidades": ["temporada", "locacao"],
  
  // Step 02 - Localização
  "endereco": {
    "pais": "Brasil",
    "estado": "Rio de Janeiro",
    "sigla_estado": "RJ",
    "cep": "28950-000",
    "cidade": "Armação dos Búzios",
    "bairro": "Praia Rasa",
    "rua": "Rua do Conteiro",
    "numero": "N 156-a",
    "complemento": "Piscada Recanto das Palmeiras",
    "mostrar_numero": true
  },
  
  "acesso_predio": {
    "tipo": "portaria",
    "instrucoes": "Falar com o porteiro João",
    "possui_elevador": true,
    "possui_estacionamento": true,
    "tipo_estacionamento": "gratuito"
  },
  
  "caracteristicas": {
    "estacionamento": true,
    "internet_cabo": false,
    "internet_wifi": true,
    "piscina": true,
    "academia": false,
    "salao_festas": false
  },
  
  "fotos_endereco": [
    "path/to/fachada.jpg",
    "path/to/entrada.jpg"
  ]
}
```

---

## 🎓 LIÇÕES APRENDIDAS

### ✅ O que está funcionando bem:
1. Salvamento campo-por-campo via RPC
2. Validações sequenciais (checkpoints)
3. Tracking de mudanças não salvas
4. Parse inteligente de tipos diferentes
5. Feedback visual claro

### ❌ O que evitar:
1. Salvar tudo de uma vez (FormData complexo)
2. Reload completo da página após salvar
3. Campos sem validação
4. Estados globais desnecessários
5. Componentes monolíticos

### 🚀 Próximos passos:
1. Implementar busca de CEP
2. Adicionar campos faltantes (complemento, acesso)
3. Criar função `saveAllStep2Fields()`
4. Testar salvamento e carregamento
5. Integrar mapa (fase 2)

---

**📅 Data:** 2025-12-13
**👤 Autor:** Claude Sonnet 4.5
**📌 Status:** Análise completa - Pronto para implementação
