/**
 * RENDIZY - AutomationTriggerButton
 * 
 * Botão reutilizável para abrir o modal de criação de automações.
 * Pode ser colocado em QUALQUER tela do sistema.
 * 
 * @example
 * // Botão simples
 * <AutomationTriggerButton module="chat" />
 * 
 * // Botão com contexto específico
 * <AutomationTriggerButton 
 *   module="reservas" 
 *   propertyId="xxx"
 *   variant="outline"
 *   size="sm"
 * />
 * 
 * // Botão com texto customizado
 * <AutomationTriggerButton module="crm" label="Automatizar Follow-up" />
 */

import React, { useState, useCallback } from 'react';
import { Button, type ButtonProps } from '../ui/button';
import { 
  Sparkles, 
  Zap, 
  Bot, 
  Wand2,
  Plus
} from 'lucide-react';
import { AutomationCreatorModal, type AutomationContext } from './AutomationCreatorModal';
import { type Automation } from '../../utils/api';
import { cn } from '../ui/utils';

// ============================================================================
// TIPOS
// ============================================================================

export interface AutomationTriggerButtonProps extends Omit<ButtonProps, 'onClick'> {
  /** Módulo de origem */
  module?: string;
  /** ID do contato (se aplicável) */
  contactId?: string;
  /** ID da propriedade (se aplicável) */
  propertyId?: string;
  /** ID da reserva (se aplicável) */
  reservationId?: string;
  /** Texto do botão */
  label?: string;
  /** Texto pré-preenchido no input */
  prefillInput?: string;
  /** Canal pré-selecionado */
  prefillChannel?: 'chat' | 'whatsapp' | 'email' | 'sms' | 'dashboard';
  /** Callback após salvar */
  onAutomationCreated?: (automation: Automation) => void;
  /** Ícone customizado */
  icon?: React.ReactNode;
  /** Mostrar apenas ícone (sem texto) */
  iconOnly?: boolean;
}

// ============================================================================
// COMPONENTE
// ============================================================================

export function AutomationTriggerButton({
  module = 'geral',
  contactId,
  propertyId,
  reservationId,
  label = 'Criar Automação',
  prefillInput,
  prefillChannel,
  onAutomationCreated,
  icon,
  iconOnly = false,
  className,
  variant = 'outline',
  size = 'default',
  ...buttonProps
}: AutomationTriggerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSave = useCallback((automation: Automation) => {
    onAutomationCreated?.(automation);
  }, [onAutomationCreated]);

  // Construir contexto
  const context: AutomationContext = {
    module,
    contactId,
    propertyId,
    reservationId,
    prefill: {
      input: prefillInput,
      channel: prefillChannel,
    },
  };

  // Ícone padrão
  const IconComponent = icon || <Sparkles className="h-4 w-4" />;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={cn(
          "gap-2",
          iconOnly && "px-2",
          className
        )}
        {...buttonProps}
      >
        {IconComponent}
        {!iconOnly && <span>{label}</span>}
      </Button>

      <AutomationCreatorModal
        open={isOpen}
        onClose={handleClose}
        context={context}
        onSave={handleSave}
      />
    </>
  );
}

// ============================================================================
// VARIANTES PRÉ-CONFIGURADAS
// ============================================================================

/** Botão para o módulo de Chat */
export function ChatAutomationButton(props: Omit<AutomationTriggerButtonProps, 'module'>) {
  return (
    <AutomationTriggerButton
      module="chat"
      label="Automatizar Chat"
      icon={<Bot className="h-4 w-4" />}
      prefillChannel="dashboard"
      {...props}
    />
  );
}

/** Botão para o módulo de Reservas */
export function ReservasAutomationButton(props: Omit<AutomationTriggerButtonProps, 'module'>) {
  return (
    <AutomationTriggerButton
      module="reservas"
      label="Automatizar Reservas"
      icon={<Zap className="h-4 w-4" />}
      prefillChannel="whatsapp"
      {...props}
    />
  );
}

/** Botão para o módulo CRM */
export function CRMAutomationButton(props: Omit<AutomationTriggerButtonProps, 'module'>) {
  return (
    <AutomationTriggerButton
      module="crm"
      label="Automatizar CRM"
      icon={<Wand2 className="h-4 w-4" />}
      prefillChannel="dashboard"
      {...props}
    />
  );
}

/** Botão minimalista (apenas ícone) */
export function AutomationIconButton(props: Omit<AutomationTriggerButtonProps, 'iconOnly'>) {
  return (
    <AutomationTriggerButton
      iconOnly
      variant="ghost"
      size="icon"
      icon={<Plus className="h-4 w-4" />}
      {...props}
    />
  );
}

export default AutomationTriggerButton;
