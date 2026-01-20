/**
 * RENDIZY - Property View Modal
 * 
 * Modal de visualização completa de anúncio/propriedade
 * Exibe todas as informações em formato read-only
 * 
 * @version 1.0.103.6
 * @date 2025-10-28
 */

import { X, MapPin, Home, Users, Bed, Bath, DollarSign, Calendar, Star, Wifi, Car, CheckCircle2, Building2, Share2, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface PropertyViewModalProps {
  open: boolean;
  onClose: () => void;
  property: any; // TODO: tipar corretamente
  onEdit?: () => void;
}

export function PropertyViewModal({ open, onClose, property, onEdit }: PropertyViewModalProps) {
  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={property.type === 'location' ? 'bg-blue-600' : 'bg-emerald-600'}>
                  {property.type === 'location' ? (
                    <>
                      <Building2 className="w-3 h-3 mr-1" />
                      Local
                    </>
                  ) : (
                    <>
                      <Home className="w-3 h-3 mr-1" />
                      Acomodação
                    </>
                  )}
                </Badge>
                <Badge 
                  variant={property.status === 'active' ? 'default' : 'secondary'}
                  className={
                    property.status === 'active' ? 'bg-green-600' :
                    property.status === 'draft' ? 'bg-yellow-600' :
                    'bg-gray-600'
                  }
                >
                  {property.status === 'active' ? 'Ativo' :
                   property.status === 'draft' ? 'Rascunho' :
                   'Inativo'}
                </Badge>
              </div>
              <DialogTitle className="text-2xl">{property.internalName}</DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                {property.address && (
                  <>
                    <MapPin className="h-4 w-4" />
                    {property.address.street && `${property.address.street}, `}
                    {property.address.city}, {property.address.state}
                  </>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-140px)]">
          <div className="px-6 py-4">
            {/* Hero Section - Foto Principal */}
            {property.photos && property.photos.length > 0 && (
              <div className="relative aspect-video rounded-lg overflow-hidden mb-6 bg-gray-200 dark:bg-gray-700">
                <img
                  src={property.photos[0]}
                  alt={property.internalName}
                  className="w-full h-full object-cover"
                />
                {property.photos.length > 1 && (
                  <Badge className="absolute bottom-4 right-4 bg-black/70 text-white">
                    +{property.photos.length - 1} fotos
                  </Badge>
                )}
              </div>
            )}

            {/* Quick Stats */}
            {property.capacity && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Hóspedes</p>
                      <p className="text-lg">{property.capacity.guests || '-'}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Bed className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Quartos</p>
                      <p className="text-lg">{property.capacity.bedrooms || '-'}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <Bath className="h-5 w-5 text-cyan-600" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Banheiros</p>
                      <p className="text-lg">{property.capacity.bathrooms || '-'}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Diária</p>
                      <p className="text-lg">
                        {property.pricing?.basePrice ? 
                          `R$ ${(property.pricing.basePrice / 100).toFixed(0)}` : 
                          '-'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tabs de Conteúdo */}
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">
                  <Home className="h-4 w-4 mr-2" />
                  Informações
                </TabsTrigger>
                <TabsTrigger value="amenities">
                  <Star className="h-4 w-4 mr-2" />
                  Amenities
                </TabsTrigger>
                <TabsTrigger value="location">
                  <MapPin className="h-4 w-4 mr-2" />
                  Localização
                </TabsTrigger>
                <TabsTrigger value="details">
                  <Calendar className="h-4 w-4 mr-2" />
                  Detalhes
                </TabsTrigger>
              </TabsList>

              {/* Tab: Informações */}
              <TabsContent value="info" className="space-y-4 mt-4">
                {/* Descrição */}
                {property.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Descrição</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {property.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Tipo de Propriedade */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tipo de Propriedade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Categoria</p>
                        <p className="capitalize">{property.type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estrutura</p>
                        <p className="capitalize">{property.structureType || '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tags */}
                {property.tags && property.tags.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Tags</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {property.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Tab: Amenities */}
              <TabsContent value="amenities" className="space-y-4 mt-4">
                {/* AMENIDADES DO LOCAL (se tiver location vinculada) */}
                {property.locationId && property.locationAmenities && property.locationAmenities.length > 0 && (
                  <Card className="border-blue-300 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-lg text-blue-900 dark:text-blue-100">
                          Amenidades do Local
                        </CardTitle>
                        <Badge className="ml-auto bg-blue-600">
                          {property.locationAmenities.length}
                        </Badge>
                      </div>
                      {property.locationName && (
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Herdadas de "{property.locationName}"
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {property.locationAmenities.map((amenity: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-800">
                            <CheckCircle2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span className="text-sm text-blue-900 dark:text-blue-100">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AMENIDADES DA ACOMODAÇÃO */}
                <Card className="border-green-300 bg-green-50/50 dark:bg-green-950/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Home className="h-5 w-5 text-green-600" />
                      <CardTitle className="text-lg text-green-900 dark:text-green-100">
                        Amenidades da Acomodação
                      </CardTitle>
                      <Badge className="ml-auto bg-green-600">
                        {property.propertyAmenities?.length || property.amenities?.length || 0}
                      </Badge>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Específicas desta unidade
                    </p>
                  </CardHeader>
                  <CardContent>
                    {(property.propertyAmenities || property.amenities) && 
                     (property.propertyAmenities?.length > 0 || property.amenities?.length > 0) ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(property.propertyAmenities || property.amenities).map((amenity: string, index: number) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-800">
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                            <span className="text-sm text-green-900 dark:text-green-100">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">Nenhuma amenidade específica cadastrada</p>
                    )}
                  </CardContent>
                </Card>

                {/* TOTAL */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">Total de Amenidades</span>
                      </div>
                      <Badge className="bg-purple-600">
                        {(property.locationAmenities?.length || 0) + (property.propertyAmenities?.length || property.amenities?.length || 0)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Localização */}
              <TabsContent value="location" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Endereço Completo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {property.address ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Rua</p>
                            <p>{property.address.street || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Número</p>
                            <p>{property.address.number || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Complemento</p>
                            <p>{property.address.complement || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Bairro</p>
                            <p>{property.address.neighborhood || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cidade</p>
                            <p>{property.address.city || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Estado</p>
                            <p>{property.address.state || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">CEP</p>
                            <p>{property.address.zipCode || '-'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">País</p>
                            <p>{property.address.country || 'Brasil'}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">Endereço não cadastrado</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Detalhes */}
              <TabsContent value="details" className="space-y-4 mt-4">
                {/* Preços */}
                {property.pricing && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Precificação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Preço Base</p>
                          <p className="text-xl">
                            R$ {property.pricing.basePrice ? (property.pricing.basePrice / 100).toFixed(2) : '0.00'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Moeda</p>
                          <p className="text-xl">{property.pricing.currency || 'BRL'}</p>
                        </div>
                        {property.pricing.weeklyDiscount > 0 && (
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Desconto Semanal</p>
                            <p>{property.pricing.weeklyDiscount}%</p>
                          </div>
                        )}
                        {property.pricing.monthlyDiscount > 0 && (
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Desconto Mensal</p>
                            <p>{property.pricing.monthlyDiscount}%</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Datas de Criação */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">ID</span>
                        <span className="text-sm font-mono">{property.id}</span>
                      </div>
                      {property.createdAt && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Criado em</span>
                          <span className="text-sm">
                            {new Date(property.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                      {property.updatedAt && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Atualizado em</span>
                          <span className="text-sm">
                            {new Date(property.updatedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
