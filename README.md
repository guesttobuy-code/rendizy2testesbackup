# RENDIZY PMS,

> **Sistema de Gestão de Propriedades para Aluguel por Temporada**
> 
> ⚠️ **IMPORTANTE:** Antes de fazer qualquer alteração, leia:
> - 🔒 **[RULES.md](RULES.md)** - Regras de Ouro (especialmente Seção 0 para IAs)
> - 📚 **[docs/README.md](docs/README.md)** - Índice completo da documentação
> - 📝 **[CHANGELOG.md](CHANGELOG.md)** - Histórico de mudanças
> - 🌐 **Fluxo de repositórios:** staging primeiro em `guesttobuy-code/rendizy2testesbackup` (ramo `final-clean` e Vercel); produção apenas com aprovação em `guesttobuy-code/Rendizyoficial`.

**Versão**: v1.0.103.405  
**Última atualização**: 20/12/2024  
**Figma**: [RENDIZY PRODUÇÃO](https://www.figma.com/design/MIUsvRcBYzJU8Rfv4MA6Qg/RENDIZY-PRODU%C3%87%C3%83O)

---

## 🚀 Tecnologias

- **Frontend:** React + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Styling:** Tailwind CSS
- **Deploy:** Netlify (Produção) / Vercel (Desenvolvimento)

## 📋 Funcionalidades

- ✅ Autenticação de usuários
- ✅ Sistema de reservas
- ✅ Gestão de propriedades
- ✅ Chat com WhatsApp Integration
- ✅ Sistema de calendário
- ✅ Gestão de hóspedes
- ✅ Sistema de locações
- ✅ Dashboard completo
- ✅ Módulo financeiro
- ✅ CRM com funis de vendas

## 🛠️ Setup Local

1. **Instalar dependências:**

   ```bash
   cd RendizyPrincipal
   npm install
   ```

2. **Configurar variáveis de ambiente:**

   Crie um arquivo `.env.local` em `RendizyPrincipal/` com:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Iniciar servidor de desenvolvimento:**

   ```bash
   npm run dev
   ```

## 📦 Build para Produção

```bash
cd RendizyPrincipal
npm run build
```

## 🗄️ Database

As migrations SQL estão em `supabase/migrations/`. Aplique-as na ordem numérica no Supabase Dashboard.

## 📁 Structure

- `RendizyPrincipal/`: main frontend application (previously `src`)
- `supabase/`: backend edge functions and SQL migrations
- `build/`: generated static bundle (`npm run build`)

## 📝 Licença

Proprietário - RENDIZY
