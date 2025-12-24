// Script para criar a imobiliária "Sua Casa Mobiliada"
// Requer: SUPABASE_URL e SUPABASE_ANON_KEY (ou VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) em .env.local

require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Variáveis de ambiente ausentes. Configure SUPABASE_URL e SUPABASE_ANON_KEY em .env.local');
  process.exit(1);
}

const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/rendizy-server/organizations`;

const payload = {
  name: "Sua Casa Mobiliada",
  email: "suacasamobiliada@gmail.com",
  phone: "",
  plan: "enterprise",
  createdBy: "user_master_rendizy"
};

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  },
  body: JSON.stringify(payload)
})
  .then(async (response) => {
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✅ Imobiliária criada com sucesso!');
      console.log('ID:', data.data.id);
      console.log('Slug:', data.data.slug);
      console.log('Nome:', data.data.name);
      console.log('Email:', data.data.email);
      console.log('Plano:', data.data.plan);
    } else {
      console.error('\n❌ Erro ao criar imobiliária');
      console.error('Erro:', text);
    }
  })
  .catch((error) => {
    console.error('❌ Erro na requisição:', error);
  });
