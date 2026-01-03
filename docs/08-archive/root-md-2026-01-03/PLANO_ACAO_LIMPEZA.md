# 🎯 PLANO DE AÇÃO - LIMPEZA E CONSOLIDAÇÃO

**Data:** 2025-11-22  
**Objetivo:** Limpar e consolidar código/banco de forma sustentável

---

## ✅ AÇÃO IMEDIATA (FAZER AGORA)

### **1. Verificar Estado do Banco (5 minutos)**
1. Abrir Supabase Dashboard
2. Ir em SQL Editor
3. Executar `VERIFICAR_ESTADO_BANCO.sql`
4. Verificar quais tabelas existem
5. Se faltar alguma → Aplicar migration correspondente

### **2. Commitar Código Restaurado (2 minutos)**
```bash
git add RendizyPrincipal/utils/services/evolutionContactsService.ts
git add RendizyPrincipal/components/EvolutionContactsList.tsx
git commit -m "fix: Restaurar persistência SQL de conversas"
git push
```

### **3. Testar Funcionalidades Críticas (10 minutos)**
- [ ] Login funciona
- [ ] Conversas persistem após logout
- [ ] Contatos salvos no SQL

---

## 📋 AÇÕES DE CURTO PRAZO (ESTA SEMANA)

### **1. Consolidar Rotas (2-3 horas)**
**Problema:** Inconsistência entre rotas com/sem `make-server-67caf26a`

**Solução:**
1. Escolher padrão: `/rendizy-server/...` (sem prefixo)
2. Atualizar backend: remover `make-server-67caf26a` de todas as rotas
3. Atualizar frontend: remover `make-server-67caf26a` de todas as chamadas
4. Testar todas as rotas

**Prioridade:** 🟡 MÉDIA

### **2. Migrar uma Entidade do KV Store (3-4 horas)**
**Escolher uma entidade simples primeiro:**
- Properties (já parcialmente SQL)
- Ou Guests (menor complexidade)

**Passos:**
1. Verificar se tabela SQL existe
2. Criar migration se necessário
3. Atualizar rotas para usar SQL
4. Testar
5. Remover código KV Store daquela entidade

**Prioridade:** 🟡 MÉDIA

---

## 🎯 AÇÕES DE MÉDIO PRAZO (ESTE MÊS)

### **1. Migrar Todas as Entidades do KV Store**
**Ordem sugerida:**
1. Properties
2. Reservations
3. Guests
4. Chat/Conversations
5. WhatsApp

**Estratégia:** Uma entidade por vez, testar bem antes de passar para próxima

**Prioridade:** 🟡 MÉDIA

### **2. Limpar localStorage**
**Objetivo:** Garantir que localStorage só seja usado para cache

**Ação:**
1. Identificar todos os usos
2. Migrar dados críticos para SQL
3. Manter apenas cache temporário

**Prioridade:** 🟢 BAIXA

---

## 📝 REGRAS PARA EVITAR BAGUNÇA NO FUTURO

### **1. Antes de Fazer Mudanças:**
- ✅ Ler `Ligando os motores.md`
- ✅ Ler `REGRAS_ESTABELECIDAS_REFERENCIA_RAPIDA.md`
- ✅ Executar `validar-regras.ps1`
- ✅ Verificar se não está quebrando algo que já funciona

### **2. Ao Fazer Mudanças:**
- ✅ Commitar frequentemente
- ✅ Testar antes de commitar
- ✅ Documentar mudanças importantes
- ✅ Não misturar múltiplas mudanças em um commit

### **3. Após Fazer Mudanças:**
- ✅ Testar funcionalidades relacionadas
- ✅ Verificar se não regrediu algo
- ✅ Atualizar documentação se necessário

---

## 🚨 SINAIS DE ALERTA

**Se você ver isso, PARAR e REVISAR:**
- ❌ Usando localStorage para dados críticos
- ❌ Usando KV Store para dados permanentes
- ❌ Criando múltiplos polling simultâneos
- ❌ Adicionando complexidade desnecessária
- ❌ Quebrando algo que já funcionava

---

## ✅ CHECKLIST DE VALIDAÇÃO PERIÓDICA

**A cada semana, verificar:**
- [ ] Banco de dados está consistente
- [ ] Todas as migrations foram aplicadas
- [ ] Código não tem regressões
- [ ] Documentação está atualizada
- [ ] Rotas estão consistentes

---

**Última atualização:** 2025-11-22  
**Status:** 📋 Plano de ação criado - Pronto para executar

