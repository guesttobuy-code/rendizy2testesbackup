import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  Download,
  Info,
  Filter,
  RefreshCw,
  Clock,
  User,
  Home,
  DollarSign,
  CalendarRange,
  ArrowRight,
  Zap,
  Database,
  GitCompare,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface StaysReservation {
  [key: string]: any;
}

interface AnalyzerProps {
  apiKey: string;
  baseUrl: string;
}

// Mapeamento de campos: Stays.net → RENDIZY
const FIELD_MAPPING = {
  // Identificação
  'id': 'id',
  'code': 'confirmationCode',
  'reservation_code': 'confirmationCode',
  
  // Datas
  'checkin': 'checkIn',
  'check_in': 'checkIn',
  'arrival': 'checkIn',
  'checkout': 'checkOut',
  'check_out': 'checkOut',
  'departure': 'checkOut',
  'created_at': 'createdAt',
  'booking_date': 'createdAt',
  
  // Hóspede
  'guest_name': 'guestName',
  'customer_name': 'guestName',
  'guest_email': 'guestEmail',
  'guest_phone': 'guestPhone',
  'guest_document': 'guestDocument',
  
  // Propriedade
  'property_id': 'propertyId',
  'unit_id': 'propertyId',
  'property_name': 'propertyName',
  'unit_name': 'propertyName',
  
  // Valores
  'total': 'pricing.total',
  'total_amount': 'pricing.total',
  'price': 'pricing.total',
  'accommodation_total': 'pricing.accommodationTotal',
  'cleaning_fee': 'pricing.cleaningFee',
  'tax': 'pricing.tax',
  
  // Status
  'status': 'status',
  'reservation_status': 'status',
  
  // Outros
  'nights': 'nights',
  'adults': 'guests.adults',
  'children': 'guests.children',
  'source': 'source',
  'channel': 'platform',
  'platform': 'platform',
  'notes': 'notes',
  'special_requests': 'specialRequests',
};

export function StaysNetReservationAnalyzer({ apiKey, baseUrl }: AnalyzerProps) {
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<StaysReservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<StaysReservation | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [searchDate, setSearchDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Buscar reserva de uma data específica
  const fetchReservationByDate = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/test-staysnet-endpoint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            apiKey,
            baseUrl,
            endpoint: '/reservations',
            method: 'GET',
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.data?.success) {
        const data = result.data.data;
        setRawResponse(data);
        
        // Extrair array de reservas
        const reservationsArray = Array.isArray(data) 
          ? data 
          : data.reservations || data.items || data.results || data.data || [];
        
        console.log('📥 Total de reservas recebidas:', reservationsArray.length);
        
        if (reservationsArray.length > 0) {
          // Filtrar por data (ontem ou hoje)
          const today = format(new Date(), 'yyyy-MM-dd');
          const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
          
          const recentReservations = reservationsArray.filter((res: any) => {
            // Tentar vários campos de data
            const dateFields = [
              res.checkin, res.check_in, res.arrival,
              res.created_at, res.booking_date, res.date,
              res.checkin_date, res.arrival_date
            ];
            
            return dateFields.some(dateField => {
              if (!dateField) return false;
              const resDate = format(new Date(dateField), 'yyyy-MM-dd');
              return resDate === today || resDate === yesterday || resDate === searchDate;
            });
          });
          
          console.log('📅 Reservas de hoje/ontem:', recentReservations.length);
          
          setReservations(recentReservations);
          
          if (recentReservations.length > 0) {
            setSelectedReservation(recentReservations[0]);
            toast.success(`✅ ${recentReservations.length} reserva(s) encontrada(s)!`);
          } else {
            // Se não encontrou, mostrar todas
            setReservations(reservationsArray.slice(0, 10)); // Primeiras 10
            setSelectedReservation(reservationsArray[0]);
            toast.info(`Mostrando 10 primeiras reservas para análise`);
          }
        } else {
          toast.warning('Nenhuma reserva encontrada na API');
        }
      } else {
        throw new Error(result.data?.error || 'Erro ao buscar reservas');
      }
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar ontem automaticamente
  const fetchYesterday = () => {
    setSearchDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
    setTimeout(fetchReservationByDate, 100);
  };

  // Buscar hoje
  const fetchToday = () => {
    setSearchDate(format(new Date(), 'yyyy-MM-dd'));
    setTimeout(fetchReservationByDate, 100);
  };

  // Comparar campos
  const compareFields = () => {
    if (!selectedReservation) return [];
    
    const comparison = [];
    const staysFields = Object.keys(selectedReservation);
    
    for (const staysField of staysFields) {
      const rendizuField = FIELD_MAPPING[staysField] || '❓ Não mapeado';
      const value = selectedReservation[staysField];
      const valueType = typeof value;
      
      comparison.push({
        staysField,
        rendizuField,
        value,
        valueType,
        hasMapping: !!FIELD_MAPPING[staysField],
      });
    }
    
    return comparison.sort((a, b) => {
      // Campos mapeados primeiro
      if (a.hasMapping && !b.hasMapping) return -1;
      if (!a.hasMapping && b.hasMapping) return 1;
      return 0;
    });
  };

  // Exportar dados
  const exportData = () => {
    const dataToExport = {
      timestamp: new Date().toISOString(),
      searchDate,
      totalReservations: reservations.length,
      selectedReservation,
      fieldComparison: compareFields(),
      rawResponse,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stays-net-analysis-${searchDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('📥 Análise exportada!');
  };

  return (
    <div className="space-y-6">
      {/* Header com Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-6 h-6 text-purple-600" />
              <div>
                <CardTitle>Buscar Reservas Reais - Stays.net</CardTitle>
                <CardDescription>
                  Busque reservas de ontem ou hoje para análise de campos
                </CardDescription>
              </div>
            </div>
            {reservations.length > 0 && (
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {reservations.length} reserva(s)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Botões de Busca Rápida */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={fetchYesterday}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Ontem
            </Button>
            
            <Button
              onClick={fetchToday}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Hoje
            </Button>
            
            <Button
              onClick={fetchReservationByDate}
              disabled={loading}
              variant="secondary"
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Buscar
            </Button>
          </div>

          {/* Data Customizada */}
          <div>
            <Label>Data Específica</Label>
            <Input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Info */}
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Buscando reservas com check-in ou criação em <strong>{searchDate}</strong>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Lista de Reservas */}
      {reservations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reservas Encontradas</CardTitle>
            <CardDescription>
              Clique em uma reserva para ver detalhes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {reservations.map((res, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedReservation(res)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedReservation === res
                        ? 'bg-purple-50 border-purple-300 dark:bg-purple-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {res.guest_name || res.customer_name || res.name || 'Hóspede não informado'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {res.property_name || res.unit_name || `ID: ${res.property_id || res.unit_id}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          {res.checkin || res.check_in || res.arrival || '?'} →{' '}
                          {res.checkout || res.check_out || res.departure || '?'}
                        </div>
                        <Badge variant="outline">
                          {res.status || 'status?'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Análise Detalhada */}
      {selectedReservation && (
        <Tabs defaultValue="comparison" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comparison">
              <GitCompare className="w-4 h-4 mr-2" />
              Comparação de Campos
            </TabsTrigger>
            <TabsTrigger value="raw">
              <Database className="w-4 h-4 mr-2" />
              Dados Brutos
            </TabsTrigger>
            <TabsTrigger value="mapping">
              <ArrowRight className="w-4 h-4 mr-2" />
              Sugestão de Mapeamento
            </TabsTrigger>
          </TabsList>

          {/* Tab: Comparação */}
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Comparação: Stays.net ↔ RENDIZY</CardTitle>
                  <Button onClick={exportData} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar JSON
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {compareFields().map((field, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${
                          field.hasMapping
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/10'
                            : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Campo Stays.net */}
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500">
                              Campo Stays.net
                            </Label>
                            <div className="font-mono text-sm mt-1">
                              {field.staysField}
                            </div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {field.valueType}
                            </Badge>
                          </div>

                          {/* Arrow */}
                          <div className="flex items-center pt-6">
                            {field.hasMapping ? (
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-yellow-600" />
                            )}
                            <ArrowRight className="w-5 h-5 mx-2 text-gray-400" />
                          </div>

                          {/* Campo RENDIZY */}
                          <div className="flex-1">
                            <Label className="text-xs text-gray-500">
                              Campo RENDIZY
                            </Label>
                            <div className={`font-mono text-sm mt-1 ${
                              field.hasMapping ? 'text-green-700' : 'text-yellow-700'
                            }`}>
                              {field.rendizuField}
                            </div>
                          </div>
                        </div>

                        {/* Valor */}
                        <Separator className="my-3" />
                        <div>
                          <Label className="text-xs text-gray-500">Valor</Label>
                          <div className="mt-1 p-2 bg-white dark:bg-gray-800 rounded border font-mono text-xs overflow-x-auto">
                            {typeof field.value === 'object'
                              ? JSON.stringify(field.value, null, 2)
                              : String(field.value)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Dados Brutos */}
          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>Dados Brutos da Reserva</CardTitle>
                <CardDescription>JSON completo retornado pela API</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedReservation, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Mapeamento */}
          <TabsContent value="mapping">
            <Card>
              <CardHeader>
                <CardTitle>Sugestão de Código de Mapeamento</CardTitle>
                <CardDescription>
                  Use este código para mapear campos da API Stays.net para RENDIZY
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <pre className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs overflow-x-auto">
{`// Função de mapeamento Stays.net → RENDIZY
function mapStaysReservationToRendizy(staysData) {
  return {
    // Identificação
    id: staysData.id || staysData.reservation_id,
    confirmationCode: staysData.code || staysData.reservation_code,
    
    // Datas
    checkIn: staysData.checkin || staysData.check_in || staysData.arrival,
    checkOut: staysData.checkout || staysData.check_out || staysData.departure,
    createdAt: staysData.created_at || staysData.booking_date,
    
    // Hóspede
    guestName: staysData.guest_name || staysData.customer_name,
    guestEmail: staysData.guest_email || staysData.email,
    guestPhone: staysData.guest_phone || staysData.phone,
    guestDocument: staysData.guest_document || staysData.document,
    
    // Propriedade
    propertyId: staysData.property_id || staysData.unit_id,
    propertyName: staysData.property_name || staysData.unit_name,
    
    // Valores
    pricing: {
      total: staysData.total || staysData.total_amount || staysData.price,
      accommodationTotal: staysData.accommodation_total,
      cleaningFee: staysData.cleaning_fee,
      tax: staysData.tax || staysData.taxes,
    },
    
    // Detalhes
    nights: staysData.nights || calculateNights(staysData.checkin, staysData.checkout),
    guests: {
      adults: staysData.adults || staysData.guests,
      children: staysData.children || 0,
    },
    
    // Status e Origem
    status: mapStaysStatus(staysData.status),
    platform: 'stays',
    source: staysData.source || staysData.channel || 'stays',
    
    // Extras
    notes: staysData.notes,
    specialRequests: staysData.special_requests,
  };
}

// Mapear status
function mapStaysStatus(staysStatus) {
  const statusMap = {
    'confirmed': 'confirmed',
    'pending': 'pending',
    'cancelled': 'cancelled',
    'checked_in': 'checked_in',
    'checked_out': 'checked_out',
  };
  return statusMap[staysStatus?.toLowerCase()] || 'pending';
}

// Calcular noites
function calculateNights(checkin, checkout) {
  const start = new Date(checkin);
  const end = new Date(checkout);
  const diff = Math.abs(end - start);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Exemplo de uso:
const staysReservation = ${JSON.stringify(selectedReservation, null, 2)};

const rendizuReservation = mapStaysReservationToRendizy(staysReservation);
console.log('Reserva mapeada:', rendizuReservation);`}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Estatísticas */}
      {selectedReservation && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {compareFields().filter(f => f.hasMapping).length}
                  </div>
                  <div className="text-sm text-gray-500">Campos Mapeados</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {compareFields().filter(f => !f.hasMapping).length}
                  </div>
                  <div className="text-sm text-gray-500">Não Mapeados</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {Object.keys(selectedReservation).length}
                  </div>
                  <div className="text-sm text-gray-500">Total de Campos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
