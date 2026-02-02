/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║           PROPERTY SERVICE CONFIG - CONFIGURAÇÃO POR IMÓVEL               ║
 * ║                                                                           ║
 * ║  Configurar quem é responsável por limpeza e manutenção de cada imóvel:  ║
 * ║  - Empresa de Gestão                                                      ║
 * ║  - Proprietário                                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * @version 1.0.0
 * @date 2026-01-31
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Home,
  User,
  Sparkles,
  Wrench,
  Loader2,
  Search,
  Save,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/components/ui/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

// Interface local para o componente (inclui os novos campos de responsabilidade)
interface PropertyWithResponsibility {
  id: string;
  name: string;
  address?: {
    street?: string;
    city?: string;
    neighborhood?: string;
    full?: string;
  };
  cleaning_responsibility?: 'company' | 'owner';
  maintenance_responsibility?: 'company' | 'owner';
}

interface PropertyServiceConfigProps {
  organizationId: string;
}

type ResponsibilityType = 'company' | 'owner';
type ServiceType = 'cleaning' | 'maintenance';

// ============================================================================
// COMPONENT
// ============================================================================

export function PropertyServiceConfig({ organizationId }: PropertyServiceConfigProps) {
  const [properties, setProperties] = useState<PropertyWithResponsibility[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [_filterService, _setFilterService] = useState<'all' | ServiceType>('all');
  const [filterResponsibility, setFilterResponsibility] = useState<'all' | ResponsibilityType>('all');
  
  // Track changes
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<PropertyWithResponsibility>>>(new Map());
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'cleaning' | 'maintenance'>('cleaning');

  // Load properties
  useEffect(() => {
    loadProperties();
  }, [organizationId]);

  async function loadProperties() {
    setLoading(true);
    try {
      console.log('[PropertyServiceConfig] Carregando imóveis via properties/lista...');
      
      // Usar a mesma API que a tela de Anúncios Ultimate usa
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/lista`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[PropertyServiceConfig] Resposta:', result);
      
      const anuncios = result.anuncios || [];
      
      if (anuncios.length > 0) {
        // Map anuncios to our format
        // Usar identificação interna (internalId), não o título comercial
        const propsWithDefaults = anuncios.map((p: any) => {
          const data = p.data || {};
          // Nome interno/identificação interna do imóvel
          const internalName = data.internalId || data.internal_id || p.internalId || p.internal_id || '';
          // Endereço
          const addressData = data.address || data.endereco || p.address || p.endereco || {};
          const street = addressData.street || addressData.rua || addressData.logradouro || '';
          const neighborhood = addressData.neighborhood || addressData.bairro || '';
          const city = addressData.city || addressData.cidade || '';
          
          // Monta endereço formatado
          const addressParts = [street, neighborhood, city].filter(Boolean);
          const fullAddress = addressParts.join(', ');
          
          return {
            id: p.id,
            name: internalName || `Imóvel ${p.id.slice(0, 8)}`, // Fallback se não tiver nome interno
            address: {
              street,
              city,
              neighborhood,
              full: fullAddress,
            },
            cleaning_responsibility: data.cleaning_responsibility || p.cleaning_responsibility || 'company',
            maintenance_responsibility: data.maintenance_responsibility || p.maintenance_responsibility || 'company',
          };
        }) as PropertyWithResponsibility[];
        
        console.log('[PropertyServiceConfig] Imóveis processados:', propsWithDefaults.length);
        setProperties(propsWithDefaults);
      } else {
        console.warn('[PropertyServiceConfig] Nenhum anúncio encontrado');
        setProperties([]);
      }
    } catch (error) {
      console.error('[PropertyServiceConfig] Erro ao carregar imóveis:', error);
      toast.error('Erro ao carregar lista de imóveis');
    } finally {
      setLoading(false);
    }
  }

  // Get property with pending changes applied
  function getPropertyWithChanges(property: PropertyWithResponsibility): PropertyWithResponsibility {
    const changes = pendingChanges.get(property.id);
    return changes ? { ...property, ...changes } : property;
  }

  // Update a single property's responsibility
  function updatePropertyResponsibility(
    propertyId: string, 
    service: ServiceType, 
    responsibility: ResponsibilityType
  ) {
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(propertyId) || {};
      const field = service === 'cleaning' ? 'cleaning_responsibility' : 'maintenance_responsibility';
      newMap.set(propertyId, { ...existing, [field]: responsibility });
      return newMap;
    });
  }

  // Bulk update selected properties
  function bulkUpdateResponsibility(service: ServiceType, responsibility: ResponsibilityType) {
    if (selectedIds.size === 0) {
      toast.error('Selecione pelo menos um imóvel');
      return;
    }
    
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      const field = service === 'cleaning' ? 'cleaning_responsibility' : 'maintenance_responsibility';
      
      selectedIds.forEach(id => {
        const existing = newMap.get(id) || {};
        newMap.set(id, { ...existing, [field]: responsibility });
      });
      
      return newMap;
    });
    
    toast.success(`${selectedIds.size} imóveis marcados como ${responsibility === 'company' ? 'Empresa' : 'Proprietário'}`);
  }

  // Save all pending changes
  async function saveChanges() {
    if (pendingChanges.size === 0) {
      toast.info('Não há alterações para salvar');
      return;
    }
    
    setSaving(true);
    try {
      const updates = Array.from(pendingChanges.entries()).map(([id, changes]) => ({
        id,
        ...changes,
      }));
      
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Update each property using the save-field endpoint
      let successCount = 0;
      for (const update of updates) {
        try {
          // Save cleaning_responsibility
          if (update.cleaning_responsibility) {
            await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/save-field`, {
              method: 'POST',
              headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
                'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                anuncioId: update.id,
                field: 'cleaning_responsibility',
                value: update.cleaning_responsibility
              })
            });
          }
          
          // Save maintenance_responsibility
          if (update.maintenance_responsibility) {
            await fetch(`${SUPABASE_URL}/functions/v1/rendizy-server/properties/save-field`, {
              method: 'POST',
              headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
                'X-Auth-Token': localStorage.getItem('rendizy-token') || '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                anuncioId: update.id,
                field: 'maintenance_responsibility',
                value: update.maintenance_responsibility
              })
            });
          }
          
          successCount++;
        } catch (err) {
          console.error(`Erro ao atualizar imóvel ${update.id}:`, err);
        }
      }
      
      if (successCount === updates.length) {
        toast.success(`${successCount} imóveis atualizados com sucesso!`);
      } else {
        toast.warning(`${successCount} de ${updates.length} imóveis atualizados`);
      }
      
      // Reload and clear pending changes
      await loadProperties();
      setPendingChanges(new Map());
      setSelectedIds(new Set());
      
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSaving(false);
    }
  }

  // Filter properties
  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const prop = getPropertyWithChanges(p);
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = prop.name?.toLowerCase().includes(query);
        const matchAddress = prop.address?.street?.toLowerCase().includes(query) ||
                           prop.address?.city?.toLowerCase().includes(query);
        if (!matchName && !matchAddress) return false;
      }
      
      // Responsibility filter
      if (filterResponsibility !== 'all') {
        if (_filterService === 'all') {
          // Check both
          if (prop.cleaning_responsibility !== filterResponsibility && 
              prop.maintenance_responsibility !== filterResponsibility) return false;
        } else if (_filterService === 'cleaning') {
          if (prop.cleaning_responsibility !== filterResponsibility) return false;
        } else {
          if (prop.maintenance_responsibility !== filterResponsibility) return false;
        }
      }
      
      return true;
    });
  }, [properties, searchQuery, _filterService, filterResponsibility, pendingChanges]);

  // Statistics
  const stats = useMemo(() => {
    const propsWithChanges = properties.map(p => getPropertyWithChanges(p));
    return {
      total: properties.length,
      cleaningCompany: propsWithChanges.filter(p => p.cleaning_responsibility === 'company').length,
      cleaningOwner: propsWithChanges.filter(p => p.cleaning_responsibility === 'owner').length,
      maintenanceCompany: propsWithChanges.filter(p => p.maintenance_responsibility === 'company').length,
      maintenanceOwner: propsWithChanges.filter(p => p.maintenance_responsibility === 'owner').length,
    };
  }, [properties, pendingChanges]);

  // Toggle selection
  function toggleSelection(id: string) {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function selectAll() {
    if (selectedIds.size === filteredProperties.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProperties.map(p => p.id)));
    }
  }

  const hasChanges = pendingChanges.size > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Estatísticas */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">imóveis cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <Sparkles className="h-4 w-4" />
              Limpeza Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.cleaningCompany}</div>
            <p className="text-xs text-blue-600">sob nossa responsabilidade</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-700">
              <Sparkles className="h-4 w-4" />
              Limpeza Proprietário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{stats.cleaningOwner}</div>
            <p className="text-xs text-orange-600">responsabilidade do dono</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-700">
              <Wrench className="h-4 w-4" />
              Manutenção Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.maintenanceCompany}</div>
            <p className="text-xs text-purple-600">sob nossa responsabilidade</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-700">
              <Wrench className="h-4 w-4" />
              Manutenção Proprietário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.maintenanceOwner}</div>
            <p className="text-xs text-amber-600">responsabilidade do dono</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription>
          Configure abaixo quem é responsável pela <strong>limpeza</strong> e <strong>manutenção</strong> de cada imóvel.
          Na tela de Operações, as tarefas de limpeza/manutenção só serão criadas para imóveis sob responsabilidade da empresa.
          Você ainda verá os indicadores de todos os imóveis para acompanhamento.
        </AlertDescription>
      </Alert>

      {/* Pending Changes Alert */}
      {hasChanges && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Alterações não salvas</AlertTitle>
          <AlertDescription className="text-amber-700">
            Você tem {pendingChanges.size} alteração(ões) pendente(s). 
            <Button 
              variant="link" 
              className="px-2 text-amber-800 font-medium"
              onClick={saveChanges}
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar agora'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs: Limpeza / Manutenção */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="cleaning" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Limpeza
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Manutenção
            </TabsTrigger>
          </TabsList>

          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selecionado(s)` : 'Selecione imóveis'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkUpdateResponsibility(activeTab, 'company')}
              disabled={selectedIds.size === 0}
              className="gap-1"
            >
              <Building2 className="h-3.5 w-3.5" />
              Marcar Empresa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkUpdateResponsibility(activeTab, 'owner')}
              disabled={selectedIds.size === 0}
              className="gap-1"
            >
              <User className="h-3.5 w-3.5" />
              Marcar Proprietário
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar imóvel..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterResponsibility} onValueChange={(v) => setFilterResponsibility(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="company">Empresa</SelectItem>
              <SelectItem value="owner">Proprietário</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Property List */}
        <TabsContent value="cleaning" className="mt-4">
          <PropertyList
            properties={filteredProperties}
            selectedIds={selectedIds}
            pendingChanges={pendingChanges}
            serviceType="cleaning"
            onToggleSelection={toggleSelection}
            onSelectAll={selectAll}
            onUpdateResponsibility={updatePropertyResponsibility}
            getPropertyWithChanges={getPropertyWithChanges}
          />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <PropertyList
            properties={filteredProperties}
            selectedIds={selectedIds}
            pendingChanges={pendingChanges}
            serviceType="maintenance"
            onToggleSelection={toggleSelection}
            onSelectAll={selectAll}
            onUpdateResponsibility={updatePropertyResponsibility}
            getPropertyWithChanges={getPropertyWithChanges}
          />
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {hasChanges && (
          <Button
            variant="outline"
            onClick={() => {
              setPendingChanges(new Map());
              setSelectedIds(new Set());
            }}
          >
            Descartar Alterações
          </Button>
        )}
        <Button 
          onClick={saveChanges} 
          disabled={!hasChanges || saving}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Alterações ({pendingChanges.size})
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// PROPERTY LIST COMPONENT
// ============================================================================

interface PropertyListProps {
  properties: PropertyWithResponsibility[];
  selectedIds: Set<string>;
  pendingChanges: Map<string, Partial<PropertyWithResponsibility>>;
  serviceType: ServiceType;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onUpdateResponsibility: (id: string, service: ServiceType, responsibility: ResponsibilityType) => void;
  getPropertyWithChanges: (property: PropertyWithResponsibility) => PropertyWithResponsibility;
}

function PropertyList({
  properties,
  selectedIds,
  pendingChanges,
  serviceType,
  onToggleSelection,
  onSelectAll,
  onUpdateResponsibility,
  getPropertyWithChanges,
}: PropertyListProps) {
  const allSelected = properties.length > 0 && selectedIds.size === properties.length;
  const field = serviceType === 'cleaning' ? 'cleaning_responsibility' : 'maintenance_responsibility';

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            onCheckedChange={onSelectAll}
          />
          <span className="text-sm font-medium">
            {properties.length} imóveis
          </span>
        </div>
      </CardHeader>
      <ScrollArea className="h-[400px]">
        <div className="divide-y">
          {properties.map(property => {
            const prop = getPropertyWithChanges(property);
            const isSelected = selectedIds.has(property.id);
            const hasChange = pendingChanges.has(property.id);
            const currentValue = prop[field] as ResponsibilityType;

            return (
              <div
                key={property.id}
                className={cn(
                  'flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors',
                  isSelected && 'bg-blue-50/50',
                  hasChange && 'bg-amber-50/30'
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelection(property.id)}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium truncate">{prop.name || 'Sem identificação'}</span>
                    {hasChange && (
                      <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700 border-amber-300">
                        Alterado
                      </Badge>
                    )}
                  </div>
                  {prop.address && (prop.address.full || prop.address.street || prop.address.city) && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {prop.address.full || [prop.address.street, prop.address.neighborhood, prop.address.city]
                        .filter(Boolean)
                        .join(', ') || 'Endereço não informado'}
                    </p>
                  )}
                </div>

                {/* Responsibility Toggle */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={currentValue === 'company' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onUpdateResponsibility(property.id, serviceType, 'company')}
                    className={cn(
                      'gap-1.5 min-w-[100px]',
                      currentValue === 'company' && 'bg-blue-600 hover:bg-blue-700'
                    )}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    Empresa
                  </Button>
                  <Button
                    variant={currentValue === 'owner' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onUpdateResponsibility(property.id, serviceType, 'owner')}
                    className={cn(
                      'gap-1.5 min-w-[120px]',
                      currentValue === 'owner' && 'bg-orange-500 hover:bg-orange-600'
                    )}
                  >
                    <User className="h-3.5 w-3.5" />
                    Proprietário
                  </Button>
                </div>
              </div>
            );
          })}

          {properties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum imóvel encontrado</h3>
              <p className="text-muted-foreground max-w-sm mt-2">
                Ajuste os filtros ou cadastre novos imóveis no sistema.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}

export default PropertyServiceConfig;
