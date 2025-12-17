/**
 * Script de Migração: KV Store → SQL
 * 
 * Migra sites de clientes do KV Store para a tabela SQL client_sites
 * Conforme Regras de Ouro: SQL para dados permanentes
 */

import { getSupabaseClient } from './kv_store.tsx';
import * as kv from './kv_store.tsx';

interface ClientSiteConfig {
  organizationId: string;
  siteName: string;
  template: 'custom' | 'moderno' | 'classico' | 'luxo';
  domain?: string;
  subdomain: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };
  logo?: string;
  favicon?: string;
  siteConfig: {
    title: string;
    description: string;
    slogan?: string;
    contactEmail: string;
    contactPhone: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      whatsapp?: string;
    };
  };
  features: {
    shortTerm: boolean;
    longTerm: boolean;
    sale: boolean;
  };
  siteCode?: string;
  archivePath?: string;
  archiveUrl?: string;
  source?: 'bolt' | 'v0' | 'figma' | 'custom';
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

async function migrateClientSites() {
  console.log('🚀 Iniciando migração de client_sites: KV Store → SQL');
  
  const supabase = getSupabaseClient();
  
  // Buscar todos os sites do KV Store
  // Nota: Como não temos kv.list(), vamos tentar buscar por organizationId conhecidos
  // ou criar uma rota temporária para listar todos
  
  console.log('⚠️  Como não temos acesso direto a kv.list(),');
  console.log('   vamos migrar sites conhecidos manualmente.');
  console.log('');
  console.log('📋 Sites conhecidos para migrar:');
  console.log('  - Medhome (subdomain: medhome)');
  console.log('');
  
  // Exemplo: Migrar Medhome (ajustar organizationId conforme necessário)
  const medhomeOrgId = 'e78c7bb9-7823-44b8-9aee-95c9b073e7b7'; // Ajustar conforme necessário
  
  try {
    // Buscar do KV Store
    const kvSite = await kv.get<ClientSiteConfig>(`client_site:${medhomeOrgId}`);
    
    if (!kvSite) {
      console.log(`❌ Site não encontrado no KV Store para orgId: ${medhomeOrgId}`);
      return;
    }
    
    console.log(`✅ Site encontrado no KV Store: ${kvSite.siteName}`);
    console.log(`   Subdomain: ${kvSite.subdomain}`);
    console.log(`   Archive Path: ${kvSite.archivePath || 'N/A'}`);
    
    // Verificar se já existe no SQL
    const { data: existingSite } = await supabase
      .from('client_sites')
      .select('id')
      .eq('organization_id', medhomeOrgId)
      .maybeSingle();
    
    if (existingSite) {
      console.log('⚠️  Site já existe no SQL. Atualizando...');
      
      // Atualizar
      const { error: updateError } = await supabase
        .from('client_sites')
        .update({
          site_name: kvSite.siteName,
          subdomain: kvSite.subdomain,
          domain: kvSite.domain || null,
          template: kvSite.template,
          source: kvSite.source || 'custom',
          theme: kvSite.theme,
          site_config: kvSite.siteConfig,
          features: kvSite.features,
          logo_url: kvSite.logo || null,
          favicon_url: kvSite.favicon || null,
          site_code: kvSite.siteCode || null,
          archive_path: kvSite.archivePath || null,
          archive_url: kvSite.archiveUrl || null,
          is_active: kvSite.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('organization_id', medhomeOrgId);
      
      if (updateError) {
        console.error('❌ Erro ao atualizar site:', updateError);
        return;
      }
      
      console.log('✅ Site atualizado no SQL com sucesso!');
    } else {
      console.log('📝 Criando novo site no SQL...');
      
      // Inserir
      const { error: insertError } = await supabase
        .from('client_sites')
        .insert({
          organization_id: medhomeOrgId,
          site_name: kvSite.siteName,
          subdomain: kvSite.subdomain,
          domain: kvSite.domain || null,
          template: kvSite.template,
          source: kvSite.source || 'custom',
          theme: kvSite.theme,
          site_config: kvSite.siteConfig,
          features: kvSite.features,
          logo_url: kvSite.logo || null,
          favicon_url: kvSite.favicon || null,
          site_code: kvSite.siteCode || null,
          archive_path: kvSite.archivePath || null,
          archive_url: kvSite.archiveUrl || null,
          is_active: kvSite.isActive,
          created_at: kvSite.createdAt || new Date().toISOString(),
          updated_at: kvSite.updatedAt || new Date().toISOString()
        });
      
      if (insertError) {
        console.error('❌ Erro ao inserir site:', insertError);
        return;
      }
      
      console.log('✅ Site criado no SQL com sucesso!');
    }
    
    console.log('');
    console.log('✅ Migração concluída!');
    console.log('');
    console.log('📋 Próximos passos:');
    console.log('  1. Verificar se o site está no SQL');
    console.log('  2. Testar acesso ao site');
    console.log('  3. Remover fallback KV Store das rotas');
    
  } catch (error) {
    console.error('❌ Erro durante migração:', error);
  }
}

// Executar migração
if (import.meta.main) {
  migrateClientSites();
}

export { migrateClientSites };

