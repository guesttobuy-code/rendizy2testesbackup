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

  const contactInitials = deal.contactName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const ownerInitials = deal.ownerName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
    <div className="p-6 space-y-6">
      {/* Activity Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="meeting">Meeting</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-4 mt-4">
          {/* Activity Input */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Describe the next activity..."
                  value={activityDescription}
                  onChange={(e) => setActivityDescription(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="icon">
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button
                className="mt-2 w-full"
                onClick={handleSaveActivity}
                disabled={isSaving || !activityDescription.trim()}
              >
                {isSaving ? 'Salvando...' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Textarea
                placeholder="Add notes about this deal..."
                value={deal.notes || ''}
                onChange={(e) => {
                  const updated = { ...deal, notes: e.target.value };
                  onUpdate(updated);
                }}
                onBlur={handleSaveNotes}
                className="min-h-[200px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meeting" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-500">Meeting functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Deal Value</p>
              <p className="font-semibold">{formatCurrency(deal.value, deal.currency)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-500">Products</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {deal.products && deal.products.length > 0
                  ? `${deal.products.length} products`
                  : 'No products added'}
              </p>
              <Button variant="link" size="sm" className="p-0 h-auto mt-1">
                + Add products
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Expected close date</p>
              <p className="font-semibold">
                {deal.expectedCloseDate
                  ? new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR')
                  : 'Not set'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Person */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Person</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                {contactInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold">{deal.contactName}</p>
              <p className="text-sm text-gray-500">Owner: {deal.ownerName}</p>
            </div>
          </div>

          <div className="space-y-2 pl-13">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">
                {deal.contactName.toLowerCase().replace(' ', '')}@company.com
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">No phone</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planned Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Planned</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <input type="radio" className="w-4 h-4" />
              <div className="flex-1">
                <p className="font-medium text-sm">Discovery Call</p>
                <p className="text-xs text-gray-500">Tomorrow • meeting</p>
              </div>
            </div>
            <Button variant="link" size="sm" className="w-full">
              + Schedule an activity
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Activity History Log</CardTitle>
          <Button variant="ghost" size="sm">
            Filter
          </Button>
        </CardHeader>
        <CardContent>
          <DealActivityTimeline dealId={deal.id} />
        </CardContent>
      </Card>
    </div>
  );
}

