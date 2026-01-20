/**
 * RENDIZY - iCal Manager Component
 * 
 * Interface completa para gerenciamento de sincronização iCal
 * - Export de calendário (para Airbnb, Booking.com)
 * - Import de calendários externos
 * - Sincronização automática
 * - Logs e status
 * 
 * @version 1.0.83
 * @date 2025-10-29
 */

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Copy,
  Edit2,
  Eye,
  Globe,
  Loader2
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

interface ICalFeed {
  id: string;
  listing_id: string;
  organization_id: string;
  name: string;
  url: string;
  platform: 'airbnb' | 'booking' | 'vrbo' | 'custom';
  status: 'active' | 'inactive' | 'error';
  last_sync_at?: string;
  last_sync_status?: 'success' | 'error';
  last_sync_message?: string;
  sync_frequency_minutes: number;
  created_at: string;
  updated_at: string;
}

interface ICalEvent {
  id: string;
  feed_id: string;
  listing_id: string;
  organization_id: string;
  external_id: string;
  summary: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ICalManager({ listingId, listingName }: { listingId: string; listingName: string }) {
  const [feeds, setFeeds] = useState<ICalFeed[]>([]);
  const [events, setEvents] = useState<ICalEvent[]>([]);
  const [selectedFeed, setSelectedFeed] = useState<ICalFeed | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEventsModalOpen, setIsEventsModalOpen] = useState(false);
  const [exportUrl, setExportUrl] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    platform: 'custom' as 'airbnb' | 'booking' | 'vrbo' | 'custom',
    sync_frequency_minutes: 1440 // 24h
  });

  useEffect(() => {
    loadFeeds();
    generateExportUrl();
  }, [listingId]);

  // ============================================================================
  // API CALLS
  // ============================================================================

  const loadFeeds = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/ical-feeds`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setFeeds(data.data || []);
      } else {
        toast.error('Erro ao carregar feeds iCal');
      }
    } catch (error) {
      console.error('Error loading feeds:', error);
      toast.error('Erro ao carregar feeds');
    } finally {
      setLoading(false);
    }
  };

  const createFeed = async () => {
    if (!formData.name || !formData.url) {
      toast.error('Preencha nome e URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/ical-feeds`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Feed criado com sucesso!');
        setIsCreateModalOpen(false);
        setFormData({
          name: '',
          url: '',
          platform: 'custom',
          sync_frequency_minutes: 1440
        });
        loadFeeds();
      } else {
        toast.error(data.error || 'Erro ao criar feed');
      }
    } catch (error) {
      console.error('Error creating feed:', error);
      toast.error('Erro ao criar feed');
    } finally {
      setLoading(false);
    }
  };

  const syncFeed = async (feedId: string) => {
    setSyncing(feedId);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/ical-feeds/${feedId}/sync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.data.message || 'Sincronizado com sucesso!');
        loadFeeds();
      } else {
        toast.error(data.error || 'Erro ao sincronizar');
      }
    } catch (error) {
      console.error('Error syncing feed:', error);
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(null);
    }
  };

  const deleteFeed = async (feedId: string) => {
    if (!confirm('Deseja realmente remover este feed?')) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/ical-feeds/${feedId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Feed removido com sucesso!');
        loadFeeds();
      } else {
        toast.error(data.error || 'Erro ao remover feed');
      }
    } catch (error) {
      console.error('Error deleting feed:', error);
      toast.error('Erro ao remover feed');
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (feedId: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/ical-feeds/${feedId}/events`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setEvents(data.data || []);
        setIsEventsModalOpen(true);
      } else {
        toast.error('Erro ao carregar eventos');
      }
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const generateExportUrl = () => {
    const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/listings/${listingId}/ical/export`;
    setExportUrl(url);
  };

  const copyExportUrl = async () => {
    try {
      await navigator.clipboard.writeText(exportUrl);
      toast.success('URL copiada para área de transferência!');
    } catch (err) {
      // Fallback para seleção manual
      const textArea = document.createElement('textarea');
      textArea.value = exportUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('URL copiada para área de transferência!');
      } catch (e) {
        toast.error('Não foi possível copiar. Selecione e copie manualmente.');
      }
      document.body.removeChild(textArea);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'airbnb':
        return '🏠';
      case 'booking':
        return '🔵';
      case 'vrbo':
        return '🏡';
      default:
        return '🌐';
    }
  };

  const getPlatformName = (platform: string) => {
    switch (platform) {
      case 'airbnb':
        return 'Airbnb';
      case 'booking':
        return 'Booking.com';
      case 'vrbo':
        return 'VRBO';
      default:
        return 'Customizado';
    }
  };

  const formatLastSync = (feed: ICalFeed) => {
    if (!feed.last_sync_at) return 'Nunca sincronizado';
    
    const date = new Date(feed.last_sync_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 1000 / 60);
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  const getSyncFrequencyLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutos`;
    const hours = minutes / 60;
    if (hours < 24) return `${hours}h`;
    const days = hours / 24;
    return `${days}d`;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Export Section */}
      <Card className="bg-[#2a2d3a] border-[#363945]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Download className="h-5 w-5 text-green-400" />
                Exportar Calendário
              </CardTitle>
              <CardDescription>
                URL para importar em Airbnb, Booking.com e outras plataformas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-[#1e2029] border border-[#363945]">
            <Label className="text-neutral-400 text-sm mb-2 block">URL do Calendário iCal</Label>
            <div className="flex gap-2">
              <Input
                value={exportUrl}
                readOnly
                className="bg-[#2a2d3a] border-[#363945] text-neutral-300 font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyExportUrl}
                className="shrink-0"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
          </div>

          <div className="text-sm text-neutral-400">
            <p className="mb-2">📌 <strong>Como usar:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Copie a URL acima</li>
              <li>Acesse as configurações de calendário no Airbnb/Booking.com</li>
              <li>Cole a URL no campo "Importar calendário"</li>
              <li>As reservas do RENDIZY aparecerão bloqueadas automaticamente</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="bg-[#2a2d3a] border-[#363945]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-400" />
                Importar Calendários
              </CardTitle>
              <CardDescription>
                Sincronize reservas do Airbnb, Booking.com e outras plataformas
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Feed
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && feeds.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-4 animate-spin" />
              <p className="text-neutral-400">Carregando feeds...</p>
            </div>
          ) : feeds.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
              <p className="text-neutral-400 mb-2">Nenhum feed configurado</p>
              <p className="text-sm text-neutral-500">
                Adicione um feed iCal para sincronizar calendários externos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {feeds.map((feed) => (
                <div
                  key={feed.id}
                  className="p-4 rounded-lg bg-[#1e2029] border border-[#363945] hover:border-[#4a4d5a] transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl mt-1">{getPlatformIcon(feed.platform)}</div>
                      <div className="flex-1">
                        <h4 className="text-white mb-1">{feed.name}</h4>
                        <p className="text-sm text-neutral-500 font-mono truncate">
                          {feed.url}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge
                            className={
                              feed.status === 'active'
                                ? 'bg-green-500/10 text-green-400'
                                : feed.status === 'error'
                                ? 'bg-red-500/10 text-red-400'
                                : 'bg-gray-500/10 text-gray-400'
                            }
                          >
                            {feed.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {feed.status === 'error' && <XCircle className="h-3 w-3 mr-1" />}
                            {feed.status === 'active' ? 'Ativo' : feed.status === 'error' ? 'Erro' : 'Inativo'}
                          </Badge>
                          <span className="text-xs text-neutral-500">
                            Sync: {getSyncFrequencyLabel(feed.sync_frequency_minutes)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadEvents(feed.id)}
                        title="Ver eventos"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => syncFeed(feed.id)}
                        disabled={syncing === feed.id}
                        title="Sincronizar agora"
                      >
                        {syncing === feed.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFeed(feed.id)}
                        title="Remover"
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Last Sync Info */}
                  {feed.last_sync_at && (
                    <div className="flex items-center gap-2 text-xs text-neutral-500 pt-3 border-t border-[#363945]">
                      <Clock className="h-3 w-3" />
                      <span>Última sincronização: {formatLastSync(feed)}</span>
                      {feed.last_sync_status === 'success' && (
                        <Badge className="bg-green-500/10 text-green-400 ml-auto">
                          {feed.last_sync_message}
                        </Badge>
                      )}
                      {feed.last_sync_status === 'error' && (
                        <Badge className="bg-red-500/10 text-red-400 ml-auto">
                          {feed.last_sync_message}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Feed Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-[#1e2029] border-[#2a2d3a] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Adicionar Feed iCal</DialogTitle>
            <DialogDescription>
              Configure um calendário externo para importar reservas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-neutral-400">Nome do Feed</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Airbnb - Casa 003"
                className="bg-[#2a2d3a] border-[#363945] text-white mt-1"
              />
            </div>

            <div>
              <Label className="text-neutral-400">Plataforma</Label>
              <Select
                value={formData.platform}
                onValueChange={(value: any) => setFormData({ ...formData, platform: value })}
              >
                <SelectTrigger className="bg-[#2a2d3a] border-[#363945] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2d3a] border-[#363945]">
                  <SelectItem value="airbnb">🏠 Airbnb</SelectItem>
                  <SelectItem value="booking">🔵 Booking.com</SelectItem>
                  <SelectItem value="vrbo">🏡 VRBO</SelectItem>
                  <SelectItem value="custom">🌐 Customizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-neutral-400">URL do Calendário iCal</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://... ou webcal://..."
                className="bg-[#2a2d3a] border-[#363945] text-white mt-1 font-mono text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Copie a URL do calendário iCal da plataforma de origem
              </p>
            </div>

            <div>
              <Label className="text-neutral-400">Frequência de Sincronização</Label>
              <Select
                value={formData.sync_frequency_minutes.toString()}
                onValueChange={(value) => setFormData({ ...formData, sync_frequency_minutes: parseInt(value) })}
              >
                <SelectTrigger className="bg-[#2a2d3a] border-[#363945] text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2d3a] border-[#363945]">
                  <SelectItem value="60">A cada 1 hora</SelectItem>
                  <SelectItem value="180">A cada 3 horas</SelectItem>
                  <SelectItem value="360">A cada 6 horas</SelectItem>
                  <SelectItem value="720">A cada 12 horas</SelectItem>
                  <SelectItem value="1440">A cada 24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={createFeed}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Events Modal */}
      <Dialog open={isEventsModalOpen} onOpenChange={setIsEventsModalOpen}>
        <DialogContent className="bg-[#1e2029] border-[#2a2d3a] text-white max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">Eventos Importados</DialogTitle>
            <DialogDescription>
              {events.length} eventos encontrados
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
                <p className="text-neutral-400">Nenhum evento importado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 rounded-lg bg-[#2a2d3a] border border-[#363945]"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white">{event.summary}</h4>
                      <Badge
                        className={
                          event.status === 'confirmed'
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-neutral-400">
                      <p>
                        {new Date(event.start_date).toLocaleDateString('pt-BR')} →{' '}
                        {new Date(event.end_date).toLocaleDateString('pt-BR')}
                      </p>
                      {event.description && (
                        <p className="text-xs text-neutral-500 mt-1">{event.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEventsModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
