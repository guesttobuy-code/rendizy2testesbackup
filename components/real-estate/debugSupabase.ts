/**
 * 🧪 Debug: Teste de conexão com Supabase
 * 
 * Para usar: Importe este arquivo temporariamente no App.tsx
 * ou execute no console do browser
 */

import { getSupabaseClient } from '../utils/supabase/client';

export async function debugSupabaseConnection() {
  console.log('🧪 Iniciando teste de conexão Supabase...');
  
  const supabase = getSupabaseClient();
  
  // Teste 1: Verificar se client foi criado
  console.log('1. Client criado:', !!supabase);
  
  // Teste 2: Buscar companies
  console.log('2. Buscando re_companies...');
  const { data: companies, error: compError } = await supabase
    .from('re_companies')
    .select('id, name, type');
  
  if (compError) {
    console.error('❌ Erro ao buscar companies:', compError);
  } else {
    console.log(`✅ Companies: ${companies?.length || 0} registros`);
    companies?.forEach(c => console.log(`   - ${c.name} (${c.type})`));
  }
  
  // Teste 3: Buscar developments
  console.log('3. Buscando re_developments...');
  const { data: devs, error: devError } = await supabase
    .from('re_developments')
    .select('id, name, company_id');
  
  if (devError) {
    console.error('❌ Erro ao buscar developments:', devError);
  } else {
    console.log(`✅ Developments: ${devs?.length || 0} registros`);
  }
  
  // Teste 4: Buscar units
  console.log('4. Buscando re_units (limit 10)...');
  const { data: units, error: unitError } = await supabase
    .from('re_units')
    .select('id, unit_number, status')
    .limit(10);
  
  if (unitError) {
    console.error('❌ Erro ao buscar units:', unitError);
  } else {
    console.log(`✅ Units (amostra): ${units?.length || 0} registros`);
  }
  
  console.log('🧪 Teste finalizado!');
  
  return { companies, devs, units };
}

// Auto-executar se importado
if (typeof window !== 'undefined') {
  (window as any).debugSupabase = debugSupabaseConnection;
  console.log('💡 Execute window.debugSupabase() no console para testar');
}
