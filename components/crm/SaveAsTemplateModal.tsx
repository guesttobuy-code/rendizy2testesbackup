import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ServiceTicket, ServiceTicketTemplate, Funnel } from '../../types/funnels';
import { ticketTemplatesApi } from '../../utils/api';
import { toast } from 'sonner';
import { Loader2, Save, Globe, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';

interface SaveAsTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ticket: ServiceTicket;
  funnel: Funnel;
}

export function SaveAsTemplateModal({
  open,
  onClose,
  onSuccess,
  ticket,
  funnel,
}: SaveAsTemplateModalProps) {
  const { isSuperAdmin } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isGlobalDefault, setIsGlobalDefault] = useState(false);
  const [globalDefaultNote, setGlobalDefaultNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome do modelo é obrigatório');
      return;
    }

    // Validar se não-admin está tentando criar global
    if (isGlobalDefault && !isSuperAdmin) {
      toast.error('Apenas o Admin Master pode criar templates globais padrão');
      return;
    }

    setIsSaving(true);
    try {
      const template: ServiceTicketTemplate = {
        id: Date.now().toString(),
        organizationId: ticket.organizationId,
        name: name.trim(),
        description: description.trim() || undefined,
        funnelId: funnel.id,
        stages: funnel.stages,
        tasks: ticket.tasks.map(task => ({
          ...task,
          // Remover IDs temporários e resetar status
          id: `${Date.now()}-${Math.random()}`,
          ticketId: '', // Não será usado no template
          status: 'TODO' as const,
          subtasks: task.subtasks.map(subtask => ({
            ...subtask,
            id: `${Date.now()}-${Math.random()}`,
            taskId: `${Date.now()}-${Math.random()}`,
            status: 'TODO' as const,
          })),
        })),
        isTemplate: true,
        isGlobalDefault: isSuperAdmin ? isGlobalDefault : false, // Apenas super_admin pode criar globais
        globalDefaultNote: isSuperAdmin && isGlobalDefault ? globalDefaultNote : undefined,
        createdBy: ticket.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Tentar salvar via API
      const response = await ticketTemplatesApi.create(template);
      
      if (response.success && response.data) {
        toast.success('Modelo salvo com sucesso!');
        // Salvar também no localStorage como backup
        const savedTemplates = JSON.parse(localStorage.getItem('rendizy_ticket_templates') || '[]');
        savedTemplates.push(response.data);
        localStorage.setItem('rendizy_ticket_templates', JSON.stringify(savedTemplates));
        onSuccess();
        handleClose();
      } else {
        // Fallback: salvar apenas no localStorage
        const savedTemplates = JSON.parse(localStorage.getItem('rendizy_ticket_templates') || '[]');
        savedTemplates.push(template);
        localStorage.setItem('rendizy_ticket_templates', JSON.stringify(savedTemplates));
        toast.success('Modelo salvo localmente!');
        onSuccess();
        handleClose();
      }
    } catch (error: any) {
      console.error('Erro ao salvar modelo:', error);
      // Fallback: salvar apenas no localStorage
      const template: ServiceTicketTemplate = {
        id: Date.now().toString(),
        organizationId: ticket.organizationId,
        name: name.trim(),
        description: description.trim() || undefined,
        funnelId: funnel.id,
        stages: funnel.stages,
        tasks: ticket.tasks,
        isTemplate: true,
        createdBy: ticket.createdBy,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const savedTemplates = JSON.parse(localStorage.getItem('rendizy_ticket_templates') || '[]');
      savedTemplates.push(template);
      localStorage.setItem('rendizy_ticket_templates', JSON.stringify(savedTemplates));
      toast.success('Modelo salvo localmente!');
      onSuccess();
      handleClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setIsGlobalDefault(false);
    setGlobalDefaultNote('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Salvar como Modelo</DialogTitle>
          <DialogDescription>
            Salve este ticket como um modelo reutilizável. Todas as tarefas e etapas serão preservadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome do Modelo *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Modelo Implantação"
              autoFocus
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva quando usar este modelo..."
              rows={3}
            />
          </div>

          {/* Opção Default Global - Apenas para Super Admin */}
          {isSuperAdmin && (
            <div className="space-y-3 p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="isGlobalDefaultTemplate"
                  checked={isGlobalDefault}
                  onCheckedChange={(checked) => setIsGlobalDefault(checked === true)}
                />
                <div className="flex-1">
                  <Label htmlFor="isGlobalDefaultTemplate" className="flex items-center gap-2 cursor-pointer">
                    <Globe className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold">Default Global</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este template será aplicado como padrão para todas as organizações (clientes).
                    Apenas o Admin Master pode criar e editar templates globais.
                  </p>
                </div>
              </div>
              {isGlobalDefault && (
                <div>
                  <Label htmlFor="globalDefaultNoteTemplate">Observação (opcional)</Label>
                  <Textarea
                    id="globalDefaultNoteTemplate"
                    value={globalDefaultNote}
                    onChange={(e) => setGlobalDefaultNote(e.target.value)}
                    placeholder="Ex: Template padrão para manutenções e consertos. Todos os clientes recebem este template automaticamente."
                    rows={3}
                    className="mt-1"
                  />
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Atenção:</strong> Alterações neste template afetarão todas as organizações.
                      Use com cuidado e apenas para melhorias universais.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
            <p className="font-semibold mb-1">Este modelo incluirá:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{ticket.tasks.length} tarefa(s) em {funnel.stages.length} etapa(s)</li>
              <li>Todas as configurações de tarefas (tipos, atribuições, etc.)</li>
              <li>Estrutura completa do processo</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Modelo
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

