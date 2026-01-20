/**
 * RENDIZY - Locations & Listings Manager
 * 
 * Módulo completo para gestão de:
 * - Locations (Prédios/Condomínios)
 * - Anúncios (Listings)
 * - Acomodações vinculadas
 * - Publicação em plataformas (Airbnb, Booking.com, etc)
 * 
 * @version 1.0.77
 * @date 2025-10-28
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Home,
  Search,
  Filter,
  ChevronRight,
  Image,
  Eye,
  EyeOff,
  Calendar,
  DollarSign,
  Users,
  Star,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Bed,
  Bath,
  Maximize,
  Wifi,
  Car,
  CreditCard,
  Settings,
  Upload,
  ExternalLink,
  Copy,
  Share2,
  BarChart3
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { toast } from 'sonner';
import { locationsApi, propertiesApi, listingsApi, type Location, type Listing, type Platform } from '../utils/api';
import { AmenitiesSelector } from './AmenitiesSelector';
import { RoomsManager } from './RoomsManager';
import { AccommodationRulesForm } from './AccommodationRulesForm';
import { PricingSettingsForm } from './PricingSettingsForm';
import { ICalManager } from './ICalManager';
import { SettingsManager } from './SettingsManager';
import { generateLocationCode, generateListingCode } from '../utils/codeGenerator';

// Tipos importados de utils/api.ts

export function LocationsAndListings() {
  const [activeView, setActiveView] = useState<'locations' | 'listings'>('listings');
  const [locations, setLocations] = useState<Location[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'draft'>('all');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [isCreateLocationOpen, setIsCreateLocationOpen] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [locationsRes, listingsRes] = await Promise.all([
        locationsApi.list(),
        listingsApi.list(),
      ]);

      if (locationsRes.success && locationsRes.data) {
        setLocations(locationsRes.data);
      }

      if (listingsRes.success && listingsRes.data) {
        setListings(listingsRes.data);
      }
    } catch (error) {
      toast.error('Erro ao carregar dados');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // OTIMIZADO: Memoizado para evitar recálculo em cada render
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      const matchesSearch = 
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.propertyName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = 
        filterStatus === 'all' || listing.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  }, [listings, searchQuery, filterStatus]);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'airbnb': return <Home className="h-4 w-4" />;
      case 'booking': return <Building2 className="h-4 w-4" />;
      case 'vrbo': return <Globe className="h-4 w-4" />;
      case 'direct': return <CreditCard className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'inactive': return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
      case 'draft': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'archived': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20';
    }
  };

  const handleCreateListing = async (data: Partial<Listing>) => {
    try {
      // Gera código automaticamente baseado nos códigos existentes
      const existingCodes = listings.map(lst => lst.code || '');
      const autoCode = generateListingCode(data.title || 'Listing', existingCodes);
      
      // Adiciona o código gerado aos dados
      const dataWithCode = {
        ...data,
        code: autoCode,
      };
      
      const result = await listingsApi.create(dataWithCode);
      if (result.success) {
        toast.success(`Anúncio criado com sucesso! Código: ${autoCode}`);
        loadData();
        setIsCreateListingOpen(false);
      } else {
        toast.error(result.error || 'Erro ao criar anúncio');
      }
    } catch (error) {
      toast.error('Erro ao criar anúncio');
      console.error(error);
    }
  };

  const handleCreateLocation = async (data: any) => {
    try {
      // Gera código automaticamente baseado nos códigos existentes
      const existingCodes = locations.map(loc => loc.code);
      const autoCode = generateLocationCode(data.name, existingCodes);
      
      // Adiciona o código gerado aos dados
      const dataWithCode = {
        ...data,
        code: autoCode,
      };
      
      const result = await locationsApi.create(dataWithCode);
      if (result.success) {
        toast.success(`Local criado com sucesso! Código: ${autoCode}`);
        loadData();
        setIsCreateLocationOpen(false);
      } else {
        toast.error(result.error || 'Erro ao criar local');
      }
    } catch (error) {
      toast.error('Erro ao criar local');
      console.error(error);
    }
  };

  const handleDeleteListing = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja deletar "${title}"?`)) {
      return;
    }

    try {
      const result = await listingsApi.delete(id);
      if (result.success) {
        toast.success(result.message || 'Anúncio deletado com sucesso!');
        loadData();
      } else {
        toast.error(result.error || 'Erro ao deletar anúncio');
      }
    } catch (error) {
      toast.error('Erro ao deletar anúncio');
      console.error(error);
    }
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja deletar o local "${name}"?`)) {
      return;
    }

    try {
      const result = await locationsApi.delete(id);
      if (result.success) {
        toast.success(result.message || 'Local deletado com sucesso!');
        loadData();
      } else {
        toast.error(result.error || 'Erro ao deletar local');
      }
    } catch (error) {
      toast.error('Erro ao deletar local');
      console.error(error);
    }
  };

  const handlePublish = async (listingId: string, platform: string) => {
    try {
      const result = await listingsApi.publish(listingId, platform);
      if (result.success) {
        toast.success(result.message || `Publicado em ${platform}!`);
        loadData();
      } else {
        toast.error(result.error || 'Erro ao publicar');
      }
    } catch (error) {
      toast.error('Erro ao publicar');
      console.error(error);
    }
  };

  const handleUnpublish = async (listingId: string, platform: string) => {
    try {
      const result = await listingsApi.unpublish(listingId, platform);
      if (result.success) {
        toast.success(result.message || `Despublicado de ${platform}!`);
        loadData();
      } else {
        toast.error(result.error || 'Erro ao despublicar');
      }
    } catch (error) {
      toast.error('Erro ao despublicar');
      console.error(error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-gray-900 dark:text-white">Locais e Anúncios</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gerencie propriedades, locais e anúncios em múltiplas plataformas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              Importar
            </Button>
            {activeView === 'listings' && (
              <Button className="gap-2" onClick={() => setIsCreateListingOpen(true)}>
                <Plus className="h-4 w-4" />
                Novo Anúncio
              </Button>
            )}
            {activeView === 'locations' && (
              <Button className="gap-2" onClick={() => setIsCreateLocationOpen(true)}>
                <Plus className="h-4 w-4" />
                Novo Local
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {/* Tabs */}
        <Tabs value={activeView} onValueChange={(v: any) => setActiveView(v)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="listings">
              <Home className="h-4 w-4 mr-2" />
              Anúncios
            </TabsTrigger>
            <TabsTrigger value="locations">
              <Building2 className="h-4 w-4 mr-2" />
              Locais
            </TabsTrigger>
          </TabsList>

          {/* Tab: Anúncios */}
          <TabsContent value="listings" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Anúncios</p>
                      <h3 className="text-2xl text-gray-900 dark:text-white mt-1">{listings.length}</h3>
                    </div>
                    <Home className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Ativos</p>
                      <h3 className="text-2xl text-gray-900 dark:text-white mt-1">
                        {listings.filter(l => l.status === 'active').length}
                      </h3>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Reservas (30d)</p>
                      <h3 className="text-2xl text-gray-900 dark:text-white mt-1">
                        {listings.reduce((acc, l) => acc + l.stats.reservations, 0)}
                      </h3>
                    </div>
                    <Calendar className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Receita (30d)</p>
                      <h3 className="text-2xl text-gray-900 dark:text-white mt-1">
                        R$ {(listings.reduce((acc, l) => acc + l.stats.revenue, 0) / 1000).toFixed(1)}k
                      </h3>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar anúncios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredListings.map((listing) => (
                <Card 
                  key={listing.id} 
                  className="hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
                  onClick={() => {
                    setSelectedListing(listing);
                    setIsListingModalOpen(true);
                  }}
                >
                  <CardContent className="p-0">
                    {/* Cover Image */}
                    <div className="relative h-48 bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden">
                    {listing.photos.length > 0 ? (
                      <img
                        src={listing.photos.find(p => p.isCover)?.url || listing.photos[0].url}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        <Badge className={getStatusColor(listing.status)}>
                          {listing.status === 'active' && 'Ativo'}
                          {listing.status === 'inactive' && 'Inativo'}
                          {listing.status === 'draft' && 'Rascunho'}
                          {listing.status === 'archived' && 'Arquivado'}
                        </Badge>
                      </div>

                      {/* Platforms */}
                      <div className="absolute bottom-2 left-2 flex gap-1">
                        {listing.publishedPlatforms.map((platform, idx) => (
                          <div 
                            key={idx}
                            className="bg-black/60 backdrop-blur-sm rounded-full p-1.5 text-white"
                            title={platform.name}
                          >
                            {getPlatformIcon(platform.name)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="text-gray-900 dark:text-white line-clamp-1">{listing.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                          {listing.description}
                        </p>
                      </div>

                      {/* Capacity */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {listing.capacity.guests}
                        </div>
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          {listing.capacity.bedrooms}
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          {listing.capacity.bathrooms}
                        </div>
                      </div>

                      <Separator />

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Visualizações</p>
                          <p className="text-gray-900 dark:text-white">{listing.stats.views}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Reservas</p>
                          <p className="text-gray-900 dark:text-white">{listing.stats.reservations}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">Avaliação</p>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <p className="text-gray-900 dark:text-white">{listing.stats.rating.toFixed(1)}</p>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-xs">A partir de</p>
                          <p className="text-gray-900 dark:text-white text-lg">
                            R$ {listing.pricing.basePrice}
                            <span className="text-sm text-gray-500 dark:text-gray-400">/noite</span>
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" className="gap-2">
                          Ver Detalhes
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredListings.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Nenhum anúncio encontrado</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    {searchQuery ? 'Tente ajustar os filtros de busca' : 'Crie seu primeiro anúncio para começar'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Locations */}
          <TabsContent value="locations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Locais</CardTitle>
                <CardDescription>
                  Prédios, condomínios e localizações físicas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Endereço</TableHead>
                      <TableHead>Unidades</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="text-gray-900 dark:text-white">{location.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{location.code}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {location.address.street}, {location.address.city}
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-white">
                          {listings.filter(l => l.locationId === location.id).length}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" title="Editar">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Deletar"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLocation(location.id, location.name);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {locations.length === 0 && (
                  <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Nenhum local cadastrado</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Crie seu primeiro local para organizar seus imóveis
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Listing Details Modal - Com Tabs para Cômodos, Regras e Preços */}
      {selectedListing && (
        <Dialog open={isListingModalOpen} onOpenChange={setIsListingModalOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>{selectedListing.title}</DialogTitle>
              <DialogDescription>
                Detalhes e gerenciamento completo do anúncio
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="overview">
                  <Eye className="h-4 w-4 mr-2" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="rooms">
                  <Bed className="h-4 w-4 mr-2" />
                  Cômodos
                </TabsTrigger>
                <TabsTrigger value="rules">
                  <Users className="h-4 w-4 mr-2" />
                  Regras
                </TabsTrigger>
                <TabsTrigger value="pricing">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Preços
                </TabsTrigger>
                <TabsTrigger value="ical">
                  <Calendar className="h-4 w-4 mr-2" />
                  iCal
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Config
                </TabsTrigger>
                <TabsTrigger value="photos">
                  <Image className="h-4 w-4 mr-2" />
                  Fotos
                </TabsTrigger>
                <TabsTrigger value="platforms">
                  <Globe className="h-4 w-4 mr-2" />
                  Plataformas
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-6">
                {/* TAB: VISÃO GERAL */}
                <TabsContent value="overview" className="mt-0 space-y-6">
                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Share2 className="h-4 w-4" />
                      Compartilhar
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </Button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Eye className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                        <p className="text-2xl text-gray-900 dark:text-white">{selectedListing.stats.views}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Visualizações</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Calendar className="h-6 w-6 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl text-gray-900 dark:text-white">{selectedListing.stats.reservations}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Reservas</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-2" />
                        <p className="text-2xl text-gray-900 dark:text-white">R$ {(selectedListing.stats.revenue / 1000).toFixed(1)}k</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Receita</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                        <p className="text-2xl text-gray-900 dark:text-white">{selectedListing.stats.rating.toFixed(1)}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Avaliação</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Pricing Summary */}
                  <div>
                    <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-3">Precificação Base</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Diária Base</p>
                        <p className="text-xl text-gray-900 dark:text-white">R$ {selectedListing.pricing.basePrice}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Taxa de Limpeza</p>
                        <p className="text-xl text-gray-900 dark:text-white">R$ {selectedListing.pricing.cleaningFee}</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: CÔMODOS (v1.0.79) */}
                <TabsContent value="rooms" className="mt-0">
                  <RoomsManager listingId={selectedListing.id} />
                </TabsContent>

                {/* TAB: REGRAS (v1.0.80) */}
                <TabsContent value="rules" className="mt-0">
                  <AccommodationRulesForm listingId={selectedListing.id} />
                </TabsContent>

                {/* TAB: PREÇOS (v1.0.81) */}
                <TabsContent value="pricing" className="mt-0 p-4">
                  <PricingSettingsForm listingId={selectedListing.id} />
                </TabsContent>

                {/* TAB: ICAL (v1.0.83) */}
                <TabsContent value="ical" className="mt-0">
                  <ICalManager 
                    listingId={selectedListing.id} 
                    listingName={selectedListing.title} 
                  />
                </TabsContent>

                {/* TAB: SETTINGS (v1.0.84) */}
                <TabsContent value="settings" className="mt-0">
                  <SettingsManager
                    organizationId={selectedListing.organization_id || 'org-default-001'}
                    listingId={selectedListing.id}
                    mode="individual"
                  />
                </TabsContent>

                {/* TAB: FOTOS */}
                <TabsContent value="photos" className="mt-0">
                  <div className="text-center py-12 text-gray-600 dark:text-gray-400">
                    <Image className="h-16 w-16 mx-auto mb-4 opacity-20" />
                    <p>Gerenciador de fotos será integrado aqui</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Utilize o PhotoManager existente
                    </p>
                  </div>
                </TabsContent>

                {/* TAB: PLATAFORMAS */}
                <TabsContent value="platforms" className="mt-0 space-y-4">
                  <h4 className="text-sm text-gray-600 dark:text-gray-400">Publicações Ativas</h4>
                  <div className="space-y-2">
                    {selectedListing.publishedPlatforms.map((platform, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          {getPlatformIcon(platform.name)}
                          <div>
                            <p className="text-gray-900 dark:text-white capitalize">{platform.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {platform.externalId}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={platform.status === 'active' ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'}>
                            {platform.status}
                          </Badge>
                          {platform.listingUrl && (
                            <Button variant="ghost" size="sm" asChild>
                              <a href={platform.listingUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsListingModalOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Listing Modal - Completo com Tabs */}
      <Dialog open={isCreateListingOpen} onOpenChange={(open) => {
        setIsCreateListingOpen(open);
        if (!open) setSelectedAmenities([]);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Criar Novo Anúncio</DialogTitle>
            <DialogDescription>
              Preencha as informações completas do anúncio
            </DialogDescription>
          </DialogHeader>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const title = formData.get('title') as string;
              const data = {
                title: title,
                description: formData.get('description') as string,
                propertyId: `temp_${Date.now()}`, // Temporário, será substituído pelo código gerado
                propertyName: title,
                propertyType: formData.get('propertyType') as any,
                status: 'draft' as const,
                pricing: {
                  basePrice: parseInt(formData.get('basePrice') as string) || 0,
                  currency: 'BRL',
                  cleaningFee: parseInt(formData.get('cleaningFee') as string) || 0,
                  extraGuestFee: 30,
                },
                capacity: {
                  guests: parseInt(formData.get('guests') as string) || 1,
                  bedrooms: parseInt(formData.get('bedrooms') as string) || 1,
                  beds: parseInt(formData.get('beds') as string) || 1,
                  bathrooms: parseInt(formData.get('bathrooms') as string) || 1,
                },
                amenities: selectedAmenities,
                photos: [],
              };
              handleCreateListing(data);
            }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                <TabsTrigger value="amenities">
                  Amenities 
                  {selectedAmenities.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedAmenities.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pricing">Precificação</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4">
                {/* Tab: Informações Básicas */}
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="title">Título do Anúncio *</Label>
                      <Input
                        id="title"
                        name="title"
                        required
                        placeholder="Ex: Casa na Praia - Guarujá"
                        className="mt-1.5"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                        💡 O código será gerado automaticamente (ex: CAS001)
                      </p>
                    </div>

                    <div className="col-span-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Descrição do imóvel..."
                        className="mt-1.5"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="propertyType">Tipo *</Label>
                      <Select name="propertyType" defaultValue="apartment" required>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">Apartamento</SelectItem>
                          <SelectItem value="house">Casa</SelectItem>
                          <SelectItem value="studio">Studio</SelectItem>
                          <SelectItem value="loft">Loft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="guests">Hóspedes *</Label>
                      <Input
                        id="guests"
                        name="guests"
                        type="number"
                        required
                        min="1"
                        defaultValue="2"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bedrooms">Quartos *</Label>
                      <Input
                        id="bedrooms"
                        name="bedrooms"
                        type="number"
                        required
                        min="0"
                        defaultValue="1"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="beds">Camas *</Label>
                      <Input
                        id="beds"
                        name="beds"
                        type="number"
                        required
                        min="0"
                        defaultValue="1"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bathrooms">Banheiros *</Label>
                      <Input
                        id="bathrooms"
                        name="bathrooms"
                        type="number"
                        required
                        min="0"
                        step="0.5"
                        defaultValue="1"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Amenities */}
                <TabsContent value="amenities" className="mt-0">
                  <AmenitiesSelector
                    selectedIds={selectedAmenities}
                    onChange={setSelectedAmenities}
                    minRecommended={5}
                    maxRecommended={10}
                    showChannelFilter={true}
                    showStats={true}
                  />
                </TabsContent>

                {/* Tab: Precificação */}
                <TabsContent value="pricing" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="basePrice">Diária Base (R$) *</Label>
                      <Input
                        id="basePrice"
                        name="basePrice"
                        type="number"
                        required
                        min="0"
                        placeholder="150"
                        className="mt-1.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="cleaningFee">Taxa de Limpeza (R$)</Label>
                      <Input
                        id="cleaningFee"
                        name="cleaningFee"
                        type="number"
                        min="0"
                        placeholder="80"
                        className="mt-1.5"
                      />
                    </div>

                    <div className="col-span-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Preview de Precificação</CardTitle>
                          <CardDescription>Resumo dos valores</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Diária base:</span>
                              <span className="text-gray-900 dark:text-white">R$ --</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Taxa de limpeza:</span>
                              <span className="text-gray-900 dark:text-white">R$ --</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-gray-700 dark:text-gray-300">Total (1 noite):</span>
                              <span className="text-gray-900 dark:text-white">R$ --</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateListingOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Criar Anúncio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Location Modal */}
      <Dialog open={isCreateLocationOpen} onOpenChange={setIsCreateLocationOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Criar Novo Local</DialogTitle>
            <DialogDescription>
              Cadastre um prédio, condomínio ou localização física
            </DialogDescription>
          </DialogHeader>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = {
                name: formData.get('name') as string,
                // Código será gerado automaticamente em handleCreateLocation
                address: {
                  street: formData.get('street') as string,
                  number: formData.get('number') as string,
                  neighborhood: formData.get('neighborhood') as string,
                  city: formData.get('city') as string,
                  state: formData.get('state') as string,
                  zipCode: formData.get('zipCode') as string,
                  country: 'Brasil',
                },
                description: formData.get('description') as string || undefined,
                showBuildingNumber: formData.get('showBuildingNumber') === 'on',
                buildingAccess: {
                  type: (formData.get('accessType') as any) || 'portaria',
                  instructions: formData.get('accessInstructions') as string || undefined,
                  hasElevator: formData.get('hasElevator') === 'on',
                  hasParking: formData.get('hasParking') === 'on',
                  parkingType: formData.get('hasParking') === 'on' 
                    ? (formData.get('parkingType') as any) || 'gratuito'
                    : undefined,
                },
                sharedAmenities: [],
              };
              handleCreateLocation(data);
            }}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto space-y-6 px-1">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h4 className="text-sm text-gray-700 dark:text-gray-300">Informações Básicas</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Local *</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="Ex: Edifício Copacabana Palace"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                      💡 O código será gerado automaticamente (ex: EDI001)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch id="showBuildingNumber" name="showBuildingNumber" defaultChecked />
                    <Label htmlFor="showBuildingNumber" className="cursor-pointer">
                      Mostrar número do prédio
                    </Label>
                  </div>

                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Descrição do local..."
                      className="mt-1.5"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Endereço */}
              <div className="space-y-4">
                <h4 className="text-sm text-gray-700 dark:text-gray-300">Endereço</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="street">Rua/Avenida *</Label>
                    <Input
                      id="street"
                      name="street"
                      required
                      placeholder="Av. Atlântica"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      name="number"
                      required
                      placeholder="1702"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="neighborhood">Bairro *</Label>
                    <Input
                      id="neighborhood"
                      name="neighborhood"
                      required
                      placeholder="Copacabana"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">Cidade *</Label>
                    <Input
                      id="city"
                      name="city"
                      required
                      placeholder="Rio de Janeiro"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      name="state"
                      required
                      placeholder="RJ"
                      maxLength={2}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="zipCode">CEP *</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      required
                      placeholder="22021-001"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Acesso ao Prédio */}
              <div className="space-y-4">
                <h4 className="text-sm text-gray-700 dark:text-gray-300">Acesso ao Prédio</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="accessType">Tipo de Acesso</Label>
                    <Select name="accessType" defaultValue="portaria">
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portaria">Portaria</SelectItem>
                        <SelectItem value="código">Código</SelectItem>
                        <SelectItem value="livre">Livre</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="accessInstructions">Instruções de Acesso</Label>
                    <Textarea
                      id="accessInstructions"
                      name="accessInstructions"
                      placeholder="Instruções para acessar o prédio..."
                      className="mt-1.5"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch id="hasElevator" name="hasElevator" defaultChecked />
                    <Label htmlFor="hasElevator" className="cursor-pointer">
                      Possui elevador
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch 
                      id="hasParking" 
                      name="hasParking" 
                      onCheckedChange={(checked) => {
                        const parkingTypeSelect = document.getElementById('parkingType');
                        if (parkingTypeSelect) {
                          (parkingTypeSelect as HTMLSelectElement).disabled = !checked;
                        }
                      }}
                    />
                    <Label htmlFor="hasParking" className="cursor-pointer">
                      Possui estacionamento
                    </Label>
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor="parkingType">Tipo de Estacionamento</Label>
                    <Select name="parkingType" defaultValue="gratuito">
                      <SelectTrigger id="parkingType" className="mt-1.5" disabled>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gratuito">Gratuito</SelectItem>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="rotativo">Rotativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateLocationOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                <Building2 className="h-4 w-4 mr-2" />
                Criar Local
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
