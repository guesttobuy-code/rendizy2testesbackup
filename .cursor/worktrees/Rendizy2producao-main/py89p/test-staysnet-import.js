/**
 * Script para testar importação completa Stays.net
 * 
 * Execute no console do navegador (F12 > Console)
 * 
 * IMPORTANTE: Você precisa estar logado no sistema
 */

async function testStaysNetImport() {
  console.log('🚀 Iniciando teste de importação Stays.net...');
  
  // Obter token
  const token = localStorage.getItem('rendizy-token');
  if (!token) {
    console.error('❌ Token não encontrado. Faça login primeiro.');
    return;
  }
  
  console.log('✅ Token encontrado:', token.substring(0, 20) + '...');
  
  // Obter projectId (ajuste se necessário)
  const projectId = 'make-server-67caf26a'; // Ajuste conforme seu projeto
  
  // URL do endpoint
  const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/import/full`;
  
  console.log('📡 Chamando:', url);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'apikey': '<REDACTED>' // Ajuste conforme necessário
      },
      body: JSON.stringify({
        selectedPropertyIds: [] // Importar todas as propriedades
      })
    });
    
    console.log('📥 Status:', response.status);
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Importação concluída com sucesso!');
      console.log('📊 Estatísticas:', result.data.stats);
      console.log('📈 Detalhes:', {
        hóspedes: `${result.data.stats.guests.created} criados, ${result.data.stats.guests.updated} atualizados`,
        propriedades: `${result.data.stats.properties.created} criadas, ${result.data.stats.properties.updated} atualizadas`,
        reservas: `${result.data.stats.reservations.created} criadas, ${result.data.stats.reservations.updated} atualizadas`
      });
      
      if (result.data.stats.errors.length > 0) {
        console.warn('⚠️ Erros encontrados:', result.data.stats.errors);
      }
    } else {
      console.error('❌ Erro na importação:', result.error);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro ao chamar API:', error);
    return null;
  }
}

// Executar automaticamente
testStaysNetImport();


