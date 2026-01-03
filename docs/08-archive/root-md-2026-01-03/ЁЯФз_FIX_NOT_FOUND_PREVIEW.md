# 🔧 FIX RÁPIDO: "Not Found" no Preview

## 🎯 PROBLEMA

Você está vendo "Not Found" ao clicar no botão "Prévia" do Figma Make.

---

## ⚡ SOLUÇÃO IMEDIATA (30 segundos)

### **Opção 1: Testar rota específica**

No preview do Figma Make, **mude a URL manualmente** para:

```
/login              → Sistema de Login
/calendario         → Calendário de Reservas
/properties         → Gestão de Imóveis
/properties/new     → Criar Novo Imóvel
```

**Como fazer:**
1. Clique em "Prévia" (Preview)
2. Quando abrir, adicione `/calendario` no final da URL
3. Pressione Enter

**Exemplo:**
```
DE:   https://preview-xxx.figma.com/
PARA: https://preview-xxx.figma.com/calendario
```

---

### **Opção 2: Verificar Console**

1. No preview, pressione **F12**
2. Vá na aba **Console**
3. Procure erros em vermelho
4. Copie e envie para mim

---

## 🔍 CAUSA PROVÁVEL

O componente `DashboardInicial` pode ter erro ao renderizar. Vou criar uma versão simplificada:

---

## 💡 FIX PERMANENTE

Vou criar um componente de Dashboard seguro que não quebra:
