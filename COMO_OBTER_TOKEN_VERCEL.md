# 🔐 Como Obter Token do Vercel

## 📍 Localização do Token

### Opção 1: Via Dashboard do Vercel (Recomendado)

1. **Acesse:** https://vercel.com/account/tokens
   - Ou vá em: Vercel Dashboard → Settings → Tokens

2. **Criar Novo Token:**
   - Clique em "Create Token"
   - Dê um nome (ex: "Cursor AI Access")
   - Escolha o escopo:
     - ✅ **Full Account** (acesso completo) - Recomendado
     - Ou escopos específicos se preferir

3. **Copiar Token:**
   - Após criar, o token será exibido **UMA ÚNICA VEZ**
   - Copie e guarde em local seguro
   - Formato: `vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 🎯 O Que Posso Fazer com o Token

Com o token do Vercel, posso:

1. ✅ **Ver todos os deployments** e seus status
2. ✅ **Ver logs de build completos** (não apenas snapshots)
3. ✅ **Fazer redeploy** de deployments
4. ✅ **Cancelar deployments** em andamento
5. ✅ **Ver configurações** do projeto
6. ✅ **Ver variáveis de ambiente**
7. ✅ **Ver domínios** configurados
8. ✅ **Ver analytics** e métricas

---

## 🔧 Como Usar o Token

### Via CLI do Vercel:
```bash
vercel login --token SEU_TOKEN_AQUI
```

### Via API do Vercel:
```bash
curl -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  https://api.vercel.com/v2/deployments
```

### No meu caso:
Você pode me passar o token e eu uso via:
- API do Vercel diretamente
- Ou configuro no ambiente para usar via CLI

---

## ⚠️ Segurança

- ✅ Token é **pessoal** e não deve ser compartilhado publicamente
- ✅ Pode ser **revogado** a qualquer momento
- ✅ Tem **escopo limitado** (dependendo do que você escolher)
- ✅ Pode ter **expiração** (opcional)

---

## 📋 Passos Rápidos

1. Acesse: https://vercel.com/account/tokens
2. Clique em "Create Token"
3. Nome: "Cursor AI Access"
4. Escopo: "Full Account" (ou o que preferir)
5. Copie o token
6. Me envie o token

---

**Com o token, posso resolver os problemas de deploy muito mais rápido!** 🚀

