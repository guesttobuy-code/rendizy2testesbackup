# RENDIZY PRODUÇÃO

This is a code bundle for RENDIZY PRODUÇÃO. The original project is available at https://www.figma.com/design/MIUsvRcBYzJU8Rfv4MA6Qg/RENDIZY-PRODU%C3%87%C3%83O.

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
