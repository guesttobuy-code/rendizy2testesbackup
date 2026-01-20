import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import CRMTasksSidebar from './CRMTasksSidebar';
import { EditFunnelsModal } from './EditFunnelsModal';
import { Funnel } from '../../types/funnels';
import { funnelsApi } from '../../utils/api';
import { toast } from 'sonner';

export default function CRMTasksModule() {
  const [editFunnelsOpen, setEditFunnelsOpen] = useState(false);
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loadingFunnels, setLoadingFunnels] = useState(false);

  // Carregar funis ao abrir o modal
  useEffect(() => {
    if (editFunnelsOpen) {
      loadFunnels();
    }
  }, [editFunnelsOpen]);

  const loadFunnels = async () => {
    setLoadingFunnels(true);
    try {
      const response = await funnelsApi.list();
      if (response.success && response.data) {
        setFunnels(response.data);
      } else {
        // Se API não estiver disponível, usar localStorage como fallback
        const savedFunnels = localStorage.getItem('rendizy_funnels');
        if (savedFunnels) {
          setFunnels(JSON.parse(savedFunnels));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar funis:', error);
      // Fallback para localStorage
      const savedFunnels = localStorage.getItem('rendizy_funnels');
      if (savedFunnels) {
        setFunnels(JSON.parse(savedFunnels));
      }
    } finally {
      setLoadingFunnels(false);
    }
  };

  const handleSaveFunnel = async (funnel: Funnel) => {
    try {
      // Tentar salvar via API
      const response = funnel.id && funnels.some(f => f.id === funnel.id)
        ? await funnelsApi.update(funnel.id, funnel)
        : await funnelsApi.create(funnel);

      if (response.success && response.data) {
        toast.success('Funil salvo com sucesso!');
        // Atualizar lista local
        if (funnel.id && funnels.some(f => f.id === funnel.id)) {
          setFunnels(prev => prev.map(f => f.id === funnel.id ? response.data! : f));
        } else {
          setFunnels(prev => [...prev, response.data!]);
        }
        // Salvar também no localStorage como backup
        const updatedFunnels = funnel.id && funnels.some(f => f.id === funnel.id)
          ? funnels.map(f => f.id === funnel.id ? response.data! : f)
          : [...funnels, response.data!];
        localStorage.setItem('rendizy_funnels', JSON.stringify(updatedFunnels));
        setEditFunnelsOpen(false);
      } else {
        throw new Error(response.error || 'Erro ao salvar funil');
      }
    } catch (error: any) {
      console.error('Erro ao salvar funil via API, usando localStorage:', error);
      // Fallback: salvar no localStorage
      const updatedFunnels = funnel.id && funnels.some(f => f.id === funnel.id)
        ? funnels.map(f => f.id === funnel.id ? funnel : f)
        : [...funnels, funnel];
      setFunnels(updatedFunnels);
      localStorage.setItem('rendizy_funnels', JSON.stringify(updatedFunnels));
      toast.success('Funil salvo localmente!');
      setEditFunnelsOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar própria do módulo CRM & Tasks */}
      <CRMTasksSidebar onEditFunnels={() => setEditFunnelsOpen(true)} />
      
      {/* Área de trabalho - renderiza as sub-rotas */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </div>

      {/* Modal de Editar Funis */}
      <EditFunnelsModal
        open={editFunnelsOpen}
        onClose={() => setEditFunnelsOpen(false)}
        onSave={handleSaveFunnel}
        existingFunnels={funnels}
      />
    </div>
  );
}
