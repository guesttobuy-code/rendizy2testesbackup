/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    CREATE DEAL FROM CHAT MODAL                             ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Modal para criar Deal a partir de uma conversa no Chat
 * Permite selecionar: Funil → Etapa → Criar Deal
 * 
 * @version 1.0.0
 * @date 2026-01-25
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Briefcase, 
  ChevronRight, 
  ArrowLeft,
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '../ui/utils';
import { toast } from 'sonner';
import { Deal, DealStage, DealSource, Funnel, FunnelStage } from '../../types/crm';

// ============================================
// TYPES
// ============================================

export interface CreateDealFromChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  /** Dados do contato vindo do chat */
  contact: {
    id?: string;
    name: string;
    phone?: string;
    whatsAppJid?: string;
    channel?: string;
  };
  
  /** Callback quando deal é criado */
  onDealCreated: (deal: Deal) => void;
  
  /** Callback para voltar ao menu de ações */
  onBack?: () => void;
}

type Step = 'funnel' | 'stage' | 'details';

// ============================================
// MOCK DATA (substituir por API)
// ============================================

const MOCK_FUNNELS: Funnel[] = [
  {
    id: 'funnel-1',
    name: 'Vendas Diretas',
    description: 'Funil para vendas diretas via WhatsApp',
    isDefault: true,
    stages: [
      { id: 'stage-1', funnelId: 'funnel-1', name: 'Qualificado', order: 1, color: 'bg-blue-500', probability: 20 },
      { id: 'stage-2', funnelId: 'funnel-1', name: 'Contato Feito', order: 2, color: 'bg-green-500', probability: 40 },
      { id: 'stage-3', funnelId: 'funnel-1', name: 'Reunião Agendada', order: 3, color: 'bg-yellow-500', probability: 60 },
      { id: 'stage-4', funnelId: 'funnel-1', name: 'Proposta Enviada', order: 4, color: 'bg-orange-500', probability: 80 },
      { id: 'stage-5', funnelId: 'funnel-1', name: 'Negociação', order: 5, color: 'bg-purple-500', probability: 90 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'funnel-2',
    name: 'Airbnb/Booking',
    description: 'Leads de plataformas OTA',
    stages: [
      { id: 'stage-6', funnelId: 'funnel-2', name: 'Novo Lead', order: 1, color: 'bg-pink-500', probability: 10 },
      { id: 'stage-7', funnelId: 'funnel-2', name: 'Em Análise', order: 2, color: 'bg-indigo-500', probability: 30 },
      { id: 'stage-8', funnelId: 'funnel-2', name: 'Cotação Enviada', order: 3, color: 'bg-teal-500', probability: 50 },
      { id: 'stage-9', funnelId: 'funnel-2', name: 'Aguardando Resposta', order: 4, color: 'bg-amber-500', probability: 70 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'funnel-3',
    name: 'Temporada',
    description: 'Reservas de temporada (longo prazo)',
    stages: [
      { id: 'stage-10', funnelId: 'funnel-3', name: 'Interesse', order: 1, color: 'bg-cyan-500', probability: 15 },
      { id: 'stage-11', funnelId: 'funnel-3', name: 'Visita Agendada', order: 2, color: 'bg-lime-500', probability: 35 },
      { id: 'stage-12', funnelId: 'funnel-3', name: 'Proposta', order: 3, color: 'bg-rose-500', probability: 55 },
      { id: 'stage-13', funnelId: 'funnel-3', name: 'Contrato', order: 4, color: 'bg-emerald-500', probability: 85 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Map channel to DealSource
function channelToSource(channel?: string): DealSource {
  const map: Record<string, DealSource> = {
    'whatsapp': 'WHATSAPP',
    'evolution': 'WHATSAPP',
    'waha': 'WHATSAPP',
    'airbnb': 'AIRBNB',
    'email': 'EMAIL',
    'phone': 'PHONE',
    'website': 'WEBSITE',
  };
  return map[channel?.toLowerCase() || ''] || 'OTHER';
}

// Map stage name to DealStage (para compatibilidade)
function stageNameToDealStage(stageName: string): DealStage {
  const map: Record<string, DealStage> = {
    'Qualificado': 'QUALIFIED',
    'Contato Feito': 'CONTACT_MADE',
    'Reunião Agendada': 'MEETING_ARRANGED',
    'Proposta Enviada': 'PROPOSAL_MADE',
    'Negociação': 'NEGOTIATIONS',
    // Fallbacks para outros nomes
    'Novo Lead': 'QUALIFIED',
    'Em Análise': 'QUALIFIED',
    'Cotação Enviada': 'PROPOSAL_MADE',
    'Aguardando Resposta': 'NEGOTIATIONS',
    'Interesse': 'QUALIFIED',
    'Visita Agendada': 'MEETING_ARRANGED',
    'Proposta': 'PROPOSAL_MADE',
    'Contrato': 'NEGOTIATIONS',
  };
  return map[stageName] || 'QUALIFIED';
}

// ============================================
// COMPONENT
// ============================================

export function CreateDealFromChatModal({
  open,
  onOpenChange,
  contact,
  onDealCreated,
  onBack,
}: CreateDealFromChatModalProps) {
  const [step, setStep] = useState<Step>('funnel');
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [selectedStage, setSelectedStage] = useState<FunnelStage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState('');

  // Não renderiza se contact é undefined (quando modal não está aberto ainda)
  const safeContact = contact || { name: '', phone: '', whatsAppJid: '', channel: '', id: '' };

  // Reset ao abrir
  useEffect(() => {
    if (open && contact) {
      setStep('funnel');
      setSelectedFunnel(null);
      setSelectedStage(null);
      setDealTitle(`Negociação - ${contact.name || 'Novo Lead'}`);
      setDealValue('');
    }
  }, [open, contact]);

  const handleFunnelSelect = (funnel: Funnel) => {
    setSelectedFunnel(funnel);
    setStep('stage');
  };

  const handleStageSelect = (stage: FunnelStage) => {
    setSelectedStage(stage);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'stage') {
      setStep('funnel');
      setSelectedStage(null);
    } else if (step === 'details') {
      setStep('stage');
    } else if (onBack) {
      onBack();
    }
  };

  const handleCreateDeal = async () => {
    if (!selectedFunnel || !selectedStage) return;

    setIsLoading(true);
    
    try {
      // Simular criação via API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newDeal: Deal = {
        id: `deal-${Date.now()}`,
        title: dealTitle,
        value: parseFloat(dealValue) || 0,
        currency: 'BRL',
        stage: stageNameToDealStage(selectedStage.name),
        source: channelToSource(safeContact.channel),
        probability: selectedStage.probability || 50,
        contactId: safeContact.id,
        contactName: safeContact.name,
        contactPhone: safeContact.phone,
        contactWhatsAppJid: safeContact.whatsAppJid,
        ownerName: 'Rafael Milfont', // TODO: Pegar do contexto de auth
        funnelId: selectedFunnel.id,
        funnelName: selectedFunnel.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      toast.success('Deal criado com sucesso!', {
        description: `${newDeal.title} no funil ${selectedFunnel.name}`,
      });

      onDealCreated(newDeal);
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao criar deal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {(step !== 'funnel' || onBack) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                Criar Deal
              </DialogTitle>
              <DialogDescription>
                {step === 'funnel' && 'Selecione o funil de vendas'}
                {step === 'stage' && `Funil: ${selectedFunnel?.name}`}
                {step === 'details' && `${selectedFunnel?.name} → ${selectedStage?.name}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          {/* STEP 1: Selecionar Funil */}
          {step === 'funnel' && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Contato: <strong>{safeContact.name || 'Não informado'}</strong>
                {safeContact.phone && <span className="ml-2 text-xs">({safeContact.phone})</span>}
              </p>
              
              {MOCK_FUNNELS.map((funnel) => (
                <Button
                  key={funnel.id}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start h-auto py-3 px-4',
                    'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700',
                    funnel.isDefault && 'ring-2 ring-blue-500'
                  )}
                  onClick={() => handleFunnelSelect(funnel)}
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{funnel.name}</p>
                      {funnel.isDefault && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 px-2 py-0.5 rounded">
                          Padrão
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {funnel.description} • {funnel.stages.length} etapas
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Button>
              ))}
            </div>
          )}

          {/* STEP 2: Selecionar Etapa */}
          {step === 'stage' && selectedFunnel && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Selecione a etapa inicial do deal:
              </p>
              
              {selectedFunnel.stages.map((stage) => (
                <Button
                  key={stage.id}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start h-auto py-3 px-4',
                    'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  onClick={() => handleStageSelect(stage)}
                >
                  <div className={cn('w-3 h-3 rounded-full mr-3', stage.color)} />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{stage.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {stage.probability}% probabilidade
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Button>
              ))}
            </div>
          )}

          {/* STEP 3: Detalhes do Deal */}
          {step === 'details' && selectedFunnel && selectedStage && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className={cn('w-3 h-3 rounded-full', selectedStage.color)} />
                <span className="text-sm">
                  {selectedFunnel.name} → {selectedStage.name}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="dealTitle">Título do Deal</Label>
                  <Input
                    id="dealTitle"
                    value={dealTitle}
                    onChange={(e) => setDealTitle(e.target.value)}
                    placeholder="Ex: Reserva Temporada - João"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="dealValue">Valor (R$)</Label>
                  <Input
                    id="dealValue"
                    type="number"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {step === 'details' && (
          <DialogFooter>
            <Button
              onClick={handleCreateDeal}
              disabled={isLoading || !dealTitle}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Criar Deal
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default CreateDealFromChatModal;
