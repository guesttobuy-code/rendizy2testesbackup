import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { ServiceTicket, Funnel, ServiceTask, TaskStatus, TaskType } from '../../types/funnels';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { CheckCircle2, Circle, AlertCircle, Plus, Trash2, FileText, Upload, FormInput, Save, User, Calendar, Users, UserCircle, ShoppingCart, Store, Home, Building2, Zap, X } from 'lucide-react';
import { servicesTicketsApi } from '../../utils/api';
import { toast } from 'sonner';
import { calculateTicketProgress, filterTasksByStage, isTaskComplete } from '../../utils/taskProgress';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import { AssigneeSelector } from './AssigneeSelector';
import { TaskDatePicker } from './TaskDatePicker';
import { FileUpload, UploadedFile } from './FileUpload';
import { FormTaskViewer } from './FormTaskViewer';
import { SortableTaskCard } from './SortableTaskCard';
import { PersonSelector } from './PersonSelector';
import { PropertySelector } from './PropertySelector';
import { AutomationSelector } from './AutomationSelector';
import { TicketProductsManager } from './TicketProductsManager';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface ServicesTicketDetailLeftProps {
  ticket: ServiceTicket;
  funnel: Funnel;
  onUpdate: (ticket: ServiceTicket) => void;
}

export function ServicesTicketDetailLeft({
  ticket,
  funnel,
  onUpdate,
}: ServicesTicketDetailLeftProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'details' | 'activity'>('tasks');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('STANDARD');
  const [newTaskAssignee, setNewTaskAssignee] = useState<{ id?: string; name?: string }>({});
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | undefined>();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filtrar tarefas da etapa atual (wizard-like)
  const currentStageTasks = useMemo(() => {
    return filterTasksByStage(ticket.tasks || [], ticket.stageId);
  }, [ticket.tasks, ticket.stageId]);

  // Calcular progresso automaticamente
  const progress = useMemo(() => {
    return calculateTicketProgress(ticket);
  }, [ticket]);

  // Atualizar progresso do ticket quando tarefas mudarem
  useEffect(() => {
    const newProgress = calculateTicketProgress(ticket);
    if (ticket.progress !== newProgress) {
      const updatedTicket = { ...ticket, progress: newProgress };
      onUpdate(updatedTicket);
    }
  }, [ticket.tasks]);

  // Função auxiliar para obter ícone do tipo de pessoa
  const getPersonIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="w-3 h-3" />;
      case 'contact':
        return <UserCircle className="w-3 h-3" />;
      case 'guest':
        return <Users className="w-3 h-3" />;
      case 'buyer':
        return <ShoppingCart className="w-3 h-3" />;
      case 'seller':
        return <Store className="w-3 h-3" />;
      default:
        return <User className="w-3 h-3" />;
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    const newTask: ServiceTask = {
      id: Date.now().toString(),
      ticketId: ticket.id,
      stageId: ticket.stageId, // ✅ VINCULADO À ETAPA ATUAL
      type: newTaskType, // ✅ TIPO DE TAREFA
      title: newTaskTitle,
      status: 'TODO',
      order: currentStageTasks.length + 1,
      subtasks: [],
      // Atribuição e prazo
      assignedTo: newTaskAssignee.id,
      assignedToName: newTaskAssignee.name,
      dueDate: newTaskDueDate,
      // Dados específicos por tipo
      ...(newTaskType === 'FORM' && {
        formData: {
          completed: false,
        },
      }),
      ...(newTaskType === 'ATTACHMENT' && {
        attachments: {
          files: [],
        },
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTicket = {
      ...ticket,
      tasks: [...ticket.tasks, newTask],
      progress: calculateTicketProgress({ ...ticket, tasks: [...ticket.tasks, newTask] }),
    };

    onUpdate(updatedTicket);
    setNewTaskTitle('');
    setNewTaskType('STANDARD');
    setNewTaskAssignee({});
    setNewTaskDueDate(undefined);
    setIsAddingTask(false);

    // TODO: Salvar via API
    toast.success('Tarefa adicionada');
  };

  const handleToggleTask = async (taskId: string) => {
    const updatedTasks = ticket.tasks.map(task => {
      if (task.id === taskId) {
        const newStatus: TaskStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
        return {
          ...task,
          status: newStatus,
          completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
        };
      }
      return task;
    });

    const updatedTicket = { 
      ...ticket, 
      tasks: updatedTasks,
      progress: calculateTicketProgress({ ...ticket, tasks: updatedTasks }),
    };
    onUpdate(updatedTicket);

    // TODO: Salvar via API
  };

  const handleAddSubtask = (taskId: string, subtaskTitle: string) => {
    const updatedTasks = ticket.tasks.map(task => {
      if (task.id === taskId) {
        const newSubtask = {
          id: Date.now().toString(),
          taskId,
          title: subtaskTitle,
          status: 'TODO' as TaskStatus,
          order: task.subtasks.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return {
          ...task,
          subtasks: [...task.subtasks, newSubtask],
        };
      }
      return task;
    });

    const updatedTicket = { ...ticket, tasks: updatedTasks };
    onUpdate(updatedTicket);
  };

  const handleUpdateStatus = async (newStatus: ServiceTicket['status']) => {
    const updatedTicket = { ...ticket, status: newStatus };
    onUpdate(updatedTicket);
    // TODO: Salvar via API
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find the tasks that belong to the current stage
    const currentStageTasksOnly = ticket.tasks.filter(task => task.stageId === ticket.stageId);
    
    // Find the indices within the currentStageTasksOnly array
    const oldIndex = currentStageTasksOnly.findIndex(task => task.id === active.id);
    const newIndex = currentStageTasksOnly.findIndex(task => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder only the tasks within the current stage
    const reorderedCurrentStageTasks = arrayMove(currentStageTasksOnly, oldIndex, newIndex);

    // Merge the reordered tasks back into the full list of tasks, maintaining tasks from other stages
    const updatedTasks = ticket.tasks.map(task => {
      const reorderedTask = reorderedCurrentStageTasks.find(rt => rt.id === task.id);
      return reorderedTask ? { ...reorderedTask, order: reorderedCurrentStageTasks.indexOf(reorderedTask) + 1 } : task;
    });

    const updatedTicket = { ...ticket, tasks: updatedTasks };
    onUpdate(updatedTicket);
  };

  const getStatusBadge = (status: ServiceTicket['status']) => {
    const config = {
      RESOLVED: { label: funnel.statusConfig.resolvedStatus, color: 'bg-green-100 text-green-800' },
      UNRESOLVED: { label: funnel.statusConfig.unresolvedStatus, color: 'bg-red-100 text-red-800' },
      IN_ANALYSIS: { label: funnel.statusConfig.inProgressStatus, color: 'bg-yellow-100 text-yellow-800' },
      PENDING: { label: 'Pendente', color: 'bg-blue-100 text-blue-800' },
      CANCELLED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' },
    };
    return config[status] || config.PENDING;
  };

  return (
    <div className="p-6 space-y-6 w-full">
      {/* Ticket Header */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-bold">{ticket.title}</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveTemplateOpen(true)}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            Salvar como Modelo
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge className={getStatusBadge(ticket.status).color}>
            {getStatusBadge(ticket.status).label}
          </Badge>
          <Badge variant="outline">{ticket.priority}</Badge>
        </div>
        {/* Valor Total dos Produtos - Só mostra se não estiver oculto */}
        {ticket.products && ticket.products.length > 0 && (ticket.hideProducts !== true) && (
          <div className="mt-3">
            <p className="text-sm text-gray-500">Products</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: ticket.currency || 'BRL',
                minimumFractionDigits: 2,
              }).format(
                ticket.products.reduce((total, product) => total + product.price * product.quantity, 0)
              )}
            </p>
          </div>
        )}
      </div>

      {/* Status Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={ticket.status}
            onValueChange={(v) => handleUpdateStatus(v as ServiceTicket['status'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RESOLVED">{funnel.statusConfig.resolvedStatus}</SelectItem>
              <SelectItem value="UNRESOLVED">{funnel.statusConfig.unresolvedStatus}</SelectItem>
              <SelectItem value="IN_ANALYSIS">{funnel.statusConfig.inProgressStatus}</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="mt-4 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso da Etapa</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {currentStageTasks.filter(t => isTaskComplete(t)).length} de {currentStageTasks.length} tarefas completas
            </p>
          </div>

          {/* Add Task */}
          {isAddingTask ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Input
                  placeholder="Título da tarefa..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddTask();
                    } else if (e.key === 'Escape') {
                      setIsAddingTask(false);
                      setNewTaskTitle('');
                      setNewTaskType('STANDARD');
                    }
                  }}
                  autoFocus
                />
                <Select value={newTaskType} onValueChange={(v) => setNewTaskType(v as TaskType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de tarefa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Tarefa Padrão
                      </div>
                    </SelectItem>
                    <SelectItem value="FORM">
                      <div className="flex items-center gap-2">
                        <FormInput className="w-4 h-4" />
                        Formulário
                      </div>
                    </SelectItem>
                    <SelectItem value="ATTACHMENT">
                      <div className="flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Anexo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <AssigneeSelector
                    value={newTaskAssignee.id}
                    valueName={newTaskAssignee.name}
                    onSelect={(id, name) => setNewTaskAssignee({ id, name })}
                    placeholder="Atribuir a..."
                  />
                  <TaskDatePicker
                    value={newTaskDueDate}
                    onChange={setNewTaskDueDate}
                    placeholder="Prazo (opcional)"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddTask}>
                    Adicionar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    setIsAddingTask(false);
                    setNewTaskTitle('');
                    setNewTaskType('STANDARD');
                    setNewTaskAssignee({});
                    setNewTaskDueDate(undefined);
                  }}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Tarefa
            </Button>
          )}

          {/* Tasks List - Apenas tarefas da etapa atual */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={currentStageTasks.map(t => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {currentStageTasks.map(task => {
                const taskComplete = isTaskComplete(task);
                return (
                  <SortableTaskCard key={task.id} task={task}>
                    <div className="flex items-start gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleTask(task.id)}
                    >
                      {taskComplete ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${taskComplete ? 'line-through text-gray-500' : ''}`}>
                          {task.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {task.type === 'STANDARD' && <FileText className="w-3 h-3 mr-1" />}
                          {task.type === 'FORM' && <FormInput className="w-3 h-3 mr-1" />}
                          {task.type === 'ATTACHMENT' && <Upload className="w-3 h-3 mr-1" />}
                          {task.type === 'STANDARD' ? 'Padrão' : task.type === 'FORM' ? 'Formulário' : 'Anexo'}
                        </Badge>
                      </div>
                      {/* Atribuição e Prazo */}
                      <div className="flex items-center gap-2 mt-2">
                        <AssigneeSelector
                          value={task.assignedTo}
                          valueName={task.assignedToName}
                          onSelect={(userId, userName) => {
                            const updatedTasks = ticket.tasks.map(t =>
                              t.id === task.id
                                ? { ...t, assignedTo: userId, assignedToName: userName }
                                : t
                            );
                            const updatedTicket = {
                              ...ticket,
                              tasks: updatedTasks,
                              progress: calculateTicketProgress({ ...ticket, tasks: updatedTasks }),
                            };
                            onUpdate(updatedTicket);
                            // TODO: Salvar via API
                          }}
                          placeholder="Atribuir a..."
                          className="h-8 text-xs"
                        />
                        <TaskDatePicker
                          value={task.dueDate}
                          onChange={(date) => {
                            const updatedTasks = ticket.tasks.map(t =>
                              t.id === task.id ? { ...t, dueDate: date } : t
                            );
                            const updatedTicket = {
                              ...ticket,
                              tasks: updatedTasks,
                            };
                            onUpdate(updatedTicket);
                            // TODO: Salvar via API
                          }}
                          placeholder="Prazo"
                          className="h-8 text-xs"
                        />
                      </div>
                      {/* Dados específicos por tipo */}
                      {task.type === 'FORM' && task.formData && (
                        <div className="mt-3">
                          <FormTaskViewer
                            task={task}
                            onComplete={async (formData) => {
                              const updatedTasks = ticket.tasks.map(t =>
                                t.id === task.id
                                  ? {
                                      ...t,
                                      formData: {
                                        ...t.formData,
                                        completed: true,
                                        responseData: formData,
                                        responseUrl: `#form-response-${task.id}`,
                                      },
                                    }
                                  : t
                              );
                              const updatedTicket = {
                                ...ticket,
                                tasks: updatedTasks,
                                progress: calculateTicketProgress({ ...ticket, tasks: updatedTasks }),
                              };
                              onUpdate(updatedTicket);
                              // TODO: Salvar via API
                            }}
                          />
                        </div>
                      )}
                      {task.type === 'ATTACHMENT' && task.attachments && (
                        <div className="mt-3">
                          <FileUpload
                            files={(task.attachments.files || []).map(f => ({
                              id: f.id,
                              name: f.name,
                              url: f.url,
                              type: f.type,
                            }))}
                            onFilesChange={(files: UploadedFile[]) => {
                              const updatedTasks = ticket.tasks.map(t =>
                                t.id === task.id
                                  ? {
                                      ...t,
                                      attachments: {
                                        files: files.map(f => ({
                                          id: f.id,
                                          name: f.name,
                                          url: f.url,
                                          type: f.type,
                                          uploadedAt: new Date().toISOString(),
                                        })),
                                      },
                                    }
                                  : t
                              );
                              const updatedTicket = {
                                ...ticket,
                                tasks: updatedTasks,
                                progress: calculateTicketProgress({ ...ticket, tasks: updatedTasks }),
                              };
                              onUpdate(updatedTicket);
                              // TODO: Salvar via API
                            }}
                            maxFiles={20}
                            maxSizeMB={10}
                          />
                        </div>
                      )}
                      {/* Subtasks */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className="mt-2 space-y-1 pl-6">
                          {task.subtasks.map(subtask => (
                            <div key={subtask.id} className="flex items-center gap-2 text-sm">
                              {subtask.status === 'COMPLETED' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-400" />
                              )}
                              <span className={subtask.status === 'COMPLETED' ? 'line-through text-gray-500' : ''}>
                                {subtask.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  </SortableTaskCard>
                );
              })}
            </SortableContext>
          </DndContext>

          {currentStageTasks.length === 0 && (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Nenhuma tarefa nesta etapa. Adicione tarefas para começar.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={ticket.description || ''}
                  onChange={(e) => {
                    const updated = { ...ticket, description: e.target.value };
                    onUpdate(updated);
                  }}
                  className="mt-1"
                  rows={4}
                />
              </div>
              {ticket.assignedToName && (
                <div>
                  <label className="text-sm font-medium">Atribuído a</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {ticket.assignedToName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{ticket.assignedToName}</span>
                  </div>
                </div>
              )}

              {/* Seção de Produtos/Orçamento */}
              <div className="border-t pt-4">
                <TicketProductsManager
                  products={ticket.products || []}
                  onProductsChange={(products) => {
                    const updated = { ...ticket, products };
                    onUpdate(updated);
                  }}
                  currency={ticket.currency || 'BRL'}
                  hideProducts={ticket.hideProducts || false}
                  onHideProductsChange={(hide) => {
                    const updated = { ...ticket, hideProducts: hide };
                    onUpdate(updated);
                  }}
                />
              </div>

              {/* Relacionamentos */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium mb-2 block">Pessoas Relacionadas</label>
                  <PersonSelector
                    selected={ticket.relatedPeople?.map(p => p.id) || []}
                    onChange={(selectedIds) => {
                      // TODO: Carregar dados reais baseado nos IDs
                      const updatedPeople = selectedIds.map(id => {
                        const existing = ticket.relatedPeople?.find(p => p.id === id);
                        return existing || {
                          id,
                          type: 'user' as const,
                          name: `Pessoa ${id}`,
                        };
                      });
                      onUpdate({ ...ticket, relatedPeople: updatedPeople });
                    }}
                    placeholder="Selecione pessoas..."
                  />
                  {ticket.relatedPeople && ticket.relatedPeople.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ticket.relatedPeople.map(person => (
                        <Badge key={person.id} variant="secondary" className="flex items-center gap-1">
                          {getPersonIcon(person.type)}
                          <span>{person.name}</span>
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => {
                              const updated = ticket.relatedPeople?.filter(p => p.id !== person.id) || [];
                              onUpdate({ ...ticket, relatedPeople: updated });
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Imóveis Relacionados</label>
                  <PropertySelector
                    selected={ticket.relatedProperties?.map(p => p.id) || []}
                    onChange={(selectedIds) => {
                      // TODO: Carregar dados reais baseado nos IDs
                      const updatedProperties = selectedIds.map(id => {
                        const existing = ticket.relatedProperties?.find(p => p.id === id);
                        return existing || {
                          id,
                          name: `Imóvel ${id}`,
                        };
                      });
                      onUpdate({ ...ticket, relatedProperties: updatedProperties });
                    }}
                    placeholder="Selecione imóvel(is)..."
                    allowMultiple={true}
                  />
                  {ticket.relatedProperties && ticket.relatedProperties.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ticket.relatedProperties.map(property => (
                        <Badge key={property.id} variant="secondary" className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          <span>{property.name}</span>
                          {property.code && <span className="text-xs">({property.code})</span>}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => {
                              const updated = ticket.relatedProperties?.filter(p => p.id !== property.id) || [];
                              onUpdate({ ...ticket, relatedProperties: updated });
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Automações</label>
                  <AutomationSelector
                    selected={ticket.relatedAutomations?.map(a => a.id) || []}
                    onChange={(selectedIds) => {
                      // TODO: Carregar dados reais baseado nos IDs
                      const updatedAutomations = selectedIds.map(id => {
                        const existing = ticket.relatedAutomations?.find(a => a.id === id);
                        return existing || {
                          id,
                          name: `Automação ${id}`,
                        };
                      });
                      onUpdate({ ...ticket, relatedAutomations: updatedAutomations });
                    }}
                    placeholder="Selecione automação(ões)..."
                  />
                  {ticket.relatedAutomations && ticket.relatedAutomations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {ticket.relatedAutomations.map(automation => (
                        <Badge key={automation.id} variant="secondary" className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          <span>{automation.name}</span>
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => {
                              const updated = ticket.relatedAutomations?.filter(a => a.id !== automation.id) || [];
                              onUpdate({ ...ticket, relatedAutomations: updated });
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Nenhuma atividade registrada</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save as Template Modal */}
      <SaveAsTemplateModal
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        onSuccess={() => {
          toast.success('Modelo salvo com sucesso!');
        }}
        ticket={ticket}
        funnel={funnel}
      />
    </div>
  );
}

