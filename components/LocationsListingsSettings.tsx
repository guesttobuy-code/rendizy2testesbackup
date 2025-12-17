/**
 * RENDIZY - Locations & Listings Settings
 * 
 * Configurações relacionadas a Locais, Propriedades e Anúncios
 * 
 * @version 1.0.103
 * @date 2025-10-28
 */

import { useState } from 'react';
import {
  Building2,
  Home,
  Image,
  FileText,
  Shield,
  Eye,
  CheckCircle,
  AlertCircle,
  Hash,
  MapPin,
  Star,
  Save,
  Plus,
  Trash2,
  GripVertical,
  Languages,
  Sparkles,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Switch } from './ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Textarea } from './ui/textarea';

interface LocationsListingsSettingsConfig {
  // View Settings
  defaultView: 'individual' | 'by-location';
  showInactiveProperties: boolean;
  compactMode: boolean;
  
  // Code Prefixes
  locationCodePrefix: string;
  propertyCodePrefix: string;
  listingCodePrefix: string;
  
  // Required Fields
  requiredFields: {
    location: {
      description: boolean;
      address: boolean;
      photos: boolean;
      amenities: boolean;
    };
    property: {
      description: boolean;
      address: boolean;
      photos: boolean;
      amenities: boolean;
      pricing: boolean;
    };
    listing: {
      description: boolean;
      photos: boolean;
      amenities: boolean;
      pricing: boolean;
    };
  };
  
  // Photo Settings
  photoSettings: {
    minPhotos: number;
    maxPhotos: number;
    maxSizeInMB: number;
    requireCoverPhoto: boolean;
  };
  
  // Validation
  validation: {
    requireApproval: boolean;
    autoPublish: boolean;
    allowDuplicateNames: boolean;
  };
  
  // Amenities
  amenitiesSettings: {
    showCategoryIcons: boolean;
    allowCustomAmenities: boolean;
    inheritLocationAmenities: boolean;
  };
  
  // Custom Description Fields (NEW v1.0.103.12)
  customDescriptionFields: Array<{
    id: string;
    label: string;
    placeholder: {
      pt: string;
      en: string;
      es: string;
    };
    required: boolean;
    order: number;
  }>;
}

export const LocationsListingsSettings = () => {
  // TODO: Buscar do backend
  const [settings, setSettings] = useState<LocationsListingsSettingsConfig>({
    defaultView: 'individual',
    showInactiveProperties: false,
    compactMode: false,
    
    locationCodePrefix: 'LOC',
    propertyCodePrefix: 'PROP',
    listingCodePrefix: 'LIST',
    
    requiredFields: {
      location: {
        description: true,
        address: true,
        photos: true,
        amenities: false,
      },
      property: {
        description: true,
        address: true,
        photos: true,
        amenities: true,
        pricing: true,
      },
      listing: {
        description: true,
        photos: true,
        amenities: true,
        pricing: true,
      },
    },
    
    photoSettings: {
      minPhotos: 3,
      maxPhotos: 50,
      maxSizeInMB: 5,
      requireCoverPhoto: true,
    },
    
    validation: {
      requireApproval: false,
      autoPublish: true,
      allowDuplicateNames: false,
    },
    
    amenitiesSettings: {
      showCategoryIcons: true,
      allowCustomAmenities: true,
      inheritLocationAmenities: true,
    },
    
    customDescriptionFields: [],
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // TODO: Salvar no backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar configurações');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let current: any = newSettings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-2">
            Configurações de Locais e Anúncios
          </h2>
          <p className="text-gray-600">
            Configure o comportamento e as regras para gestão de imóveis
          </p>
        </div>
        
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* View Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Preferências de Visualização</CardTitle>
                <CardDescription>
                  Como os imóveis são exibidos por padrão
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Default View */}
            <div className="space-y-2">
              <Label htmlFor="default-view">Visualização Padrão</Label>
              <Select
                value={settings.defaultView}
                onValueChange={(value: any) => updateSettings('defaultView', value)}
              >
                <SelectTrigger id="default-view">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Individual (Lista Plana)
                    </div>
                  </SelectItem>
                  <SelectItem value="by-location">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Por Local (Hierárquica)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Usuários podem alternar entre as visualizações
              </p>
            </div>

            {/* Show Inactive */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Exibir Inativos</Label>
                <p className="text-xs text-gray-500">
                  Mostrar propriedades inativas por padrão
                </p>
              </div>
              <Switch
                checked={settings.showInactiveProperties}
                onCheckedChange={(checked) => 
                  updateSettings('showInactiveProperties', checked)
                }
              />
            </div>

            {/* Compact Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo Compacto</Label>
                <p className="text-xs text-gray-500">
                  Cards menores para ver mais itens
                </p>
              </div>
              <Switch
                checked={settings.compactMode}
                onCheckedChange={(checked) => 
                  updateSettings('compactMode', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Code Prefixes */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Hash className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Prefixos de Códigos</CardTitle>
                <CardDescription>
                  Personalize os prefixos dos códigos gerados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Location Prefix */}
            <div className="space-y-2">
              <Label htmlFor="location-prefix">Prefixo de Locais</Label>
              <div className="flex gap-2">
                <Input
                  id="location-prefix"
                  value={settings.locationCodePrefix}
                  onChange={(e) => 
                    updateSettings('locationCodePrefix', e.target.value.toUpperCase())
                  }
                  placeholder="LOC"
                  maxLength={5}
                  className="max-w-[120px]"
                />
                <Badge variant="outline" className="self-center">
                  Ex: {settings.locationCodePrefix}-001
                </Badge>
              </div>
            </div>

            {/* Property Prefix */}
            <div className="space-y-2">
              <Label htmlFor="property-prefix">Prefixo de Propriedades</Label>
              <div className="flex gap-2">
                <Input
                  id="property-prefix"
                  value={settings.propertyCodePrefix}
                  onChange={(e) => 
                    updateSettings('propertyCodePrefix', e.target.value.toUpperCase())
                  }
                  placeholder="PROP"
                  maxLength={5}
                  className="max-w-[120px]"
                />
                <Badge variant="outline" className="self-center">
                  Ex: {settings.propertyCodePrefix}-001
                </Badge>
              </div>
            </div>

            {/* Listing Prefix */}
            <div className="space-y-2">
              <Label htmlFor="listing-prefix">Prefixo de Anúncios</Label>
              <div className="flex gap-2">
                <Input
                  id="listing-prefix"
                  value={settings.listingCodePrefix}
                  onChange={(e) => 
                    updateSettings('listingCodePrefix', e.target.value.toUpperCase())
                  }
                  placeholder="LIST"
                  maxLength={5}
                  className="max-w-[120px]"
                />
                <Badge variant="outline" className="self-center">
                  Ex: {settings.listingCodePrefix}-001
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Image className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Configurações de Fotos</CardTitle>
                <CardDescription>
                  Regras para upload de imagens
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Min Photos */}
            <div className="space-y-2">
              <Label htmlFor="min-photos">Mínimo de Fotos</Label>
              <Input
                id="min-photos"
                type="number"
                min="0"
                max="20"
                value={settings.photoSettings.minPhotos}
                onChange={(e) => 
                  updateSettings('photoSettings.minPhotos', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-gray-500">
                Quantidade mínima obrigatória para publicar
              </p>
            </div>

            {/* Max Photos */}
            <div className="space-y-2">
              <Label htmlFor="max-photos">Máximo de Fotos</Label>
              <Input
                id="max-photos"
                type="number"
                min="1"
                max="100"
                value={settings.photoSettings.maxPhotos}
                onChange={(e) => 
                  updateSettings('photoSettings.maxPhotos', parseInt(e.target.value))
                }
              />
              <p className="text-xs text-gray-500">
                Limite de fotos por imóvel
              </p>
            </div>

            {/* Max Size */}
            <div className="space-y-2">
              <Label htmlFor="max-size">Tamanho Máximo (MB)</Label>
              <Input
                id="max-size"
                type="number"
                min="1"
                max="20"
                value={settings.photoSettings.maxSizeInMB}
                onChange={(e) => 
                  updateSettings('photoSettings.maxSizeInMB', parseInt(e.target.value))
                }
              />
            </div>

            {/* Require Cover */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Foto de Capa Obrigatória</Label>
                <p className="text-xs text-gray-500">
                  Exigir foto de destaque
                </p>
              </div>
              <Switch
                checked={settings.photoSettings.requireCoverPhoto}
                onCheckedChange={(checked) => 
                  updateSettings('photoSettings.requireCoverPhoto', checked)
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Validation Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Shield className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Validação e Aprovação</CardTitle>
                <CardDescription>
                  Regras de publicação de imóveis
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Require Approval */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aprovação Obrigatória</Label>
                <p className="text-xs text-gray-500">
                  Imóveis ficam em análise antes de publicar
                </p>
              </div>
              <Switch
                checked={settings.validation.requireApproval}
                onCheckedChange={(checked) => 
                  updateSettings('validation.requireApproval', checked)
                }
              />
            </div>

            {/* Auto Publish */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Publicação Automática</Label>
                <p className="text-xs text-gray-500">
                  Publicar automaticamente após aprovação
                </p>
              </div>
              <Switch
                checked={settings.validation.autoPublish}
                onCheckedChange={(checked) => 
                  updateSettings('validation.autoPublish', checked)
                }
                disabled={!settings.validation.requireApproval}
              />
            </div>

            {/* Allow Duplicates */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Permitir Nomes Duplicados</Label>
                <p className="text-xs text-gray-500">
                  Múltiplos imóveis com mesmo nome
                </p>
              </div>
              <Switch
                checked={settings.validation.allowDuplicateNames}
                onCheckedChange={(checked) => 
                  updateSettings('validation.allowDuplicateNames', checked)
                }
              />
            </div>

            {settings.validation.requireApproval && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-700">
                    Com aprovação ativada, usuários com permissão "Manager" precisarão 
                    revisar novos imóveis antes da publicação.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Required Fields Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <CardTitle>Campos Obrigatórios</CardTitle>
              <CardDescription>
                Defina quais informações são obrigatórias ao criar imóveis
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Location Required Fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h4 className="text-gray-900">Locais</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Descrição</Label>
                  <Switch
                    checked={settings.requiredFields.location.description}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.location.description', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Endereço</Label>
                  <Switch
                    checked={settings.requiredFields.location.address}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.location.address', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Fotos</Label>
                  <Switch
                    checked={settings.requiredFields.location.photos}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.location.photos', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Comodidades</Label>
                  <Switch
                    checked={settings.requiredFields.location.amenities}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.location.amenities', checked)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Property Required Fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-5 h-5 text-emerald-600" />
                <h4 className="text-gray-900">Propriedades</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Descrição</Label>
                  <Switch
                    checked={settings.requiredFields.property.description}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.property.description', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Endereço</Label>
                  <Switch
                    checked={settings.requiredFields.property.address}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.property.address', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Fotos</Label>
                  <Switch
                    checked={settings.requiredFields.property.photos}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.property.photos', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Comodidades</Label>
                  <Switch
                    checked={settings.requiredFields.property.amenities}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.property.amenities', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Preços</Label>
                  <Switch
                    checked={settings.requiredFields.property.pricing}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.property.pricing', checked)
                    }
                  />
                </div>
              </div>
            </div>

            {/* Listing Required Fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-yellow-600" />
                <h4 className="text-gray-900">Anúncios</h4>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Descrição</Label>
                  <Switch
                    checked={settings.requiredFields.listing.description}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.listing.description', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Fotos</Label>
                  <Switch
                    checked={settings.requiredFields.listing.photos}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.listing.photos', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Comodidades</Label>
                  <Switch
                    checked={settings.requiredFields.listing.amenities}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.listing.amenities', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Preços</Label>
                  <Switch
                    checked={settings.requiredFields.listing.pricing}
                    onCheckedChange={(checked) => 
                      updateSettings('requiredFields.listing.pricing', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Amenities Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Star className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle>Configurações de Comodidades</CardTitle>
              <CardDescription>
                Como as comodidades (amenities) funcionam
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show Category Icons */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exibir Ícones de Categoria</Label>
              <p className="text-xs text-gray-500">
                Mostrar ícones visuais para categorias de comodidades
              </p>
            </div>
            <Switch
              checked={settings.amenitiesSettings.showCategoryIcons}
              onCheckedChange={(checked) => 
                updateSettings('amenitiesSettings.showCategoryIcons', checked)
              }
            />
          </div>

          {/* Allow Custom */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Permitir Comodidades Customizadas</Label>
              <p className="text-xs text-gray-500">
                Usuários podem adicionar comodidades personalizadas
              </p>
            </div>
            <Switch
              checked={settings.amenitiesSettings.allowCustomAmenities}
              onCheckedChange={(checked) => 
                updateSettings('amenitiesSettings.allowCustomAmenities', checked)
              }
            />
          </div>

          {/* Inherit Location Amenities */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Herdar Comodidades do Local</Label>
              <p className="text-xs text-gray-500">
                Propriedades herdam automaticamente comodidades do local pai
              </p>
            </div>
            <Switch
              checked={settings.amenitiesSettings.inheritLocationAmenities}
              onCheckedChange={(checked) => 
                updateSettings('amenitiesSettings.inheritLocationAmenities', checked)
              }
            />
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700">
                <strong>Herança de Comodidades:</strong> Quando ativado, propriedades dentro 
                de um local herdarão automaticamente as comodidades compartilhadas (ex: piscina, 
                estacionamento). Usuários podem adicionar comodidades adicionais específicas 
                de cada propriedade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Description Fields */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Campos Personalizados de Descrição</CardTitle>
              <CardDescription>
                Crie campos extras que aparecerão automaticamente em todas as propriedades
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Custom Field Button */}
          <Button
            onClick={() => {
              const newField = {
                id: `custom_${Date.now()}`,
                label: '',
                placeholder: {
                  pt: '',
                  en: '',
                  es: ''
                },
                required: false,
                order: settings.customDescriptionFields.length
              };
              setSettings({
                ...settings,
                customDescriptionFields: [...settings.customDescriptionFields, newField]
              });
              toast.success('Campo personalizado adicionado!');
            }}
            variant="outline"
            className="w-full border-dashed border-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Campo Personalizado
          </Button>

          {/* Custom Fields List */}
          {settings.customDescriptionFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Languages className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Nenhum campo personalizado</p>
              <p className="text-sm">Adicione campos extras como GPS, Senhas, Instruções, etc.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {settings.customDescriptionFields
                .sort((a, b) => a.order - b.order)
                .map((field, index) => (
                  <Card key={field.id} className="border-purple-200 bg-purple-50/30">
                    <CardContent className="p-4 space-y-4">
                      {/* Field Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
                          <Badge variant="outline" className="bg-purple-100">
                            #{index + 1}
                          </Badge>
                          <span className="text-sm font-medium">Campo Personalizado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.required}
                            onCheckedChange={(checked) => {
                              const updated = settings.customDescriptionFields.map(f =>
                                f.id === field.id ? { ...f, required: checked } : f
                              );
                              setSettings({ ...settings, customDescriptionFields: updated });
                            }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {field.required ? 'Obrigatório' : 'Opcional'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = settings.customDescriptionFields.filter(
                                f => f.id !== field.id
                              );
                              setSettings({ ...settings, customDescriptionFields: updated });
                              toast.success('Campo removido!');
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>

                      {/* Field Label */}
                      <div className="space-y-2">
                        <Label>Nome do Campo</Label>
                        <Input
                          placeholder="Ex: Link do GPS, Senha do Cofre, Instruções de Vendas..."
                          value={field.label}
                          onChange={(e) => {
                            const updated = settings.customDescriptionFields.map(f =>
                              f.id === field.id ? { ...f, label: e.target.value } : f
                            );
                            setSettings({ ...settings, customDescriptionFields: updated });
                          }}
                        />
                      </div>

                      {/* Placeholders Multi-language */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Languages className="h-4 w-4" />
                          Placeholders (Texto de exemplo para cada idioma)
                        </Label>
                        
                        <div className="grid grid-cols-1 gap-3">
                          {/* PT */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">🇧🇷 Português</span>
                            </div>
                            <Textarea
                              placeholder="Texto de exemplo em português..."
                              value={field.placeholder.pt}
                              onChange={(e) => {
                                const updated = settings.customDescriptionFields.map(f =>
                                  f.id === field.id
                                    ? { ...f, placeholder: { ...f.placeholder, pt: e.target.value } }
                                    : f
                                );
                                setSettings({ ...settings, customDescriptionFields: updated });
                              }}
                              rows={2}
                              className="resize-none"
                            />
                          </div>

                          {/* EN */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">🇺🇸 Inglês</span>
                            </div>
                            <Textarea
                              placeholder="Example text in English..."
                              value={field.placeholder.en}
                              onChange={(e) => {
                                const updated = settings.customDescriptionFields.map(f =>
                                  f.id === field.id
                                    ? { ...f, placeholder: { ...f.placeholder, en: e.target.value } }
                                    : f
                                );
                                setSettings({ ...settings, customDescriptionFields: updated });
                              }}
                              rows={2}
                              className="resize-none"
                            />
                          </div>

                          {/* ES */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">🇪🇸 Espanhol</span>
                            </div>
                            <Textarea
                              placeholder="Texto de ejemplo en español..."
                              value={field.placeholder.es}
                              onChange={(e) => {
                                const updated = settings.customDescriptionFields.map(f =>
                                  f.id === field.id
                                    ? { ...f, placeholder: { ...f.placeholder, es: e.target.value } }
                                    : f
                                );
                                setSettings({ ...settings, customDescriptionFields: updated });
                              }}
                              rows={2}
                              className="resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Info about Custom Fields */}
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex gap-2">
              <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-700 space-y-1">
                <p><strong>Como funciona:</strong></p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Campos personalizados aparecem automaticamente no Step 6 do wizard</li>
                  <li>São aplicados a todas as propriedades do sistema</li>
                  <li>Emojis são permitidos nos campos personalizados ✅</li>
                  <li>Use para: GPS, Senhas, Links, Instruções específicas, etc.</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Footer */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex gap-3">
          <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-gray-900 mb-2">
              Sobre as Configurações
            </h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Essas configurações afetam todo o sistema de gestão de imóveis</li>
              <li>• Campos obrigatórios evitam publicação de anúncios incompletos</li>
              <li>• Prefixos de código ajudam na organização e identificação rápida</li>
              <li>• Configurações de fotos garantem qualidade visual dos anúncios</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
