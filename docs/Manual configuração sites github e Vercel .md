# Manual configuração sites GitHub e Vercel

> Passo a passo **minucioso** para configurar sites por repositório (GitHub + Vercel) no Rendizy.

---

## ✅ Visão geral do modelo
- Cada site tem **um repositório Git** (fonte de verdade).
- A Vercel faz o **deploy automático**.
- O GitHub envia **webhook de push** para o Rendizy.
- O Rendizy dispara o **Deploy Hook** da Vercel.

---

## 1) Pré‑requisitos

### 1.1 Repositório do site
- O site deve estar em um repositório Git (ex: GitHub).
- Branch principal definida (ex: `main`).

### 1.2 Projeto na Vercel
- O repositório já deve estar conectado na Vercel.
- O projeto deve buildar com sucesso na Vercel.

---

## 2) Criar Deploy Hook na Vercel
1. Abra o projeto na Vercel.
2. Vá em **Settings → Git → Deploy Hooks**.
3. Clique **Create Hook**.
4. Copie a URL do hook gerado.

> Esse hook é usado pelo Rendizy para disparar o deploy.

---

## 3) Gerar e guardar o Secret do Webhook
- O secret pode ser gerado no painel (aba **GitHub + Vercel** → botão **Gerar secret**).
- Ele fica salvo no cadastro do site.
- Você deve **copiar esse secret** e colar no GitHub.

---

## 4) Configurar Webhook no GitHub
1. Repositório do site → **Settings → Webhooks → Add webhook**
2. **Payload URL**:
   - `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/client-sites/repo/webhook/github`
3. **Content type**: `application/json`
4. **Secret**: (cole o secret que o Rendizy gerou)
5. **Which events**: **Just the push event**
6. **Active**: marcado
7. Salve o webhook.

---

## 5) Configurar no Rendizy (Modal de Site)
Abra o painel **Sites dos Clientes**, edite o site e vá na aba **GitHub + Vercel**.

Preencha:
- **Repo URL** (ex: `https://github.com/guesttobuy-code/medhomeCelso`)
- **Branch** (ex: `main`)
- **Deploy Hook Vercel** (URL gerada no passo 2)
- **URL do Projeto Vercel** (opcional, para abrir rápido)
- **Webhook Secret** (gerado pelo Rendizy, copiar e colar no GitHub)

Clique **Salvar**.

---

## 6) Testar o fluxo
1. Faça um **push** no branch principal do repositório.
2. O GitHub envia o webhook ao Rendizy.
3. O Rendizy dispara o Deploy Hook da Vercel.
4. A Vercel faz o deploy.

---

## ✅ Erros comuns e ajustes aplicados

### Erro 401 (Authorization ausente)
**Sintoma:**
- Ao acessar rota de `client-sites` direto no navegador, aparece 401.

**Motivo:**
- As rotas exigem autenticação no header `X-Auth-Token`.

**Correção:**
- Use o painel (ele envia o header) ou requisições autenticadas.

---

### Erro 401 no Webhook GitHub
**Sintoma:**
- Webhook no GitHub retorna 401.

**Motivo:**
- A função exigia JWT.

**Correção aplicada:**
- `verify_jwt = false` para `rendizy-server`.

---

### Erro “Assinatura inválida”
**Sintoma:**
- Webhook retorna “Assinatura inválida”.

**Motivos possíveis:**
- Secret diferente do configurado.
- Payload não assinado corretamente.

**Correção aplicada:**
- Secret atualizado no Supabase e no GitHub.
- Garantir assinatura HMAC usando **body bruto**.

---

## ✅ Observações importantes
- O **repositório é a fonte de verdade**.
- Upload manual via ZIP é **apenas emergência**.
- Sempre versionar alterações no GitHub.

---

## 📌 Checklist final
- [ ] Repo URL preenchido
- [ ] Branch configurada
- [ ] Deploy Hook da Vercel salvo
- [ ] Secret copiado para GitHub
- [ ] Webhook GitHub ativo
- [ ] Push realizado com sucesso

---

Se precisar, o Rendizy consegue disparar deploy manual pelo botão **Disparar Deploy** no modal.
