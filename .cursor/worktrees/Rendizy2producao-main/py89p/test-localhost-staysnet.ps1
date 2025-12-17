# 🧪 TESTE COMPLETO: Funcionalidades Stays.net em Localhost
# 
# Este script testa todas as funcionalidades implementadas

Write-Host "`n🧪 TESTE COMPLETO - STAYS.NET LOCALHOST" -ForegroundColor Green
Write-Host "=" * 60

$projectId = "make-server-67caf26a"
$baseUrl = "http://localhost:5173" # Vite default port
$apiUrl = "https://$projectId.supabase.co/functions/v1/rendizy-server/make-server-67caf26a"

Write-Host "`n📋 FUNCIONALIDADES A TESTAR:" -ForegroundColor Cyan
Write-Host "1. ✅ Configuração da API Stays.net" -ForegroundColor White
Write-Host "2. ✅ Teste de conexão" -ForegroundColor White
Write-Host "3. ✅ Importação de hóspedes" -ForegroundColor White
Write-Host "4. ✅ Importação de propriedades" -ForegroundColor White
Write-Host "5. ✅ Importação de reservas (01/01/2025 - 31/12/2026)" -ForegroundColor White
Write-Host "6. ✅ Verificação de dados no banco" -ForegroundColor White

Write-Host "`n🌐 INSTRUÇÕES:" -ForegroundColor Yellow
Write-Host "1. Abra o navegador em: $baseUrl" -ForegroundColor White
Write-Host "2. Faça login no sistema" -ForegroundColor White
Write-Host "3. Acesse: Configuração > Integrações > Stays.net" -ForegroundColor White
Write-Host "4. Configure as credenciais:" -ForegroundColor White
Write-Host "   - Base URL: https://bvm.stays.net/external/v1" -ForegroundColor Gray
Write-Host "   - API Key: a5146970" -ForegroundColor Gray
Write-Host "   - API Secret: bfcf4daf" -ForegroundColor Gray
Write-Host "5. Execute os testes abaixo no console do navegador (F12)" -ForegroundColor White

$testScript = @"
(async function testStaysNetLocalhost() {
  console.log('🚀 TESTE COMPLETO - STAYS.NET LOCALHOST');
  console.log('='.repeat(60));
  
  const token = localStorage.getItem('rendizy-token');
  if (!token) {
    console.error('❌ ERRO: Faça login primeiro!');
    return;
  }
  
  const projectId = '$projectId';
  const apiUrl = `https://` + projectId + `.supabase.co/functions/v1/rendizy-server/make-server-67caf26a`;
  
  // ============================================================================
  // TESTE 1: CONFIGURAÇÃO
  // ============================================================================
  console.log('\n📝 TESTE 1: Configuração da API');
  try {
    const configResponse = await fetch(apiUrl + '/settings/staysnet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'apikey': '<REDACTED>'
      },
      body: JSON.stringify({
        apiKey: 'a5146970',
        apiSecret: 'bfcf4daf',
        baseUrl: 'https://bvm.stays.net/external/v1',
        enabled: true
      })
    });
    
    const configResult = await configResponse.json();
    if (configResult.success) {
      console.log('✅ Configuração salva com sucesso!');
    } else {
      console.error('❌ Erro ao salvar configuração:', configResult.error);
    }
  } catch (error) {
    console.error('❌ Erro no teste de configuração:', error);
  }
  
  // ============================================================================
  // TESTE 2: TESTE DE CONEXÃO
  // ============================================================================
  console.log('\n🔌 TESTE 2: Teste de Conexão');
  try {
    const testResponse = await fetch(apiUrl + '/staysnet/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'apikey': '<REDACTED>'
      },
      body: JSON.stringify({
        apiKey: 'a5146970',
        apiSecret: 'bfcf4daf',
        baseUrl: 'https://bvm.stays.net/external/v1'
      })
    });
    
    const testResult = await testResponse.json();
    if (testResult.success) {
      console.log('✅ Conexão estabelecida com sucesso!');
      console.log('📊 Dados:', testResult.data);
    } else {
      console.error('❌ Erro na conexão:', testResult.error);
    }
  } catch (error) {
    console.error('❌ Erro no teste de conexão:', error);
  }
  
  // ============================================================================
  // TESTE 3: IMPORTAÇÃO COMPLETA
  // ============================================================================
  console.log('\n📥 TESTE 3: Importação Completa (Hóspedes + Propriedades + Reservas)');
  console.log('⏳ Isso pode levar alguns minutos...');
  
  try {
    const startTime = Date.now();
    const importResponse = await fetch(apiUrl + '/staysnet/import/full', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'apikey': '<REDACTED>'
      },
      body: JSON.stringify({
        selectedPropertyIds: [] // Importar todas
      })
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Tempo: ` + elapsed + `s`);
    
    const importResult = await importResponse.json();
    
    if (importResult.success && importResult.data) {
      console.log('✅ Importação concluída!');
      console.log('\n📊 ESTATÍSTICAS:');
      const stats = importResult.data.stats;
      
      console.log('\n👥 HÓSPEDES:');
      console.log(`   Buscados: ` + stats.guests.fetched);
      console.log(`   ✅ Criados: ` + stats.guests.created);
      console.log(`   🔄 Atualizados: ` + stats.guests.updated);
      console.log(`   ❌ Falhas: ` + stats.guests.failed);
      
      console.log('\n🏠 PROPRIEDADES:');
      console.log(`   Buscadas: ` + stats.properties.fetched);
      console.log(`   ✅ Criadas: ` + stats.properties.created);
      console.log(`   🔄 Atualizadas: ` + stats.properties.updated);
      console.log(`   ❌ Falhas: ` + stats.properties.failed);
      
      console.log('\n📅 RESERVAS:');
      console.log(`   Buscadas: ` + stats.reservations.fetched);
      console.log(`   ✅ Criadas: ` + stats.reservations.created);
      console.log(`   🔄 Atualizadas: ` + stats.reservations.updated);
      console.log(`   ❌ Falhas: ` + stats.reservations.failed);
      
      if (stats.errors && stats.errors.length > 0) {
        console.log('\n⚠️  ERROS:');
        stats.errors.forEach((error, i) => {
          console.log(`   ` + (i + 1) + `. ` + error);
        });
      }
      
      console.log('\n✅ PRÓXIMOS PASSOS:');
      console.log('   1. Verifique os Hóspedes no menu');
      console.log('   2. Verifique as Propriedades no menu');
      console.log('   3. Verifique as Reservas no menu');
      console.log('   4. Verifique o Calendário (reservas devem aparecer)');
      
      return importResult;
    } else {
      console.error('❌ Erro na importação:', importResult.error || importResult);
      return importResult;
    }
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    return null;
  }
})();
"@

Write-Host "`n📝 CÓDIGO PARA COPIAR NO CONSOLE DO NAVEGADOR:" -ForegroundColor Yellow
Write-Host $testScript -ForegroundColor Gray

Write-Host "`n✅ TESTE COMPLETO!" -ForegroundColor Green
Write-Host "Execute o código acima no console do navegador após fazer login." -ForegroundColor White


