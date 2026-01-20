import React, { useState } from 'react';
import { User, Permission, PermissionResource, PermissionAction, DEFAULT_PERMISSIONS } from '../types/tenancy';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import {
  Shield,
  Check,
  X,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Lock,
  Unlock
} from 'lucide-react';
import { cn } from './ui/utils';

interface PermissionsManagerProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (permissions: Permission[]) => void;
}

const resourceLabels: Record<PermissionResource, { label: string; category: string }> = {
  dashboard: { label: 'Dashboard', category: 'Principal' },
  calendar: { label: 'Calendário', category: 'Principal' },
  reservations: { label: 'Reservas', category: 'Principal' },
  messages: { label: 'Mensagens', category: 'Principal' },
  properties: { label: 'Locais - Imóveis', category: 'Principal' },
  booking_engine: { label: 'Motor de Reservas', category: 'Principal' },
  promotions: { label: 'Promoções', category: 'Principal' },
  finance: { label: 'Finanças', category: 'Principal' },
  tasks: { label: 'Tasks', category: 'Operacional' },
  users: { label: 'Usuários', category: 'Operacional' },
  notifications: { label: 'Notificações', category: 'Operacional' },
  catalog: { label: 'Catálogo', category: 'Operacional' },
  statistics: { label: 'Estatísticas', category: 'Avançado' },
  applications: { label: 'Aplicativos', category: 'Avançado' },
  settings: { label: 'Configurações', category: 'Avançado' },
  support: { label: 'Suporte', category: 'Avançado' },
  backend: { label: 'Backend', category: 'Avançado' },
  guests: { label: 'Hóspedes', category: 'Específico' },
  owners: { label: 'Proprietários', category: 'Específico' },
  pricing: { label: 'Precificação', category: 'Específico' },
  blocks: { label: 'Bloqueios', category: 'Específico' },
  reports: { label: 'Relatórios', category: 'Específico' },
  integrations: { label: 'Integrações', category: 'Específico' },
  billing: { label: 'Cobrança', category: 'Específico' }
};

const actionLabels: Record<PermissionAction, { label: string; icon: any; color: string }> = {
  create: { label: 'Criar', icon: Plus, color: 'text-green-600' },
  read: { label: 'Visualizar', icon: Eye, color: 'text-blue-600' },
  update: { label: 'Editar', icon: Edit, color: 'text-yellow-600' },
  delete: { label: 'Deletar', icon: Trash2, color: 'text-red-600' },
  export: { label: 'Exportar', icon: Download, color: 'text-purple-600' }
};

export function PermissionsManager({ user, isOpen, onClose, onSave }: PermissionsManagerProps) {
  const [useCustomPermissions, setUseCustomPermissions] = useState(
    user.customPermissions && user.customPermissions.length > 0
  );
  
  const [permissions, setPermissions] = useState<Permission[]>(
    user.customPermissions || DEFAULT_PERMISSIONS[user.role] || []
  );

  // Agrupar recursos por categoria
  const groupedResources: Record<string, PermissionResource[]> = {};
  Object.entries(resourceLabels).forEach(([resource, { category }]) => {
    if (!groupedResources[category]) {
      groupedResources[category] = [];
    }
    groupedResources[category].push(resource as PermissionResource);
  });

  const hasPermission = (resource: PermissionResource, action: PermissionAction): boolean => {
    const permission = permissions.find(p => p.resource === resource);
    return permission?.actions.includes(action) || false;
  };

  const togglePermission = (resource: PermissionResource, action: PermissionAction) => {
    setPermissions(prev => {
      const existingPermission = prev.find(p => p.resource === resource);
      
      if (existingPermission) {
        // Toggle action
        const hasAction = existingPermission.actions.includes(action);
        
        if (hasAction) {
          // Remove action
          const newActions = existingPermission.actions.filter(a => a !== action);
          
          if (newActions.length === 0) {
            // Remove permission entirely if no actions left
            return prev.filter(p => p.resource !== resource);
          } else {
            // Update actions
            return prev.map(p => 
              p.resource === resource 
                ? { ...p, actions: newActions }
                : p
            );
          }
        } else {
          // Add action
          return prev.map(p => 
            p.resource === resource
              ? { ...p, actions: [...p.actions, action] }
              : p
          );
        }
      } else {
        // Create new permission with action
        return [...prev, { resource, actions: [action] }];
      }
    });
  };

  const toggleAllActions = (resource: PermissionResource, enabled: boolean) => {
    setPermissions(prev => {
      if (enabled) {
        // Add all actions
        const allActions: PermissionAction[] = ['create', 'read', 'update', 'delete', 'export'];
        const existingPermission = prev.find(p => p.resource === resource);
        
        if (existingPermission) {
          return prev.map(p => 
            p.resource === resource
              ? { ...p, actions: allActions }
              : p
          );
        } else {
          return [...prev, { resource, actions: allActions }];
        }
      } else {
        // Remove all permissions for this resource
        return prev.filter(p => p.resource !== resource);
      }
    });
  };

  const hasAnyPermission = (resource: PermissionResource): boolean => {
    const permission = permissions.find(p => p.resource === resource);
    return permission && permission.actions.length > 0 || false;
  };

  const handleSave = () => {
    if (useCustomPermissions) {
      onSave(permissions);
    } else {
      onSave([]);
    }
    toast.success('Permissões atualizadas com sucesso!');
    onClose();
  };

  const handleReset = () => {
    setPermissions(DEFAULT_PERMISSIONS[user.role] || []);
    setUseCustomPermissions(false);
    toast.success('Permissões restauradas ao padrão da função');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Gerenciar Permissões - {user.name}
          </DialogTitle>
          <DialogDescription>
            Configure permissões personalizadas ou use as permissões padrão da função
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Custom Permissions Toggle */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {useCustomPermissions ? (
                    <Unlock className="h-5 w-5 text-orange-500" />
                  ) : (
                    <Lock className="h-5 w-5 text-gray-400" />
                  )}
                  <div>
                    <p className="text-gray-900">Permissões Customizadas</p>
                    <p className="text-sm text-gray-500">
                      {useCustomPermissions 
                        ? 'Permissões personalizadas ativas' 
                        : 'Usando permissões padrão da função'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={useCustomPermissions}
                  onCheckedChange={setUseCustomPermissions}
                />
              </div>
            </CardContent>
          </Card>

          {/* Permissions Grid */}
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedResources).map(([category, resources]) => (
                <div key={category}>
                  <h3 className="text-gray-900 mb-3 flex items-center gap-2">
                    {category}
                    <Badge variant="outline" className="text-xs">
                      {resources.length} módulos
                    </Badge>
                  </h3>
                  
                  <Card>
                    <CardContent className="p-0">
                      <div className="divide-y divide-gray-100">
                        {resources.map((resource) => {
                          const hasAny = hasAnyPermission(resource);
                          
                          return (
                            <div
                              key={resource}
                              className={cn(
                                "p-4 transition-colors",
                                !useCustomPermissions && "opacity-50 pointer-events-none"
                              )}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={hasAny}
                                    onCheckedChange={(checked) => 
                                      toggleAllActions(resource, checked as boolean)
                                    }
                                    disabled={!useCustomPermissions}
                                  />
                                  <Label className="text-gray-900 cursor-pointer">
                                    {resourceLabels[resource].label}
                                  </Label>
                                </div>
                                
                                {hasAny && (
                                  <Badge variant="outline" className="text-xs">
                                    {permissions.find(p => p.resource === resource)?.actions.length || 0} permissões
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="ml-8 flex flex-wrap gap-2">
                                {(Object.entries(actionLabels) as [PermissionAction, any][]).map(([action, { label, icon: Icon, color }]) => {
                                  const isChecked = hasPermission(resource, action);
                                  
                                  return (
                                    <button
                                      key={action}
                                      onClick={() => togglePermission(resource, action)}
                                      disabled={!useCustomPermissions}
                                      className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all text-sm",
                                        isChecked
                                          ? "bg-blue-50 border-blue-200 text-blue-700"
                                          : "bg-white border-gray-200 text-gray-600 hover:border-gray-300",
                                        !useCustomPermissions && "cursor-not-allowed"
                                      )}
                                    >
                                      <Icon className="h-3.5 w-3.5" />
                                      {label}
                                      {isChecked && (
                                        <Check className="h-3.5 w-3.5 text-blue-600" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!useCustomPermissions}
            >
              Restaurar Padrão
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar Permissões
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
