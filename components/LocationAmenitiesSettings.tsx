/**
 * RENDIZY - Location Amenities Settings
 * 
 * Gerenciamento de amenidades disponíveis para Locations (Locais/Endereços)
 * - Somente Admin Master pode editar
 * - Amenidades compartilhadas que podem ser herdadas pelos anúncios
 * - 13 categorias com 252 amenidades catalogadas
 * 
 * @version 1.0.103.11
 * @date 2025-10-29
 */

import { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Check,
  X,
  AlertCircle,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { 
  AMENITIES,
  AMENITY_CATEGORIES,
  getAmenitiesByCategory,
  type AmenityCategory 
} from '../utils/amenities-data';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

interface LocationAmenitiesConfig {
  enabledCategories: AmenityCategory[];
  enabledAmenities: string[]; // IDs das amenidades habilitadas
  allowCustomAmenities: boolean;
  customAmenities: Array<{
    id: string;
    name: string;
    category: AmenityCategory;
  }>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LocationAmenitiesSettings() {
  const [config, setConfig] = useState<LocationAmenitiesConfig>({
    enabledCategories: Object.keys(AMENITY_CATEGORIES) as AmenityCategory[],
    enabledAmenities: AMENITIES.map(a => a.id),
    allowCustomAmenities: true,
    customAmenities: []
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<AmenityCategory>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/settings/location-amenities`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // SAVE CONFIGURATION
  // ============================================================================

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/settings/location-amenities`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ config })
        }
      );

      if (response.ok) {
        toast.success('Configurações de amenidades salvas com sucesso!');
        setHasChanges(false);
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações de amenidades');
    } finally {
      setSaving(false);
    }
  };

  // ============================================================================
  // CATEGORY MANAGEMENT
  // ============================================================================

  const toggleCategory = (categoryId: AmenityCategory) => {
    const isEnabled = config.enabledCategories.includes(categoryId);
    const categoryAmenities = getAmenitiesByCategory(categoryId).map(a => a.id);

    setConfig(prev => {
      const newCategories = isEnabled
        ? prev.enabledCategories.filter(c => c !== categoryId)
        : [...prev.enabledCategories, categoryId];

      const newAmenities = isEnabled
        ? prev.enabledAmenities.filter(a => !categoryAmenities.includes(a))
        : [...new Set([...prev.enabledAmenities, ...categoryAmenities])];

      return {
        ...prev,
        enabledCategories: newCategories,
        enabledAmenities: newAmenities
      };
    });
    setHasChanges(true);
  };

  const toggleCategoryExpanded = (categoryId: AmenityCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // ============================================================================
  // AMENITY MANAGEMENT
  // ============================================================================

  const toggleAmenity = (amenityId: string) => {
    setConfig(prev => {
      const isEnabled = prev.enabledAmenities.includes(amenityId);
      return {
        ...prev,
        enabledAmenities: isEnabled
          ? prev.enabledAmenities.filter(id => id !== amenityId)
          : [...prev.enabledAmenities, amenityId]
      };
    });
    setHasChanges(true);
  };

  const selectAllInCategory = (categoryId: AmenityCategory) => {
    const categoryAmenities = getAmenitiesByCategory(categoryId).map(a => a.id);
    setConfig(prev => ({
      ...prev,
      enabledAmenities: [...new Set([...prev.enabledAmenities, ...categoryAmenities])]
    }));
    setHasChanges(true);
  };

  const deselectAllInCategory = (categoryId: AmenityCategory) => {
    const categoryAmenities = getAmenitiesByCategory(categoryId).map(a => a.id);
    setConfig(prev => ({
      ...prev,
      enabledAmenities: prev.enabledAmenities.filter(id => !categoryAmenities.includes(id))
    }));
    setHasChanges(true);
  };

  // ============================================================================
  // RESET
  // ============================================================================

  const handleReset = () => {
    setConfig({
      enabledCategories: Object.keys(AMENITY_CATEGORIES) as AmenityCategory[],
      enabledAmenities: AMENITIES.map(a => a.id),
      allowCustomAmenities: true,
      customAmenities: []
    });
    setHasChanges(true);
    toast.success('Configurações resetadas para o padrão');
  };

  // ============================================================================
  // FILTER
  // ============================================================================

  const filteredAmenities = AMENITIES.filter(amenity =>
    amenity.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============================================================================
  // STATS
  // ============================================================================

  const stats = {
    totalCategories: Object.keys(AMENITY_CATEGORIES).length,
    enabledCategories: config.enabledCategories.length,
    totalAmenities: AMENITIES.length,
    enabledAmenities: config.enabledAmenities.length
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Amenidades de Locais (Locations)</CardTitle>
                <CardDescription>
                  Configure quais amenidades estarão disponíveis para os locais/endereços
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Admin Master
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Amenidades de Locations são compartilhadas por todas as propriedades daquele endereço 
              (ex: piscina do condomínio, portaria 24h, elevador). Anúncios podem herdar essas amenidades automaticamente.
            </AlertDescription>
          </Alert>

          {/* STATS */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.totalCategories}</div>
              <div className="text-sm text-muted-foreground">Total de Categorias</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.enabledCategories}</div>
              <div className="text-sm text-muted-foreground">Categorias Ativas</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold">{stats.totalAmenities}</div>
              <div className="text-sm text-muted-foreground">Total de Amenidades</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.enabledAmenities}</div>
              <div className="text-sm text-muted-foreground">Amenidades Ativas</div>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar amenidades..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Resetar Padrão
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CATEGORIES LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Categorias e Amenidades</CardTitle>
          <CardDescription>
            Selecione quais amenidades estarão disponíveis para os locais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {Object.values(AMENITY_CATEGORIES).map((category) => {
                const categoryAmenities = getAmenitiesByCategory(category.id);
                const enabledInCategory = categoryAmenities.filter(a => 
                  config.enabledAmenities.includes(a.id)
                ).length;
                const isExpanded = expandedCategories.has(category.id);
                const isCategoryEnabled = config.enabledCategories.includes(category.id);

                return (
                  <Card key={category.id} className={isCategoryEnabled ? '' : 'opacity-50'}>
                    <CardContent className="p-4">
                      {/* CATEGORY HEADER */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={isCategoryEnabled}
                            onCheckedChange={() => toggleCategory(category.id)}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-2xl">{category.icon}</span>
                            <div className="flex-1">
                              <div className="font-medium">{category.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {enabledInCategory} de {category.count} selecionadas
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={isCategoryEnabled ? "default" : "secondary"}>
                            {enabledInCategory}/{category.count}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCategoryExpanded(category.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* AMENITIES LIST */}
                      {isExpanded && (
                        <>
                          <Separator className="my-3" />
                          
                          {/* QUICK ACTIONS */}
                          <div className="flex gap-2 mb-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => selectAllInCategory(category.id)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Selecionar Todas
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deselectAllInCategory(category.id)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Limpar Seleção
                            </Button>
                          </div>

                          {/* AMENITIES GRID */}
                          <div className="grid grid-cols-2 gap-2">
                            {categoryAmenities
                              .filter(a => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map((amenity) => (
                              <div
                                key={amenity.id}
                                className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                  config.enabledAmenities.includes(amenity.id)
                                    ? 'bg-primary/5 border-primary'
                                    : 'hover:bg-muted'
                                }`}
                                onClick={() => toggleAmenity(amenity.id)}
                              >
                                <Checkbox
                                  checked={config.enabledAmenities.includes(amenity.id)}
                                  onCheckedChange={() => toggleAmenity(amenity.id)}
                                />
                                <span className="text-sm">{amenity.name}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
