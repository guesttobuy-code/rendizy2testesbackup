# 🚀 GUIA RÁPIDO - MÓDULO DE RESERVAS v1.0.73

**Versão**: v1.0.73  
**Data**: 28 de outubro de 2025  
**Tempo de leitura**: 5 minutos

---

## 📍 COMO ACESSAR

### Passo 1: Acesse o Admin Master
1. Na barra lateral esquerda, clique em **"Admin Master"**
2. Você verá as abas: Overview | Imobiliárias | **Reservas** | Sistema | Configurações

### Passo 2: Abra a Tab Reservas
1. Clique na aba **"Reservas"** (ícone de calendário 📅)
2. A tela de gerenciamento completo será exibida

---

## 📊 VISÃO GERAL DA TELA

### Cards de Estatísticas (Topo)

```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ Total       │ Confirmadas │ Pendentes   │ Revenue     │
│ Reservas    │ (verde)     │ (amarelo)   │ Total       │
│ 📅 150      │ ✅ 120      │ ⏳ 25       │ 💰 R$ 50K  │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

### Filtros (Abaixo dos Cards)

```
┌────────────────┬─────────────┬──────────────┬──────────────┐
│ 🔍 Buscar...   │ Status ▼    │ Plataforma ▼ │ Propriedade ▼│
└────────────────┴─────────────┴──────────────┴──────────────┘
```

### Tabela de Reservas

| ID | Hóspede | Propriedade | Check-in | Check-out | Noites | Status | Plataforma | Total | Ações |
|----|---------|-------------|----------|-----------|--------|--------|------------|-------|-------|
| abc123 | João Silva | Casa Praia | 01/11/2025 | 05/11/2025 | 4 | Confirmada | Airbnb | R$ 2.000 | 👁️ ✏️ ❌ |

### Dashboard de Conflitos (Rodapé)

```
┌──────────────────────────────────────────────────────┐
│ ⚠️ Detecção de Conflitos (Overbooking)              │
│                                                      │
│ [🔍 Detectar Conflitos]                             │
│                                                      │
│ ✅ Nenhum conflito detectado!                       │
└──────────────────────────────────────────────────────┘
```

---

## 🔍 COMO USAR OS FILTROS

### 1. Busca por Texto
**Campo**: 🔍 Buscar...

**Busca em**:
- ID da reserva
- Nome do hóspede
- Email do hóspede
- Nome da propriedade

**Exemplo**: Digite "João" para encontrar todas as reservas de hóspedes chamados João

### 2. Filtro por Status
**Opções**:
- ✅ **Confirmada**: Reservas ativas
- ⏳ **Pendente**: Aguardando confirmação
- 🏠 **Check-in**: Hóspede já entrou
- 🚪 **Check-out**: Hóspede já saiu
- ✔️ **Concluída**: Finalizada
- ❌ **Cancelada**: Cancelada

**Como usar**: Clique no dropdown "Status" e selecione a opção desejada

### 3. Filtro por Plataforma
**Opções**:
- 🌸 **Airbnb**
- 🔵 **Booking**
- 🟠 **Decolar**
- 🟢 **Direto**
- ⚪ **Outro**

**Como usar**: Clique no dropdown "Plataforma" e selecione a opção desejada

### 4. Filtro por Propriedade
**Opções**: Lista dinâmica de todas as propriedades cadastradas

**Como usar**: Clique no dropdown "Propriedade" e selecione a propriedade desejada

### 💡 DICA: Combine Filtros!
Você pode usar múltiplos filtros simultaneamente. Exemplo:
- Status: **Confirmada**
- Plataforma: **Airbnb**
- Busca: **"Praia"**

Resultado: Todas as reservas confirmadas do Airbnb em propriedades com "Praia" no nome

---

## 👁️ AÇÕES DISPONÍVEIS

### 1. Ver Detalhes (Ícone de Olho 👁️)

**O que faz**: Abre um modal com todas as informações da reserva

**Informações exibidas**:
- Dados do hóspede
- Dados da propriedade
- Datas e duração
- Preços detalhados
- Status de pagamento
- Histórico de alterações

**Sempre disponível**: ✅ Sim

---

### 2. Editar (Ícone de Lápis ✏️)

**O que faz**: Abre o wizard de edição para alterar a reserva

**Pode editar**:
- Datas (check-in/check-out)
- Dados do hóspede
- Número de adultos/crianças
- Notas internas
- Preço

**Validações**:
- ⚠️ Detecta conflitos se alterar datas
- ⚠️ Recalcula preço automaticamente
- ⚠️ Valida minNights da propriedade

**Quando está desabilitado**: Se a reserva foi cancelada

---

### 3. Cancelar (Ícone de X ❌)

**O que faz**: Cancela a reserva (soft delete)

**Confirmação**: Sim, pede confirmação antes de cancelar

**O que acontece**:
- Status muda para "Cancelada"
- Propriedade fica disponível novamente
- Reserva permanece no histórico
- Não pode ser desfeito (precisa criar nova)

**Quando está desabilitado**: Se a reserva já foi cancelada ou está concluída

---

## ⚠️ DETECÇÃO DE CONFLITOS

### O que é Overbooking?
É quando duas ou mais reservas estão marcadas para a mesma propriedade em datas que se sobrepõem.

### Como Detectar

**Passo 1**: Role até o final da página

**Passo 2**: Clique no botão **"🔍 Detectar Conflitos"**

**Passo 3**: Aguarde a análise

### Resultados Possíveis

#### ✅ Sem Conflitos
```
┌──────────────────────────────────────┐
│ ✅ Parabéns!                         │
│ Nenhum overbooking detectado.        │
│ Todas as reservas estão organizadas. │
└──────────────────────────────────────┘
```

#### ⚠️ Com Conflitos
```
┌──────────────────────────────────────────┐
│ ⚠️ Atenção!                              │
│ 3 conflitos detectados                   │
│ 6 reservas afetadas                      │
│ 2 propriedades afetadas                  │
│                                          │
│ 📍 Casa da Praia                         │
│ Conflito em 15/11/2025                   │
│ 2 reservas sobrepostas                   │
│                                          │
│ Reserva #1: abc123                       │
│ Check-in: 14/11/2025                     │
│ Check-out: 16/11/2025                    │
│                                          │
│ Reserva #2: def456                       │
│ Check-in: 15/11/2025                     │
│ Check-out: 17/11/2025                    │
│                                          │
│ [Ver Detalhes] [Cancelar Mais Recente]  │
└──────────────────────────────────────────┘
```

### Como Resolver Conflitos

**Opções**:
1. **Cancelar uma das reservas**
2. **Alterar as datas** de uma das reservas
3. **Mover para outra propriedade**

**Recomendação**: Sempre cancele a reserva mais recente ou menos importante

---

## 🎛️ ALTERNANDO ENTRE MOCK MODE E REAL MODE

### O que é?
- **Mock Mode**: Dados salvos apenas no navegador (localStorage)
- **Real Mode**: Dados salvos no Supabase (banco real)

### Quando usar cada um?

**Mock Mode** (Roxo 🟣):
- ✅ Desenvolvimento
- ✅ Testes
- ✅ Demonstrações
- ⚠️ Dados NÃO compartilhados entre dispositivos

**Real Mode** (Verde 🟢):
- ✅ Produção
- ✅ Dados reais
- ✅ Sincronização global
- ✅ Persistência garantida

### Como Alternar

**Passo 1**: Vá para Admin Master > **Sistema**

**Passo 2**: Localize o card "Modo de Backend"

**Passo 3**: Clique no botão **"Alternar para [Modo]"**

**Passo 4**: Aguarde o reload automático (2 segundos)

**Passo 5**: Verifique o indicador visual:
- 🟣 Roxo = Mock Mode
- 🟢 Verde = Real Mode

### ⚠️ IMPORTANTE
- Os dados de cada modo são **independentes**
- Não são compartilhados entre os modos
- Ao mudar de modo, você verá dados diferentes

---

## 💡 DICAS E BOAS PRÁTICAS

### 1. Use Filtros para Encontrar Rapidamente
Em vez de rolar a tabela inteira, use:
- Busca por texto para encontrar por nome
- Filtro de status para ver apenas confirmadas
- Filtro de plataforma para análise por canal

### 2. Detecte Conflitos Regularmente
Recomendação: **Uma vez por semana**

Melhor ainda: **Após criar/editar muitas reservas**

### 3. Atenção nas Datas
Ao editar reservas:
- ⚠️ O sistema detecta conflitos automaticamente
- ⚠️ Se houver conflito, a edição será bloqueada
- ⚠️ Resolva o conflito antes de tentar novamente

### 4. Use Real Mode em Produção
- ✅ Sempre use **Real Mode** (verde) em produção
- ✅ Mock Mode só para desenvolvimento

### 5. Revise Antes de Cancelar
- ⚠️ Cancelamento não pode ser desfeito
- ⚠️ Confirme se é a reserva certa
- ⚠️ Verifique se há pagamentos já feitos

---

## ❓ TROUBLESHOOTING

### Problema: Nenhuma reserva aparece

**Soluções**:
1. Clique em **"Atualizar"** (botão no topo)
2. Verifique se há filtros ativos
3. Remova todos os filtros (selecione "Todos")
4. Verifique se está no modo correto (Mock vs Real)

### Problema: Erro ao detectar conflitos

**Soluções**:
1. Verifique sua conexão com a internet
2. Recarregue a página
3. Tente novamente em alguns segundos
4. Se persistir, contate o suporte

### Problema: Botão "Editar" está desabilitado

**Motivos possíveis**:
1. Reserva foi cancelada (não pode editar)
2. Você não tem permissão (role)

**Solução**: Verifique o status da reserva

### Problema: Página muito lenta

**Soluções**:
1. Use filtros para reduzir o número de reservas exibidas
2. Limpe o cache do navegador
3. Recarregue a página
4. Verifique se está no Real Mode (mais rápido que Mock)

---

## 📞 SUPORTE

### Documentação Completa
- **DIARIO_RENDIZY**: `/docs/logs/2025-10-28_alinhamento-reservas-v1.0.73.md`
- **Changelog**: `/docs/changelogs/CHANGELOG_V1.0.73.md`
- **Resumo**: `/docs/RESUMO_ALINHAMENTO_RESERVAS_v1.0.73.md`

### Dúvidas?
Consulte a documentação completa ou entre em contato com a equipe RENDIZY.

---

## 🎯 PRÓXIMAS FUNCIONALIDADES

Em desenvolvimento:
- 📊 Dashboard de Analytics
- 📧 Notificações por email
- 📥 Exportação de dados (CSV/PDF)
- 🤖 Auto-resolução de conflitos
- 📱 App mobile

---

**Versão do Guia**: v1.0.73  
**Última Atualização**: 28 de outubro de 2025
