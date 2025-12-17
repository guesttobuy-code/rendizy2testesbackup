/**
 * RENDIZY - Bulk Pricing Manager
 * 
 * Interface para aplicar precificação em lote para múltiplos listings.
 * 
 * Funcionalidades:
 * - Selecionar múltiplos listings (por filtros ou manual)
 * - Aplicar operações: set base, adjust %, seasonal, derived
 * - Preview antes de aplicar
 * - Templates pré-configurados
 * - Histórico de operações
 * 
 * @version 1.0.85
 * @date 2025-10-29
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Star,
  Filter,
  Eye,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  History,
  Tag,
  MapPin,
  Home,
  RotateCcw,
  Plus,
  Minus,
  Percent
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Switch } from './ui/switch';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table';

// ============================================================================
// TYPES
// ============================================================================

interface Listing {
  id: string;
  name: string;
  location: string;
  property_type: string;
  current_price: number;
  tags: string[];
}

interface PreviewItem {
  listing_id: string;
  listing_name: string;
  current_base_price: number;
  new_base_price: number;
  affected_dates?: number;
  estimated_revenue_change?: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  operation: string;
  percentage?: number;
  icon: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BulkPricingManager({ organizationId }: { organizationId: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'select' | 'configure' | 'preview'>('select');
  
  // Seleção de listings
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [selectedListings, setSelectedListings] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    tags: [] as string[],
    location: '',
    property_type: ''
  });
  
  // Configuração de operação
  const [operation, setOperation] = useState<'set_base' | 'adjust_percentage' | 'seasonal' | 'derived'>('adjust_percentage');
  const [basePrice, setBasePrice] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(0);
  const [applyTo, setApplyTo] = useState<'base' | 'all' | 'weekday' | 'weekend'>('base');
  
  // Preview
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [previewStats, setPreviewStats] = useState<any>(null);
  
  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    loadListings();
    loadTemplates();
  }, [organizationId]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const loadListings = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/bulk-pricing/filter-listings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(filters)
        }
      );

      const data = await response.json();
      if (data.success) {
        setAllListings(data.listings || []);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
      toast.error('Erro ao carregar listings');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/bulk-pricing/templates`,
        {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }
      );

      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const generatePreview = async () => {
    if (selectedListings.length === 0) {
      toast.error('Selecione ao menos 1 listing');
      return;
    }

    setLoading(true);
    try {
      const requestBody: any = {
        listing_ids: selectedListings,
        operation,
        preview: true
      };

      if (operation === 'set_base') {
        requestBody.base_price = basePrice;
      } else if (operation === 'adjust_percentage') {
        requestBody.percentage = percentage;
        requestBody.apply_to = applyTo;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/bulk-pricing/preview`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const data = await response.json();
      if (data.success) {
        setPreview(data.preview || []);
        setPreviewStats(data.stats);
        setActiveTab('preview');
        toast.success('Preview gerado!');
      } else {
        toast.error(data.error || 'Erro ao gerar preview');
      }
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Erro ao gerar preview');
    } finally {
      setLoading(false);
    }
  };

  const applyChanges = async () => {
    if (!confirm(`Aplicar mudanças a ${selectedListings.length} listings?`)) return;

    setSaving(true);
    try {
      const requestBody: any = {
        listing_ids: selectedListings,
        operation,
        preview: false
      };

      if (operation === 'set_base') {
        requestBody.base_price = basePrice;
      } else if (operation === 'adjust_percentage') {
        requestBody.percentage = percentage;
        requestBody.apply_to = applyTo;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/organizations/${organizationId}/bulk-pricing/apply`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(data.message || 'Precificação aplicada com sucesso!');
        // Reset
        setSelectedListings([]);
        setPreview([]);
        setActiveTab('select');
        loadListings(); // Recarregar com preços atualizados
      } else {
        toast.error(data.error || 'Erro ao aplicar');
      }
    } catch (error) {
      console.error('Error applying changes:', error);
      toast.error('Erro ao aplicar mudanças');
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (template: Template) => {
    setOperation(template.operation as any);
    if (template.percentage !== undefined) {
      setPercentage(template.percentage);
    }
    toast.success(`Template "${template.name}" aplicado!`);
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const toggleListing = (listingId: string) => {
    setSelectedListings(prev =>
      prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );
  };

  const selectAll = () => {
    setSelectedListings(allListings.map(l => l.id));
  };

  const deselectAll = () => {
    setSelectedListings([]);
  };

  const getOperationIcon = () => {
    switch (operation) {
      case 'set_base':
        return DollarSign;
      case 'adjust_percentage':
        return percentage >= 0 ? TrendingUp : TrendingDown;
      case 'seasonal':
        return Calendar;
      case 'derived':
        return Sparkles;
      default:
        return DollarSign;
    }
  };

  const getTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'TrendingUp':
        return TrendingUp;
      case 'TrendingDown':
        return TrendingDown;
      case 'Calendar':
        return Calendar;
      case 'Star':
        return Star;
      case 'DollarSign':
        return DollarSign;
      default:
        return DollarSign;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl text-white flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-green-400" />
            Precificação em Lote
          </h2>
          <p className="text-neutral-400 mt-1">
            Atualize preços de múltiplos listings simultaneamente
          </p>
        </div>
        <Badge className="bg-blue-500/10 text-blue-400">
          {selectedListings.length} selecionado{selectedListings.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-[#2a2d3a]">
          <TabsTrigger value="select">
            <Filter className="h-4 w-4 mr-2" />
            1. Selecionar
          </TabsTrigger>
          <TabsTrigger value="configure" disabled={selectedListings.length === 0}>
            <DollarSign className="h-4 w-4 mr-2" />
            2. Configurar
          </TabsTrigger>
          <TabsTrigger value="preview" disabled={preview.length === 0}>
            <Eye className="h-4 w-4 mr-2" />
            3. Preview
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SELECIONAR LISTINGS */}
        <TabsContent value="select" className="space-y-6">
          {/* Filtros */}
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-400" />
                Filtros
              </CardTitle>
              <CardDescription>Filtre listings por critérios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-neutral-300">Localização</Label>
                  <Input
                    placeholder="Ex: Rio de Janeiro"
                    value={filters.location}
                    onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                    className="bg-[#1e2029] border-[#363945] text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-neutral-300">Tipo de Imóvel</Label>
                  <Select
                    value={filters.property_type}
                    onValueChange={(value) => setFilters({ ...filters, property_type: value })}
                  >
                    <SelectTrigger className="bg-[#1e2029] border-[#363945] text-white">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#2a2d3a] border-[#363945]">
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="apartment">Apartamento</SelectItem>
                      <SelectItem value="house">Casa</SelectItem>
                      <SelectItem value="condo">Condomínio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={loadListings} className="w-full">
                    <Filter className="h-4 w-4 mr-2" />
                    Aplicar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Listings */}
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Listings Disponíveis</CardTitle>
                  <CardDescription>{allListings.length} encontrado{allListings.length !== 1 ? 's' : ''}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Selecionar Todos
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Limpar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-4 animate-spin" />
                  <p className="text-neutral-400">Carregando listings...</p>
                </div>
              ) : allListings.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                  <p className="text-neutral-400">Nenhum listing encontrado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {allListings.map((listing) => (
                    <div
                      key={listing.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedListings.includes(listing.id)
                          ? 'bg-blue-500/10 border-blue-500/50'
                          : 'bg-[#1e2029] border-[#363945] hover:border-[#4a5568]'
                      }`}
                      onClick={() => toggleListing(listing.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <Checkbox
                            checked={selectedListings.includes(listing.id)}
                            onCheckedChange={() => toggleListing(listing.id)}
                          />
                          <div className="flex-1">
                            <h4 className="text-white">{listing.name}</h4>
                            <div className="flex items-center gap-4 mt-1 text-sm text-neutral-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {listing.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <Home className="h-3 w-3" />
                                {listing.property_type}
                              </span>
                            </div>
                            {listing.tags && listing.tags.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {listing.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white">R$ {listing.current_price.toFixed(2)}</p>
                          <p className="text-xs text-neutral-500">Preço atual</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => setActiveTab('configure')}
              disabled={selectedListings.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Próximo: Configurar
              <TrendingUp className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </TabsContent>

        {/* TAB 2: CONFIGURAR OPERAÇÃO */}
        <TabsContent value="configure" className="space-y-6">
          {/* Templates Rápidos */}
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-400" />
                Templates Rápidos
              </CardTitle>
              <CardDescription>Clique para aplicar configuração pré-definida</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {templates.map((template) => {
                  const Icon = getTemplateIcon(template.icon);
                  return (
                    <Button
                      key={template.id}
                      variant="outline"
                      className="h-auto p-4 justify-start text-left"
                      onClick={() => applyTemplate(template)}
                    >
                      <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-xs text-neutral-400 mt-1">{template.description}</p>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Configuração Manual */}
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white">Configuração Manual</CardTitle>
              <CardDescription>Configure a operação de precificação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tipo de Operação */}
              <div className="space-y-2">
                <Label className="text-neutral-300">Tipo de Operação</Label>
                <Select
                  value={operation}
                  onValueChange={(v: any) => setOperation(v)}
                >
                  <SelectTrigger className="bg-[#1e2029] border-[#363945] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2d3a] border-[#363945]">
                    <SelectItem value="adjust_percentage">Ajuste Percentual (+/-)</SelectItem>
                    <SelectItem value="set_base">Definir Preço Base</SelectItem>
                    <SelectItem value="seasonal">Regras Sazonais</SelectItem>
                    <SelectItem value="derived">Preços Derivados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-[#363945]" />

              {/* Configuração por tipo */}
              {operation === 'adjust_percentage' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-neutral-300">Percentual de Ajuste (%)</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPercentage(Math.max(-100, percentage - 5))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={percentage || ''}
                        onChange={(e) => setPercentage(parseFloat(e.target.value) || 0)}
                        className="bg-[#1e2029] border-[#363945] text-white text-center"
                        placeholder="0"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPercentage(Math.min(200, percentage + 5))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Percent className="h-5 w-5 text-neutral-500" />
                    </div>
                    <p className="text-xs text-neutral-500">
                      {percentage >= 0 ? 'Aumento' : 'Redução'} de {Math.abs(percentage)}%
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-sm text-blue-300">
                      💡 <strong>Exemplo:</strong> Um listing com preço de R$ 100 ficará com{' '}
                      R$ {(100 + (100 * percentage / 100)).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {operation === 'set_base' && (
                <div className="space-y-2">
                  <Label className="text-neutral-300">Preço Base (R$)</Label>
                  <Input
                    type="number"
                    value={basePrice || ''}
                    onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                    className="bg-[#1e2029] border-[#363945] text-white"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-neutral-500">
                    Todos os listings selecionados terão este preço base
                  </p>
                </div>
              )}

              {operation === 'seasonal' && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-sm text-yellow-300">
                    ⚠️ Configuração de regras sazonais disponível em breve
                  </p>
                </div>
              )}

              {operation === 'derived' && (
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="text-sm text-purple-300">
                    ⚠️ Configuração de preços derivados disponível em breve
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setActiveTab('select')}>
              Voltar
            </Button>
            <Button onClick={generatePreview} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Gerar Preview
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* TAB 3: PREVIEW */}
        <TabsContent value="preview" className="space-y-6">
          {/* Estatísticas */}
          {previewStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-[#2a2d3a] border-[#363945]">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-neutral-400 text-sm">Listings Afetados</p>
                    <p className="text-2xl text-white mt-2">{previewStats.affected_listings}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#2a2d3a] border-[#363945]">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-neutral-400 text-sm">Mudança Média</p>
                    <p className={`text-2xl mt-2 ${previewStats.avg_price_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {previewStats.avg_price_change >= 0 ? '+' : ''}
                      R$ {previewStats.avg_price_change?.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#2a2d3a] border-[#363945]">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-neutral-400 text-sm">Receita Estimada/Mês</p>
                    <p className={`text-2xl mt-2 ${previewStats.total_revenue_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {previewStats.total_revenue_change >= 0 ? '+' : ''}
                      R$ {previewStats.total_revenue_change?.toFixed(0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#2a2d3a] border-[#363945]">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-neutral-400 text-sm">Faixa de Preço</p>
                    <p className="text-sm text-white mt-2">
                      R$ {previewStats.min_new_price} - R$ {previewStats.max_new_price}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabela de Preview */}
          <Card className="bg-[#2a2d3a] border-[#363945]">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Eye className="h-5 w-5 text-blue-400" />
                Preview das Mudanças
              </CardTitle>
              <CardDescription>
                Revise as mudanças antes de aplicar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-[#363945] overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#1e2029] hover:bg-[#1e2029]">
                      <TableHead className="text-neutral-300">Listing</TableHead>
                      <TableHead className="text-neutral-300 text-right">Preço Atual</TableHead>
                      <TableHead className="text-neutral-300 text-right">Novo Preço</TableHead>
                      <TableHead className="text-neutral-300 text-right">Mudança</TableHead>
                      <TableHead className="text-neutral-300 text-right">Impacto Mês</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.map((item) => {
                      const change = item.new_base_price - item.current_base_price;
                      const changePercentage = (change / item.current_base_price) * 100;
                      
                      return (
                        <TableRow key={item.listing_id} className="border-[#363945]">
                          <TableCell className="text-white">{item.listing_name}</TableCell>
                          <TableCell className="text-right text-neutral-300">
                            R$ {item.current_base_price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-white">
                            R$ {item.new_base_price.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {change >= 0 ? '+' : ''}R$ {change.toFixed(2)}
                            <br />
                            <span className="text-xs">
                              ({change >= 0 ? '+' : ''}{changePercentage.toFixed(1)}%)
                            </span>
                          </TableCell>
                          <TableCell className={`text-right ${(item.estimated_revenue_change || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {(item.estimated_revenue_change || 0) >= 0 ? '+' : ''}
                            R$ {item.estimated_revenue_change?.toFixed(0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setActiveTab('configure')}>
              Voltar
            </Button>
            <Button onClick={applyChanges} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Aplicar Mudanças
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
