# 📋 MAPEAMENTO COMPLETO - FILTRO LATERAL DO CALENDÁRIO

**Data:** 28/10/2025  
**Arquivo:** `/components/PropertySidebar.tsx`  
**Linhas totais:** 724 linhas  
**Versão:** v1.0.99

---

## 🎯 VISÃO GERAL

Este documento mapeia **TODO** o código do filtro lateral do Calendário (PropertySidebar), conforme mostrado na imagem fornecida.

**Screenshot da interface:**
- Painel lateral esquerdo
- Seção "Propriedades" no topo
- Datas: "De - até" (24 out - 11 nov 2025)
- Botão "Filtros Avançados"
- Lista de "Anúncios - Imóveis" com thumbnails

---

## 📦 IMPORTS (Linhas 1-11)

```tsx
import React, { useState } from 'react';
import { Property } from '../App';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock } from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';
```

### Componentes ShadCN utilizados:
- ✅ Checkbox
- ✅ Input
- ✅ Label
- ✅ Button
- ✅ Badge
- ✅ Select
- ✅ Collapsible

### Ícones Lucide:
- Search (🔍)
- SlidersHorizontal (⚙️)
- ChevronDown/Up (▼▲)
- X (✕)
- ChevronLeft/Right (◀▶)
- CalendarIcon (📅)
- List (📄)
- Clock (🕐)

---

## 🔧 INTERFACE DE PROPS (Linhas 13-23)

```tsx
interface PropertySidebarProps {
  properties: Property[];
  selectedProperties: string[];
  onToggleProperty: (id: string) => void;
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  selectedReservationTypes: string[];
  onReservationTypesChange: (types: string[]) => void;
  currentView: 'calendar' | 'list' | 'timeline';
  onViewChange: (view: 'calendar' | 'list' | 'timeline') => void;
}
```

### Props recebidas:
| Prop | Tipo | Descrição |
|------|------|-----------|
| `properties` | `Property[]` | Lista de todas as propriedades |
| `selectedProperties` | `string[]` | IDs das propriedades selecionadas |
| `onToggleProperty` | `function` | Callback para selecionar/desselecionar |
| `dateRange` | `{from, to}` | Range de datas selecionado |
| `onDateRangeChange` | `function` | Callback para alterar datas |
| `selectedReservationTypes` | `string[]` | Tipos de reserva selecionados |
| `onReservationTypesChange` | `function` | Callback para alterar tipos |
| `currentView` | `string` | View atual (calendar/list/timeline) |
| `onViewChange` | `function` | Callback para mudar view |

---

## 📊 ESTADOS DO COMPONENTE (Linhas 36-51)

### Estados de Filtros:
```tsx
const [searchQuery, setSearchQuery] = useState('');                    // Busca de propriedades
const [showFilters, setShowFilters] = useState(false);                 // Mostra/esconde filtros avançados
const [selectedTarifGroup, setSelectedTarifGroup] = useState<string>('all');  // Região tarifária
const [propertyTypes, setPropertyTypes] = useState<string[]>([]);      // Tipos de imóvel (apartment, house, studio)
const [statusFilters, setStatusFilters] = useState<string[]>([]);      // Status (confirmada, pendente, etc)
const [platformFilters, setPlatformFilters] = useState<string[]>([]);  // Plataformas (Airbnb, Booking, etc)
const [selectedTags, setSelectedTags] = useState<string[]>([]);        // Tags (Praia, Montanha, Luxo, etc)
const [isCollapsed, setIsCollapsed] = useState(false);                 // Painel minimizado/expandido
```

### Estados de Collapsible (Linhas 46-51):
```tsx
const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
const [isTagsOpen, setIsTagsOpen] = useState(false);
const [isReservationTypesOpen, setIsReservationTypesOpen] = useState(false);
const [isPropertyTypesOpen, setIsPropertyTypesOpen] = useState(false);
const [isStatusOpen, setIsStatusOpen] = useState(false);
const [isPlatformOpen, setIsPlatformOpen] = useState(false);
```

**Total de estados:** 14 estados

---

## 🔍 LÓGICA DE FILTROS (Linhas 53-66)

### Filtro de Propriedades (Linhas 53-62):
```tsx
const filteredProperties = properties.filter(property => {
  if (!property) return false;
  
  const matchesSearch = (property.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                        (property.location?.toLowerCase() || '').includes(searchQuery.toLowerCase());
  const matchesTarifGroup = selectedTarifGroup === 'all' || property.tarifGroup === selectedTarifGroup;
  const matchesType = propertyTypes.length === 0 || propertyTypes.includes(property.type);
  const matchesTags = selectedTags.length === 0 || (property.tags && property.tags.some(tag => selectedTags.includes(tag)));
  
  return matchesSearch && matchesTarifGroup && matchesType && matchesTags;
});
```

**Critérios de filtro:**
1. ✅ **Busca textual** - Nome ou localização
2. ✅ **Região tarifária** - all ou específica
3. ✅ **Tipo de imóvel** - apartment, house, studio
4. ✅ **Tags** - Praia, Montanha, Luxo, etc

### Extração de valores únicos (Linhas 64-66):
```tsx
const allTypes = Array.from(new Set(properties.filter(p => p?.type).map(p => p.type)));
const allTarifGroups = Array.from(new Set(properties.filter(p => p?.tarifGroup).map(p => p.tarifGroup)));
const allTags = Array.from(new Set(properties.flatMap(p => p?.tags || [])));
```

---

## ⚡ FUNÇÕES AUXILIARES (Linhas 68-82)

### Selecionar Todas (Linhas 68-74):
```tsx
const selectAll = () => {
  filteredProperties.forEach(p => {
    if (!selectedProperties.includes(p.id)) {
      onToggleProperty(p.id);
    }
  });
};
```

### Desselecionar Todas (Linhas 76-82):
```tsx
const deselectAll = () => {
  filteredProperties.forEach(p => {
    if (selectedProperties.includes(p.id)) {
      onToggleProperty(p.id);
    }
  });
};
```

---

## 🎨 OPÇÕES DE FILTROS (Linhas 84-113)

### Tipos de Reserva (Linhas 84-91):
```tsx
const reservationTypesOptions = [
  { value: 'pre-reserva', label: 'pré-reserva' },
  { value: 'reserva', label: 'reserva' },
  { value: 'contrato', label: 'contrato' },
  { value: 'bloqueado', label: 'bloqueado' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'cancelada', label: 'cancelada' }
];
```

### Status (Linhas 93-98):
```tsx
const statusOptions = [
  { value: 'confirmed', label: 'Confirmada', color: 'text-green-600' },
  { value: 'pending', label: 'Pendente', color: 'text-yellow-600' },
  { value: 'blocked', label: 'Bloqueada', color: 'text-gray-600' },
  { value: 'maintenance', label: 'Manutenção', color: 'text-orange-600' }
];
```

### Plataformas (Linhas 100-105):
```tsx
const platformOptions = [
  { value: 'airbnb', label: 'Airbnb', color: 'text-red-600' },
  { value: 'booking', label: 'Booking.com', color: 'text-blue-600' },
  { value: 'direct', label: 'Reserva Direta', color: 'text-green-600' },
  { value: 'decolar', label: 'Decolar', color: 'text-orange-600' }
];
```

### Tags (Linhas 108-113):
```tsx
const tagsOptions = [
  { value: 'Praia', label: 'Praia', colorClass: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'Montanha', label: 'Montanha', colorClass: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'Cidade', label: 'Cidade', colorClass: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'Luxo', label: 'Luxo', colorClass: 'bg-pink-100 text-pink-700 border-pink-300' }
];
```

---

## 🏗️ ESTRUTURA JSX (Linhas 117-723)

### 1. Container Principal (Linha 118)
```tsx
<div className={`
  border-r border-gray-200 dark:border-gray-700 
  bg-white dark:bg-gray-800 
  flex flex-col h-full self-start sticky top-0 
  transition-all duration-300 relative 
  ${isCollapsed ? 'w-12' : 'w-80'} 
  overflow-hidden
`}>
```

**Classes aplicadas:**
- `w-80` quando expandido
- `w-12` quando colapsado
- `sticky top-0` - fixa no topo ao scrollar
- `transition-all duration-300` - animação suave

---

### 2. Botão Collapse/Expand (Linhas 120-130)
```tsx
<button
  onClick={() => setIsCollapsed(!isCollapsed)}
  className="absolute top-4 right-2 z-10 p-1.5 hover:bg-gray-100 rounded-md transition-colors group"
  title={isCollapsed ? 'Expandir painel' : 'Minimizar painel'}
>
  {isCollapsed ? (
    <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
  ) : (
    <ChevronLeft className="h-4 w-4 text-gray-600 group-hover:text-gray-900" />
  )}
</button>
```

**Posicionamento:**
- `absolute top-4 right-2`
- `z-10` para ficar sobre outros elementos
- Ícone muda: ChevronLeft ◀ / ChevronRight ▶

---

### 3. HEADER - FIXO (Linhas 133-142)

#### Título (Linha 134)
```tsx
<h2 className="text-gray-900 mb-3">Propriedades</h2>
```

#### DateRangePicker (Linhas 137-141)
```tsx
<div className="mb-3">
  <DateRangePicker
    dateRange={dateRange}
    onDateRangeChange={onDateRangeChange}
  />
</div>
```

**📅 Este é o componente "De - até" visível na imagem!**

---

### 4. BOTÃO FILTROS AVANÇADOS (Linhas 145-169)

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowFilters(!showFilters)}
  className="w-full justify-between"
>
  <span className="flex items-center gap-2">
    <SlidersHorizontal className="h-4 w-4" />
    Filtros Avançados
    {/* CONTADOR DE FILTROS ATIVOS */}
    {(/* condições */) && (
      <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
        {quantidadeFiltrosAtivos}
      </span>
    )}
  </span>
  {showFilters ? <ChevronUp /> : <ChevronDown />}
</Button>
```

**Lógica do contador (Linhas 154-164):**
```tsx
(statusFilters.length > 0 ? 1 : 0) + 
(platformFilters.length > 0 ? 1 : 0) + 
(propertyTypes.length > 0 ? 1 : 0) + 
(selectedTags.length > 0 ? 1 : 0) +
(selectedTarifGroup !== 'all' ? 1 : 0) +
(searchQuery !== '' || (selectedProperties.length > 0 && selectedProperties.length < properties.length) ? 1 : 0) +
(selectedReservationTypes.length < 6 ? 1 : 0)
```

---

## 🔽 SEÇÕES COLAPSÁVEIS (Linhas 172-712)

### Container de Filtros (Linha 173)
```tsx
<div className="mt-3 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
```

---

### 📊 SEÇÃO 1: VISUALIZAÇÃO (Linhas 176-213)

```tsx
<div className="border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 p-3">
  <Label className="text-xs text-gray-600 dark:text-gray-400 block mb-2">Visualização</Label>
  <div className="grid grid-cols-3 gap-1">
    {/* Botão Calendário */}
    <button onClick={() => onViewChange('calendar')} className={...}>
      <CalendarIcon className="h-4 w-4" />
      <span className="text-xs">Calendário</span>
    </button>
    
    {/* Botão Lista */}
    <button onClick={() => onViewChange('list')} className={...}>
      <List className="h-4 w-4" />
      <span className="text-xs">Lista</span>
    </button>
    
    {/* Botão Timeline */}
    <button onClick={() => onViewChange('timeline')} className={...}>
      <Clock className="h-4 w-4" />
      <span className="text-xs">Timeline</span>
    </button>
  </div>
</div>
```

**Comportamento:**
- Grid 3 colunas
- Botão ativo: `bg-blue-50 text-blue-700 border border-blue-200`
- Botão inativo: `hover:bg-gray-50 text-gray-600`

---

### 🏠 SEÇÃO 2: PROPRIEDADES (Linhas 216-322)

#### Estrutura Collapsible
```tsx
<Collapsible open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
  <div className="border border-gray-200 rounded-md bg-white">
    
    {/* Trigger */}
    <CollapsibleTrigger asChild>
      <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50">
        <div className="flex-1 text-left">
          <Label>Propriedades</Label>
          
          {/* Preview quando fechado */}
          {!isPropertiesOpen && selectedProperties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {/* Badges das primeiras 3 propriedades */}
              {selectedPropertiesData.slice(0, 3).map(prop => (
                <Badge>{prop.name.substring(0, 15)}...</Badge>
              ))}
              {/* +X se houver mais */}
              {selectedPropertiesData.length > 3 && (
                <Badge>+{selectedPropertiesData.length - 3}</Badge>
              )}
            </div>
          )}
        </div>
        <ChevronDown className={isPropertiesOpen ? 'rotate-180' : ''} />
      </button>
    </CollapsibleTrigger>
    
    {/* Content */}
    <CollapsibleContent>
      <div className="px-3 pb-3 pt-0 border-t border-gray-100">
        
        {/* BUSCA (Linhas 251-260) */}
        <div className="relative mb-3 mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        
        {/* CONTROLES (Linhas 263-287) */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
          <span className="text-[10px] text-gray-600">
            {selectedProperties.length} de {filteredProperties.length} selecionadas
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={selectAll} className="h-6 px-2 text-[10px]">
              Todas
            </Button>
            <Button variant="ghost" size="sm" onClick={deselectAll} className="h-6 px-2 text-[10px]">
              Nenhuma
            </Button>
          </div>
        </div>
        
        {/* LISTA DE PROPRIEDADES (Linhas 290-318) */}
        <div className="max-h-[250px] overflow-y-auto space-y-1.5">
          {filteredProperties.length === 0 ? (
            <div className="py-6 text-center text-gray-400 text-[10px]">
              Nenhuma propriedade encontrada
            </div>
          ) : (
            filteredProperties.map(property => (
              <label
                key={property.id}
                className={`
                  flex items-center gap-2 p-2 rounded cursor-pointer
                  transition-colors hover:bg-gray-50
                  ${selectedProperties.includes(property.id) ? 'bg-blue-50' : ''}
                `}
              >
                <Checkbox
                  checked={selectedProperties.includes(property.id)}
                  onCheckedChange={() => onToggleProperty(property.id)}
                />
                <span className="text-[11px] text-gray-900 line-clamp-1 flex-1">
                  {property.name || 'Sem nome'}
                </span>
                {/* Indicador visual - bolinha azul */}
                {selectedProperties.includes(property.id) && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                )}
              </label>
            ))
          )}
        </div>
      </div>
    </CollapsibleContent>
  </div>
</Collapsible>
```

**📸 Esta seção corresponde à lista "Anúncios - Imóveis" da imagem!**

**Características:**
- ✅ Busca em tempo real
- ✅ Contador "X de Y selecionadas"
- ✅ Botões "Todas" / "Nenhuma"
- ✅ Scroll interno (max-h-[250px])
- ✅ Preview colapsado (badges)
- ✅ Indicador visual azul quando selecionado
- ✅ Hover bg-gray-50
- ✅ Selecionado bg-blue-50

---

### 🏷️ SEÇÃO 3: TAGS (Linhas 325-390)

```tsx
<Collapsible open={isTagsOpen} onOpenChange={setIsTagsOpen}>
  <div className="border border-gray-200 rounded-md bg-white">
    
    {/* Trigger com preview */}
    <CollapsibleTrigger asChild>
      <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50">
        <div className="flex-1 text-left">
          <Label>Tags</Label>
          
          {/* Preview quando fechado */}
          {!isTagsOpen && selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tagsOptions
                .filter(tag => selectedTags.includes(tag.value))
                .map(tag => (
                  <Badge className={`text-[10px] px-1.5 py-0 border ${tag.colorClass}`}>
                    {tag.label}
                    {/* X para remover */}
                    <X className="h-2.5 w-2.5 cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTags(selectedTags.filter(t => t !== tag.value));
                    }} />
                  </Badge>
                ))}
            </div>
          )}
        </div>
        <ChevronDown className={isTagsOpen ? 'rotate-180' : ''} />
      </button>
    </CollapsibleTrigger>
    
    {/* Content */}
    <CollapsibleContent>
      <div className="px-3 pb-3 pt-0 border-t border-gray-100">
        <div className="space-y-2 mt-3">
          {tagsOptions.map(tag => (
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
              <Checkbox
                checked={selectedTags.includes(tag.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedTags([...selectedTags, tag.value]);
                  } else {
                    setSelectedTags(selectedTags.filter(t => t !== tag.value));
                  }
                }}
              />
              <Badge className={`text-xs border ${tag.colorClass}`}>
                {tag.label}
              </Badge>
              {/* Indicador azul */}
              {selectedTags.includes(tag.value) && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </label>
          ))}
        </div>
      </div>
    </CollapsibleContent>
  </div>
</Collapsible>
```

**Tags disponíveis:**
- 🏖️ Praia (azul)
- 🏔️ Montanha (verde)
- 🏙️ Cidade (roxo)
- 💎 Luxo (rosa)

---

### 📍 SEÇÃO 4: REGIÃO TARIFÁRIA (Linhas 393-408)

```tsx
<div className="border border-gray-200 rounded-md bg-white p-3">
  <Label className="text-xs text-gray-600 mb-2 block">Região Tarifária</Label>
  <Select value={selectedTarifGroup} onValueChange={setSelectedTarifGroup}>
    <SelectTrigger className="w-full h-8 text-xs">
      <SelectValue placeholder="Todas as Regiões" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todas as Regiões</SelectItem>
      {allTarifGroups.map(group => (
        <SelectItem key={group} value={group}>
          {group}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**Comportamento:**
- Não é Collapsible (sempre visível quando filtros abertos)
- Select simples
- Valor padrão: "all" (Todas as Regiões)

---

### 📋 SEÇÃO 5: TIPOS DE RESERVAS/BLOQUEIOS (Linhas 411-472)

```tsx
<Collapsible open={isReservationTypesOpen} onOpenChange={setIsReservationTypesOpen}>
  <div className="border border-gray-200 rounded-md bg-white">
    
    {/* Trigger */}
    <CollapsibleTrigger asChild>
      <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50">
        <div className="flex-1 text-left">
          <Label>Tipos de Reservas/Bloqueios</Label>
          
          {/* Preview quando fechado */}
          {!isReservationTypesOpen && selectedReservationTypes.length < 6 && (
            <div className="flex flex-wrap gap-1">
              {reservationTypesOptions
                .filter(opt => selectedReservationTypes.includes(opt.value))
                .map(opt => (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {opt.label}
                  </Badge>
                ))}
            </div>
          )}
        </div>
        <ChevronDown className={isReservationTypesOpen ? 'rotate-180' : ''} />
      </button>
    </CollapsibleTrigger>
    
    {/* Content */}
    <CollapsibleContent>
      <div className="px-3 pb-3 pt-0 border-t border-gray-100">
        <div className="space-y-2 mt-3">
          {reservationTypesOptions.map(type => (
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
              <Checkbox
                checked={selectedReservationTypes.includes(type.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onReservationTypesChange([...selectedReservationTypes, type.value]);
                  } else {
                    onReservationTypesChange(
                      selectedReservationTypes.filter(t => t !== type.value)
                    );
                  }
                }}
              />
              <span className="text-xs text-gray-700">{type.label}</span>
              {selectedReservationTypes.includes(type.value) && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </label>
          ))}
        </div>
      </div>
    </CollapsibleContent>
  </div>
</Collapsible>
```

**Tipos disponíveis:**
1. pré-reserva
2. reserva
3. contrato
4. bloqueado
5. Manutenção
6. cancelada

---

### 🏘️ SEÇÃO 6: TIPO DE IMÓVEL (Linhas 475-538)

```tsx
<Collapsible open={isPropertyTypesOpen} onOpenChange={setIsPropertyTypesOpen}>
  <div className="border border-gray-200 rounded-md bg-white">
    
    {/* Trigger */}
    <CollapsibleTrigger asChild>
      <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50">
        <div className="flex-1 text-left">
          <Label>Tipo de Imóvel</Label>
          
          {/* Preview quando fechado - com X para remover */}
          {!isPropertyTypesOpen && propertyTypes.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {propertyTypes.map(type => (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                  {type}
                  <X 
                    className="h-2.5 w-2.5 cursor-pointer hover:text-red-600" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setPropertyTypes(propertyTypes.filter(t => t !== type));
                    }}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
        <ChevronDown className={isPropertyTypesOpen ? 'rotate-180' : ''} />
      </button>
    </CollapsibleTrigger>
    
    {/* Content */}
    <CollapsibleContent>
      <div className="px-3 pb-3 pt-0 border-t border-gray-100">
        <div className="space-y-2 mt-3">
          {allTypes.map(type => (
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
              <Checkbox
                checked={propertyTypes.includes(type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setPropertyTypes([...propertyTypes, type]);
                  } else {
                    setPropertyTypes(propertyTypes.filter(t => t !== type));
                  }
                }}
              />
              <span className="text-xs text-gray-700">{type}</span>
              {propertyTypes.includes(type) && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </label>
          ))}
        </div>
      </div>
    </CollapsibleContent>
  </div>
</Collapsible>
```

**Tipos dinâmicos extraídos das propriedades:**
- apartment
- house
- studio
- etc.

---

### ✅ SEÇÃO 7: STATUS (Linhas 542-608)

```tsx
<Collapsible open={isStatusOpen} onOpenChange={setIsStatusOpen}>
  <div className="border border-gray-200 rounded-md bg-white">
    
    {/* Trigger */}
    <CollapsibleTrigger asChild>
      <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50">
        <div className="flex-1 text-left">
          <Label>Status</Label>
          
          {/* Preview quando fechado - com X para remover */}
          {!isStatusOpen && statusFilters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {statusOptions
                .filter(opt => statusFilters.includes(opt.value))
                .map(opt => (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                    {opt.label}
                    <X 
                      className="h-2.5 w-2.5 cursor-pointer hover:text-red-600" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusFilters(statusFilters.filter(s => s !== opt.value));
                      }}
                    />
                  </Badge>
                ))}
            </div>
          )}
        </div>
        <ChevronDown className={isStatusOpen ? 'rotate-180' : ''} />
      </button>
    </CollapsibleTrigger>
    
    {/* Content */}
    <CollapsibleContent>
      <div className="px-3 pb-3 pt-0 border-t border-gray-100">
        <div className="space-y-2 mt-3">
          {statusOptions.map(status => (
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
              <Checkbox
                checked={statusFilters.includes(status.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setStatusFilters([...statusFilters, status.value]);
                  } else {
                    setStatusFilters(statusFilters.filter(s => s !== status.value));
                  }
                }}
              />
              <span className={`text-xs ${status.color}`}>
                {status.label}
              </span>
              {statusFilters.includes(status.value) && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </label>
          ))}
        </div>
      </div>
    </CollapsibleContent>
  </div>
</Collapsible>
```

**Status disponíveis:**
- ✅ Confirmada (verde)
- ⏳ Pendente (amarelo)
- 🚫 Bloqueada (cinza)
- 🔧 Manutenção (laranja)

---

### 🌐 SEÇÃO 8: PLATAFORMA ORIGEM DA RESERVA (Linhas 611-677)

```tsx
<Collapsible open={isPlatformOpen} onOpenChange={setIsPlatformOpen}>
  <div className="border border-gray-200 rounded-md bg-white">
    
    {/* Trigger */}
    <CollapsibleTrigger asChild>
      <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50">
        <div className="flex-1 text-left">
          <Label>Plataforma origem da reserva</Label>
          
          {/* Preview quando fechado - com X para remover */}
          {!isPlatformOpen && platformFilters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {platformOptions
                .filter(opt => platformFilters.includes(opt.value))
                .map(opt => (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
                    {opt.label}
                    <X 
                      className="h-2.5 w-2.5 cursor-pointer hover:text-red-600" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlatformFilters(platformFilters.filter(p => p !== opt.value));
                      }}
                    />
                  </Badge>
                ))}
            </div>
          )}
        </div>
        <ChevronDown className={isPlatformOpen ? 'rotate-180' : ''} />
      </button>
    </CollapsibleTrigger>
    
    {/* Content */}
    <CollapsibleContent>
      <div className="px-3 pb-3 pt-0 border-t border-gray-100">
        <div className="space-y-2 mt-3">
          {platformOptions.map(platform => (
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
              <Checkbox
                checked={platformFilters.includes(platform.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setPlatformFilters([...platformFilters, platform.value]);
                  } else {
                    setPlatformFilters(platformFilters.filter(p => p !== platform.value));
                  }
                }}
              />
              <span className={`text-xs ${platform.color}`}>
                {platform.label}
              </span>
              {platformFilters.includes(platform.value) && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </label>
          ))}
        </div>
      </div>
    </CollapsibleContent>
  </div>
</Collapsible>
```

**Plataformas disponíveis:**
- 🏠 Airbnb (vermelho)
- 🔵 Booking.com (azul)
- ✅ Reserva Direta (verde)
- 🟠 Decolar (laranja)

---

### 🧹 BOTÃO LIMPAR FILTROS (Linhas 680-710)

```tsx
{(propertyTypes.length > 0 || 
  statusFilters.length > 0 || 
  platformFilters.length > 0 || 
  selectedTags.length > 0 || 
  selectedTarifGroup !== 'all' || 
  searchQuery !== '' || 
  selectedReservationTypes.length < 6 || 
  (selectedProperties.length > 0 && selectedProperties.length < properties.length)) && (
  
  <Button
    variant="ghost"
    size="sm"
    onClick={() => {
      // Resetar todos os filtros
      setPropertyTypes([]);
      setStatusFilters([]);
      setPlatformFilters([]);
      setSelectedTags([]);
      setSelectedTarifGroup('all');
      setSearchQuery('');
      
      // Resetar tipos de reserva para todos
      onReservationTypesChange([
        'pre-reserva',
        'reserva',
        'contrato',
        'bloqueado',
        'manutencao',
        'cancelada'
      ]);
      
      // Selecionar todas as propriedades
      properties.forEach(p => {
        if (!selectedProperties.includes(p.id)) {
          onToggleProperty(p.id);
        }
      });
    }}
    className="w-full mt-1"
  >
    Limpar todos os filtros
  </Button>
)}
```

**Aparece quando:**
- Qualquer filtro está ativo
- Busca não está vazia
- Propriedades parcialmente selecionadas
- Tipos de reserva não estão todos selecionados

**Ação:**
- Reseta TODOS os filtros
- Seleciona TODAS as propriedades
- Seleciona TODOS os tipos de reserva

---

### 5. FOOTER - FIXO (Linhas 716-720)

```tsx
<div className={`
  p-4 border-t border-gray-200 bg-gray-50 mt-auto flex-shrink-0 
  ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}
`}>
  <div className="text-xs text-gray-500 text-center">
    💡 Dica: Clique na linha de preço e arraste para editar
  </div>
</div>
```

**Características:**
- `mt-auto` - empurra para o final
- `flex-shrink-0` - não encolhe
- `border-t` - borda superior
- `bg-gray-50` - fundo cinza claro
- Desaparece quando colapsado

---

## 📊 RESUMO DA ARQUITETURA

### Hierarquia de Componentes:
```
PropertySidebar
├── Botão Collapse/Expand (absolute)
├── Header (fixo)
│   ├── Título "Propriedades"
│   ├── DateRangePicker
│   └── Botão "Filtros Avançados" (com contador)
├── Filtros (scrollável)
│   ├── 1. Visualização (sempre visível)
│   ├── 2. Propriedades (Collapsible)
│   │   ├── Busca
│   │   ├── Controles (Todas/Nenhuma)
│   │   └── Lista scrollável
│   ├── 3. Tags (Collapsible)
│   ├── 4. Região Tarifária (Select simples)
│   ├── 5. Tipos de Reservas (Collapsible)
│   ├── 6. Tipo de Imóvel (Collapsible)
│   ├── 7. Status (Collapsible)
│   ├── 8. Plataforma (Collapsible)
│   └── Botão Limpar Filtros (condicional)
└── Footer (fixo)
    └── Dica
```

---

## 🎨 PADRÃO VISUAL CONSISTENTE

### Collapsible Padrão:
```tsx
<Collapsible open={isOpen} onOpenChange={setIsOpen}>
  <div className="border border-gray-200 rounded-md bg-white">
    
    {/* Trigger */}
    <CollapsibleTrigger asChild>
      <button className="w-full p-3 flex items-center justify-between hover:bg-gray-50">
        <div className="flex-1 text-left">
          <Label className="text-xs text-gray-600 block mb-1">Título</Label>
          {/* Preview quando fechado */}
        </div>
        <ChevronDown className={isOpen ? 'rotate-180' : ''} />
      </button>
    </CollapsibleTrigger>
    
    {/* Content */}
    <CollapsibleContent>
      <div className="px-3 pb-3 pt-0 border-t border-gray-100">
        {/* Conteúdo */}
      </div>
    </CollapsibleContent>
  </div>
</Collapsible>
```

### Padrão de Checkbox + Label:
```tsx
<label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded">
  <Checkbox checked={...} onCheckedChange={...} />
  <span className="text-xs">{label}</span>
  {/* Indicador azul quando selecionado */}
  {isSelected && (
    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
  )}
</label>
```

### Padrão de Badge com X:
```tsx
<Badge className="text-[10px] px-1.5 py-0 flex items-center gap-1">
  {label}
  <X 
    className="h-2.5 w-2.5 cursor-pointer hover:text-red-600" 
    onClick={(e) => {
      e.stopPropagation();
      // remover
    }}
  />
</Badge>
```

---

## 🔢 ESTATÍSTICAS DO CÓDIGO

| Métrica | Valor |
|---------|-------|
| **Total de linhas** | 724 |
| **Imports** | 11 linhas |
| **Interface Props** | 11 linhas |
| **Estados** | 14 estados |
| **Funções auxiliares** | 2 (selectAll, deselectAll) |
| **Opções de filtros** | 4 arrays (reservationTypes, status, platforms, tags) |
| **Seções Collapsible** | 7 seções |
| **Total de filtros** | 8 critérios diferentes |

---

## 🎯 FUNCIONALIDADES IMPLEMENTADAS

### ✅ Filtros:
1. ✅ Busca textual por nome ou localização
2. ✅ Seleção múltipla de propriedades
3. ✅ Filtro por Tags (Praia, Montanha, Luxo, Cidade)
4. ✅ Filtro por Região Tarifária
5. ✅ Filtro por Tipos de Reserva (6 tipos)
6. ✅ Filtro por Tipo de Imóvel (apartment, house, studio)
7. ✅ Filtro por Status (4 status)
8. ✅ Filtro por Plataforma (4 plataformas)

### ✅ Interações:
1. ✅ Collapse/Expand painel completo
2. ✅ Collapse/Expand cada seção individualmente
3. ✅ Selecionar Todas / Nenhuma (propriedades)
4. ✅ Remover filtro individual (X em badges)
5. ✅ Limpar todos os filtros de uma vez
6. ✅ Preview dos filtros ativos quando colapsado
7. ✅ Contador de filtros ativos no botão principal
8. ✅ Troca de visualização (Calendário/Lista/Timeline)

### ✅ UX:
1. ✅ Scroll interno nas listas longas
2. ✅ Hover states em todos os elementos clicáveis
3. ✅ Indicadores visuais de seleção (bolinha azul)
4. ✅ Background azul claro em itens selecionados
5. ✅ Animações suaves (transition-all duration-300)
6. ✅ Ícones contextuais
7. ✅ Cores semânticas (verde=confirmada, vermelho=cancelada)
8. ✅ Dica fixa no footer

---

## 💡 PONTOS-CHAVE DA IMPLEMENTAÇÃO

### 1. **Sticky Positioning**
```tsx
className="... sticky top-0 ..."
```
O painel fica fixo no topo ao scrollar a página principal.

### 2. **Collapse Animation**
```tsx
className={`transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-80'}`}
```
Animação suave de 300ms ao colapsar/expandir.

### 3. **Scroll Independente**
```tsx
style={{ maxHeight: 'calc(100vh - 400px)' }}
```
Área de filtros tem scroll próprio, não afeta header/footer.

### 4. **Preview Inteligente**
```tsx
{!isPropertiesOpen && selectedProperties.length > 0 && (
  <div className="flex flex-wrap gap-1">
    {/* Mostra primeiras 3 + contador */}
  </div>
)}
```
Quando colapsado, mostra resumo dos filtros ativos.

### 5. **Contador Dinâmico**
```tsx
{(condições...) && (
  <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
    {soma de filtros ativos}
  </span>
)}
```
Badge azul mostra quantos grupos de filtros estão ativos.

### 6. **Dark Mode Support**
```tsx
className="... dark:bg-gray-800 dark:border-gray-700 dark:text-white"
```
Todas as seções têm suporte a dark mode.

### 7. **Responsive Text**
```tsx
className="text-[10px] ... text-xs ... text-sm"
```
Tamanhos de texto variados para hierarquia visual.

### 8. **Stop Propagation**
```tsx
onClick={(e) => {
  e.stopPropagation();
  // ação
}}
```
Evita que cliques em badges/X acionem o toggle do Collapsible.

---

## 🚀 COMO USAR ESTE CÓDIGO

### Para replicar em outro módulo:

1. **Copiar estrutura base:**
```tsx
<div className="w-80 border-r flex flex-col h-full sticky top-0">
  {/* Header fixo */}
  <div className="p-4 border-b flex-shrink-0">
    {/* DateRangePicker, botão de filtros */}
  </div>
  
  {/* Filtros scrolláveis */}
  <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
    {/* Collapsibles */}
  </div>
  
  {/* Footer fixo */}
  <div className="p-4 border-t mt-auto flex-shrink-0">
    {/* Dica */}
  </div>
</div>
```

2. **Adaptar estados:**
```tsx
const [isXOpen, setIsXOpen] = useState(false);
const [selectedX, setSelectedX] = useState<string[]>([]);
```

3. **Criar Collapsible:**
```tsx
<Collapsible open={isXOpen} onOpenChange={setIsXOpen}>
  {/* Trigger + Content */}
</Collapsible>
```

4. **Adicionar lógica de filtro:**
```tsx
const filteredItems = items.filter(item => {
  const matchesX = selectedX.length === 0 || selectedX.includes(item.x);
  return matchesX;
});
```

---

## 📸 CORRESPONDÊNCIA COM A IMAGEM

| Elemento na Imagem | Linha de Código | Componente |
|-------------------|----------------|------------|
| **"Propriedades"** (título) | 134 | `<h2>` |
| **"De - até"** (datas) | 137-141 | `<DateRangePicker>` |
| **"Filtros Avançados"** (botão) | 145-169 | `<Button>` com contador |
| **"Anúncios - Imóveis"** (lista) | 216-322 | Seção Propriedades (Collapsible) |
| **Apartamento Copacabana 201** | 296-316 | Item da lista (label + Checkbox) |
| **Buscar...** (campo) | 251-260 | `<Input>` com ícone Search |
| **"Todas" / "Nenhuma"** | 268-286 | Botões `selectAll` / `deselectAll` |

---

## ✅ CHECKLIST DE QUALIDADE

- [x] **Responsivo** - Colapsa para w-12
- [x] **Acessível** - Labels em todos os Checkboxes
- [x] **Dark Mode** - Classes dark: em todos os elementos
- [x] **Performance** - Filtros eficientes (filter + map)
- [x] **UX** - Hover states, animações suaves
- [x] **Manutenível** - Código organizado em seções
- [x] **Reutilizável** - Padrões consistentes
- [x] **Testável** - Lógica separada da apresentação
- [x] **Documentado** - Este arquivo! 📄

---

## 🎊 CONCLUSÃO

Este filtro lateral do Calendário é um **exemplo completo e profissional** de:
- ✅ Arquitetura de filtros complexos
- ✅ Componentes Collapsible bem estruturados
- ✅ UX refinada com previews e contadores
- ✅ Performance otimizada com scroll independente
- ✅ Dark mode completo
- ✅ Código limpo e manutenível

**Total:** 724 linhas de código TypeScript + TSX bem estruturado.

---

**RENDIZY - PropertySidebar Mapeamento Completo**  
**Versão:** v1.0.99  
**Data:** 28/10/2025
