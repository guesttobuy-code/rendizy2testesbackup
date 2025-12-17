// Script para criar a imobiliária "Sua Casa Mobiliada"
const projectId = "odcgnzfremrqnvtitpcc";
const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ";

const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations`;

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
    'Authorization': `Bearer ${publicAnonKey}`
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
