// Sistema de Organizações Offline
// Permite criar e gerenciar organizações localmente quando backend está offline

import { Organization } from '../types/tenancy';

const STORAGE_KEY = 'rendizy_offline_organizations';

// ============================================================
// CRUD LOCAL
// ============================================================

export function getOfflineOrganizations(): Organization[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao carregar organizações offline:', error);
    return [];
  }
}

export function saveOfflineOrganization(org: Organization): void {
  try {
    const existing = getOfflineOrganizations();
    
    // Verificar se já existe
    const index = existing.findIndex(o => o.id === org.id);
    
    if (index >= 0) {
      // Atualizar
      existing[index] = org;
    } else {
      // Adicionar
      existing.push(org);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    
    console.log('✅ Organização salva offline:', org.name);
  } catch (error) {
    console.error('Erro ao salvar organização offline:', error);
    throw error;
  }
}

export function deleteOfflineOrganization(id: string): void {
  try {
    const existing = getOfflineOrganizations();
    const filtered = existing.filter(o => o.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    
    console.log('✅ Organização removida do modo offline:', id);
  } catch (error) {
    console.error('Erro ao deletar organização offline:', error);
    throw error;
  }
}

export function clearOfflineOrganizations(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('✅ Organizações offline limpas');
  } catch (error) {
    console.error('Erro ao limpar organizações offline:', error);
  }
}

// ============================================================
// SINCRONIZAÇÃO (quando backend voltar)
// ============================================================

export async function syncOfflineOrganizationsToBackend(
  baseUrl: string,
  token: string
): Promise<{ success: number; failed: number; errors: any[] }> {
  const offlineOrgs = getOfflineOrganizations();
  
  if (offlineOrgs.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }
  
  console.log(`🔄 Sincronizando ${offlineOrgs.length} organizações offline...`);
  
  let success = 0;
  let failed = 0;
  const errors: any[] = [];
  
  for (const org of offlineOrgs) {
    try {
      const response = await fetch(`${baseUrl}/organizations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(org)
      });
      
      if (response.ok) {
        success++;
        console.log(`✅ Sincronizado: ${org.name}`);
      } else {
        failed++;
        const error = await response.text();
        errors.push({ org: org.name, error });
        console.error(`❌ Erro ao sincronizar ${org.name}:`, error);
      }
    } catch (error) {
      failed++;
      errors.push({ org: org.name, error: error.message });
      console.error(`❌ Erro ao sincronizar ${org.name}:`, error);
    }
  }
  
  console.log(`📊 Sincronização completa: ${success} sucesso, ${failed} falhas`);
  
  // Se tudo sincronizado, limpar local
  if (failed === 0) {
    clearOfflineOrganizations();
  }
  
  return { success, failed, errors };
}

// ============================================================
// UTILITÁRIOS
// ============================================================

export function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function isOfflineOrganization(org: Organization): boolean {
  return org.id.startsWith('offline_');
}

export function hasOfflineOrganizations(): boolean {
  return getOfflineOrganizations().length > 0;
}

export function countOfflineOrganizations(): number {
  return getOfflineOrganizations().length;
}
