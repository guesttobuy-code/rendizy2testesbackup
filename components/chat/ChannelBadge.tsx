/**
 * CHANNEL BADGE COMPONENT
 * 
 * Badge visual para indicar o canal de origem de uma conversa.
 * Usado na lista de conversas unificada para diferenciar
 * WhatsApp, Marketplace, Team, Airbnb, etc.
 * 
 * @version 1.0.0
 * @date 2026-02-02
 * @see ADR-010
 */

import { 
  MessageCircle, 
  Building2, 
  Users, 
  Mail, 
  Phone,
  Home,
  Instagram,
  type LucideIcon
} from 'lucide-react';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export type ChatChannelType = 
  | 'whatsapp'
  | 'marketplace'
  | 'team'
  | 'email'
  | 'airbnb'
  | 'booking'
  | 'sms'
  | 'instagram'
  | 'internal';

interface ChannelConfig {
  icon: LucideIcon;
  emoji: string;
  label: string;
  color: string;        // Tailwind text color
  bgColor: string;      // Tailwind background color
  borderColor: string;  // Tailwind border color
}

// ============================================
// CHANNEL CONFIGURATION
// ============================================

export const CHANNEL_CONFIG: Record<ChatChannelType, ChannelConfig> = {
  whatsapp: {
    icon: MessageCircle,
    emoji: '🟢',
    label: 'WhatsApp',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  marketplace: {
    icon: Building2,
    emoji: '🏢',
    label: 'Marketplace',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
  },
  team: {
    icon: Users,
    emoji: '👥',
    label: 'Equipe',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
  email: {
    icon: Mail,
    emoji: '📧',
    label: 'Email',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  airbnb: {
    icon: Home,
    emoji: '🏠',
    label: 'Airbnb',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
  booking: {
    icon: Home,
    emoji: '🔵',
    label: 'Booking',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  sms: {
    icon: Phone,
    emoji: '📱',
    label: 'SMS',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
  instagram: {
    icon: Instagram,
    emoji: '📸',
    label: 'Instagram',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
  },
  internal: {
    icon: MessageCircle,
    emoji: '💬',
    label: 'Sistema',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
};

// ============================================
// COMPONENT PROPS
// ============================================

interface ChannelBadgeProps {
  /** Canal de origem */
  channel: ChatChannelType;
  
  /** Variante de exibição */
  variant?: 'icon' | 'badge' | 'full' | 'emoji';
  
  /** Tamanho */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  
  /** Classes adicionais */
  className?: string;
  
  /** Mostrar tooltip */
  showTooltip?: boolean;
}

// ============================================
// SIZE CONFIGS
// ============================================

const SIZE_CONFIG = {
  xs: { icon: 'h-3 w-3', text: 'text-[10px]', padding: 'px-1 py-0.5' },
  sm: { icon: 'h-3.5 w-3.5', text: 'text-xs', padding: 'px-1.5 py-0.5' },
  md: { icon: 'h-4 w-4', text: 'text-sm', padding: 'px-2 py-1' },
  lg: { icon: 'h-5 w-5', text: 'text-base', padding: 'px-2.5 py-1.5' },
};

// ============================================
// COMPONENT
// ============================================

export function ChannelBadge({
  channel,
  variant = 'badge',
  size = 'sm',
  className,
  showTooltip = true,
}: ChannelBadgeProps) {
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.internal;
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  // Variante: apenas emoji
  if (variant === 'emoji') {
    return (
      <span 
        className={cn('inline-flex items-center', className)}
        title={showTooltip ? config.label : undefined}
      >
        {config.emoji}
      </span>
    );
  }

  // Variante: apenas ícone
  if (variant === 'icon') {
    return (
      <span 
        className={cn('inline-flex items-center', config.color, className)}
        title={showTooltip ? config.label : undefined}
      >
        <Icon className={sizeConfig.icon} />
      </span>
    );
  }

  // Variante: badge completo
  if (variant === 'full') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border',
          config.bgColor,
          config.borderColor,
          config.color,
          sizeConfig.padding,
          sizeConfig.text,
          'font-medium',
          className
        )}
        title={showTooltip ? config.label : undefined}
      >
        <Icon className={sizeConfig.icon} />
        <span>{config.label}</span>
      </span>
    );
  }

  // Variante padrão: badge compacto (emoji + label)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border',
        config.bgColor,
        config.borderColor,
        config.color,
        sizeConfig.padding,
        sizeConfig.text,
        'font-medium',
        className
      )}
      title={showTooltip ? config.label : undefined}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}

// ============================================
// CHANNEL ICON (standalone)
// ============================================

interface ChannelIconProps {
  channel: ChatChannelType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showEmoji?: boolean;
}

export function ChannelIcon({ 
  channel, 
  size = 'sm', 
  className,
  showEmoji = false,
}: ChannelIconProps) {
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.internal;
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  if (showEmoji) {
    return (
      <span className={cn('inline-flex items-center gap-0.5', config.color, className)}>
        <span>{config.emoji}</span>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center', config.color, className)}>
      <Icon className={sizeConfig.icon} />
    </span>
  );
}

// ============================================
// HELPERS
// ============================================

export function getChannelLabel(channel: ChatChannelType): string {
  return CHANNEL_CONFIG[channel]?.label || 'Desconhecido';
}

export function getChannelEmoji(channel: ChatChannelType): string {
  return CHANNEL_CONFIG[channel]?.emoji || '💬';
}

export function getChannelColor(channel: ChatChannelType): string {
  return CHANNEL_CONFIG[channel]?.color || 'text-gray-500';
}
