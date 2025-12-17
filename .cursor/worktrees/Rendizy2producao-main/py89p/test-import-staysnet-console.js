/**
 * 🚀 TESTE DE IMPORTAÇÃO STAYS.NET
 * 
 * COMO USAR:
 * 1. Abra o navegador e faça login no sistema
 * 2. Abra o DevTools (F12)
 * 3. Vá para a aba "Console"
 * 4. Cole e execute este script completo
 * 
 * O script vai:
 * - Verificar se você está logado
 * - Chamar a API de importação completa
 * - Mostrar estatísticas da importação
 * - Verificar se os dados foram salvos
 */

(async function testStaysNetImport() {
  console.log('🚀 Iniciando teste de importação Stays.net...\n');
  
  // 1. Verificar token
  const token = localStorage.getItem('rendizy-token');
  if (!token) {
    console.error('❌ ERRO: Token não encontrado!');
    console.error('   → Faça login no sistema primeiro');
    return;
  }
  console.log('✅ Token encontrado:', token.substring(0, 30) + '...\n');
  
  // 2. Configurar URL
  const projectId = 'make-server-67caf26a';
  const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/import/full`;
  
  console.log('📡 Endpoint:', url);
  console.log('📦 Body:', { selectedPropertyIds: [] });
  console.log('\n⏳ Aguardando resposta...\n');
  
  try {
    // 3. Fazer chamada
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'apikey': '<REDACTED>'
      },
      body: JSON.stringify({
        selectedPropertyIds: [] // Importar todas as propriedades
      })
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Tempo de execução: ${elapsed}s\n`);
    console.log('📥 Status HTTP:', response.status, response.statusText);
    
    // 4. Processar resposta
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ ERRO na resposta:', result);
      return;
    }
    
    if (result.success && result.data) {
      console.log('✅ Importação concluída com sucesso!\n');
      console.log('📊 ESTATÍSTICAS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const stats = result.data.stats;
      
      // Hóspedes
      console.log('\n👥 HÓSPEDES:');
      console.log(`   Buscados: ${stats.guests.fetched}`);
      console.log(`   ✅ Criados: ${stats.guests.created}`);
      console.log(`   🔄 Atualizados: ${stats.guests.updated}`);
      console.log(`   ❌ Falhas: ${stats.guests.failed}`);
      
      // Propriedades
      console.log('\n🏠 PROPRIEDADES:');
      console.log(`   Buscadas: ${stats.properties.fetched}`);
      console.log(`   ✅ Criadas: ${stats.properties.created}`);
      console.log(`   🔄 Atualizadas: ${stats.properties.updated}`);
      console.log(`   ❌ Falhas: ${stats.properties.failed}`);
      
      // Reservas
      console.log('\n📅 RESERVAS:');
      console.log(`   Buscadas: ${stats.reservations.fetched}`);
      console.log(`   ✅ Criadas: ${stats.reservations.created}`);
      console.log(`   🔄 Atualizadas: ${stats.reservations.updated}`);
      console.log(`   ❌ Falhas: ${stats.reservations.failed}`);
      
      // Erros
      if (stats.errors && stats.errors.length > 0) {
        console.log('\n⚠️  ERROS ENCONTRADOS:');
        stats.errors.forEach((error, i) => {
          console.log(`   ${i + 1}. ${error}`);
        });
      }
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\n✅ PRÓXIMOS PASSOS:');
      console.log('   1. Verifique os Hóspedes no menu');
      console.log('   2. Verifique as Propriedades no menu');
      console.log('   3. Verifique as Reservas no menu');
      console.log('   4. Verifique o Calendário (as reservas devem aparecer)');
      
      return result;
    } else {
      console.error('❌ Erro na importação:', result.error || result);
      return result;
    }
  } catch (error) {
    console.error('❌ ERRO ao chamar API:', error);
    console.error('   → Verifique se o backend está rodando');
    console.error('   → Verifique se a configuração do Stays.net está correta');
    return null;
  }
})();


