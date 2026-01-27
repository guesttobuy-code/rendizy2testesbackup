import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Settings, ChevronDown, Plus, Trash2, Copy, GripVertical, ArrowLeft, Pencil, Check, X } from 'lucide-react';
import { FunnelType } from '../../types/funnels';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
// ✅ API MODULAR - Importar APIs separadas
import { crmSalesApi, SalesFunnel, SalesFunnelStage } from '@/utils/api-crm-sales';
import { crmServicesApi, ServiceFunnel, ServiceFunnelStage } from '@/utils/api-crm-services';
import { crmPredeterminedApi, PredeterminedFunnel, PredeterminedFunnelStage } from '@/utils/api-crm-predetermined';

// Tipo genérico para funis (compatível com todos os módulos)
type GenericFunnel = SalesFunnel | ServiceFunnel | PredeterminedFunnel;
type GenericStage = SalesFunnelStage | ServiceFunnelStage | PredeterminedFunnelStage;

// Cores predefinidas para etapas
const STAGE_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // yellow
  '#ef4444', // red
  '#8b5cf6', // purple
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
];

interface FunnelSelectorProps {
  type: FunnelType;
  selectedFunnelId: string | null;
  onFunnelChange: (funnelId: string) => void;
  funnels: GenericFunnel[];
  onFunnelsUpdate: (funnels: GenericFunnel[]) => void;
}

export function FunnelSelector({
  type,
  selectedFunnelId,
  onFunnelChange,
  funnels,
  onFunnelsUpdate,
}: FunnelSelectorProps) {
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newFunnelDescription, setNewFunnelDescription] = useState('');
  
  // Estados para edição de etapas
  const [editingFunnel, setEditingFunnel] = useState<GenericFunnel | null>(null);
  const [editingStages, setEditingStages] = useState<GenericStage[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0]);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState('');
  const [editStageColor, setEditStageColor] = useState('');
  const [draggedStageId, setDraggedStageId] = useState<string | null>(null);

  const selectedFunnel = funnels.find(f => f.id === selectedFunnelId);

  // ✅ API modular por tipo
  const getApiForType = () => {
    switch (type) {
      case 'SALES': return crmSalesApi.funnels;
      case 'SERVICES': return crmServicesApi.funnels;
      case 'PREDETERMINED': return crmPredeterminedApi.funnels;
      default: return crmSalesApi.funnels;
    }
  };
  
  const getTypeLabel = () => {
    switch (type) {
      case 'SALES': return 'Vendas';
      case 'SERVICES': return 'Serviços';
      case 'PREDETERMINED': return 'Pré-determinados';
      default: return 'Funil';
    }
  };

  const handleCreateFunnel = async () => {
    if (!newFunnelName.trim()) {
      toast.error('Nome do funil é obrigatório');
      return;
    }

    try {
      const api = getApiForType();
      const newFunnel = {
        name: newFunnelName,
        description: newFunnelDescription,
        is_default: funnels.length === 0,
        stages: getDefaultStages(type).map(s => ({ name: s.name, color: s.color, order: s.order })),
      };

      // ✅ API MODULAR - Criar via backend real
      const response = await api.create(newFunnel);
      if (response.success && response.data) {
        const updatedFunnels = [...funnels, response.data as GenericFunnel];
        onFunnelsUpdate(updatedFunnels);
        onFunnelChange(response.data.id);
        toast.success('Funil criado com sucesso!');
        setIsCreating(false);
        setNewFunnelName('');
        setNewFunnelDescription('');
      } else {
        throw new Error(response.error || 'Erro ao criar funil');
      }
    } catch (error: any) {
      console.error('[CRM] Erro ao criar funil:', error);
      toast.error(error.message || 'Erro ao criar funil');
    }
  };

  const handleDuplicateFunnel = async (funnel: GenericFunnel) => {
    try {
      const api = getApiForType();
      const duplicatedFunnel = {
        name: `${funnel.name} (Cópia)`,
        description: funnel.description,
        is_default: false,
        stages: funnel.stages?.map(s => ({ name: s.name, color: s.color, order: s.order })),
      };

      // ✅ API MODULAR - Criar cópia via backend real
      const response = await api.create(duplicatedFunnel);
      if (response.success && response.data) {
        const updatedFunnels = [...funnels, response.data as GenericFunnel];
        onFunnelsUpdate(updatedFunnels);
        toast.success('Funil duplicado com sucesso!');
      } else {
        throw new Error(response.error || 'Erro ao duplicar funil');
      }
    } catch (error: any) {
      console.error('[CRM] Erro ao duplicar funil:', error);
      toast.error(error.message || 'Erro ao duplicar funil');
    }
  };

  const handleDeleteFunnel = async (funnel: GenericFunnel) => {
    if (funnels.length <= 1) {
      toast.error('É necessário ter pelo menos um funil');
      return;
    }

    try {
      const api = getApiForType();
      // ✅ API MODULAR - Deletar via backend real
      const response = await api.delete(funnel.id);
      if (response.success) {
        const updatedFunnels = funnels.filter(f => f.id !== funnel.id);
        onFunnelsUpdate(updatedFunnels);
        if (selectedFunnelId === funnel.id && updatedFunnels.length > 0) {
          onFunnelChange(updatedFunnels[0].id);
        }
        toast.success('Funil excluído com sucesso!');
      } else {
        throw new Error(response.error || 'Erro ao excluir funil');
      }
    } catch (error: any) {
      console.error('[CRM] Erro ao excluir funil:', error);
      toast.error(error.message || 'Erro ao excluir funil');
    }
  };

  // ============================================================================
  // FUNÇÕES DE GERENCIAMENTO DE ETAPAS
  // ============================================================================

  const openStagesEditor = (funnel: GenericFunnel) => {
    setEditingFunnel(funnel);
    setEditingStages([...(funnel.stages || [])].sort((a, b) => a.order - b.order));
    setNewStageName('');
    setNewStageColor(STAGE_COLORS[0]);
    setEditingStageId(null);
  };

  const closeStagesEditor = () => {
    setEditingFunnel(null);
    setEditingStages([]);
    setNewStageName('');
    setEditingStageId(null);
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) {
      toast.error('Nome da etapa é obrigatório');
      return;
    }

    const newStage: GenericStage = {
      id: `stage-${Date.now()}`,
      funnel_id: editingFunnel?.id || '',
      name: newStageName.trim(),
      order: editingStages.length + 1,
      color: newStageColor,
      created_at: new Date().toISOString(),
    };

    setEditingStages([...editingStages, newStage]);
    setNewStageName('');
    setNewStageColor(STAGE_COLORS[(editingStages.length + 1) % STAGE_COLORS.length]);
  };

  const handleDeleteStage = (stageId: string) => {
    if (editingStages.length <= 1) {
      toast.error('É necessário ter pelo menos uma etapa');
      return;
    }
    
    const updatedStages = editingStages
      .filter(s => s.id !== stageId)
      .map((s, index) => ({ ...s, order: index + 1 }));
    setEditingStages(updatedStages);
  };

  const startEditStage = (stage: GenericStage) => {
    setEditingStageId(stage.id);
    setEditStageName(stage.name);
    setEditStageColor(stage.color);
  };

  const confirmEditStage = () => {
    if (!editStageName.trim()) {
      toast.error('Nome da etapa é obrigatório');
      return;
    }

    const updatedStages = editingStages.map(s => 
      s.id === editingStageId 
        ? { ...s, name: editStageName.trim(), color: editStageColor }
        : s
    );
    setEditingStages(updatedStages);
    setEditingStageId(null);
    setEditStageName('');
    setEditStageColor('');
  };

  const cancelEditStage = () => {
    setEditingStageId(null);
    setEditStageName('');
    setEditStageColor('');
  };

  const handleDragStart = (stageId: string) => {
    setDraggedStageId(stageId);
  };

  const handleDragOver = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    if (draggedStageId && draggedStageId !== targetStageId) {
      const draggedIndex = editingStages.findIndex(s => s.id === draggedStageId);
      const targetIndex = editingStages.findIndex(s => s.id === targetStageId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newStages = [...editingStages];
        const [removed] = newStages.splice(draggedIndex, 1);
        newStages.splice(targetIndex, 0, removed);
        
        // Atualizar order
        const reorderedStages = newStages.map((s, index) => ({ ...s, order: index + 1 }));
        setEditingStages(reorderedStages);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedStageId(null);
  };

  const handleSaveStages = async () => {
    if (!editingFunnel) return;

    // ✅ AUTO-ADD: Se houver texto no campo de nova etapa, adiciona automaticamente
    let stagesToSave = [...editingStages];
    if (newStageName.trim()) {
      const autoAddStage: GenericStage = {
        id: `stage-${Date.now()}`,
        funnel_id: editingFunnel.id,
        name: newStageName.trim(),
        order: stagesToSave.length + 1,
        color: newStageColor,
        created_at: new Date().toISOString(),
      };
      stagesToSave = [...stagesToSave, autoAddStage];
      console.log('[CRM] Auto-adicionando etapa pendente:', autoAddStage.name);
    }

    if (stagesToSave.length === 0) {
      toast.error('O funil precisa ter pelo menos uma etapa');
      return;
    }

    try {
      const api = getApiForType();
      const updateData = {
        name: editingFunnel.name,
        description: editingFunnel.description,
        stages: stagesToSave.map(s => ({ name: s.name, color: s.color, order: s.order })),
      };

      console.log('[CRM] Salvando etapas...', { funnelId: editingFunnel.id, stages: updateData.stages });

      // ✅ API MODULAR - Atualizar via backend real
      const response = await api.update(editingFunnel.id, updateData);
      
      if (response.success && response.data) {
        console.log('[CRM] Etapas salvas com sucesso!', response.data);
        
        // ✅ Atualizar lista de funis com dados do servidor
        const updatedFunnel = response.data as GenericFunnel;
        const updatedFunnels = funnels.map(f => 
          f.id === editingFunnel.id ? updatedFunnel : f
        );
        
        // ✅ Propagar atualização para componente pai
        onFunnelsUpdate(updatedFunnels);
        
        toast.success(`Etapas salvas com sucesso! (${updatedFunnel.stages?.length || 0} etapas)`);
        closeStagesEditor();
      } else {
        throw new Error(response.error || 'Erro ao salvar etapas');
      }
    } catch (error: any) {
      console.error('[CRM] Erro ao salvar etapas:', error);
      toast.error(error.message || 'Erro ao salvar etapas');
    }
  };

  const getDefaultStages = (funnelType: FunnelType) => {
    const baseId = `stage-${Date.now()}`;
    switch (funnelType) {
      case 'SALES':
        return [
          { id: `${baseId}-1`, funnelId: '', name: 'Qualificado', order: 1, color: '#3b82f6', createdAt: new Date().toISOString() },
          { id: `${baseId}-2`, funnelId: '', name: 'Contato Feito', order: 2, color: '#f59e0b', createdAt: new Date().toISOString() },
          { id: `${baseId}-3`, funnelId: '', name: 'Reunião Agendada', order: 3, color: '#ef4444', createdAt: new Date().toISOString() },
          { id: `${baseId}-4`, funnelId: '', name: 'Proposta Enviada', order: 4, color: '#8b5cf6', createdAt: new Date().toISOString() },
          { id: `${baseId}-5`, funnelId: '', name: 'Negociação', order: 5, color: '#6366f1', createdAt: new Date().toISOString() },
        ];
      case 'SERVICES':
        return [
          { id: `${baseId}-1`, funnelId: '', name: 'Triagem', order: 1, color: '#3b82f6', createdAt: new Date().toISOString() },
          { id: `${baseId}-2`, funnelId: '', name: 'Em Análise', order: 2, color: '#f59e0b', createdAt: new Date().toISOString() },
          { id: `${baseId}-3`, funnelId: '', name: 'Em Resolução', order: 3, color: '#8b5cf6', createdAt: new Date().toISOString() },
          { id: `${baseId}-4`, funnelId: '', name: 'Resolvido', order: 4, color: '#10b981', createdAt: new Date().toISOString() },
        ];
      case 'PREDETERMINED':
        return [
          { id: `${baseId}-1`, funnelId: '', name: 'Início', order: 1, color: '#3b82f6', createdAt: new Date().toISOString() },
          { id: `${baseId}-2`, funnelId: '', name: 'Em Progresso', order: 2, color: '#f59e0b', createdAt: new Date().toISOString() },
          { id: `${baseId}-3`, funnelId: '', name: 'Conclusão', order: 3, color: '#10b981', createdAt: new Date().toISOString() },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Dropdown de seleção de funil */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[200px] justify-between">
            <span className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Funil:</span>
              <span className="font-medium">{selectedFunnel?.name || 'Selecione...'}</span>
              {selectedFunnel?.is_default && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                  Padrão
                </Badge>
              )}
            </span>
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[300px]">
          {funnels.map(funnel => (
            <DropdownMenuItem
              key={funnel.id}
              onClick={() => onFunnelChange(funnel.id)}
              className={selectedFunnelId === funnel.id ? 'bg-gray-100 dark:bg-gray-800' : ''}
            >
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{funnel.name}</span>
                  {funnel.is_default && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                      Padrão
                    </Badge>
                  )}
                </div>
                {funnel.description && (
                  <span className="text-xs text-gray-500 mt-0.5">{funnel.description}</span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          {funnels.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="text-gray-500">Nenhum funil disponível</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Botão de gestão de funis (engrenagem) */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setManageModalOpen(true)}
        title="Gerenciar funis"
      >
        <Settings className="w-4 h-4" />
      </Button>

      {/* Modal de gestão de funis */}
      <Dialog open={manageModalOpen} onOpenChange={(open) => {
        setManageModalOpen(open);
        if (!open) closeStagesEditor();
      }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            {editingFunnel ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeStagesEditor}
                    className="p-1 h-8 w-8"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <DialogTitle>Etapas do Funil</DialogTitle>
                    <DialogDescription className="text-sm">
                      {editingFunnel.name}
                    </DialogDescription>
                  </div>
                </div>
              </>
            ) : (
              <>
                <DialogTitle>Gerenciar Funis de {getTypeLabel()}</DialogTitle>
                <DialogDescription>
                  Crie, edite ou exclua funis. Cada funil pode ter etapas personalizadas.
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          {/* Conteúdo: Lista de funis ou Editor de etapas */}
          {editingFunnel ? (
            // ========== EDITOR DE ETAPAS ==========
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Lista de etapas */}
              <div className="flex-1 overflow-y-auto py-2 space-y-2 min-h-0">
                {editingStages.map((stage) => (
                  <div
                    key={stage.id}
                    draggable
                    onDragStart={() => handleDragStart(stage.id)}
                    onDragOver={(e) => handleDragOver(e, stage.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-3 border rounded-lg bg-white dark:bg-gray-900 cursor-move transition-all ${
                      draggedStageId === stage.id ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    
                    {/* Cor da etapa */}
                    {editingStageId === stage.id ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {STAGE_COLORS.slice(0, 5).map(color => (
                          <button
                            key={color}
                            onClick={() => setEditStageColor(color)}
                            className={`w-5 h-5 rounded-full border-2 transition-all ${
                              editStageColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: stage.color }}
                      />
                    )}

                    {/* Nome da etapa */}
                    {editingStageId === stage.id ? (
                      <Input
                        value={editStageName}
                        onChange={(e) => setEditStageName(e.target.value)}
                        className="flex-1 h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmEditStage();
                          if (e.key === 'Escape') cancelEditStage();
                        }}
                      />
                    ) : (
                      <span className="flex-1 font-medium text-sm">{stage.name}</span>
                    )}

                    {/* Ações */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {editingStageId === stage.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={confirmEditStage}
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditStage}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditStage(stage)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStage(stage.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Adicionar nova etapa */}
              <div className="border-t pt-4 mt-2 space-y-3">
                <Label className="text-sm font-medium">Adicionar Nova Etapa</Label>
                <div className="flex items-center gap-2">
                  {/* Seletor de cor */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {STAGE_COLORS.slice(0, 5).map(color => (
                      <button
                        key={color}
                        onClick={() => setNewStageColor(color)}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${
                          newStageColor === color ? 'border-gray-800 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <Input
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    placeholder="Nome da etapa"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddStage();
                    }}
                  />
                  <Button onClick={handleAddStage} size="sm">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Botão Salvar */}
              <div className="border-t pt-4 mt-4">
                <Button onClick={handleSaveStages} className="w-full">
                  Salvar Etapas
                </Button>
              </div>
            </div>
          ) : (
            // ========== LISTA DE FUNIS ==========
            <>
              <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
                {funnels.map(funnel => (
                  <div
                    key={funnel.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => openStagesEditor(funnel)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{funnel.name}</span>
                        {funnel.is_default && (
                          <Badge variant="outline" className="text-xs">Padrão</Badge>
                        )}
                      </div>
                      {funnel.description && (
                        <p className="text-xs text-gray-500 mt-1">{funnel.description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        {funnel.stages?.slice(0, 5).map(stage => (
                          <div
                            key={stage.id}
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                            title={stage.name}
                          />
                        ))}
                        {(funnel.stages?.length || 0) > 5 && (
                          <span className="text-xs text-gray-400">+{(funnel.stages?.length || 0) - 5}</span>
                        )}
                        <span className="text-xs text-gray-400 ml-2">
                          {funnel.stages?.length || 0} etapas
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateFunnel(funnel)}
                        title="Duplicar funil"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      {!funnel.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFunnel(funnel)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Excluir funil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Formulário de criação */}
              {isCreating ? (
                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label>Nome do Funil</Label>
                    <Input
                      value={newFunnelName}
                      onChange={(e) => setNewFunnelName(e.target.value)}
                      placeholder={`Ex: Funil de ${getTypeLabel()} WhatsApp`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Textarea
                      value={newFunnelDescription}
                      onChange={(e) => setNewFunnelDescription(e.target.value)}
                      placeholder="Descreva o objetivo deste funil..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateFunnel} className="flex-1">
                      Criar Funil
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreating(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsCreating(true)}
                  className="w-full mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Novo Funil
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
