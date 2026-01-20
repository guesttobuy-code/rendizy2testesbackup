import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Building2, MapPin, Plus, Edit2, Trash2, Home, Loader2, Search, ChevronRight, Image } from 'lucide-react';
import { locationsApi, propertiesApi, type Location } from '../utils/api';
import { toast } from 'sonner';
import { TestPropertiesCard } from './TestPropertiesCard';
import { PropertyPhotosModal } from './PropertyPhotosModal';
import { Photo } from './PhotoManager';
import { photosApi } from '../utils/api';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function LocationsManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [photoModalState, setPhotoModalState] = useState<{
    isOpen: boolean;
    propertyId?: string;
    propertyName?: string;
  }>({ isOpen: false });
  const [properties, setProperties] = useState<any[]>([]);
  const [accommodationsModalState, setAccommodationsModalState] = useState<{
    isOpen: boolean;
    location?: Location;
  }>({ isOpen: false });

  useEffect(() => {
    loadLocations();
    loadProperties();
  }, []);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await locationsApi.list();
      if (response.success && response.data) {
        setLocations(response.data);
      }
    } catch (error) {
      toast.error('Erro ao carregar locations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      const response = await propertiesApi.list();
      if (response.success && response.data) {
        setProperties(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar propriedades:', error);
    }
  };

  const handleSavePhotos = async (photos: Photo[]) => {
    const propertyId = photoModalState.propertyId;
    if (!propertyId) return;
    
    console.log('📸 Salvando fotos para propriedade:', propertyId);
    console.log('📦 Fotos:', photos);
    
    // Filtrar fotos que precisam de upload
    const photosToUpload = photos.filter(p => p.file);
    console.log('📤 Fotos para upload:', photosToUpload.length);
    
    if (photosToUpload.length === 0) {
      console.log('ℹ️ Nenhuma foto nova para fazer upload');
      toast.success('Nenhuma alteração para salvar');
      return;
    }
    
    // Fazer upload de fotos que têm file (novas)
    const uploadPromises = photosToUpload.map(async (photo, index) => {
      console.log(`📤 Iniciando upload ${index + 1}/${photosToUpload.length}:`, {
        room: photo.room,
        fileName: photo.file?.name,
        fileSize: photo.file?.size
      });
      
      try {
        const result = await photosApi.upload(photo.file!, propertyId, photo.room);
        console.log(`✅ Upload ${index + 1} concluído:`, result);
        return result.data;
      } catch (error) {
        console.error(`❌ Erro no upload ${index + 1}:`, error);
        throw error;
      }
    });

    try {
      console.log('⏳ Aguardando todos os uploads...');
      const uploadedPhotos = await Promise.all(uploadPromises);
      console.log('✅ Todos uploads concluídos:', uploadedPhotos);
      
      toast.success(`${uploadedPhotos.length} foto(s) salva(s) com sucesso!`);
    } catch (error) {
      console.error('❌ Erro geral ao salvar fotos:', error);
      toast.error(`Erro ao salvar fotos: ${error instanceof Error ? error.message : 'Unknown'}`);
      throw error;
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja deletar "${name}"?\n\nAtenção: Só é possível deletar locations sem accommodations vinculadas.`)) {
      return;
    }

    try {
      const response = await locationsApi.delete(id);
      if (response.success) {
        toast.success('Location deletada com sucesso!');
        loadLocations();
      } else {
        toast.error(response.error || 'Erro ao deletar location');
      }
    } catch (error) {
      toast.error('Erro ao deletar location');
      console.error(error);
    }
  };

  const filteredLocations = locations.filter(location =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Locations</h2>
          <p className="text-muted-foreground">
            Gerencie prédios, condomínios e localizações físicas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={async () => {
              const confirmed = confirm(
                '🏠 Carregar 4 Imóveis para Teste?\n\n' +
                'Isso irá criar:\n' +
                '• Arraial Novo - Barra da Tijuca RJ (Casa)\n' +
                '• Casa 003 - Itaúnas RJ (Casa)\n' +
                '• Studio Centro - RJ (Apartamento)\n' +
                '• MARICÁ - RESERVA TIPO CASA (Casa)\n\n' +
                'Incluindo locations, propriedades e hóspedes para teste.\n\n' +
                'Continuar?'
              );
              
              if (!confirmed) return;

              setLoading(true);
              try {
                const response = await fetch(
                  `https://${projectId}.supabase.co/functions/v1/rendizy-server/dev/seed-test-properties`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${publicAnonKey}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );

                const data = await response.json();

                if (data.success) {
                  const reservationMsg = data.data.reservationsCount > 0 
                    ? `\n✈️ ${data.data.reservationsCount} reserva do Airbnb criada (24-27 Jan)!` 
                    : '';
                  toast.success(`✅ ${data.data.propertiesCount} imóveis de teste criados!`, {
                    description: `${data.data.guestsCount} hóspedes criados${reservationMsg}`,
                    duration: 6000,
                  });
                  loadLocations();
                } else {
                  toast.error(data.error || 'Erro ao carregar imóveis de teste');
                }
              } catch (error) {
                toast.error('Erro ao carregar imóveis de teste');
                console.error(error);
              } finally {
                setLoading(false);
              }
            }}
            variant="outline"
            size="lg"
          >
            <Home className="mr-2 h-4 w-4" />
            Carregar 4 Imóveis de Teste
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Novo Location
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, código ou cidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredLocations.length} {filteredLocations.length === 1 ? 'location' : 'locations'}
        </div>
      </div>

      {/* Photo Manager Modal */}
      {photoModalState.isOpen && photoModalState.propertyId && (
        <PropertyPhotosModal
          isOpen={photoModalState.isOpen}
          onClose={() => setPhotoModalState({ isOpen: false })}
          propertyId={photoModalState.propertyId}
          propertyName={photoModalState.propertyName || 'Imóvel'}
          initialPhotos={[]}
          onSave={handleSavePhotos}
        />
      )}

      {/* Locations Grid */}
      {filteredLocations.length === 0 ? (
        <div className="space-y-6">
          {/* Test Properties Card - só mostra se não estiver filtrando */}
          {!searchQuery && (
            <TestPropertiesCard onLoadComplete={() => {
              loadLocations();
              loadProperties();
            }} />
          )}

          {/* Empty State */}
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum location encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? 'Tente buscar com outros termos' : 'Comece criando seu primeiro location'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Location Manualmente
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              properties={properties.filter(p => p.locationId === location.id)}
              onEdit={() => setSelectedLocation(location)}
              onDelete={() => handleDelete(location.id, location.name)}
              onManagePhotos={(propertyId, propertyName) => {
                setPhotoModalState({
                  isOpen: true,
                  propertyId,
                  propertyName
                });
              }}
              onManageAccommodations={() => {
                setAccommodationsModalState({
                  isOpen: true,
                  location: location
                });
              }}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <LocationFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          loadLocations();
        }}
      />

      {/* Edit Modal */}
      {selectedLocation && (
        <LocationFormModal
          isOpen={true}
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
          onSuccess={() => {
            setSelectedLocation(null);
            loadLocations();
          }}
        />
      )}

      {/* Accommodations Management Modal */}
      {accommodationsModalState.isOpen && accommodationsModalState.location && (
        <AccommodationsModal
          isOpen={accommodationsModalState.isOpen}
          location={accommodationsModalState.location}
          properties={properties.filter(p => p.locationId === accommodationsModalState.location?.id)}
          onClose={() => setAccommodationsModalState({ isOpen: false })}
          onSuccess={() => {
            loadLocations();
            loadProperties();
          }}
          onManagePhotos={(propertyId, propertyName) => {
            setPhotoModalState({
              isOpen: true,
              propertyId,
              propertyName
            });
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// LOCATION CARD
// ============================================================================

interface LocationCardProps {
  location: Location;
  properties: any[];
  onEdit: () => void;
  onDelete: () => void;
  onManagePhotos: (propertyId: string, propertyName: string) => void;
  onManageAccommodations: () => void;
}

function LocationCard({ location, properties, onEdit, onDelete, onManagePhotos, onManageAccommodations }: LocationCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-lg">{location.name}</CardTitle>
            </div>
            <Badge variant="secondary" className="font-mono text-xs">
              {location.code}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Address */}
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-muted-foreground">
            <div>{location.address.street}, {location.address.number}</div>
            <div>{location.address.neighborhood} - {location.address.city}/{location.address.state}</div>
          </div>
        </div>

        {/* Stats */}
        {location.stats && (
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-semibold">{location.stats.activeAccommodations}</div>
                <div className="text-xs text-muted-foreground">Ativas</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-semibold">{location.stats.totalAccommodations}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>
          </div>
        )}

        {/* Amenities */}
        {location.sharedAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {location.sharedAmenities.slice(0, 3).map((amenity) => (
              <Badge key={amenity} variant="outline" className="text-xs">
                {amenity}
              </Badge>
            ))}
            {location.sharedAmenities.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{location.sharedAmenities.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onManageAccommodations}
          >
            <Home className="mr-2 h-4 w-4" />
            Gerenciar Unidades
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// LOCATION FORM MODAL
// ============================================================================

interface LocationFormModalProps {
  isOpen: boolean;
  location?: Location;
  onClose: () => void;
  onSuccess: () => void;
}

function LocationFormModal({ isOpen, location, onClose, onSuccess }: LocationFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: location?.name || '',
    code: location?.code || '',
    street: location?.address.street || '',
    number: location?.address.number || '',
    neighborhood: location?.address.neighborhood || '',
    city: location?.address.city || '',
    state: location?.address.state || 'RJ',
    zipCode: location?.address.zipCode || '',
    country: location?.address.country || 'BR',
    description: location?.description || '',
    showBuildingNumber: location?.showBuildingNumber ?? true,
    hasElevator: location?.buildingAccess?.hasElevator ?? false,
    hasParking: location?.buildingAccess?.hasParking ?? false,
    parkingType: location?.buildingAccess?.parkingType || 'gratuito',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        address: {
          street: formData.street,
          number: formData.number,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        sharedAmenities: [],
        buildingAccess: {
          type: 'portaria' as const,
          hasElevator: formData.hasElevator,
          hasParking: formData.hasParking,
          parkingType: formData.parkingType as 'gratuito' | 'pago' | 'rotativo',
        },
        description: formData.description,
        showBuildingNumber: formData.showBuildingNumber,
      };

      const response = location
        ? await locationsApi.update(location.id, payload)
        : await locationsApi.create(payload);

      if (response.success) {
        toast.success(location ? 'Location atualizado!' : 'Location criado!');
        onSuccess();
      } else {
        toast.error(response.error || 'Erro ao salvar location');
      }
    } catch (error) {
      toast.error('Erro ao salvar location');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {location ? 'Editar Location' : 'Novo Location'}
          </DialogTitle>
          <DialogDescription>
            {location ? 'Atualize as informações do prédio/condomínio' : 'Crie um novo prédio/condomínio que agrupa múltiplas unidades'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Location *</Label>
              <Input
                id="name"
                placeholder="Ex: Edifício Copacabana Palace"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                placeholder="Ex: COP"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                maxLength={10}
                required
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold">Endereço</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">Rua/Avenida *</Label>
                <Input
                  id="street"
                  placeholder="Av. Atlântica"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Número *</Label>
                <Input
                  id="number"
                  placeholder="1500"
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro *</Label>
                <Input
                  id="neighborhood"
                  placeholder="Copacabana"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  placeholder="Rio de Janeiro"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">Estado *</Label>
                <Input
                  id="state"
                  placeholder="RJ"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  maxLength={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  placeholder="22021-000"
                  value={formData.zipCode}
                  onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* Building Features */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold">Características do Prédio</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasElevator">Possui Elevador</Label>
                <Switch
                  id="hasElevator"
                  checked={formData.hasElevator}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasElevator: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="hasParking">Possui Estacionamento</Label>
                <Switch
                  id="hasParking"
                  checked={formData.hasParking}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasParking: checked })}
                />
              </div>
              {formData.hasParking && (
                <div className="space-y-2">
                  <Label htmlFor="parkingType">Tipo de Estacionamento</Label>
                  <Select value={formData.parkingType} onValueChange={(value) => setFormData({ ...formData, parkingType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gratuito">Gratuito</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="rotativo">Rotativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="showBuildingNumber">Mostrar Número nos Anúncios</Label>
                <Switch
                  id="showBuildingNumber"
                  checked={formData.showBuildingNumber}
                  onCheckedChange={(checked) => setFormData({ ...formData, showBuildingNumber: checked })}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição do prédio/condomínio..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                location ? 'Atualizar' : 'Criar Location'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// ACCOMMODATIONS MODAL
// ============================================================================

interface AccommodationsModalProps {
  isOpen: boolean;
  location: Location;
  properties: any[];
  onClose: () => void;
  onSuccess: () => void;
  onManagePhotos: (propertyId: string, propertyName: string) => void;
}

function AccommodationsModal({ 
  isOpen, 
  location, 
  properties, 
  onClose, 
  onSuccess,
  onManagePhotos 
}: AccommodationsModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);

  return (
    <>
      <Dialog open={isOpen && !isCreating && !editingProperty} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <DialogTitle>Unidades - {location.name}</DialogTitle>
                <DialogDescription>
                  {location.address.street}, {location.address.number} - {location.address.city}/{location.address.state}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Header com stats */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex gap-6">
                <div>
                  <div className="text-2xl font-bold">{properties.length}</div>
                  <div className="text-sm text-muted-foreground">Unidades Cadastradas</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {properties.filter(p => p.status === 'active').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Ativas</div>
                </div>
              </div>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Unidade
              </Button>
            </div>

            {/* Lista de Accommodations */}
            {properties.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Home className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma unidade cadastrada</h3>
                  <p className="text-sm text-muted-foreground mb-4 text-center">
                    Comece criando a primeira unidade neste location
                  </p>
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Unidade
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {properties.map((property) => (
                  <Card key={property.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 text-blue-600">
                            <Home className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{property.name}</h4>
                              <Badge variant="secondary" className="font-mono text-xs">
                                {property.code}
                              </Badge>
                              {property.status === 'active' ? (
                                <Badge variant="default" className="bg-green-600">Ativa</Badge>
                              ) : property.status === 'maintenance' ? (
                                <Badge variant="outline" className="border-yellow-600 text-yellow-600">Manutenção</Badge>
                              ) : (
                                <Badge variant="secondary">Inativa</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{property.type}</span>
                              <span>•</span>
                              <span>{property.bedrooms} quartos</span>
                              <span>•</span>
                              <span>{property.bathrooms} banheiros</span>
                              <span>•</span>
                              <span>Até {property.maxGuests} hóspedes</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onManagePhotos(property.id, property.name)}
                          >
                            <Image className="h-4 w-4 mr-2" />
                            Fotos
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingProperty(property)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if (!confirm(`Tem certeza que deseja deletar "${property.name}"?`)) {
                                return;
                              }
                              try {
                                await propertiesApi.delete(property.id);
                                toast.success('Unidade deletada com sucesso!');
                                onSuccess();
                              } catch (error) {
                                toast.error('Erro ao deletar unidade');
                                console.error(error);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Accommodation Modal */}
      {isCreating && (
        <AccommodationFormModal
          isOpen={isCreating}
          location={location}
          onClose={() => setIsCreating(false)}
          onSuccess={() => {
            setIsCreating(false);
            onSuccess();
          }}
        />
      )}

      {/* Edit Accommodation Modal */}
      {editingProperty && (
        <AccommodationFormModal
          isOpen={true}
          location={location}
          property={editingProperty}
          onClose={() => setEditingProperty(null)}
          onSuccess={() => {
            setEditingProperty(null);
            onSuccess();
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// ACCOMMODATION FORM MODAL
// ============================================================================

interface AccommodationFormModalProps {
  isOpen: boolean;
  location: Location;
  property?: any;
  onClose: () => void;
  onSuccess: () => void;
}

function AccommodationFormModal({ 
  isOpen, 
  location, 
  property, 
  onClose, 
  onSuccess 
}: AccommodationFormModalProps) {
  const [loading, setLoading] = useState(false);
  
  // Converter status de inglês para português para o form
  const getStatusPT = (status?: string) => {
    if (!status) return 'ativo';
    if (status === 'active') return 'ativo';
    if (status === 'inactive') return 'inativo';
    if (status === 'maintenance') return 'manutencao';
    return status;
  };
  
  const [formData, setFormData] = useState({
    name: property?.name || '',
    code: property?.code || '',
    type: property?.type || 'apartamento',
    bedrooms: property?.bedrooms || 1,
    bathrooms: property?.bathrooms || 1,
    maxGuests: property?.maxGuests || 2,
    area: property?.area || 50,
    floor: property?.floor || '1',
    apartmentNumber: property?.apartmentNumber || '',
    description: property?.description || '',
    status: getStatusPT(property?.status),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        locationId: location.id,
        type: formData.type,
        
        // Address herdado do location (obrigatório)
        address: {
          street: location.address.street,
          number: location.address.number,
          complement: formData.apartmentNumber ? `Apto ${formData.apartmentNumber}` : undefined,
          neighborhood: location.address.neighborhood,
          city: location.address.city,
          state: location.address.state,
          zipCode: location.address.zipCode,
          country: location.address.country,
        },
        
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        maxGuests: formData.maxGuests,
        area: formData.area,
        
        // Preço base padrão (pode ser editado depois)
        basePrice: 100,
        
        floor: formData.floor,
        apartmentNumber: formData.apartmentNumber,
        description: formData.description,
        
        // Status em inglês conforme API espera
        status: formData.status === 'ativo' ? 'active' : formData.status === 'inativo' ? 'inactive' : 'maintenance',
        
        amenities: [],
        photos: [],
      };

      const response = property
        ? await propertiesApi.update(property.id, payload)
        : await propertiesApi.create(payload);

      if (response.success) {
        toast.success(property ? 'Unidade atualizada!' : 'Unidade criada!');
        onSuccess();
      } else {
        toast.error(response.error || 'Erro ao salvar unidade');
      }
    } catch (error) {
      toast.error('Erro ao salvar unidade');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {property ? 'Editar Unidade' : 'Nova Unidade'}
          </DialogTitle>
          <DialogDescription>
            {location.name} - {location.address.city}/{location.address.state}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Unidade *</Label>
              <Input
                id="name"
                placeholder="Ex: Apartamento 201"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                placeholder="Ex: APT201"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                maxLength={10}
                required
              />
            </div>
          </div>

          {/* Type and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="loft">Loft</SelectItem>
                  <SelectItem value="kitnet">Kitnet</SelectItem>
                  <SelectItem value="cobertura">Cobertura</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="manutencao">Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold">Detalhes da Propriedade</h4>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Quartos *</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Banheiros *</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="1"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxGuests">Máx. Hóspedes *</Label>
                <Input
                  id="maxGuests"
                  type="number"
                  min="1"
                  value={formData.maxGuests}
                  onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area">Área (m²) *</Label>
                <Input
                  id="area"
                  type="number"
                  min="1"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Unit Location */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-semibold">Localização na Edificação</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Andar</Label>
                <Input
                  id="floor"
                  placeholder="Ex: 2, Térreo, Cobertura"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apartmentNumber">Número do Apto</Label>
                <Input
                  id="apartmentNumber"
                  placeholder="Ex: 201, A, B"
                  value={formData.apartmentNumber}
                  onChange={(e) => setFormData({ ...formData, apartmentNumber: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descrição da unidade..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                property ? 'Atualizar Unidade' : 'Criar Unidade'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
