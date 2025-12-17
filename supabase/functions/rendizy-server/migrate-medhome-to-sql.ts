/**
 * Script de Migração: Medhome do KV Store para SQL
 * 
 * Executa: deno run --allow-net --allow-env migrate-medhome-to-sql.ts
 */

import { getSupabaseClient } from './kv_store.tsx';
import * as kv from './kv_store.tsx';

const MEDHOME_ORG_ID = 'e78c7bb9-7823-44b8-9aee-95c9b073e7b7';

interface ClientSiteConfig {
  organizationId: string;
  siteName: string;
  template: 'custom' | 'moderno' | 'classico' | 'luxo';
  domain?: string;
  subdomain: string;
  theme: any;
  logo?: string;
  favicon?: string;
  siteConfig: any;
  features: any;
  siteCode?: string;
  archivePath?: string;
  archiveUrl?: string;
  source?: 'bolt' | 'v0' | 'figma' | 'custom';
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

async function migrateMedhome() {
  console.log('🚀 Migrando Medhome do KV Store para SQL...\n');
  
  const supabase = getSupabaseClient();
  
  // Buscar do KV Store
  const kvSite = await kv.get<ClientSiteConfig>(`client_site:${MEDHOME_ORG_ID}`);
  
  if (!kvSite) {
    console.log('❌ Medhome não encontrado no KV Store');
    return;
  }
  
  console.log('✅ Medhome encontrado no KV Store:');
  console.log(`   Nome: ${kvSite.siteName}`);
  console.log(`   Subdomain: ${kvSite.subdomain}`);
  console.log(`   Archive Path: ${kvSite.archivePath || 'N/A'}`);
  console.log(`   Source: ${kvSite.source || 'N/A'}\n`);
  
  // Verificar se já existe no SQL
  const { data: existing } = await supabase
    .from('client_sites')
    .select('id')
    .eq('organization_id', MEDHOME_ORG_ID)
    .maybeSingle();
  
  const sqlData = {
    organization_id: kvSite.organizationId,
    site_name: kvSite.siteName,
    subdomain: kvSite.subdomain,
    domain: kvSite.domain || null,
    template: kvSite.template,
    source: kvSite.source || 'custom',
    theme: kvSite.theme || {},
    site_config: kvSite.siteConfig || {},
    features: kvSite.features || {},
    logo_url: kvSite.logo || null,
    favicon_url: kvSite.favicon || null,
    site_code: kvSite.siteCode || null,
    archive_path: kvSite.archivePath || null,
    archive_url: kvSite.archiveUrl || null,
    is_active: kvSite.isActive,
    created_at: kvSite.createdAt || new Date().toISOString(),
    updated_at: kvSite.updatedAt || new Date().toISOString()
  };
  
  if (existing) {
    console.log('⚠️  Medhome já existe no SQL. Atualizando...\n');
    
    const { error: updateError } = await supabase
      .from('client_sites')
      .update(sqlData)
      .eq('organization_id', MEDHOME_ORG_ID);
    
    if (updateError) {
      console.error('❌ Erro ao atualizar:', updateError);
      return;
    }
    
    console.log('✅ Medhome atualizado no SQL com sucesso!');
  } else {
    console.log('📝 Criando Medhome no SQL...\n');
    
    const { error: insertError } = await supabase
      .from('client_sites')
      .insert(sqlData);
    
    if (insertError) {
      console.error('❌ Erro ao inserir:', insertError);
      return;
    }
    
    console.log('✅ Medhome criado no SQL com sucesso!');
  }
  
  // Verificar
  const { data: verify } = await supabase
    .from('client_sites')
    .select('*')
    .eq('organization_id', MEDHOME_ORG_ID)
    .single();
  
  if (verify) {
    console.log('\n✅ Verificação: Medhome está no SQL!');
    console.log(`   ID: ${verify.id}`);
    console.log(`   Subdomain: ${verify.subdomain}`);
    console.log(`   Archive Path: ${verify.archive_path || 'N/A'}`);
  }
}

if (import.meta.main) {
  migrateMedhome().catch(console.error);
}

