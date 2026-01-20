import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Trash2, GripVertical, Edit2, Save, X, Globe, AlertCircle } from 'lucide-react';
import { Funnel, FunnelType, FunnelStage, StatusConfig } from '../../types/funnels';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface EditFunnelsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (funnel: Funnel) => void;
  existingFunnels?: Funnel[];
}

export function EditFunnelsModal({ open, onClose, onSave, existingFunnels = [] }: EditFunnelsModalProps) {
  const { isSuperAdmin } = useAuth();
  const [funnels, setFunnels] = useState<Funnel[]>(existingFunnels);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [funnelName, setFunnelName] = useState('');
  const [funnelType, setFunnelType] = useState<FunnelType>('SALES');
  const [funnelDescription, setFunnelDescription] = useState('');
  const [isGlobalDefault, setIsGlobalDefault] = useState(false);
  const [globalDefaultNote, setGlobalDefaultNote] = useState('');
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [statusConfig, setStatusConfig] = useState<StatusConfig>({
    resolvedStatus: 'Resolvido',
    unresolvedStatus: 'Não Resolvido',
    inProgressStatus: 'Em Análise',
    customStatuses: [],
  });

  useEffect(() => {
    if (existingFunnels.length > 0) {
      setFunnels(existingFunnels);
    } else {
      // Funis padrão
      const defaultFunnels: Funnel[] = [
        {
          id: 'sales-default',
          organizationId: '',
          name: 'Funil de Vendas',
          type: 'SALES',
          description: 'Pipeline de vendas padrão',
          stages: [
            { id: '1', funnelId: 'sales-default', name: 'Qualificado', order: 1, color: '#3b82f6', createdAt: new Date().toISOString() },
            { id: '2', funnelId: 'sales-default', name: 'Contato Feito', order: 2, color: '#f59e0b', createdAt: new Date().toISOString() },
            { id: '3', funnelId: 'sales-default', name: 'Reunião Agendada', order: 3, color: '#ef4444', createdAt: new Date().toISOString() },
            { id: '4', funnelId: 'sales-default', name: 'Proposta Feita', order: 4, color: '#8b5cf6', createdAt: new Date().toISOString() },
            { id: '5', funnelId: 'sales-default', name: 'Negociações', order: 5, color: '#6366f1', createdAt: new Date().toISOString() },
            { id: '6', funnelId: 'sales-default', name: 'Ganho', order: 6, color: '#10b981', createdAt: new Date().toISOString() },
            { id: '7', funnelId: 'sales-default', name: 'Perdido', order: 7, color: '#ef4444', createdAt: new Date().toISOString() },
          ],
          statusConfig: {
            resolvedStatus: 'Ganho',
            unresolvedStatus: 'Perdido',
            inProgressStatus: 'Em Negociação',
          },
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'services-default',
          organizationId: '',
          name: 'Funil de Serviços',
          type: 'SERVICES',
          description: 'Gestão de tickets e resolução de problemas',
          stages: [
            { id: '1', funnelId: 'services-default', name: 'Triagem', order: 1, color: '#3b82f6', createdAt: new Date().toISOString() },
            { id: '2', funnelId: 'services-default', name: 'Em Análise', order: 2, color: '#f59e0b', createdAt: new Date().toISOString() },
            { id: '3', funnelId: 'services-default', name: 'Em Resolução', order: 3, color: '#8b5cf6', createdAt: new Date().toISOString() },
            { id: '4', funnelId: 'services-default', name: 'Aguardando Cliente', order: 4, color: '#6366f1', createdAt: new Date().toISOString() },
            { id: '5', funnelId: 'services-default', name: 'Resolvido', order: 5, color: '#10b981', createdAt: new Date().toISOString() },
            { id: '6', funnelId: 'services-default', name: 'Não Resolvido', order: 6, color: '#ef4444', createdAt: new Date().toISOString() },
          ],
          statusConfig: {
            resolvedStatus: 'Resolvido',
            unresolvedStatus: 'Não Resolvido',
            inProgressStatus: 'Em Análise',
            customStatuses: [
              { id: '1', label: 'Aguardando Aprovação', color: '#f59e0b' },
              { id: '2', label: 'Em Teste', color: '#8b5cf6' },
            ],
          },
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'predetermined-default',
          organizationId: '',
          name: 'Funil Pré-determinado',
          type: 'PREDETERMINED',
          description: 'Processos sequenciais tipo wizard (ex: vistoria, implantação)',
          stages: [
            { id: '1', funnelId: 'predetermined-default', name: 'Etapa 1', order: 1, color: '#3b82f6', createdAt: new Date().toISOString() },
            { id: '2', funnelId: 'predetermined-default', name: 'Etapa 2', order: 2, color: '#f59e0b', createdAt: new Date().toISOString() },
            { id: '3', funnelId: 'predetermined-default', name: 'Etapa 3', order: 3, color: '#8b5cf6', createdAt: new Date().toISOString() },
            { id: '4', funnelId: 'predetermined-default', name: 'Etapa 4', order: 4, color: '#10b981', createdAt: new Date().toISOString() },
          ],
          statusConfig: {
            resolvedStatus: 'Concluído',
            unresolvedStatus: 'Cancelado',
            inProgressStatus: 'Em Andamento',
          },
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setFunnels(defaultFunnels);
    }
  }, [existingFunnels]);

  const handleCreateFunnel = () => {
    setSelectedFunnel(null);
    setIsEditing(true);
    setFunnelName('');
    setFunnelType('SALES');
    setFunnelDescription('');
    setIsGlobalDefault(false);
    setGlobalDefaultNote('');
    setStages([]);
    setStatusConfig({
      resolvedStatus: funnelType === 'SERVICES' ? 'Resolvido' : funnelType === 'PREDETERMINED' ? 'Concluído' : 'Ganho',
      unresolvedStatus: funnelType === 'SERVICES' ? 'Não Resolvido' : funnelType === 'PREDETERMINED' ? 'Cancelado' : 'Perdido',
      inProgressStatus: funnelType === 'PREDETERMINED' ? 'Em Andamento' : 'Em Análise',
      customStatuses: [],
    });
  };

  const handleEditFunnel = (funnel: Funnel) => {
    // Prevenir edição de funis globais por não-admin
    if (funnel.isGlobalDefault && !isSuperAdmin) {
      toast.error('Apenas o Admin Master pode editar funis globais padrão');
      return;
    }
    
    setSelectedFunnel(funnel);
    setIsEditing(true);
    setFunnelName(funnel.name);
    setFunnelType(funnel.type);
    setFunnelDescription(funnel.description || '');
    setIsGlobalDefault(funnel.isGlobalDefault || false);
    setGlobalDefaultNote(funnel.globalDefaultNote || '');
    setStages([...funnel.stages]);
    setStatusConfig({ ...funnel.statusConfig });
  };

  const handleAddStage = () => {
    const newStage: FunnelStage = {
      id: Date.now().toString(),
      funnelId: selectedFunnel?.id || 'new',
      name: `Etapa ${stages.length + 1}`,
      order: stages.length + 1,
      color: '#3b82f6',
      createdAt: new Date().toISOString(),
    };
    setStages([...stages, newStage]);
  };

  const handleDeleteStage = (stageId: string) => {
    setStages(stages.filter(s => s.id !== stageId).map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const handleSaveFunnel = () => {
    if (!funnelName.trim()) {
      toast.error('Nome do funil é obrigatório');
      return;
    }

    if (stages.length === 0) {
      toast.error('Adicione pelo menos uma etapa');
      return;
    }

    // Validar se não-admin está tentando criar/editar global
    if (isGlobalDefault && !isSuperAdmin) {
      toast.error('Apenas o Admin Master pode criar ou editar funis globais padrão');
      return;
    }

    const funnel: Funnel = {
      id: selectedFunnel?.id || Date.now().toString(),
      organizationId: '',
      name: funnelName,
      type: funnelType,
      description: funnelDescription,
      stages,
      statusConfig,
      isDefault: false,
      isGlobalDefault: isSuperAdmin ? isGlobalDefault : false, // Apenas super_admin pode criar globais
      globalDefaultNote: isSuperAdmin && isGlobalDefault ? globalDefaultNote : undefined,
      createdAt: selectedFunnel?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(funnel);
    toast.success('Funil salvo com sucesso!');
    setIsEditing(false);
    setSelectedFunnel(null);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Funis</DialogTitle>
          <DialogDescription>
            Crie e edite funis de vendas, serviços e pré-determinados. Configure etapas e status customizados.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list">Meus Funis</TabsTrigger>
            <TabsTrigger value="create">Criar/Editar</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleCreateFunnel}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Funil
              </Button>
            </div>

            <div className="space-y-2">
              {funnels.map(funnel => (
                <div
                  key={funnel.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{funnel.name}</h3>
                      <Badge variant={funnel.type === 'SALES' ? 'default' : funnel.type === 'PREDETERMINED' ? 'outline' : 'secondary'}>
                        {funnel.type === 'SALES' ? 'Vendas' : funnel.type === 'PREDETERMINED' ? 'Pré-determinado' : 'Serviços'}
                      </Badge>
                      {funnel.isDefault && (
                        <Badge variant="outline">Padrão</Badge>
                      )}
                      {funnel.isGlobalDefault && (
                        <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
                          <Globe className="w-3 h-3 mr-1" />
                          Global
                        </Badge>
                      )}
                    </div>
                    {funnel.description && (
                      <p className="text-sm text-gray-500 mt-1">{funnel.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {funnel.stages.length} etapas
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {funnel.isGlobalDefault && !isSuperAdmin && (
                      <span className="text-xs text-muted-foreground">Apenas Admin Master</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditFunnel(funnel)}
                      disabled={funnel.isGlobalDefault && !isSuperAdmin}
                      title={funnel.isGlobalDefault && !isSuperAdmin ? 'Apenas o Admin Master pode editar funis globais' : 'Editar funil'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            {isEditing ? (
              <>
                <div className="space-y-4">
                  <div>
                    <Label>Nome do Funil</Label>
                    <Input
                      value={funnelName}
                      onChange={(e) => setFunnelName(e.target.value)}
                      placeholder="Ex: Funil de Vendas Q1 2025"
                    />
                  </div>

                  <div>
                    <Label>Tipo</Label>
                    <Select value={funnelType} onValueChange={(v) => setFunnelType(v as FunnelType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALES">Funil de Vendas</SelectItem>
                        <SelectItem value="SERVICES">Funil de Serviços</SelectItem>
                        <SelectItem value="PREDETERMINED">Funil Pré-determinado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={funnelDescription}
                      onChange={(e) => setFunnelDescription(e.target.value)}
                      placeholder="Descreva o propósito deste funil..."
                    />
                  </div>

                  {/* Opção Default Global - Apenas para Super Admin */}
                  {isSuperAdmin && (
                    <div className="space-y-3 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="isGlobalDefault"
                          checked={isGlobalDefault}
                          onCheckedChange={(checked) => setIsGlobalDefault(checked === true)}
                        />
                        <div className="flex-1">
                          <Label htmlFor="isGlobalDefault" className="flex items-center gap-2 cursor-pointer">
                            <Globe className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold">Default Global</span>
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Este funil será aplicado como padrão para todas as organizações (clientes).
                            Apenas o Admin Master pode criar e editar funis globais.
                          </p>
                        </div>
                      </div>
                      {isGlobalDefault && (
                        <div>
                          <Label htmlFor="globalDefaultNote">Observação (opcional)</Label>
                          <Textarea
                            id="globalDefaultNote"
                            value={globalDefaultNote}
                            onChange={(e) => setGlobalDefaultNote(e.target.value)}
                            placeholder="Ex: Funil padrão para manutenções e consertos em imóveis. Todos os clientes recebem este funil automaticamente."
                            rows={3}
                            className="mt-1"
                          />
                          <Alert className="mt-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                              <strong>Atenção:</strong> Alterações neste funil afetarão todas as organizações.
                              Use com cuidado e apenas para melhorias universais.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Etapas do Funil</Label>
                      <Button size="sm" onClick={handleAddStage}>
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Etapa
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {stages.map((stage, index) => (
                        <div
                          key={stage.id}
                          className="flex items-center gap-2 p-2 border rounded"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <Input
                            value={stage.name}
                            onChange={(e) => {
                              const newStages = [...stages];
                              newStages[index].name = e.target.value;
                              setStages(newStages);
                            }}
                            className="flex-1"
                          />
                          <Input
                            type="color"
                            value={stage.color}
                            onChange={(e) => {
                              const newStages = [...stages];
                              newStages[index].color = e.target.value;
                              setStages(newStages);
                            }}
                            className="w-16"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStage(stage.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {funnelType === 'SERVICES' && (
                    <div>
                      <Label>Configuração de Status</Label>
                      <div className="space-y-2 mt-2">
                        <div>
                          <Label className="text-xs">Status Resolvido</Label>
                          <Input
                            value={statusConfig.resolvedStatus}
                            onChange={(e) =>
                              setStatusConfig({ ...statusConfig, resolvedStatus: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Status Não Resolvido</Label>
                          <Input
                            value={statusConfig.unresolvedStatus}
                            onChange={(e) =>
                              setStatusConfig({ ...statusConfig, unresolvedStatus: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Status Em Análise</Label>
                          <Input
                            value={statusConfig.inProgressStatus}
                            onChange={(e) =>
                              setStatusConfig({ ...statusConfig, inProgressStatus: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveFunnel}>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Funil
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Selecione um funil para editar ou crie um novo</p>
                <Button className="mt-4" onClick={handleCreateFunnel}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Novo Funil
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

