import React, { useState } from 'react';
import { User, UserRole, Invitation } from '../types/tenancy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Key
} from 'lucide-react';
import { cn } from './ui/utils';

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrador',
  manager: 'Gerente',
  agent: 'Corretor/Agente',
  guest_services: 'Atendimento',
  finance: 'Financeiro',
  readonly: 'Somente Leitura'
};

const roleColors: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  agent: 'bg-green-100 text-green-700',
  guest_services: 'bg-orange-100 text-orange-700',
  finance: 'bg-emerald-100 text-emerald-700',
  readonly: 'bg-gray-100 text-gray-700'
};

const statusColors = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  pending: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700'
};

const statusLabels = {
  active: 'Ativo',
  inactive: 'Inativo',
  pending: 'Pendente',
  suspended: 'Suspenso'
};

// Mock data
const mockUsers: User[] = [
  {
    id: '1',
    organizationId: '1',
    email: 'admin@vistamar.com',
    name: 'Carlos Silva',
    role: 'admin',
    status: 'active',
    emailVerified: true,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
    phone: '(11) 98765-4321',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date(),
    lastLoginAt: new Date('2025-10-28')
  },
  {
    id: '2',
    organizationId: '1',
    email: 'maria@vistamar.com',
    name: 'Maria Santos',
    role: 'manager',
    status: 'active',
    emailVerified: true,
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date(),
    lastLoginAt: new Date('2025-10-27')
  },
  {
    id: '3',
    organizationId: '1',
    email: 'joao@vistamar.com',
    name: 'João Oliveira',
    role: 'agent',
    status: 'pending',
    emailVerified: false,
    createdAt: new Date('2025-10-25'),
    updatedAt: new Date(),
    invitedAt: new Date('2025-10-25'),
    invitedBy: '1'
  }
];

const mockInvitations: Invitation[] = [
  {
    id: '1',
    organizationId: '1',
    email: 'pedro@example.com',
    role: 'agent',
    invitedBy: '1',
    status: 'pending',
    token: 'abc123',
    expiresAt: new Date('2025-11-10'),
    createdAt: new Date('2025-10-25')
  }
];

interface UserManagementProps {
  organizationId?: string;
  isSuperAdmin?: boolean;
}

export function UserManagement({ organizationId, isSuperAdmin = false }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [invitations, setInvitations] = useState<Invitation[]>(mockInvitations);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);

  // Filtrar usuários
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const pendingUsers = users.filter(u => u.status === 'pending').length;

  const handleInviteUser = (formData: any) => {
    toast.success('Convite enviado com sucesso!');
    setInviteDialogOpen(false);
  };

  const handleUpdateUser = (user: User, updates: Partial<User>) => {
    toast.success('Usuário atualizado com sucesso!');
    setEditDialogOpen(false);
  };

  const handleDeleteUser = (user: User) => {
    if (confirm(`Tem certeza que deseja remover ${user.name}?`)) {
      toast.success('Usuário removido com sucesso!');
    }
  };

  const handleResendInvitation = (invitation: Invitation) => {
    toast.success('Convite reenviado!');
  };

  const handleCancelInvitation = (invitation: Invitation) => {
    toast.success('Convite cancelado!');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Gerenciamento de Usuários
            </h1>
            <p className="text-gray-500 mt-1">
              Gerencie usuários, funções e permissões
            </p>
          </div>
          
          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Convidar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Envie um convite por email para adicionar um novo usuário
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" placeholder="usuario@email.com" />
                </div>
                
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input placeholder="Nome completo" />
                </div>
                
                <div className="space-y-2">
                  <Label>Função *</Label>
                  <Select defaultValue="agent">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isSuperAdmin && (
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      )}
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="agent">Corretor/Agente</SelectItem>
                      <SelectItem value="guest_services">Atendimento</SelectItem>
                      <SelectItem value="finance">Financeiro</SelectItem>
                      <SelectItem value="readonly">Somente Leitura</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    A função determina as permissões padrão do usuário
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleInviteUser}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Convite
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="px-8 py-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Usuários</p>
                <p className="text-2xl mt-1 text-gray-900">{totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Usuários Ativos</p>
                <p className="text-2xl mt-1 text-green-600">{activeUsers}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Convites Pendentes</p>
                <p className="text-2xl mt-1 text-yellow-600">{pendingUsers}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="px-8 pb-4">
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <div className="flex-1 px-8 pb-8 overflow-auto">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[user.status]}>
                        {statusLabels[user.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {user.lastLoginAt ? (
                        <span>
                          {user.lastLoginAt.toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span className="text-gray-400">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setPermissionsDialogOpen(true);
                          }}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Convites Pendentes
              </CardTitle>
              <CardDescription>
                Convites enviados aguardando aceitação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-gray-900">{invitation.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={roleColors[invitation.role]}>
                            {roleLabels[invitation.role]}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            Enviado em {invitation.createdAt.toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvitation(invitation)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Reenviar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancelInvitation(invitation)}
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
