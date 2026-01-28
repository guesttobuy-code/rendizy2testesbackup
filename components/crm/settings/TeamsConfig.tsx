/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    TEAMS CONFIGURATION - UI COMPONENT                       ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente para gerenciamento de Times/Equipes
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Bell,
  UserPlus,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Settings2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import type {
  Team,
  TeamMember,
  TeamNotificationConfig,
  AssignmentRule,
  NotificationChannel,
  CreateTeamInput,
} from '@/types/crm-tasks';
import { TeamsService } from '@/services/crmTasksService';

// ============================================================================
// TYPES
// ============================================================================

interface TeamsConfigProps {
  organizationId: string;
  availableUsers?: { id: string; name: string; email: string; avatar_url?: string }[];
}

// ============================================================================
// MOCK DATA (Fallback quando não há conexão)
// ============================================================================

const MOCK_TEAMS: Team[] = [
  {
    id: '1',
    organization_id: 'org-1',
    name: 'Equipe de Limpeza',
    description: 'Responsáveis pelas limpezas dos imóveis',
    notification_config: {
      on_task_created: true,
      on_sla_approaching: true,
      on_task_overdue: true,
      on_any_update: false,
      channels: ['whatsapp', 'push'],
    },
    assignment_rule: 'round_robin',
    color: '#22c55e',
    icon: 'sparkles',
    members: [
      { id: 'm1', team_id: '1', user_id: 'u1', user: { id: 'u1', name: 'Maria Limpeza', email: 'maria@email.com' }, role: 'leader', is_active: true, created_at: '' },
      { id: 'm2', team_id: '1', user_id: 'u2', user: { id: 'u2', name: 'João Auxiliar', email: 'joao@email.com' }, role: 'member', is_active: true, created_at: '' },
    ],
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    organization_id: 'org-1',
    name: 'Manutenção',
    description: 'Equipe técnica para reparos',
    notification_config: {
      on_task_created: true,
      on_sla_approaching: true,
      on_task_overdue: true,
      on_any_update: false,
      channels: ['whatsapp', 'push', 'email'],
    },
    assignment_rule: 'least_busy',
    color: '#f59e0b',
    icon: 'wrench',
    members: [
      { id: 'm3', team_id: '2', user_id: 'u3', user: { id: 'u3', name: 'Pedro Técnico', email: 'pedro@email.com' }, role: 'leader', is_active: true, created_at: '' },
    ],
    is_active: true,
    created_at: '',
    updated_at: '',
  },
  {
    id: '3',
    organization_id: 'org-1',
    name: 'Check-in/out',
    description: 'Operações de entrada e saída de hóspedes',
    notification_config: {
      on_task_created: true,
      on_sla_approaching: true,
      on_task_overdue: true,
      on_any_update: true,
      channels: ['push'],
    },
    assignment_rule: 'notify_all',
    color: '#3b82f6',
    icon: 'key',
    members: [
      { id: 'm4', team_id: '3', user_id: 'u4', user: { id: 'u4', name: 'Ana Operações', email: 'ana@email.com' }, role: 'member', is_active: true, created_at: '' },
      { id: 'm5', team_id: '3', user_id: 'u5', user: { id: 'u5', name: 'Lucas Operações', email: 'lucas@email.com' }, role: 'member', is_active: true, created_at: '' },
    ],
    is_active: true,
    created_at: '',
    updated_at: '',
  },
];

const MOCK_USERS = [
  { id: 'u1', name: 'Maria Limpeza', email: 'maria@email.com', avatar_url: '' },
  { id: 'u2', name: 'João Auxiliar', email: 'joao@email.com', avatar_url: '' },
  { id: 'u3', name: 'Pedro Técnico', email: 'pedro@email.com', avatar_url: '' },
  { id: 'u4', name: 'Ana Operações', email: 'ana@email.com', avatar_url: '' },
  { id: 'u5', name: 'Lucas Operações', email: 'lucas@email.com', avatar_url: '' },
  { id: 'u6', name: 'Juliana Premium', email: 'juliana@email.com', avatar_url: '' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TeamsConfig({ organizationId, availableUsers }: TeamsConfigProps) {
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set(['1']));
  
  const users = availableUsers || MOCK_USERS;

  // Carrega times do servidor
  useEffect(() => {
    loadTeams();
  }, [organizationId]);

  async function loadTeams() {
    setLoading(true);
    setError(null);
    try {
      const data = await TeamsService.list(organizationId);
      if (data.length > 0) {
        setTeams(data);
      }
      // Se não houver dados, mantém o mock para demonstração
    } catch (err) {
      console.error('Erro ao carregar times:', err);
      // Mantém mock em caso de erro
    } finally {
      setLoading(false);
    }
  }

  function toggleTeamExpanded(teamId: string) {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  function handleCreateTeam() {
    setEditingTeam(null);
    setIsModalOpen(true);
  }

  function handleEditTeam(team: Team) {
    setEditingTeam(team);
    setIsModalOpen(true);
  }

  async function handleDeleteTeam(teamId: string) {
    if (!confirm('Tem certeza que deseja excluir este time?')) return;
    
    try {
      await TeamsService.delete(teamId);
      setTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err) {
      // Para demo, remove localmente
      setTeams(prev => prev.filter(t => t.id !== teamId));
    }
  }

  async function handleSaveTeam(input: CreateTeamInput) {
    try {
      if (editingTeam) {
        const updated = await TeamsService.update(editingTeam.id, input);
        setTeams(prev => prev.map(t => t.id === editingTeam.id ? updated : t));
      } else {
        const created = await TeamsService.create(organizationId, input);
        setTeams(prev => [...prev, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      // Para demo, atualiza localmente
      if (editingTeam) {
        setTeams(prev => prev.map(t => t.id === editingTeam.id ? { ...t, ...input, notification_config: input.notification_config } as Team : t));
      } else {
        const newTeam: Team = {
          id: `temp-${Date.now()}`,
          organization_id: organizationId,
          name: input.name,
          description: input.description,
          notification_config: input.notification_config,
          assignment_rule: input.assignment_rule,
          color: input.color || '#3b82f6',
          icon: input.icon || 'users',
          members: [],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setTeams(prev => [...prev, newTeam]);
      }
      setIsModalOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Times e Equipes</h2>
          <p className="text-muted-foreground">
            Gerencie as equipes responsáveis pelas tarefas operacionais
          </p>
        </div>
        <Button onClick={handleCreateTeam}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Time
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Teams List */}
      {!loading && (
        <div className="space-y-4">
          {teams.map(team => (
            <TeamCard
              key={team.id}
              team={team}
              isExpanded={expandedTeams.has(team.id)}
              onToggle={() => toggleTeamExpanded(team.id)}
              onEdit={() => handleEditTeam(team)}
              onDelete={() => handleDeleteTeam(team.id)}
              availableUsers={users}
            />
          ))}

          {teams.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhum time criado</h3>
                <p className="text-muted-foreground text-center max-w-sm mt-2">
                  Crie times para organizar sua equipe e definir quem recebe notificações de cada tipo de tarefa.
                </p>
                <Button className="mt-4" onClick={handleCreateTeam}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeiro time
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <TeamFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        team={editingTeam}
        onSave={handleSaveTeam}
        availableUsers={users}
      />
    </div>
  );
}

// ============================================================================
// TEAM CARD COMPONENT
// ============================================================================

interface TeamCardProps {
  team: Team;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  availableUsers: { id: string; name: string; email: string; avatar_url?: string }[];
}

function TeamCard({ team, isExpanded, onToggle, onEdit, onDelete, availableUsers }: TeamCardProps) {
  const assignmentRuleLabels: Record<AssignmentRule, string> = {
    notify_all: 'Notifica todos',
    round_robin: 'Rodízio automático',
    least_busy: 'Por disponibilidade',
    by_region: 'Por região',
    fixed: 'Responsável fixo',
  };

  const channelLabels: Record<NotificationChannel, string> = {
    whatsapp: 'WhatsApp',
    push: 'App',
    email: 'Email',
    sms: 'SMS',
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: team.color + '20' }}
              >
                <Users className="h-5 w-5" style={{ color: team.color }} />
              </div>
              
              <div>
                <CardTitle className="text-lg">{team.name}</CardTitle>
                {team.description && (
                  <CardDescription>{team.description}</CardDescription>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {team.members?.length || 0} membro{(team.members?.length || 0) !== 1 ? 's' : ''}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-red-600">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Membros */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Membros
                </h4>
                <div className="space-y-2">
                  {team.members?.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.avatar_url} />
                        <AvatarFallback>
                          {(member.user?.name || member.external_name || '??')
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {member.user?.name || member.external_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.user?.email || member.external_email || member.external_phone}
                        </p>
                      </div>
                      {member.role === 'leader' && (
                        <Badge variant="outline" className="text-xs">Líder</Badge>
                      )}
                    </div>
                  ))}
                  
                  {(!team.members || team.members.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum membro adicionado
                    </p>
                  )}
                </div>
              </div>

              {/* Configurações */}
              <div className="space-y-4">
                {/* Atribuição */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Regra de Atribuição
                  </h4>
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{assignmentRuleLabels[team.assignment_rule]}</span>
                  </div>
                </div>

                {/* Notificações */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Notificações
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Canais:</span>
                      <div className="flex gap-1">
                        {team.notification_config.channels.map(channel => (
                          <Badge key={channel} variant="secondary" className="text-xs">
                            {channelLabels[channel]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {team.notification_config.on_task_created && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Tarefa criada
                        </span>
                      )}
                      {team.notification_config.on_sla_approaching && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          SLA próximo
                        </span>
                      )}
                      {team.notification_config.on_task_overdue && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Tarefa atrasada
                        </span>
                      )}
                      {team.notification_config.on_any_update && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Qualquer atualização
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ============================================================================
// TEAM FORM MODAL
// ============================================================================

interface TeamFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onSave: (input: CreateTeamInput) => void;
  availableUsers: { id: string; name: string; email: string; avatar_url?: string }[];
}

function TeamFormModal({ open, onOpenChange, team, onSave, availableUsers }: TeamFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [assignmentRule, setAssignmentRule] = useState<AssignmentRule>('notify_all');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  
  // Notificações
  const [onTaskCreated, setOnTaskCreated] = useState(true);
  const [onSlaApproaching, setOnSlaApproaching] = useState(true);
  const [onTaskOverdue, setOnTaskOverdue] = useState(true);
  const [onAnyUpdate, setOnAnyUpdate] = useState(false);
  const [channels, setChannels] = useState<NotificationChannel[]>(['push']);

  // External member form
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalName, setExternalName] = useState('');
  const [externalPhone, setExternalPhone] = useState('');
  const [externalEmail, setExternalEmail] = useState('');
  const [externalMembers, setExternalMembers] = useState<Array<{ name: string; phone?: string; email?: string }>>([]);

  // Preenche form ao editar
  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || '');
      setColor(team.color);
      setAssignmentRule(team.assignment_rule);
      setSelectedMembers(team.members?.filter(m => m.user_id).map(m => m.user_id!) || []);
      setExternalMembers(
        team.members?.filter(m => !m.user_id).map(m => ({
          name: m.external_name || '',
          phone: m.external_phone,
          email: m.external_email,
        })) || []
      );
      setOnTaskCreated(team.notification_config.on_task_created);
      setOnSlaApproaching(team.notification_config.on_sla_approaching);
      setOnTaskOverdue(team.notification_config.on_task_overdue);
      setOnAnyUpdate(team.notification_config.on_any_update);
      setChannels(team.notification_config.channels);
    } else {
      resetForm();
    }
  }, [team, open]);

  function resetForm() {
    setName('');
    setDescription('');
    setColor('#3b82f6');
    setAssignmentRule('notify_all');
    setSelectedMembers([]);
    setExternalMembers([]);
    setOnTaskCreated(true);
    setOnSlaApproaching(true);
    setOnTaskOverdue(true);
    setOnAnyUpdate(false);
    setChannels(['push']);
    setShowExternalForm(false);
    setExternalName('');
    setExternalPhone('');
    setExternalEmail('');
  }

  function toggleChannel(channel: NotificationChannel) {
    setChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel) 
        : [...prev, channel]
    );
  }

  function toggleMember(userId: string) {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  }

  function addExternalMember() {
    if (!externalName) return;
    setExternalMembers(prev => [...prev, {
      name: externalName,
      phone: externalPhone || undefined,
      email: externalEmail || undefined,
    }]);
    setExternalName('');
    setExternalPhone('');
    setExternalEmail('');
    setShowExternalForm(false);
  }

  function removeExternalMember(index: number) {
    setExternalMembers(prev => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      icon: 'users',
      assignment_rule: assignmentRule,
      notification_config: {
        on_task_created: onTaskCreated,
        on_sla_approaching: onSlaApproaching,
        on_task_overdue: onTaskOverdue,
        on_any_update: onAnyUpdate,
        channels,
      },
      member_ids: selectedMembers,
      external_members: externalMembers,
    });
  }

  const COLORS = [
    '#3b82f6', // blue
    '#22c55e', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#64748b', // slate
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{team ? 'Editar Time' : 'Novo Time'}</DialogTitle>
          <DialogDescription>
            Configure as informações do time e seus membros
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Nome e Descrição */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Nome do Time *</Label>
                <Input
                  id="team-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Equipe de Limpeza"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-description">Descrição</Label>
                <Textarea
                  id="team-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Descreva a função deste time..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Cor do Time</Label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={cn(
                        'h-8 w-8 rounded-full transition-all',
                        color === c && 'ring-2 ring-offset-2 ring-primary'
                      )}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <Separator />

            {/* Membros */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Membros do Time</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExternalForm(!showExternalForm)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Adicionar Externo
                </Button>
              </div>

              {/* Usuários internos */}
              <div className="grid grid-cols-2 gap-2">
                {availableUsers.map(user => (
                  <div
                    key={user.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
                      selectedMembers.includes(user.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    )}
                    onClick={() => toggleMember(user.id)}
                  >
                    <Checkbox checked={selectedMembers.includes(user.id)} />
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Form para membro externo */}
              {showExternalForm && (
                <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
                  <h4 className="font-medium text-sm">Adicionar Membro Externo</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Input
                        value={externalName}
                        onChange={e => setExternalName(e.target.value)}
                        placeholder="Nome"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input
                        value={externalPhone}
                        onChange={e => setExternalPhone(e.target.value)}
                        placeholder="+55 54 99999-0000"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Email</Label>
                      <Input
                        value={externalEmail}
                        onChange={e => setExternalEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                        className="h-8"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowExternalForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={addExternalMember}
                      disabled={!externalName}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de membros externos */}
              {externalMembers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Membros Externos</Label>
                  {externalMembers.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-lg border bg-amber-50/50"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs bg-amber-100">
                          {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {m.phone || m.email || 'Externo'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExternalMember(i)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Regra de Atribuição */}
            <div className="space-y-4">
              <Label>Regra de Atribuição</Label>
              <RadioGroup value={assignmentRule} onValueChange={(v) => setAssignmentRule(v as AssignmentRule)}>
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="notify_all" id="notify_all" />
                    <Label htmlFor="notify_all" className="font-normal cursor-pointer">
                      <span className="font-medium">Notificar todos</span>
                      <span className="text-muted-foreground"> - Qualquer um pode assumir</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="round_robin" id="round_robin" />
                    <Label htmlFor="round_robin" className="font-normal cursor-pointer">
                      <span className="font-medium">Rodízio automático</span>
                      <span className="text-muted-foreground"> - Distribui igualmente</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="least_busy" id="least_busy" />
                    <Label htmlFor="least_busy" className="font-normal cursor-pointer">
                      <span className="font-medium">Por disponibilidade</span>
                      <span className="text-muted-foreground"> - Quem tem menos tarefas</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="by_region" id="by_region" />
                    <Label htmlFor="by_region" className="font-normal cursor-pointer">
                      <span className="font-medium">Por região</span>
                      <span className="text-muted-foreground"> - Proximidade do imóvel</span>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <Separator />

            {/* Notificações */}
            <div className="space-y-4">
              <Label>Configuração de Notificações</Label>
              
              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Quando notificar</Label>
                <div className="grid gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="on_task_created"
                      checked={onTaskCreated}
                      onCheckedChange={(c) => setOnTaskCreated(c === true)}
                    />
                    <Label htmlFor="on_task_created" className="font-normal cursor-pointer">
                      Tarefa criada e atribuída ao time
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="on_sla_approaching"
                      checked={onSlaApproaching}
                      onCheckedChange={(c) => setOnSlaApproaching(c === true)}
                    />
                    <Label htmlFor="on_sla_approaching" className="font-normal cursor-pointer">
                      SLA próximo de vencer
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="on_task_overdue"
                      checked={onTaskOverdue}
                      onCheckedChange={(c) => setOnTaskOverdue(c === true)}
                    />
                    <Label htmlFor="on_task_overdue" className="font-normal cursor-pointer">
                      Tarefa atrasada
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="on_any_update"
                      checked={onAnyUpdate}
                      onCheckedChange={(c) => setOnAnyUpdate(c === true)}
                    />
                    <Label htmlFor="on_any_update" className="font-normal cursor-pointer">
                      Qualquer atualização na tarefa
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm text-muted-foreground">Canais de notificação</Label>
                <div className="flex gap-2">
                  {(['whatsapp', 'push', 'email', 'sms'] as NotificationChannel[]).map(channel => (
                    <Button
                      key={channel}
                      type="button"
                      variant={channels.includes(channel) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleChannel(channel)}
                    >
                      {channel === 'whatsapp' && 'WhatsApp'}
                      {channel === 'push' && 'App (Push)'}
                      {channel === 'email' && 'Email'}
                      {channel === 'sms' && 'SMS'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            <Save className="mr-2 h-4 w-4" />
            {team ? 'Salvar Alterações' : 'Criar Time'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TeamsConfig;
