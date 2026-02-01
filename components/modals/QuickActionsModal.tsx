/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                       QUICK ACTIONS MODAL                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Modal genérico de Ações Rápidas - Pode ser usado no Chat ou CRM
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * 
 * AÇÕES DISPONÍVEIS:
 * - Criar Deal (com seleção de funil e etapa)
 * - Criar Reserva
 * - Fazer Cotação
 * - Bloqueio para visita (Corretor)
 * - Bloqueio para visita (Cliente)
 * - Bloqueio genérico
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { 
  Briefcase, 
  Calendar, 
  Calculator, 
  UserCheck, 
  Users, 
  Lock,
  ChevronRight,
  LogIn,
} from 'lucide-react';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export type QuickActionType = 
  | 'CREATE_DEAL'
  | 'CREATE_RESERVATION'
  | 'CREATE_QUOTATION'
  | 'BLOCK_BROKER_VISIT'
  | 'BLOCK_CLIENT_VISIT'
  | 'BLOCK_GENERIC'
  | 'MANAGE_CHECKIN';

export interface QuickActionConfig {
  type: QuickActionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export interface QuickActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  /** Dados do contato (do chat) */
  contact?: {
    id?: string;
    name: string;
    phone?: string;
    whatsAppJid?: string;
  };
  
  /** Callback quando uma ação é selecionada */
  onActionSelect: (action: QuickActionType, contact?: QuickActionsModalProps['contact']) => void;
  
  /** Ações habilitadas (default: todas) */
  enabledActions?: QuickActionType[];
}

// ============================================
// CONFIG
// ============================================

const ACTIONS_CONFIG: QuickActionConfig[] = [
  {
    type: 'CREATE_DEAL',
    label: 'Criar Deal',
    description: 'Criar negociação no CRM',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30',
  },
  {
    type: 'CREATE_RESERVATION',
    label: 'Criar Reserva',
    description: 'Nova reserva para este contato',
    icon: <Calendar className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30',
  },
  {
    type: 'CREATE_QUOTATION',
    label: 'Fazer Cotação',
    description: 'Calcular valores de hospedagem',
    icon: <Calculator className="w-5 h-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30',
  },
  {
    type: 'BLOCK_BROKER_VISIT',
    label: 'Bloqueio - Visita Corretor',
    description: 'Bloquear para visita de corretor',
    icon: <UserCheck className="w-5 h-5" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30',
  },
  {
    type: 'BLOCK_CLIENT_VISIT',
    label: 'Bloqueio - Visita Cliente',
    description: 'Bloquear para visita de cliente',
    icon: <Users className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30',
  },
  {
    type: 'BLOCK_GENERIC',
    label: 'Bloqueio Genérico',
    description: 'Bloqueio sem motivo específico',
    icon: <Lock className="w-5 h-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-900/30',
  },
  {
    type: 'MANAGE_CHECKIN',
    label: 'Gestão de Check-in',
    description: 'Ver instruções e gerenciar status do check-in',
    icon: <LogIn className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
  },
];

// ============================================
// COMPONENT
// ============================================

export function QuickActionsModal({
  open,
  onOpenChange,
  contact,
  onActionSelect,
  enabledActions,
}: QuickActionsModalProps) {
  const filteredActions = enabledActions 
    ? ACTIONS_CONFIG.filter(a => enabledActions.includes(a.type))
    : ACTIONS_CONFIG;

  const handleActionClick = (action: QuickActionConfig) => {
    onActionSelect(action.type, contact);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⚡ Ações Rápidas
          </DialogTitle>
          <DialogDescription>
            {contact ? (
              <span>Ação para <strong>{contact.name}</strong></span>
            ) : (
              'Selecione uma ação'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {filteredActions.map((action) => (
            <Button
              key={action.type}
              variant="ghost"
              className={cn(
                'w-full justify-start h-auto py-3 px-4',
                action.bgColor
              )}
              onClick={() => handleActionClick(action)}
            >
              <div className={cn('mr-3', action.color)}>
                {action.icon}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">{action.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {action.description}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QuickActionsModal;
