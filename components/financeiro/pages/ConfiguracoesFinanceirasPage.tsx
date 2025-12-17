/**
 * RENDIZY - Configurações Financeiras Page
 * Configurações do módulo financeiro
 * 
 * @version v1.0.103.1300 - Refatorado para usar padrão SettingsTabsLayout
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { SettingsTabsLayout } from '../components/SettingsTabsLayout';
import { CampoPlanoContasMappingVisual } from '../components/CampoPlanoContasMappingVisual';
import { PlataformasPagamento } from '../components/PlataformasPagamento';
import { Link2, CreditCard } from 'lucide-react';

export function ConfiguracoesFinanceirasPage() {
  const { organization, user, isLoading, isSuperAdmin } = useAuth();
  
  // Obter organizationId - usar organização master para superadmin se necessário
  // Para superadmin, sempre usar a organização master Rendizy
  // Para outros usuários, usar a organização do usuário ou da organização carregada
  const organizationId = isSuperAdmin 
    ? '00000000-0000-0000-0000-000000000000' 
    : (organization?.id || user?.organizationId || null);
  
  // Aguardar carregamento do usuário antes de renderizar
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Carregando informações da organização...</p>
          <p className="text-sm text-gray-400">Aguarde um momento.</p>
        </div>
      </div>
    );
  }
  
  // Log para debug
  console.log('🔍 [ConfiguracoesFinanceirasPage] Estado:', {
    user: user?.username,
    isSuperAdmin,
    organizationId,
    organization: organization?.id,
    userOrgId: user?.organizationId
  });

  // Definir abas de configurações
  const tabs = [
    {
      id: 'mapeamento',
      label: 'Mapeamento de Campos x Contas',
      icon: <Link2 className="h-4 w-4" />,
      content: organizationId ? (
        <CampoPlanoContasMappingVisual organizationId={organizationId} />
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">Carregando informações da organização...</p>
          <p className="text-sm text-gray-400">O mapeamento de campos será exibido em breve.</p>
        </div>
      ),
    },
    {
      id: 'pagamentos',
      label: 'Plataformas de Pagamento',
      icon: <CreditCard className="h-4 w-4" />,
      content: <PlataformasPagamento />,
    },
  ];

  return (
    <SettingsTabsLayout
      title="Configurações Financeiras"
      description="Gerencie todas as configurações do módulo financeiro"
      tabs={tabs}
      defaultTab="mapeamento"
    />
  );
}

export default ConfiguracoesFinanceirasPage;

