import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Search, User, Users } from 'lucide-react';
import { cn } from '../ui/utils';

interface UserOption {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  type: 'user' | 'team';
  memberCount?: number;
}

interface AssigneeSelectorProps {
  value?: string;
  valueName?: string;
  onSelect: (userId: string, userName: string) => void;
  placeholder?: string;
  className?: string;
}

export function AssigneeSelector({
  value,
  valueName,
  onSelect,
  placeholder = 'Atribuir a...',
  className,
}: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // TODO: Buscar usuários e equipes da API
      // Por enquanto, usar dados mock
      const mockUsers: UserOption[] = [
        { id: 'user1', name: 'João Silva', email: 'joao@rendizy.com', type: 'user' },
        { id: 'user2', name: 'Maria Santos', email: 'maria@rendizy.com', type: 'user' },
        { id: 'user3', name: 'Pedro Costa', email: 'pedro@rendizy.com', type: 'user' },
        { id: 'team1', name: 'Equipe Implantação', type: 'team', memberCount: 3 },
        { id: 'team2', name: 'Equipe Suporte', type: 'team', memberCount: 5 },
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('justify-start gap-2', className)}
        >
          {valueName ? (
            <>
              <Avatar className="w-5 h-5">
                <AvatarFallback className="text-xs">
                  {getInitials(valueName)}
                </AvatarFallback>
              </Avatar>
              <span>{valueName}</span>
            </>
          ) : (
            <>
              <User className="w-4 h-4" />
              <span>{placeholder}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquise ou insira o e-mail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          ) : (
            <>
              {/* Pessoas */}
              <div className="p-2">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                  Pessoas
                </div>
                {filteredUsers
                  .filter(u => u.type === 'user')
                  .map(user => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => {
                        onSelect(user.id, user.name);
                        setOpen(false);
                      }}
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        {user.email && (
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Equipes */}
              {filteredUsers.some(u => u.type === 'team') && (
                <div className="p-2 border-t">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                    Equipes
                  </div>
                  {filteredUsers
                    .filter(u => u.type === 'team')
                    .map(team => (
                      <div
                        key={team.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => {
                          onSelect(team.id, team.name);
                          setOpen(false);
                        }}
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-purple-100 dark:bg-purple-900">
                            <Users className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{team.name}</p>
                          {team.memberCount !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              {team.memberCount} {team.memberCount === 1 ? 'pessoa' : 'pessoas'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

