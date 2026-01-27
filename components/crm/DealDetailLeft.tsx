import React, { useState } from 'react';
import { Deal, ActivityType } from '../../types/crm';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Paperclip,
  Sparkles,
  Calendar,
  Mail,
  Phone,
  User,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { DealActivityTimeline } from './DealActivityTimeline';
import { dealsApi } from '../../utils/api';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface DealDetailLeftProps {
  deal: Deal;
  onUpdate: (deal: Deal) => void;
}

export function DealDetailLeft({ deal, onUpdate }: DealDetailLeftProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'notes' | 'meeting'>('activity');
  const [activityDescription, setActivityDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  // ✅ Tratar valores nulos para evitar erro de split
  const contactInitials = deal.contactName
    ? deal.contactName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'N/A';

  const ownerInitials = deal.ownerName
    ? deal.ownerName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'N/A';

  const handleSaveActivity = async () => {
    if (!activityDescription.trim() || !user) return;

    setIsSaving(true);
    try {
      const response = await dealsApi.createActivity({
        dealId: deal.id,
        type: 'NOTE',
        title: 'Activity',
        description: activityDescription,
      });

      if (response.success) {
        toast.success('Atividade salva com sucesso');
        setActivityDescription('');
        // Recarregar atividades
        const refreshFn = (window as any)[`refreshActivities_${deal.id}`];
        if (refreshFn) refreshFn();
      } else {
        throw new Error(response.error || 'Erro ao salvar atividade');
      }
    } catch (error: any) {
      console.error('Erro ao salvar atividade:', error);
      toast.error(error.message || 'Erro ao salvar atividade');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!user) return;

    try {
      const updated = { ...deal, notes: deal.notes };
      onUpdate(updated);
      toast.success('Notas salvas com sucesso');
    } catch (error: any) {
      console.error('Erro ao salvar notas:', error);
      toast.error('Erro ao salvar notas');
    }
  };

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-4 lg:p-6">
      {/* Grid layout - 2 colunas em telas grandes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Coluna Esquerda - Activity e Details */}
        <div className="space-y-4 lg:space-y-6">
          {/* Activity Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="activity">Atividade</TabsTrigger>
              <TabsTrigger value="notes">Notas</TabsTrigger>
              <TabsTrigger value="meeting">Reunião</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-4 mt-4">
              {/* Activity Input */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Descreva a próxima atividade..."
                      value={activityDescription}
                      onChange={(e) => setActivityDescription(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-8 w-8">
                        <Sparkles className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="mt-2 w-full"
                    size="sm"
                    onClick={handleSaveActivity}
                    disabled={isSaving || !activityDescription.trim()}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  <Textarea
                    placeholder="Adicione notas sobre este deal..."
                    value={deal.notes || ''}
                    onChange={(e) => {
                      const updated = { ...deal, notes: e.target.value };
                      onUpdate(updated);
                    }}
                    onBlur={handleSaveNotes}
                    className="min-h-[120px]"
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meeting" className="mt-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-500">Funcionalidade de reuniões em breve...</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Valor do Deal</p>
              <p className="font-semibold text-sm">{formatCurrency(deal.value, deal.currency)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Package className="w-4 h-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-xs text-gray-500">Produtos</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {deal.products && deal.products.length > 0
                  ? `${deal.products.length} produtos`
                  : 'Nenhum produto adicionado'}
              </p>
              <Button variant="link" size="sm" className="p-0 h-auto text-xs">
                + Adicionar produtos
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Data prevista de fechamento</p>
              <p className="font-semibold text-sm">
                {deal.expectedCloseDate
                  ? new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR')
                  : 'Não definida'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

          {/* Activity History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Histórico de Atividades</CardTitle>
              <Button variant="ghost" size="sm">
                Filtrar
              </Button>
            </CardHeader>
            <CardContent>
              <DealActivityTimeline dealId={deal.id} />
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Person e Planned */}
        <div className="space-y-4 lg:space-y-6">
          {/* Person */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-sm">
                    {contactInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{deal.contactName || 'Sem contato'}</p>
                  <p className="text-xs text-gray-500 truncate">Responsável: {deal.ownerName || 'Não atribuído'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 truncate text-xs">
                    {deal.contactEmail || 'Sem email'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-400 text-xs">Sem telefone</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Planned Activities */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Planejado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <input type="radio" className="w-3 h-3" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs">Chamada de Descoberta</p>
                    <p className="text-xs text-gray-500">Amanhã • reunião</p>
                  </div>
                </div>
                <Button variant="link" size="sm" className="w-full text-xs">
                  + Agendar uma atividade
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

