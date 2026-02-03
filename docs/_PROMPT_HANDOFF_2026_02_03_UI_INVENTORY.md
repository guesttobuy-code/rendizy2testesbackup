# 🔄 PROMPT DE HANDOFF - Inventário UI & Mapeamento OTA

**Data:** 2026-02-03 00:30  
**Sessão anterior:** Mapeamento de telas Rendizy vs Stays.net  
**Próxima ação:** Continuar recebendo prints e definir sprints de implementação

---

## 📋 COPIE TUDO ABAIXO PARA O NOVO CHAT

---

```
Olá! Estou continuando um trabalho de mapeamento de telas para integração OTA no Rendizy (SaaS de gestão de aluguel por temporada).

## 🎯 CONTEXTO DO PROJETO

O Rendizy é um sistema SaaS para gestão de imóveis de temporada que precisa integrar com OTAs (Expedia Group, Booking.com, Airbnb). Estamos fazendo um inventário completo das telas existentes comparando com o Stays.net (PMS em produção real) para identificar GAPs e planejar implementação em sprints.

## 📁 DOCUMENTOS CRÍTICOS A LER (em ordem)

### 1. DOCUMENTO PRINCIPAL - Leia PRIMEIRO:
`docs/roadmaps/FUNCTIONAL_MAPPING_OTA_FIELDS.md` (v3.1, ~1000 linhas)

Este documento contém:
- PARTE 1: Mapeamento funcional de campos OTA → funcionalidades
- PARTE 2: Inventário de 63+ telas (31 Rendizy + 32+ Stays)
- PARTE 3: Análise comparativa Global ↔ Individual
- Tabela de GAPs identificados
- Padrão de código para relacionamento Global/Individual

### 2. ARQUITETURA OTA:
- `docs/architecture/ADR-001-OTA-UNIVERSAL-ARCHITECTURE.md` - Princípios de design
- `docs/architecture/ADR-002-OTA-UNIVERSAL-SCHEMA.md` - Schema universal de campos
- `docs/architecture/ADR-003-MIGRATIONS-OTA-ORDER.md` - Ordem das 12 migrations

### 3. ROADMAPS:
- `docs/MASTER_CHECKLIST_OTA_2026_02.md` - Checklist principal
- `docs/roadmaps/ROADMAP_EXPEDIA_GAP_ANALYSIS.md` - Gap analysis Expedia

### 4. HANDOFF ANTERIOR:
- `docs/_PROMPT_HANDOFF_2026_02_02_OTA_UI.md` - Contexto inicial desta sessão

## 🔑 CONCEITOS CRÍTICOS ESTABELECIDOS

### 1. Padrão GLOBAL ↔ INDIVIDUAL
```
GLOBAL (Configurações Gerais)     ←→     INDIVIDUAL (No Anúncio)
/settings/reservas                       /properties/:id/edit
/settings/precificacao                   > FINANCEIRO > Relacionamento
                                         > CONFIGURAÇÕES > *

┌─────────────────┐                      ┌─────────────────┐
│  DEFAULT        │  ─── herda de ───►  │  OVERRIDE       │
│  (organização)  │  ◄── se vazio ───   │  (por anúncio)  │
└─────────────────┘                      └─────────────────┘
```

### 2. Padrão Stays.net a seguir
- Cada config tem toggle `[Global] [Individual]`
- Botão `[Prévia]` para visualizar resultado
- Link "Saiba mais" para documentação

### 3. RESSALVA IMPORTANTE
⚠️ Muitas telas do Rendizy foram CRIADAS mas NÃO ESTÃO FUNCIONAIS.
⚠️ Não confiar cegamente no que está na UI.
⚠️ O Stays.net (produção real) é a REFERÊNCIA de como deve funcionar.

## 📊 INVENTÁRIO ATUAL

### RENDIZY (31 telas documentadas):
- Formulário de Anúncio: 17 abas (Conteúdo 7, Financeiro 5, Configurações 5)
- Settings/Properties: 4 sub-abas
- Settings/Reservas: 2 sub-abas
- Settings/Precificação: 1 aba
- Settings/Chat: 2 abas
- Settings/Integrações: 5 telas (incluindo modal Expedia com 4 abas)

### STAYS.NET (32+ telas documentadas):
- No Anúncio: house_rules (3), contract (6), sellprice (2), reservation-settings (2), icalendar (1), partnership (1)
- Configs Globais: language, currency, pricing (2), listing, accounting, exchange, timezone
- Configs Reserva: duration, inout, block, prebooking, instantbooking, invoice, contract, policy

## ⚠️ GAPS PRINCIPAIS IDENTIFICADOS

1. **Falta Global de Comissão/Repasse no Rendizy** - Stays tem em `/contract` com G/I
2. **Falta padrão visual "Global/Individual"** - Stays tem toggle claro
3. **E-mails por evento não vinculados ao anúncio** - Stays tem 8+ tipos por anúncio
4. **Falta Fuso Horário e Idiomas em Settings** - Stays tem configuração clara
5. **Abas "Em desenvolvimento" no anúncio** - Check-in, Regras Casa, Políticas, Integração

## 🗄️ MIGRATIONS JÁ EXECUTADAS (12)

01-Foundation, 02-Cancellation/Rates, 03-Multi-room, 04-Payments, 05-Webhooks, 
07-Seeds, 08-CRM, 09-History, 10-Trigger, 11-Rooms, 12-Check-in

⚠️ CRÍTICO: `reservations.id` é TEXT, não UUID!

## 🔧 STACK TÉCNICA

- Frontend: React + TypeScript + Vite + shadcn/ui + Tailwind
- Backend: Supabase (PostgreSQL)
- Server rodando em: localhost:3004

## 📸 O QUE FALTA DOCUMENTAR

O usuário estava enviando prints do Stays.net. Podem faltar:
- Hóspedes (configs globais)
- Proprietários (configs globais)
- E-mails (configs globais)
- Tarefas operacionais
- Informações da empresa
- Setores específicos (Locação, Venda, Turismo)

## 🎯 PRÓXIMOS PASSOS

1. Continuar recebendo prints do usuário e documentar em FUNCTIONAL_MAPPING_OTA_FIELDS.md
2. Após completar inventário, definir sprints de implementação
3. Criar componente padrão GlobalIndividualToggle
4. Implementar as abas "Em desenvolvimento" do anúncio

## 📝 INSTRUÇÕES

1. Leia o arquivo `docs/roadmaps/FUNCTIONAL_MAPPING_OTA_FIELDS.md` PRIMEIRO
2. Mantenha o documento organizado - ele será nosso norte para sprints
3. Quando o usuário enviar prints, adicione ao documento na seção apropriada
4. Sempre atualize a versão e data do documento ao modificar
5. O usuário pode ter mais 10-15 prints para enviar ainda
```

---

## ✅ CHECKLIST ANTES DE COLAR

- [ ] Abrir novo chat no VS Code
- [ ] Colar o prompt acima
- [ ] Anexar qualquer print pendente
- [ ] Confirmar que o assistente leu o documento principal

---

*Handoff criado em 2026-02-03 00:30*
