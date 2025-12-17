/**
 * RENDIZY - Integrations Manager
 * 
 * Interface de gerenciamento de integrações com canais externos
 * Exibe cards de canais e abre configuração ao clicar
 * 
 * @version 1.0.103.24
 * @date 2025-10-29
 */

import React, { useState } from 'react';
import {
  Zap,
  Building2,
  Globe,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  BarChart3,
  TrendingUp,
  Bot
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Separator } from './ui/separator';
import StaysNetIntegration from './StaysNetIntegration';
import { BookingComIntegration } from './BookingComIntegration';
import WhatsAppIntegration from './WhatsAppIntegration';
import { AirbnbIntegration } from './AirbnbIntegration';
import { AIIntegration } from './AIIntegration';

// ============================================================================
// TYPES
// ============================================================================

interface IntegrationChannel {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  status: 'active' | 'inactive' | 'coming-soon';
  stats?: {
    connected: number;
    active: number;
    inactive: number;
  };
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
  };
}

// ============================================================================
// CHANNELS DATA
// ============================================================================

const CHANNELS: IntegrationChannel[] = [
  {
    id: 'staysnet',
    name: 'Stays.net PMS',
    description: 'Property Management System completo',
    icon: Building2,
    iconColor: 'text-white',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-purple-600',
    status: 'active',
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'PMS',
      variant: 'default'
    }
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Integração com Evolution API para mensagens',
    icon: Globe,
    iconColor: 'text-white',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-green-600',
    status: 'active', // ✅ REATIVADO v1.0.103.84 - Integração completa com proxy seguro
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'NOVO', // ✅ Mudado de 'EM BREVE' para 'NOVO'
      variant: 'success' // ✅ Mudado de 'secondary' para 'success'
    }
  },
  {
    id: 'bookingcom',
    name: 'Booking.com',
    description: 'Canal de distribuição global',
    icon: Globe,
    iconColor: 'text-white',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-700',
    status: 'active',
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'OTA',
      variant: 'secondary'
    }
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    description: 'Plataforma de aluguel por temporada',
    icon: Building2,
    iconColor: 'text-white',
    gradientFrom: 'from-pink-500',
    gradientTo: 'to-red-500',
    status: 'active', // ✅ ATIVADO para teste de registro de campo financeiro
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'NOVO',
      variant: 'success'
    }
  },
  {
    id: 'ai-provider',
    name: 'Provedor de IA',
    description: 'Integra ChatGPT / IA open-source para copilotar o Rendizy',
    icon: Bot,
    iconColor: 'text-white',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-indigo-500',
    status: 'active',
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'Novo',
      variant: 'success'
    }
  },
  {
    id: 'decolar',
    name: 'Decolar / Despegar',
    description: 'OTA líder na América Latina',
    icon: Globe,
    iconColor: 'text-white',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-yellow-500',
    status: 'coming-soon',
    badge: {
      text: 'Em Breve',
      variant: 'secondary'
    }
  },
  {
    id: 'vrbo',
    name: 'VRBO',
    description: 'Vacation Rentals by Owner',
    icon: Building2,
    iconColor: 'text-white',
    gradientFrom: 'from-indigo-500',
    gradientTo: 'to-purple-500',
    status: 'coming-soon',
    badge: {
      text: 'Em Breve',
      variant: 'secondary'
    }
  },
  {
    id: 'expedia',
    name: 'Expedia',
    description: 'Portal de viagens global',
    icon: Globe,
    iconColor: 'text-white',
    gradientFrom: 'from-yellow-500',
    gradientTo: 'to-orange-500',
    status: 'coming-soon',
    badge: {
      text: 'Em Breve',
      variant: 'secondary'
    }
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function IntegrationsManager() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleChannelClick = (channelId: string) => {
    const channel = CHANNELS.find(c => c.id === channelId);
    if (channel && channel.status !== 'coming-soon') {
      setSelectedChannel(channelId);
      setIsDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setSelectedChannel(null), 300);
  };

  const selectedChannelData = CHANNELS.find(c => c.id === selectedChannel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl text-foreground flex items-center gap-3">
          <Zap className="h-5 w-5 text-purple-400" />
          Integrações
        </h3>
        <p className="text-muted-foreground mt-1">
          Conecte o RENDIZY com canais de distribuição e sistemas externos
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Canais Ativos</p>
                <p className="text-2xl mt-1">
                  {CHANNELS.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Desenvolvimento</p>
                <p className="text-2xl mt-1">
                  {CHANNELS.filter(c => c.status === 'coming-soon').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Disponível</p>
                <p className="text-2xl mt-1">{CHANNELS.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Channels Grid */}
      <div>
        <h4 className="text-foreground mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Canais Disponíveis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const isDisabled = channel.status === 'coming-soon';

            return (
              <Card
                key={channel.id}
                className={`
                  border-2 transition-all duration-200
                  ${isDisabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:shadow-lg hover:border-blue-300'
                  }
                `}
                onClick={() => !isDisabled && handleChannelClick(channel.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`
                        w-12 h-12 rounded-lg 
                        bg-gradient-to-br ${channel.gradientFrom} ${channel.gradientTo}
                        flex items-center justify-center
                        ${isDisabled ? 'grayscale' : ''}
                      `}>
                        <Icon className={`w-6 h-6 ${channel.iconColor}`} />
                      </div>
                      
                      {/* Name & Badge */}
                      <div>
                        <CardTitle className="text-base">{channel.name}</CardTitle>
                        {channel.badge && (
                          <Badge 
                            variant={channel.badge.variant as any}
                            className="mt-1"
                          >
                            {channel.badge.text}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Status Icon */}
                    {!isDisabled && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground">
                    {channel.description}
                  </p>

                  {/* Stats */}
                  {channel.stats && !isDisabled && (
                    <div className="flex items-center gap-4 pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">
                          {channel.stats.connected} conectados
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="text-xs text-muted-foreground">
                          {channel.stats.inactive} inativos
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Coming Soon Message */}
                  {isDisabled && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        🚀 Disponível em breve
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    variant={isDisabled ? 'outline' : 'default'}
                    size="sm"
                    className="w-full"
                    disabled={isDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDisabled) handleChannelClick(channel.id);
                    }}
                  >
                    {isDisabled ? 'Em Desenvolvimento' : 'Configurar'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Integration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedChannelData && (
                <>
                  <div className={`
                    w-10 h-10 rounded-lg 
                    bg-gradient-to-br ${selectedChannelData.gradientFrom} ${selectedChannelData.gradientTo}
                    flex items-center justify-center
                  `}>
                    {React.createElement(selectedChannelData.icon, {
                      className: `w-5 h-5 ${selectedChannelData.iconColor}`
                    })}
                  </div>
                  {selectedChannelData.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedChannelData?.description || 'Configure a integração com este canal'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {/* Render specific integration component */}
            {selectedChannel === 'staysnet' && <StaysNetIntegration />}
            {selectedChannel === 'whatsapp' && <WhatsAppIntegration />}
            {selectedChannel === 'bookingcom' && <BookingComIntegration />}
            {selectedChannel === 'airbnb' && <AirbnbIntegration />}
            {selectedChannel === 'ai-provider' && <AIIntegration />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}