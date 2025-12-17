# 📅 DateRangePicker - Componente Padrão Oficial

> **Versão:** 1.0.52  
> **Status:** 🎯 PADRÃO OFICIAL OBRIGATÓRIO  
> **Localização:** `/components/DateRangePicker.tsx`

---

## 🎯 REGRA CRÍTICA

### ⚠️ SEMPRE que precisar de um seletor de datas com range (de-até):

✅ **USE:** `/components/DateRangePicker.tsx`  
❌ **NÃO CRIE:** Novos componentes de seleção  
❌ **NÃO USE:** Calendar do shadcn diretamente para ranges  
❌ **NÃO REIMPLEMENTE:** A lógica de seleção de datas

---

## 📋 Quando Usar

### ✅ USE DateRangePicker para:
- Filtros de período no calendário
- Seleção de datas de reserva
- Períodos de bloqueio
- Sazonalidade (início e fim)
- Cotações e exportações
- Relatórios por período
- Qualquer funcionalidade que precise de **data inicial + data final**

### ❌ NÃO use DateRangePicker para:
- **Data única** → Use `Calendar` do shadcn (`/components/ui/calendar.tsx`)
- **Data + hora** → Use `Calendar` + `Input` para hora
- **Apenas mês/ano** → Crie selector específico (se necessário)

---

## 🔧 Interface TypeScript

```tsx
interface DateRangePickerProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}
```

### Props:
- **`dateRange`** (obrigatório): Objeto com `from` e `to` (Date)
- **`onDateRangeChange`** (obrigatório): Callback que recebe o novo range

---

## 💻 Exemplo de Implementação

### Import:
```tsx
import { DateRangePicker } from './components/DateRangePicker';
import { addDays } from 'date-fns';
```

### State:
```tsx
const [dateRange, setDateRange] = useState({
  from: new Date(),
  to: addDays(new Date(), 7)
});
```

### Renderização:
```tsx
<DateRangePicker 
  dateRange={dateRange}
  onDateRangeChange={setDateRange}
/>
```

### Completo:
```tsx
import React, { useState } from 'react';
import { DateRangePicker } from './components/DateRangePicker';
import { addDays } from 'date-fns';

export function MeuComponente() {
  const [dateRange, setDateRange] = useState({
    from: new Date(),
    to: addDays(new Date(), 7)
  });

  const handleSave = () => {
    console.log('Período selecionado:', dateRange);
    // Lógica de salvamento
  };

  return (
    <div>
      <h2>Selecione o Período</h2>
      <DateRangePicker 
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
      <button onClick={handleSave}>Salvar</button>
    </div>
  );
}
```

---

## ✨ Funcionalidades

### 1. 📅 Dois Meses Lado a Lado
- Visualização ampla para facilitar seleção de períodos longos
- Útil para ver feriados e finais de semana

### 2. 🔄 Navegação Intuitiva
- Setas de mês (esquerda/direita)
- Setas de ano (cima/baixo) no primeiro mês
- Navegação rápida por períodos

### 3. 🎯 Seleção em 2 Cliques
1. **Primeiro clique:** Seleciona data inicial
2. **Segundo clique:** Seleciona data final
3. **Automático:** Se data final < inicial, inverte automaticamente

### 4. 🔵 Highlight Visual
- **Data inicial/final:** Azul escuro (`bg-blue-500`)
- **Range entre datas:** Azul claro (`bg-blue-100`)
- **Hover:** Mostra preview do range (`bg-blue-50`)

### 5. 🇧🇷 Localização PT-BR
- Meses em português (Janeiro, Fevereiro, etc.)
- Dias da semana abreviados (2ª, 3ª, 4ª, etc.)
- Formato de data brasileiro (d MMM yyyy)

### 6. ✅ Confirmação Explícita
- **Botão Aplicar:** Confirma a seleção
- **Botão Cancelar:** Descarta alterações
- **Preview:** Mostra range selecionado antes de aplicar

### 7. 💡 Feedback em Tempo Real
- Mensagem muda conforme seleção:
  - "Selecione o período" (inicial)
  - "Selecione a data final" (após primeiro click)
  - "5 Mar - 12 Mar 2025" (preview do range)

### 8. 📱 Responsivo
- Funciona em diferentes tamanhos de tela
- Popover se ajusta automaticamente

---

## 🎨 Customização (Se Necessário)

### Cores
```tsx
// Azul padrão (não alterar sem necessidade)
isSelected: 'bg-blue-500 text-white hover:bg-blue-600'
isInRange: 'bg-blue-100'
isHovering: 'bg-blue-50'
```

### Tamanho do Botão
```tsx
// Padrão: w-full h-9
className="w-full justify-start text-left h-9"
```

### Label
```tsx
// O componente já tem label "De - até"
// Para customizar, edite linha 196 do DateRangePicker.tsx
<Label className="text-xs text-gray-600 mb-1.5 block">
  Seu Label Aqui
</Label>
```

---

## 🏗️ Componentes Que Já Usam

✅ **CalendarHeader** - Filtro de período do calendário principal  
✅ **ExportModal** - Seleção de período para exportação  
✅ **SeasonalityModal** - Definição de períodos de sazonalidade  
✅ **QuotationModal** - Período de cotação para hóspedes  

---

## 🔍 Validações Automáticas

O componente JÁ FAZ:
- ✅ Impede selecionar datas fora do mês visível
- ✅ Inverte automaticamente se data final < inicial
- ✅ Desabilita botão "Aplicar" se range incompleto
- ✅ Reseta seleção temporária ao cancelar
- ✅ Mantém estado anterior se popover fechar sem aplicar

O componente **NÃO FAZ** (você precisa adicionar se necessário):
- ❌ Validação de data mínima/máxima
- ❌ Bloqueio de datas específicas (ex: passado)
- ❌ Limite de dias no range (ex: máximo 30 dias)
- ❌ Validação de conflitos com reservas

**Para adicionar validações customizadas:**
```tsx
const handleDateRangeChange = (range: { from: Date; to: Date }) => {
  // Sua validação aqui
  if (range.to < new Date()) {
    toast.error('Data final não pode ser no passado');
    return;
  }
  
  // Se validou, salva
  setDateRange(range);
};
```

---

## 📦 Dependências

```json
{
  "date-fns": "^2.x",
  "lucide-react": "^0.x"
}
```

**Componentes shadcn usados:**
- `Button` (`./ui/button`)
- `Popover` (`./ui/popover`)

---

## 🐛 Troubleshooting

### Problema: DateRangePicker não aparece
**Solução:** Verifique se o Popover está com z-index correto

### Problema: Datas em inglês
**Solução:** Verifique se `ptBR` está importado corretamente de `date-fns/locale`

### Problema: Range não aplica ao clicar em "Aplicar"
**Solução:** Verifique se `onDateRangeChange` está conectado ao state

### Problema: Componente não aceita datas iniciais
**Solução:** Garanta que `dateRange.from` e `dateRange.to` sejam objetos `Date` válidos

---

## 📝 Changelog

### v1.0.52 (28 OUT 2025)
- 🎯 Estabelecido como componente padrão oficial
- 📝 Documentação completa criada
- ✅ Guidelines adicionadas

### v1.0.45 (27 OUT 2025)
- ✨ Componente criado originalmente
- 🎨 Interface visual definida
- 🔧 Funcionalidades básicas implementadas

---

## 🚀 Próximos Passos (Se Necessário)

Possíveis melhorias futuras (NÃO implementar sem demanda):
- [ ] Presets rápidos (Últimos 7 dias, Último mês, etc.)
- [ ] Suporte a timezone
- [ ] Destacar feriados
- [ ] Bloquear datas específicas
- [ ] Limite de range (mínimo/máximo de dias)
- [ ] Modo dark theme

---

## 📞 Suporte

Para dúvidas ou problemas com o DateRangePicker:
1. Consulte esta documentação
2. Verifique exemplos nos componentes que já usam
3. Consulte o código-fonte em `/components/DateRangePicker.tsx`
4. Registre no LOG_ATUAL.md se encontrar bugs

---

**Última atualização:** 28 OUT 2025  
**Responsável:** Sistema Rendizy  
**Status:** ✅ ATIVO E OBRIGATÓRIO
