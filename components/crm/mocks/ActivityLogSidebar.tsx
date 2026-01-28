/**
 * Activity Log Sidebar - Painel de Atividades
 * 
 * Histórico de atividades estilo ClickUp:
 * - Timeline de eventos
 * - Filtros por tipo
 * - Comentários inline
 * - Sistema de menções
 */

import React, { useState } from 'react';
import {
  MessageSquare,
  CheckCircle2,
  Circle,
  AlertCircle,
  User,
  Clock,
  Tag,
  Flag,
  Calendar,
  Paperclip,
  Link2,
  Edit3,
  Trash2,
  ArrowRight,
  Plus,
  Filter,
  ChevronDown,
  AtSign,
  Smile,
  Send,
  Image,
  MoreHorizontal,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ============================================================================
// TYPES
// ============================================================================

export type ActivityType =
  | 'comment'
  | 'status_change'
  | 'task_completed'
  | 'task_uncompleted'
  | 'assigned'
  | 'unassigned'
  | 'created'
  | 'due_date_change'
  | 'priority_change'
  | 'attachment_added'
  | 'tag_added'
  | 'tag_removed'
  | 'subtask_added'
  | 'moved';

export interface Activity {
  id: string;
  type: ActivityType;
  user: {
    id: string;
    name: string;
    initials: string;
    avatar?: string;
  };
  timestamp: string;
  content?: string;
  metadata?: {
    from?: string;
    to?: string;
    taskName?: string;
    tagName?: string;
    fileName?: string;
    listName?: string;
    mentionedUsers?: string[];
  };
  reactions?: { emoji: string; count: number; users: string[] }[];
  replies?: Activity[];
  isEdited?: boolean;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: '1',
    type: 'comment',
    user: { id: 'u1', name: 'Rafael Marques', initials: 'RM' },
    timestamp: '2026-01-24T10:30:00',
    content: '@Arthur por favor verificar se o proprietário já recebeu os acessos da plataforma. Precisamos confirmar antes de liberar para vendas.',
    metadata: { mentionedUsers: ['Arthur'] },
    reactions: [{ emoji: '👍', count: 2, users: ['Arthur', 'Maria'] }],
    replies: [
      {
        id: '1.1',
        type: 'comment',
        user: { id: 'u2', name: 'Arthur Silva', initials: 'AS' },
        timestamp: '2026-01-24T10:45:00',
        content: 'Já confirmei! Ele tem acesso e já fez o primeiro login ontem.',
      },
    ],
  },
  {
    id: '2',
    type: 'status_change',
    user: { id: 'u1', name: 'Rafael Marques', initials: 'RM' },
    timestamp: '2026-01-24T09:15:00',
    metadata: {
      from: '🟡 Fotos/Vistoria',
      to: '⏳ Aguardando Proprietário',
    },
  },
  {
    id: '3',
    type: 'task_completed',
    user: { id: 'u3', name: 'Maria Teresa', initials: 'MT' },
    timestamp: '2026-01-24T08:30:00',
    metadata: { taskName: 'Alinhar com o proprietário a responsabilidade da limpeza' },
  },
  {
    id: '4',
    type: 'assigned',
    user: { id: 'u1', name: 'Rafael Marques', initials: 'RM' },
    timestamp: '2026-01-23T16:00:00',
    metadata: { to: 'Rocha' },
  },
  {
    id: '5',
    type: 'due_date_change',
    user: { id: 'u1', name: 'Rafael Marques', initials: 'RM' },
    timestamp: '2026-01-23T14:20:00',
    metadata: {
      from: '20/01/2026',
      to: '25/01/2026',
    },
  },
  {
    id: '6',
    type: 'attachment_added',
    user: { id: 'u4', name: 'João Fotos', initials: 'JF' },
    timestamp: '2026-01-23T11:00:00',
    metadata: { fileName: 'fotos_imovel_gramado.zip' },
  },
  {
    id: '7',
    type: 'priority_change',
    user: { id: 'u1', name: 'Rafael Marques', initials: 'RM' },
    timestamp: '2026-01-22T17:30:00',
    metadata: {
      from: 'Normal',
      to: 'Urgente',
    },
  },
  {
    id: '8',
    type: 'subtask_added',
    user: { id: 'u1', name: 'Rafael Marques', initials: 'RM' },
    timestamp: '2026-01-22T15:00:00',
    metadata: { taskName: 'Liberar para vendas' },
  },
  {
    id: '9',
    type: 'created',
    user: { id: 'u1', name: 'Rafael Marques', initials: 'RM' },
    timestamp: '2026-01-20T10:00:00',
    metadata: { listName: 'Imóveis - Proprietários' },
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getActivityIcon = (type: ActivityType) => {
  const iconClass = 'h-4 w-4';
  switch (type) {
    case 'comment':
      return <MessageSquare className={iconClass} />;
    case 'status_change':
      return <RefreshCw className={iconClass} />;
    case 'task_completed':
      return <CheckCircle2 className={cn(iconClass, 'text-green-500')} />;
    case 'task_uncompleted':
      return <Circle className={iconClass} />;
    case 'assigned':
      return <User className={cn(iconClass, 'text-blue-500')} />;
    case 'unassigned':
      return <User className={cn(iconClass, 'text-gray-400')} />;
    case 'created':
      return <Plus className={cn(iconClass, 'text-purple-500')} />;
    case 'due_date_change':
      return <Calendar className={cn(iconClass, 'text-orange-500')} />;
    case 'priority_change':
      return <Flag className={iconClass} />;
    case 'attachment_added':
      return <Paperclip className={cn(iconClass, 'text-blue-500')} />;
    case 'tag_added':
    case 'tag_removed':
      return <Tag className={iconClass} />;
    case 'subtask_added':
      return <Plus className={cn(iconClass, 'text-green-500')} />;
    case 'moved':
      return <ArrowRight className={iconClass} />;
    default:
      return <Circle className={iconClass} />;
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

const formatFullTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================================================
// ACTIVITY ITEM COMPONENT
// ============================================================================

interface ActivityItemProps {
  activity: Activity;
  showReplies?: boolean;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, showReplies = true }) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showAllReplies, setShowAllReplies] = useState(false);

  const renderContent = () => {
    switch (activity.type) {
      case 'comment':
        return (
          <div className="space-y-2">
            <p className="text-sm whitespace-pre-wrap">
              {activity.content?.split(/(@\w+)/g).map((part, i) =>
                part.startsWith('@') ? (
                  <span key={i} className="text-blue-500 font-medium">
                    {part}
                  </span>
                ) : (
                  part
                )
              )}
            </p>
            {activity.reactions && activity.reactions.length > 0 && (
              <div className="flex items-center gap-1">
                {activity.reactions.map((reaction, i) => (
                  <button
                    key={i}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted hover:bg-muted/80 text-xs"
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'status_change':
        return (
          <p className="text-sm text-muted-foreground">
            alterou o status de{' '}
            <span className="font-medium">{activity.metadata?.from}</span> para{' '}
            <span className="font-medium">{activity.metadata?.to}</span>
          </p>
        );

      case 'task_completed':
        return (
          <p className="text-sm text-muted-foreground">
            concluiu{' '}
            <span className="font-medium text-green-600">
              {activity.metadata?.taskName}
            </span>
          </p>
        );

      case 'assigned':
        return (
          <p className="text-sm text-muted-foreground">
            atribuiu para{' '}
            <span className="font-medium text-blue-600">{activity.metadata?.to}</span>
          </p>
        );

      case 'due_date_change':
        return (
          <p className="text-sm text-muted-foreground">
            alterou a data de{' '}
            <span className="font-medium">{activity.metadata?.from}</span> para{' '}
            <span className="font-medium text-orange-600">{activity.metadata?.to}</span>
          </p>
        );

      case 'attachment_added':
        return (
          <p className="text-sm text-muted-foreground">
            anexou{' '}
            <span className="font-medium text-blue-600 hover:underline cursor-pointer">
              {activity.metadata?.fileName}
            </span>
          </p>
        );

      case 'priority_change':
        return (
          <p className="text-sm text-muted-foreground">
            alterou a prioridade de{' '}
            <span className="font-medium">{activity.metadata?.from}</span> para{' '}
            <span className="font-medium text-red-600">{activity.metadata?.to}</span>
          </p>
        );

      case 'subtask_added':
        return (
          <p className="text-sm text-muted-foreground">
            adicionou subtarefa{' '}
            <span className="font-medium">{activity.metadata?.taskName}</span>
          </p>
        );

      case 'created':
        return (
          <p className="text-sm text-muted-foreground">
            criou esta tarefa em{' '}
            <span className="font-medium">{activity.metadata?.listName}</span>
          </p>
        );

      default:
        return <p className="text-sm text-muted-foreground">{activity.content}</p>;
    }
  };

  return (
    <div className="group">
      <div className="flex gap-3 py-2">
        {/* Avatar */}
        <Avatar className="h-7 w-7 flex-shrink-0">
          {activity.user.avatar && <AvatarImage src={activity.user.avatar} />}
          <AvatarFallback className="text-xs">{activity.user.initials}</AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{activity.user.name}</span>
            {activity.type !== 'comment' && (
              <span className="text-muted-foreground">
                {getActivityIcon(activity.type)}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-help">
                  {formatTimestamp(activity.timestamp)}
                </span>
              </TooltipTrigger>
              <TooltipContent>{formatFullTimestamp(activity.timestamp)}</TooltipContent>
            </Tooltip>
            {activity.isEdited && (
              <span className="text-xs text-muted-foreground">(editado)</span>
            )}
          </div>

          <div className="mt-1">{renderContent()}</div>

          {/* Actions for comments */}
          {activity.type === 'comment' && (
            <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setIsReplying(true)}
              >
                Responder
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Smile className="h-3 w-3 mr-1" />
                Reagir
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link2 className="h-4 w-4 mr-2" />
                    Copiar link
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Replies */}
          {showReplies && activity.replies && activity.replies.length > 0 && (
            <div className="mt-3 pl-4 border-l-2 border-muted space-y-2">
              {(showAllReplies ? activity.replies : activity.replies.slice(0, 2)).map(
                (reply) => (
                  <ActivityItem key={reply.id} activity={reply} showReplies={false} />
                )
              )}
              {activity.replies.length > 2 && !showAllReplies && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAllReplies(true)}
                >
                  Ver mais {activity.replies.length - 2} respostas
                </Button>
              )}
            </div>
          )}

          {/* Reply Input */}
          {isReplying && (
            <div className="mt-2 flex items-start gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px]">VO</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Escreva uma resposta..."
                  className="min-h-[60px] text-sm"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" disabled={!replyText.trim()}>
                    Responder
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface ActivityLogSidebarProps {
  activities?: Activity[];
  onClose?: () => void;
  className?: string;
}

export const ActivityLogSidebar: React.FC<ActivityLogSidebarProps> = ({
  activities = MOCK_ACTIVITIES,
  onClose,
  className,
}) => {
  const [newComment, setNewComment] = useState('');
  const [filterTypes, setFilterTypes] = useState<ActivityType[]>([]);
  const [showComments, setShowComments] = useState(true);
  const [showActivity, setShowActivity] = useState(true);

  const filteredActivities = activities.filter((activity) => {
    if (filterTypes.length > 0 && !filterTypes.includes(activity.type)) {
      return false;
    }
    if (!showComments && activity.type === 'comment') return false;
    if (!showActivity && activity.type !== 'comment') return false;
    return true;
  });

  // Group activities by date
  const groupedActivities: Record<string, Activity[]> = {};
  filteredActivities.forEach((activity) => {
    const date = new Date(activity.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = 'Ontem';
    } else {
      key = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    }

    if (!groupedActivities[key]) {
      groupedActivities[key] = [];
    }
    groupedActivities[key].push(activity);
  });

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Atividade</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuCheckboxItem
                checked={showComments}
                onCheckedChange={setShowComments}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comentários
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showActivity}
                onCheckedChange={setShowActivity}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atividades
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground text-xs">
                Mais filtros em breve...
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Activity List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {Object.entries(groupedActivities).map(([date, items]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">{date}</span>
                <Separator className="flex-1" />
              </div>
              {items.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          ))}

          {filteredActivities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma atividade encontrada</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Comment Input */}
      <div className="flex-shrink-0 p-4 border-t bg-muted/30">
        <div className="flex items-start gap-3">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">VO</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              className="min-h-[60px] resize-none bg-background"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Emoji</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <AtSign className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mencionar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Image className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Imagem</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Anexar</TooltipContent>
                </Tooltip>
              </div>
              <Button size="sm" disabled={!newComment.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogSidebar;
