# 🧪 TESTE COMPLETO: Importação Stays.net
# 
# Este script testa a importação completa via API
# Execute após fazer login no sistema

Write-Host "`n🧪 TESTE DE IMPORTAÇÃO COMPLETA STAYS.NET" -ForegroundColor Green
Write-Host "=" * 60

# Verificar se está no diretório correto
$projectId = "make-server-67caf26a"
$baseUrl = "https://$projectId.supabase.co/functions/v1/rendizy-server/make-server-67caf26a"

Write-Host "`n📋 INSTRUÇÕES:" -ForegroundColor Cyan
Write-Host "1. Abra o navegador e faça login no sistema" -ForegroundColor White
Write-Host "2. Abra o DevTools (F12) > Console" -ForegroundColor White
Write-Host "3. Execute o seguinte código:" -ForegroundColor White

$script = @"
(async function testStaysNetImport() {
  console.log('🚀 Iniciando teste de importação Stays.net...\n');
  
  const token = localStorage.getItem('rendizy-token');
  if (!token) {
    console.error('❌ ERRO: Token não encontrado! Faça login primeiro.');
    return;
  }
  
  const projectId = '$projectId';
  const url = `https://` + projectId + `.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/import/full`;
  
  console.log('📡 Endpoint:', url);
  console.log('⏳ Aguardando resposta...\n');
  
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': token,
        'apikey': '<REDACTED>'
      },
      body: JSON.stringify({ selectedPropertyIds: [] })
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Tempo: ` + elapsed + `s\n`);
    console.log('📥 Status:', response.status);
    
    const result = await response.json();
    
    if (result.success && result.data) {
      console.log('✅ Importação concluída!\n');
      console.log('📊 ESTATÍSTICAS:');
      const stats = result.data.stats;
      console.log('👥 Hóspedes:', stats.guests.created + ' criados, ' + stats.guests.updated + ' atualizados');
      console.log('🏠 Propriedades:', stats.properties.created + ' criadas, ' + stats.properties.updated + ' atualizadas');
      console.log('📅 Reservas:', stats.reservations.created + ' criadas, ' + stats.reservations.updated + ' atualizadas');
      
      if (stats.errors && stats.errors.length > 0) {
        console.log('\n⚠️  ERROS:', stats.errors);
      }
      
      return result;
    } else {
      console.error('❌ Erro:', result.error || result);
      return result;
    }
  } catch (error) {
    console.error('❌ ERRO:', error);
    return null;
  }
})();
"@

Write-Host "`n📝 CÓDIGO PARA COPIAR:" -ForegroundColor Yellow
Write-Host $script -ForegroundColor Gray

Write-Host "`n✅ PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Execute o código acima no console do navegador" -ForegroundColor White
Write-Host "2. Verifique os resultados no console" -ForegroundColor White
Write-Host "3. Verifique os dados no sistema:" -ForegroundColor White
Write-Host "   - Menu Hóspedes" -ForegroundColor Gray
Write-Host "   - Menu Propriedades" -ForegroundColor Gray
Write-Host "   - Menu Reservas" -ForegroundColor Gray
Write-Host "   - Menu Calendário (reservas devem aparecer)" -ForegroundColor Gray


