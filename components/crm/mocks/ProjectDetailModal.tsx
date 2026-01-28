/**
 * Project Detail Modal - Modal de Detalhes do Projeto
 * 
 * Estilo ClickUp com:
 * - Hierarquia de subtarefas (múltiplos níveis)
 * - Activity log lateral
 * - Campos editáveis inline
 * - Progress tracking
 */

import React, { useState } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  MessageSquare,
  Paperclip,
  Link2,
  Copy,
  Trash2,
  Archive,
  Star,
  StarOff,
  Sparkles,
  Send,
  AtSign,
  Smile,
  Image,
  FileText,
  ExternalLink,
  Edit3,
  Users,
  Tag,
  AlertCircle,
  CheckCheck,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================================
// MOCK DATA
// ============================================================================

interface MockSubtask {
  id: string;
  title: string;
  completed: boolean;
  assignee?: { name: string; initials: string };
  dueDate?: string;
  children?: MockSubtask[];
  expanded?: boolean;
}

interface MockActivity {
  id: string;
  type: 'comment' | 'status_change' | 'task_completed' | 'assigned' | 'created';
  user: { name: string; initials: string };
  content: string;
  timestamp: string;
  metadata?: any;
}

const MOCK_SUBTASKS: MockSubtask[] = [
  {
    id: '1',
    title: 'Tarefas Iniciais',
    completed: true,
    expanded: true,
    children: [
      {
        id: '1.1',
        title: 'MARIA TERESA e ARTHUR - Reunião ES',
        completed: true,
        assignee: { name: 'Maria Teresa', initials: 'MT' },
      },
      {
        id: '1.2',
        title: 'MARIA TERESA: Limpeza',
        completed: true,
        assignee: { name: 'Maria Teresa', initials: 'MT' },
        expanded: true,
        children: [
          { id: '1.2.1', title: 'Limpeza: alinhar com o proprietário a responsabilidade da limpeza', completed: true },
          { id: '1.2.2', title: 'Explicar as opções de pagamento das limpezas', completed: true },
          { id: '1.2.3', title: 'Caso o proprietário já tenha um contato de limpeza, anote o contato', completed: true },
          { id: '1.2.4', title: 'Caso existam reservas ativas, esclareça se a limpeza vai ser a cargo do proprietário ou nós vamos assumir a limpeza dessas reservas', completed: true },
        ],
      },
    ],
  },
  {
    id: '2',
    title: 'Implantação',
    completed: false,
    expanded: true,
    children: [
      {
        id: '2.1',
        title: 'ROCHA - Anúncio',
        completed: false,
        assignee: { name: 'Rocha', initials: 'RO' },
        expanded: true,
        children: [
          { id: '2.1.1', title: 'Continuar com o anúncio após o envio das fotos (João avisa que estão no Drive)', completed: false },
          { id: '2.1.2', title: 'Informações na descrição do grupo do proprietário', completed: false },
          { id: '2.1.3', title: 'Solicite que o proprietário confirme o acesso à plataforma', completed: false },
        ],
      },
      {
        id: '2.2',
        title: 'RAFAEL - Precificação',
        completed: false,
        assignee: { name: 'Rafael', initials: 'RM' },
        children: [
          { id: '2.2.1', title: 'Apresentar o anúncio ao proprietário', completed: false },
          { id: '2.2.2', title: 'Solicite ao proprietário fazer simulações diferentes para testar o anúncio', completed: false },
        ],
      },
      {
        id: '2.3',
        title: 'ARTHUR - Acesso à estadia do proprietário, caso o proprietário tenha dificuldades',
        completed: false,
        assignee: { name: 'Arthur', initials: 'AR' },
        children: [
          { id: '2.3.1', title: 'Solicite que o proprietário confirme o acesso à plataforma', completed: false },
          { id: '2.3.2', title: 'Orientar o proprietário a assistir o Link de Treinamento', completed: false },
          { id: '2.3.3', title: 'Solicite que o proprietário veja o vídeo de como fazer bloqueios no calendário', completed: false },
        ],
      },
      {
        id: '2.4',
        title: 'RAFAEL - Liberar para vendas',
        completed: false,
        assignee: { name: 'Rafael', initials: 'RM' },
      },
      {
        id: '2.5',
        title: 'ATENDIMENTO ARTHUR - Apresentar o imóvel novo para a Equipe de Atendimento',
        completed: false,
        assignee: { name: 'Arthur', initials: 'AR' },
      },
    ],
  },
  {
    id: '3',
    title: 'SUCESSO DO CLIENTE',
    completed: false,
    expanded: true,
    children: [
      {
        id: '3.1',
        title: 'Monitoramento de reservas',
        completed: false,
        children: [
          { id: '3.1.1', title: '1ª reserva - monitorar reserva, observar a avaliação do hóspede e responder', completed: false },
          { id: '3.1.2', title: '2ª reserva - monitorar reserva, observar a avaliação do hóspede e responder', completed: false },
          { id: '3.1.3', title: '3ª reserva - monitorar reserva, observar a avaliação do hóspede e responder', completed: false },
        ],
      },
      {
        id: '3.2',
        title: 'Pesquisa de Satisfação',
        completed: false,
        children: [
          { id: '3.2.1', title: 'Pesquisa de satisfação com o cliente', completed: false },
          { id: '3.2.2', title: 'Identificar oportunidades de crescimento vertical da relação com o cliente', completed: false },
        ],
      },
    ],
  },
];

const MOCK_ACTIVITIES: MockActivity[] = [
  {
    id: '1',
    type: 'comment',
    user: { name: 'Sua Casa Rende Mais', initials: 'SC' },
    content: 'FICHA PREENCHIDA DO PROPRIETÁRIO: 📋 Checklist de Cadastro de Imóvel - Sua Casa Rende Mais: Avaliação Inicial e Sucesso do Cliente',
    timestamp: '2025-11-13T10:05:00',
  },
  {
    id: '2',
    type: 'comment',
    user: { name: 'Sua Casa Rende Mais', initials: 'SC' },
    content: 'GRUPO DO WHATSAPP:\n\nWalker - Gramado, RS/Guarapari, ES | Sua Casa Rende Mais\n🔗 chat.whatsapp.com/IIAFR01TaCv6lqa2PuC8IS',
    timestamp: '2025-11-13T10:04:00',
  },
  {
    id: '3',
    type: 'task_completed',
    user: { name: 'You', initials: 'YO' },
    content: 'checked Preencher a tarefa Aqpira|Detalhes&spart; do clickup: e-mail, link do grupo e link do vídeo in MODELO DA IMPLANTAÇÃO',
    timestamp: '2025-11-13T10:04:00',
  },
  {
    id: '4',
    type: 'task_completed',
    user: { name: 'You', initials: 'YO' },
    content: 'checked Apresentar o time para o proprietário in MODELO DA IMPLANTAÇÃO',
    timestamp: '2025-11-13T10:03:00',
  },
  {
    id: '5',
    type: 'status_change',
    user: { name: 'You', initials: 'YO' },
    content: 'changed status from 🟡 Fotos/Vistoria/CheckIn to ⏳ Aguardando Proprietário',
    timestamp: '2025-12-20T12:08:00',
  },
];

// ============================================================================
// SUBTASK COMPONENT
// ============================================================================

interface SubtaskItemProps {
  task: MockSubtask;
  level?: number;
  onToggle?: (id: string) => void;
  onComplete?: (id: string, completed: boolean) => void;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({
  task,
  level = 0,
  onToggle,
  onComplete,
}) => {
  const [isExpanded, setIsExpanded] = useState(task.expanded ?? false);
  const hasChildren = task.children && task.children.length > 0;
  const completedChildren = task.children?.filter(c => c.completed).length || 0;
  const totalChildren = task.children?.length || 0;

  return (
    <div className="select-none">
      <div
        className={cn(
          'group flex items-start gap-2 py-1.5 px-2 rounded hover:bg-accent/50 transition-colors',
          level > 0 && 'ml-6'
        )}
        style={{ paddingLeft: `${level * 24 + 8}px` }}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-accent rounded mt-0.5"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Checkbox */}
        <Checkbox
          checked={task.completed}
          onCheckedChange={(checked) => onComplete?.(task.id, checked as boolean)}
          className={cn(
            'mt-0.5',
            task.completed && 'data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500'
          )}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm',
              task.completed && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </span>
            {hasChildren && (
              <span className="text-xs text-muted-foreground">
                {completedChildren}/{totalChildren}
              </span>
            )}
          </div>
        </div>

        {/* Assignee */}
        {task.assignee && (
          <Avatar className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity">
            <AvatarFallback className="text-[10px]">{task.assignee.initials}</AvatarFallback>
          </Avatar>
        )}

        {/* Due Date Icon */}
        {task.dueDate && (
          <Calendar className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="border-l border-muted ml-4" style={{ marginLeft: `${level * 24 + 20}px` }}>
          {task.children?.map((child) => (
            <SubtaskItem
              key={child.id}
              task={child}
              level={level + 1}
              onToggle={onToggle}
              onComplete={onComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

const ActivityItem: React.FC<{ activity: MockActivity }> = ({ activity }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      year: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIcon = () => {
    switch (activity.type) {
      case 'comment':
        return <MessageSquare className="h-4 w-4" />;
      case 'task_completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'status_change':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex gap-3 py-3">
      <Avatar className="h-6 w-6 flex-shrink-0">
        <AvatarFallback className="text-[10px]">{activity.user.initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{activity.user.name}</span>
          <span className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</span>
        </div>
        <div className="flex items-start gap-2 mt-1">
          <span className="text-muted-foreground mt-0.5">{getIcon()}</span>
          <p className="text-sm whitespace-pre-wrap">{activity.content}</p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ProjectDetailModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  projectName?: string;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  isOpen = true,
  onClose,
  projectName = 'WALKER PIERRE - GRAMADO RS / GUARAPARI ES',
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [subtasks, setSubtasks] = useState(MOCK_SUBTASKS);
  const [newComment, setNewComment] = useState('');

  // Calculate progress
  const countTasks = (tasks: MockSubtask[]): { total: number; completed: number } => {
    let total = 0;
    let completed = 0;
    
    tasks.forEach(task => {
      if (!task.children || task.children.length === 0) {
        total++;
        if (task.completed) completed++;
      } else {
        const childCount = countTasks(task.children);
        total += childCount.total;
        completed += childCount.completed;
      }
    });
    
    return { total, completed };
  };

  const { total, completed } = countTasks(subtasks);
  const progress = Math.round((completed / total) * 100);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative ml-auto h-full w-full max-w-4xl bg-background shadow-xl flex flex-col animate-in slide-in-from-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-4">
            <Checkbox className="h-5 w-5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">SETOR - IMPLANTAÇÃO</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Imóveis - Proprietários</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Lista</span>
              </div>
              <h2 className="font-semibold text-lg mt-1">{projectName}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Star className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* AI Assistant */}
        <div className="px-6 py-3 bg-muted/30 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span>Peça ao cérebro para escreva uma descrição, criar um resumo ou encontrar tarefas semelhantes</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Status & Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Status
                  </label>
                  <Select defaultValue="aguardando">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao-iniciado">⚪ Não Iniciado</SelectItem>
                      <SelectItem value="fotos">🟣 Fotos/Vistoria/CheckIn</SelectItem>
                      <SelectItem value="transportando">🟢 Transportando CS</SelectItem>
                      <SelectItem value="aguardando">🟡 Aguardando Proprietário</SelectItem>
                      <SelectItem value="fim">🔵 Fim de</SelectItem>
                      <SelectItem value="desistentes">🔴 Desistentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Cessionários
                  </label>
                  <div className="mt-1 text-sm text-muted-foreground">Vazio</div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Datas
                  </label>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span>Começar +</span>
                    <span className="text-orange-500">🗓️ 15/11/25</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Prioridade
                  </label>
                  <Badge className="mt-1 bg-red-100 text-red-600">🚩 Urgente</Badge>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Relacionamentos
                  </label>
                  <div className="mt-1 text-sm text-muted-foreground">Vazio</div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <FileText className="h-4 w-4" />
                  Adicionar descrição
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Escreva com IA
                </div>
              </div>

              <Separator />

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="subtasks">Subtarefas</TabsTrigger>
                  <TabsTrigger value="items">
                    Itens de ação
                    <Badge variant="secondary" className="ml-2">{total}</Badge>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Detalhes do projeto serão exibidos aqui.
                  </p>
                </TabsContent>

                <TabsContent value="subtasks" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    Subtarefas simples serão exibidas aqui.
                  </p>
                </TabsContent>

                <TabsContent value="items" className="mt-4 space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Listas de verificação</span>
                      <span className="text-sm text-muted-foreground">
                        <span className="text-green-500">●</span> {completed}/{total}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Checklist Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">MODELO DA IMPLANTAÇÃO</h3>
                    <span className="text-sm text-muted-foreground">{completed} de {total}</span>
                  </div>

                  {/* Subtasks Tree */}
                  <div className="space-y-1">
                    {subtasks.map((task) => (
                      <SubtaskItem
                        key={task.id}
                        task={task}
                        onComplete={(id, completed) => {
                          // Update logic would go here
                          console.log('Complete:', id, completed);
                        }}
                      />
                    ))}
                  </div>

                  {/* Add Item */}
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Item
                  </button>

                  {/* Hide Completed Toggle */}
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                    <CheckCheck className="h-4 w-4" />
                    Ocultar concluído
                  </button>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Activity Sidebar */}
          <div className="w-80 border-l flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Activity</h3>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {MOCK_ACTIVITIES.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </ScrollArea>

            {/* Comment Input */}
            <div className="p-4 border-t">
              <div className="flex items-start gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">YO</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[60px] resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Smile className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <AtSign className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Image className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button size="sm" disabled={!newComment.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailModal;
