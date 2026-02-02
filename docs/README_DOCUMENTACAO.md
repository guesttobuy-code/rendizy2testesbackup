# 📚 ÍNDICE DA DOCUMENTAÇÃO RENDIZY

> **Como usar este índice:**  
> Sempre que criar um novo arquivo .md, adicione aqui com link e descrição breve.

---

## 🗂️ ESTRUTURA

```
docs/
├── README_DOCUMENTACAO.md (ESTE ARQUIVO - Índice principal)
├── dev-logs/ (Logs diários de desenvolvimento)
├── implementacoes/ (Implementações e post-mortems)
├── operations/ (Setup, deploy, troubleshooting)
├── architecture/ (Arquitetura do sistema)
├── 04-modules/ (Documentação por módulo)
├── api/ (Documentação de APIs)
└── migrations/ (Histórico de migrações)
```

---

## 🧩 MÓDULOS

| Módulo | Documento | Status |
|--------|----------|--------|
| Sites dos Clientes (Edição de site) | [04-modules/SITES_DOS_CLIENTES.md](04-modules/SITES_DOS_CLIENTES.md) | ✅ |

---

## 📅 LOGS DE DESENVOLVIMENTO (Cronológico)

| Data | Arquivo | Resumo | Status |
|------|---------|--------|--------|
| 2024-12-19 | [dev-logs/2024-12-19_staysnet-fix.md](dev-logs/2024-12-19_staysnet-fix.md) | StaysNet 401 corrigido | ✅ |
| 2024-12-18 | [dev-logs/2024-12-18_reservas-uuid.md](dev-logs/2024-12-18_reservas-uuid.md) | UUID e FK constraints | ✅ |
| 2024-12-16 | [dev-logs/2024-12-16_calendario-v2.md](dev-logs/2024-12-16_calendario-v2.md) | Refatoração React Query | ⚠️ Incompleto |

---

## 🧪 IMPLEMENTAÇÕES (Como foi feito)

| Data | Arquivo | Resumo | Status |
|------|---------|--------|--------|
| 2025-12-25 | [implementacoes/IMPLEMENTACAO_STAYSNET_RESERVAS_PRICING_GUEST_BACKFILL_2025-12-25.md](implementacoes/IMPLEMENTACAO_STAYSNET_RESERVAS_PRICING_GUEST_BACKFILL_2025-12-25.md) | Pricing real + guest linkage + backfill StaysNet | ✅ |

---

## 🔧 OPERAÇÕES (Setup, Deploy, Manutenção)

| Documento | Descrição | Quando Usar |
|-----------|-----------|-------------|
| [📘 Índice Operações](operations/README.md) | Índice completo de docs operacionais | Navegação rápida |
| [⚡ Início Rápido](operations/INICIO_RAPIDO.md) | Como iniciar em 5 minutos | Já tem ambiente configurado |
| [📦 Setup Completo](operations/SETUP_COMPLETO.md) | Configuração completa do zero | Primeira vez no projeto |
| [🔧 Troubleshooting](operations/TROUBLESHOOTING.md) | Solução de problemas comuns | Algo não funciona |
| [🔁 Sync Capacidade (Anúncios→Properties)](operations/ANUNCIOS_PROPERTIES_CAPACITY_SYNC.md) | Evita cards com quartos/banheiros/camas/hóspedes desatualizados | Quando edição interna não reflete no card |

**Comandos Rápidos:**
```powershell
# Iniciar desenvolvimento
cd Rendizyoficial-main && npm run dev

# Deploy backend
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc

# Ver logs
npx supabase functions logs rendizy-server --tail
```

---

## 🏗️ ARQUITETURA

| Documento | Descrição | Última Atualização |
|-----------|-----------|-------------------|
| [ARQUITETURA_GERAL.md](ARQUITETURA_GERAL.md) | Visão geral do sistema | 2024-12-19 |
| [ARQUITETURA_MOTOR_RESERVAS.md](../ARQUITETURA_MOTOR_RESERVAS_RENDIZY.md) | Motor de reservas | 2024-11-XX |
| [TRIPE_FUNDAMENTAL.md](TRIPE_FUNDAMENTAL.md) | Imóveis, Hóspedes, Calendário | 2024-12-XX |

---

## 🔌 APIs

| Módulo | Endpoint Base | Documentação | Status |
|--------|---------------|--------------|--------|
| Reservas | `/reservations` | [api/reservations.md](api/reservations.md) | ✅ Ativo |
| Calendário | `/calendar` | [api/calendar.md](api/calendar.md) | ✅ Ativo |
| StaysNet | `/staysnet` | [api/staysnet.md](api/staysnet.md) | ✅ Ativo |
| Anúncios | `/properties` | [api/anuncios.md](api/anuncios.md) | ✅ Ativo |

---

## 🗃️ MIGRAÇÕES DE BANCO

| Data | Arquivo | Descrição | Aplicada? |
|------|---------|-----------|-----------|
| 2024-12-18 | `20241218_ALINHAMENTO_COMPLETO_SCHEMA.sql` | FK para properties | ✅ |
| 2024-12-14 | `20241214_create_reservations_table.sql` | Tabela reservations | ✅ |
| 2024-12-13 | `20251213_anuncio_ultimate_v2.sql` | Sistema Ultimate | ✅ |

---

## 🔧 REFATORAÇÕES IMPORTANTES

| Versão | Data | Descrição | Docs | Status |
|--------|------|-----------|------|--------|
| v2.0.0 | 2024-12-16 | Calendário React Query | [📘_REFATORACAO_CALENDARIO_v2.0.0.md](../📘_REFATORACAO_CALENDARIO_v2.0.0.md) | ⚠️ 90% |
| v1.Como iniciar o projeto?** → [operations/INICIO_RAPIDO.md](operations/INICIO_RAPIDO.md)
2. **Algo não funciona?** → [operations/TROUBLESHOOTING.md](operations/TROUBLESHOOTING.md)
3. **Procurando implementação de feature?** → Busque em `architecture/`
4. **Procurando bug report?** → Veja "Issues Conhecidos" acima
5. **Procurando o que mudou recentemente?** → Veja "Logs de Desenvolvimento"
6
## 🐛 ISSUES CONHECIDOS

| ID | Descrição | Arquivo Relacionado | Status |
|----|-----------|---------------------|--------|
| #42 | Calendário com datas hardcoded | `contexts/CalendarContext.tsx` | 🔴 Aberto |
| #41 | Rota /calendario-v2 não ativa | `App.tsx` | 🔴 Aberto |

---

## 📖 GUIAS

- [COMO_CONTRIBUIR.md](COMO_CONTRIBUIR.md) - Processo de desenvolvimento
- [CONVENCOES_CODIGO.md](CONVENCOES_CODIGO.md) - Padrões de código
- [DEPLOY.md](DEPLOY.md) - Como fazer deploy

---

## 🔍 COMO BUSCAR INFORMAÇÃO

1. **Procurando implementação de feature?** → Busque em `architecture/`
2. **Procurando bug report?** → Veja "Issues Conhecidos" acima
3. **Procurando o que mudou recentemente?** → Veja "Logs de Desenvolvimento"
4. **Procurando como usar API?** → Veja seção "APIs"

---

**Última Atualização:** 2024-12-19  
**Mantenedor:** Time Rendizy
