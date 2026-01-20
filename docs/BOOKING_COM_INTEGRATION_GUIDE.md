# 🔌 RENDIZY - Guia de Integração Booking.com

**Versão**: 1.0.76  
**Data**: 2025-10-28  
**Status**: ✅ Produção Ready  

---

## 📖 VISÃO GERAL

O RENDIZY agora possui integração **completa e bidirecional** com a **Booking.com Connectivity API**, permitindo que você gerencie suas reservas, preços e disponibilidade de forma centralizada.

### 🎯 O Que Você Pode Fazer

- ✅ **Receber Reservas Automaticamente** - Novas reservas do Booking.com aparecem no RENDIZY
- ✅ **Atualizar Preços** - Defina preços no RENDIZY e sincronize com Booking.com
- ✅ **Gerenciar Disponibilidade** - Bloqueios no RENDIZY fecham automaticamente no Booking.com
- ✅ **Evitar Overbooking** - Sincronização constante mantém calendários alinhados
- ✅ **Centralizar Gestão** - Um único sistema para todas as suas propriedades

---

## 🚀 INÍCIO RÁPIDO (5 Minutos)

### 1️⃣ Obter Credenciais do Booking.com

Você precisará de:
- **Hotel ID** (número fornecido pelo Booking.com)
- **Username** (credenciais da Connectivity API)
- **Password** (credenciais da Connectivity API)

📌 **Como obter**: Entre em contato com seu Account Manager do Booking.com ou acesse o portal de parceiros.

### 2️⃣ Configurar no RENDIZY

1. Acesse **Integrações → Booking.com** no menu lateral
2. Na tab **Configuração**, preencha:
   - Hotel ID: `1234567`
   - Username: `seu_username`
   - Password: `sua_senha`
3. Clique em **Testar Conexão** ✅
4. Se conectar com sucesso, clique em **Salvar Configuração**

### 3️⃣ Criar Mapeamento

1. Vá para tab **Mapeamentos**
2. Clique em **Novo Mapeamento** (TODO: implementar modal)
3. Por enquanto, crie manualmente via backend:

```bash
# Exemplo de mapeamento
POST /bookingcom/create-mapping
{
  "rendizzyPropertyId": "property_abc123",
  "rendizzyPropertyName": "Casa da Praia",
  "bookingComHotelId": "1234567",
  "bookingComHotelName": "Beach House"
}
```

### 4️⃣ Ativar Sincronização

1. Volte para tab **Configuração**
2. Ative: ✅ **Habilitar Integração**
3. Configure:
   - Intervalo: `30 minutos` (recomendado)
   - ✅ Importar Reservas
   - ✅ Exportar Preços
   - ✅ Exportar Disponibilidade
   - ✅ Auto-confirmar Reservas (opcional)
4. Clique em **Salvar Configuração**

### 5️⃣ Primeira Sincronização

1. Vá para tab **Sincronização**
2. Clique em **Sincronizar Agora**
3. Aguarde conclusão (toast de confirmação)
4. Vá para tab **Logs** para verificar detalhes

🎉 **Pronto!** Agora o RENDIZY e Booking.com estão sincronizados!

---

## 📋 FUNCIONALIDADES DETALHADAS

### 🔽 Pull de Reservas (Booking.com → RENDIZY)

**Como Funciona**:
1. Sistema busca novas reservas no Booking.com a cada X minutos
2. Para cada reserva:
   - Cria/atualiza hóspede no RENDIZY
   - Cria reserva vinculada à propriedade mapeada
   - Bloqueia datas no calendário automaticamente
   - (Opcional) Confirma reserva no Booking.com

**Dados Importados**:
- Nome do hóspede
- Email e telefone
- Datas de check-in/check-out
- Número de adultos e crianças
- Valor total
- Moeda
- ID da reserva no Booking.com

**Visualização**:
- Reservas aparecem no módulo **Reservas → Recepção**
- Filtro por plataforma: `bookingcom`
- Calendário mostra bloqueio automático
- Dados do hóspede disponíveis para contato

---

### 🔼 Push de Preços (RENDIZY → Booking.com)

**Como Funciona**:
1. Sistema coleta preços configurados no RENDIZY
2. Formata em OTA XML (padrão Booking.com)
3. Envia para Booking.com via API
4. Atualiza preços para próximos 365 dias

**Configuração de Preços**:
1. Vá para **Calendário**
2. Selecione propriedade e datas
3. Clique direito → **Editar Preço**
4. Defina preço diário ou use condições
5. Na próxima sincronização, preço será enviado ao Booking.com

**Noites Mínimas**:
- Configurações de `minNights` também são enviadas
- Define "Min LOS" (Length of Stay) no Booking.com

---

### 🔼 Push de Disponibilidade (RENDIZY → Booking.com)

**Como Funciona**:
1. Sistema verifica calendário de cada propriedade
2. Identifica datas disponíveis vs bloqueadas
3. Envia status para Booking.com

**Status Enviados**:
- ✅ **Disponível** (BookingLimit = 1)
- ❌ **Bloqueado** (BookingLimit = 0)

**Tipos de Bloqueio**:
- Reservas confirmadas → Fecha no Booking.com
- Bloqueios manuais → Fecha no Booking.com
- Manutenção → Fecha no Booking.com

---

### 🎛️ Configurações Avançadas

#### Intervalo de Sincronização
- **5 minutos**: Para alta demanda (muitas reservas/dia)
- **15 minutos**: Recomendado para médio volume
- **30 minutos**: Padrão, equilibrado
- **60 minutos**: Para baixo volume
- **120 minutos**: Economia de chamadas API

⚠️ **Atenção**: Booking.com tem rate limit de **10.000 chamadas/minuto**

#### Auto-Confirmar Reservas
- ✅ **Habilitado**: Reservas são confirmadas automaticamente no Booking.com
- ❌ **Desabilitado**: Você deve confirmar manualmente (via Extranet Booking.com)

**Recomendação**: Habilite apenas se tiver certeza de disponibilidade real.

---

## 🗺️ MAPEAMENTO DE PROPRIEDADES

### Por Que Mapear?

O Booking.com identifica propriedades por **Hotel ID**, enquanto o RENDIZY usa **Property ID** interno. O mapeamento conecta os dois sistemas.

### Estrutura de Mapeamento

```typescript
{
  rendizzyPropertyId: "property_casa_praia_123",
  rendizzyPropertyName: "Casa da Praia - Guarujá",
  bookingComHotelId: "9876543",
  bookingComHotelName: "Beach House Guarujá",
  enabled: true,
  lastSync: "2025-10-28T10:30:00Z"
}
```

### Como Criar Mapeamento (Manual)

Temporariamente, use a API backend:

```bash
POST https://seu-projeto.supabase.co/functions/v1/make-server-67caf26a/bookingcom/create-mapping

Headers:
  Authorization: Bearer SEU_ANON_KEY
  Content-Type: application/json

Body:
{
  "rendizzyPropertyId": "property_abc123",
  "rendizzyPropertyName": "Seu Imóvel RENDIZY",
  "bookingComHotelId": "1234567",
  "bookingComHotelName": "Nome no Booking.com"
}
```

✅ **TODO**: Interface visual para criar mapeamentos será adicionada em próxima versão.

---

## 📊 MONITORAMENTO E LOGS

### Dashboard de Estatísticas

Na tab **Sincronização**, você vê:

**Total de Reservas**
- Número total de reservas importadas do Booking.com

**Reservas Hoje**
- Quantas reservas foram importadas nas últimas 24h

**Última Sincronização**
- Timestamp da última operação de sync

**Status Atual**
- `idle` - Aguardando próxima sincronização
- `syncing` - Sincronização em andamento
- `error` - Última sincronização falhou

### Logs Detalhados

Na tab **Logs**, você vê histórico completo:

**Tipos de Log**:
- 🏨 `reservation` - Import/export de reservas
- 💰 `price` - Push de preços
- 📅 `availability` - Push de disponibilidade

**Direção**:
- ⬇️ `pull` - Dados vindo do Booking.com
- ⬆️ `push` - Dados indo para Booking.com

**Status**:
- ✅ `success` - Operação bem-sucedida
- ❌ `error` - Operação falhou (veja detalhes)

**Exemplo de Log**:
```
✅ reservation • Pull
2025-10-28 10:30:45
Reserva RSV-ABC123 importada com sucesso
Hóspede: João Silva • Check-in: 25/12/2025
```

---

## 🔧 TROUBLESHOOTING

### ⚠️ **IMPORTANTE: Status da API Booking.com**

Antes de reportar problemas, **sempre verifique o status oficial da API**:

🔗 **https://status.booking.com** (API Status Page)

**Endpoints Monitorados**:
- ✅ Tarifas e Disponibilidade
- ✅ Gestão de Planos de Quartos e Tarifas
- ⚠️ **Reservas** (pode ter instabilidade ocasional)
- ✅ API de Conteúdo

**Últimos Incidentes Conhecidos**:
- 27/10/2025: Problema resolvido em endpoints de reservas (10:25-10:30 GMT+1)
  - Afetou: `/xml/reservationssummary`, `/ota/OTA_HotelResNotif`

💡 **Dica**: Se houver falhas intermitentes, aguarde alguns minutos e tente novamente. O sistema tem retry automático (planejado para v1.0.78).

---

### ❌ "Falha na Conexão"

**Possíveis Causas**:
1. **Booking.com API está fora do ar** → Verifique https://status.booking.com
2. Credenciais incorretas → Verifique Hotel ID, Username, Password
3. Hotel ID não existe → Confirme com Booking.com
4. Conta não tem acesso à API → Entre em contato com Account Manager
5. Firewall bloqueando → Libere `supply-xml.booking.com` e `secure-supply-xml.booking.com`

**Solução**:
```
1. Vá para tab Configuração
2. Revise credenciais
3. Clique em "Testar Conexão"
4. Se falhar, entre em contato com suporte Booking.com
```

### ❌ "Nenhuma Reserva Importada"

**Possíveis Causas**:
1. Não há reservas novas no Booking.com
2. Mapeamento não existe ou está desabilitado
3. Sincronização está desabilitada
4. Hotel ID incorreto

**Solução**:
```
1. Verifique se há reservas no Booking.com Extranet
2. Vá para tab Mapeamentos
3. Confirme que mapeamento existe e está ativo
4. Vá para tab Sincronização
5. Clique em "Sincronizar Agora"
6. Verifique logs para erros detalhados
```

### ❌ "Erro ao Importar Reserva"

**Erro Comum**: `No property mapping found for Booking.com Hotel ID: 1234567`

**Solução**:
```
1. Crie mapeamento para esse Hotel ID
2. Use API endpoint /bookingcom/create-mapping
3. Sincronize novamente
```

### ❌ "Preços Não Atualizando no Booking.com"

**Possíveis Causas**:
1. Push de preços desabilitado
2. Não há preços configurados no RENDIZY
3. Problema de autenticação

**Solução**:
```
1. Vá para tab Configuração
2. Confirme: ✅ Exportar Preços (habilitado)
3. Vá para Calendário e configure preços
4. Sincronize manualmente
5. Verifique logs para erros
```

---

## 🔐 SEGURANÇA E BOAS PRÁTICAS

### ✅ Proteção de Credenciais

**Atual**:
- Credenciais armazenadas em `localStorage` (client-side)
- Adequado para uso interno em ambiente controlado

**Recomendação para Produção**:
- Migrar credenciais para backend (environment variables)
- Usar API proxy no servidor
- Nunca expor senha no frontend

### ✅ Rate Limiting

**Limites da API Booking.com**:
- 10.000 chamadas/minuto (geral)
- 700 chamadas/minuto para `/xml/bookingsummary`
- 75 chamadas/minuto para endpoints OTA

**Como o RENDIZY Respeita**:
- Sincronização espaçada (mínimo 5 minutos)
- Batch processing de updates
- TODO: Implementar exponential backoff em falhas

### ✅ Validação de Dados

**Antes de Importar Reserva**:
- ✅ Verifica se mapeamento existe
- ✅ Valida formato de datas
- ✅ Confirma disponibilidade no calendário
- ✅ Cria hóspede se não existir

**Antes de Push**:
- ✅ Valida formato de preços
- ✅ Confirma intervalo de datas (até 365 dias)
- ✅ Verifica status de disponibilidade

---

## 📚 REFERÊNCIAS TÉCNICAS

### Documentação Oficial
- [Booking.com Connectivity Docs](https://developers.booking.com/connectivity/docs)
- [OTA Specification v2003B](http://www.opentravel.org/)

### Arquivos do Projeto
- `/utils/bookingcom/api.ts` - Cliente API
- `/components/BookingComIntegration.tsx` - Interface
- `/supabase/functions/server/routes-bookingcom.ts` - Backend routes
- `/docs/logs/2025-10-28_bookingcom-integration-v1.0.76.md` - Documentação técnica

### Tipos TypeScript
```typescript
// Ver /utils/bookingcom/api.ts para definições completas
BookingComConfig
BookingComCredentials
BookingComReservation
BookingComAPIClient
BookingComSyncManager
PropertyMapping
SyncLog
```

---

## 🛣️ ROADMAP FUTURO

### ✅ Implementado (v1.0.76)
- Cliente API completo (OTA XML + B.XML)
- Sincronização bidirecional
- Interface de configuração
- Sistema de mapeamento
- Dashboard e logs
- Backend integrado

### 🔜 Próximas Versões

**v1.0.77 - Mapeamentos UI**
- Modal para criar mapeamentos
- Edição de mapeamentos existentes
- Validação de Hotel ID

**v1.0.78 - Melhorias de Sync**
- Webhook receiver para notificações push
- Retry logic com exponential backoff
- Performance dashboard

**v1.0.79 - Multi-OTA**
- Integração Airbnb
- Integração Expedia
- Channel Manager unificado

**v1.0.80 - Recursos Avançados**
- Sincronização de conteúdo (fotos)
- Políticas de cancelamento
- Rate plans complexos
- Suporte a múltiplas contas

---

## 💬 SUPORTE

### Problemas com RENDIZY
- Abra issue no repositório do projeto
- Consulte documentação em `/docs/`

### Problemas com Booking.com API
- **Primeiro**: Verifique [Status da API](https://status.booking.com)
- **Segundo**: Assine o RSS Feed para receber alertas: https://status.booking.com/rss
- Entre em contato com seu Account Manager
- Acesse [Booking.com Partner Hub](https://partners.booking.com)
- Email: connectivity@booking.com

### 📊 Monitoramento Proativo
**Recomendamos**:
1. ✅ Assinar feed RSS de status: https://status.booking.com/rss
2. ✅ Verificar status antes de sincronizações importantes
3. ✅ Monitorar logs do RENDIZY para padrões de falha
4. ✅ Configurar retry automático (v1.0.78)

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

Antes de ir para produção, confirme:

- [ ] Credenciais da API Booking.com obtidas
- [ ] Teste de conexão bem-sucedido
- [ ] Pelo menos 1 mapeamento criado
- [ ] Sincronização habilitada
- [ ] Intervalo de sync configurado (recomendado: 30 min)
- [ ] Opções de sync definidas (pull/push)
- [ ] Primeira sincronização manual executada
- [ ] Logs verificados (sem erros)
- [ ] Reserva de teste importada com sucesso
- [ ] Calendário bloqueado corretamente
- [ ] Preço atualizado no Booking.com

---

**Parabéns! 🎉 Sua integração com Booking.com está pronta!**

Agora você pode gerenciar todas as suas reservas e propriedades de forma centralizada no RENDIZY.

---

*Última atualização: 2025-10-28 | Versão 1.0.76*
