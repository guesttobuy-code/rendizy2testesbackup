import React, { useState, useMemo } from 'react';
import { ServiceTicket, Funnel } from '../../types/funnels';
import { Button } from '../ui/button';
import { X, ChevronRight, MessageSquare, FileText } from 'lucide-react';
import { ServicesTicketDetailLeft } from './ServicesTicketDetailLeft';
import { ServicesTicketDetailRight } from './ServicesTicketDetailRight';
import { calculateTicketProgress } from '../../utils/taskProgress';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { cn } from '../ui/utils';

interface ServicesTicketDetailProps {
  ticket: ServiceTicket;
  funnel: Funnel;
  onClose: () => void;
  onUpdate: (ticket: ServiceTicket) => void;
}

export function ServicesTicketDetail({
  ticket,
  funnel,
  onClose,
  onUpdate,
}: ServicesTicketDetailProps) {
  const [currentTicket, setCurrentTicket] = useState<ServiceTicket>(ticket);
  // Desktop: mostra ambas as colunas, Mobile: começa no chat (padrão)
  const [activeView, setActiveView] = useState<'chat' | 'details'>('chat');

  const handleUpdate = (updatedTicket: ServiceTicket) => {
    setCurrentTicket(updatedTicket);
    onUpdate(updatedTicket);
  };

  if (!funnel || !funnel.stages || funnel.stages.length === 0) {
    return null; // Não renderizar se não houver funil válido
  }

  const currentStage = funnel.stages.find(s => s.id === currentTicket.stageId);
  const stageIndex = funnel.stages.findIndex(s => s.id === currentTicket.stageId);
  
  // Progresso baseado em tarefas completas (não apenas etapa)
  const taskProgress = useMemo(() => {
    return calculateTicketProgress(currentTicket);
  }, [currentTicket]);
  
  // Progresso visual da etapa no funil
  const stageProgress = ((stageIndex + 1) / funnel.stages.length) * 100;

  // Swipe navigation para mobile
  const swipeNav = useSwipeNavigation({
    onSwipeLeft: () => {
      // Swipe left = ir para funcionalidades
      if (activeView === 'chat') {
        setActiveView('details');
      }
    },
    onSwipeRight: () => {
      // Swipe right = voltar para chat
      if (activeView === 'details') {
        setActiveView('chat');
      }
    },
    threshold: 50,
  });

  return (
    <div 
      className="fixed z-50 bg-background/80 backdrop-blur-sm" 
      style={{ 
        margin: 0, 
        padding: 0,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden'
      }}
    >
      <div 
        className="absolute bg-card shadow-lg flex flex-col" 
        style={{ 
          left: 0, 
          right: 0, 
          top: 0, 
          bottom: 0, 
          width: '100vw', 
          height: '100vh',
          margin: 0, 
          padding: 0,
          maxWidth: 'none',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ChevronRight className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-bold">{currentTicket.title}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Bars */}
        {currentStage && (
          <div className="space-y-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b">
            {/* Progresso do Funil (Etapas) */}
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Etapa do Funil</span>
              <span className="font-semibold">{Math.round(stageProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full mb-2">
              <div
                className="h-full transition-all rounded-full"
                style={{
                  width: `${stageProgress}%`,
                  backgroundColor: currentStage.color,
                }}
              />
            </div>
            {/* Progresso das Tarefas */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso das Tarefas</span>
              <span className="font-semibold">{taskProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full">
              <div
                className="bg-purple-500 h-full transition-all rounded-full"
                style={{ width: `${taskProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Mobile View Toggle (apenas mobile) */}
        <div className="lg:hidden flex items-center justify-center gap-2 p-2 border-b bg-gray-50 dark:bg-gray-800">
          <Button
            variant={activeView === 'chat' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('chat')}
            className="flex-1"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Chat
          </Button>
          <Button
            variant={activeView === 'details' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView('details')}
            className="flex-1"
          >
            <FileText className="w-4 h-4 mr-2" />
            Detalhes
          </Button>
        </div>

        {/* Content Area - Split View Desktop / Swipe Mobile */}
        <div className="flex-1 flex overflow-hidden min-h-0" style={{ width: '100%' }}>
          {/* Desktop: Layout - Detalhes ocupa resto, Chat fixo colado na borda direita */}
          <div className="hidden lg:flex lg:flex-1 lg:overflow-hidden lg:min-h-0" style={{ width: '100%' }}>
            {/* Left Column: Ticket Details + Tasks - Ocupa todo espaço restante */}
            <div className="flex-1 min-w-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto min-h-0">
              <ServicesTicketDetailLeft
                ticket={currentTicket}
                funnel={funnel}
                onUpdate={handleUpdate}
              />
            </div>

            {/* Right Column: Chat IA - Fixo colado na borda direita, largura fixa */}
            <div 
              className="flex flex-col overflow-hidden min-h-0 flex-shrink-0 bg-white dark:bg-gray-800"
              style={{ width: '400px', minWidth: '400px' }}
            >
              <ServicesTicketDetailRight
                ticket={currentTicket}
                onUpdate={handleUpdate}
              />
            </div>
          </div>

          {/* Mobile: Swipe Views - Uma view por vez, full width */}
          <div
            ref={swipeNav.containerRef}
            {...swipeNav.touchHandlers}
            {...swipeNav.mouseHandlers}
            className="lg:hidden flex-1 relative overflow-hidden w-full h-full"
            style={{ touchAction: 'pan-x pan-y' }}
          >
            {/* Chat View - Full width quando ativo */}
            <div
              className={cn(
                'absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out',
                'bg-white dark:bg-gray-800',
                activeView === 'chat' ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
              )}
              style={{ zIndex: activeView === 'chat' ? 10 : 0 }}
            >
              <ServicesTicketDetailRight
                ticket={currentTicket}
                onUpdate={handleUpdate}
              />
            </div>

            {/* Details View - Full width quando ativo */}
            <div
              className={cn(
                'absolute inset-0 w-full h-full transition-transform duration-300 ease-in-out',
                'bg-white dark:bg-gray-800',
                activeView === 'details' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
              )}
              style={{ zIndex: activeView === 'details' ? 10 : 0 }}
            >
              <div className="overflow-y-auto h-full w-full">
                <ServicesTicketDetailLeft
                  ticket={currentTicket}
                  funnel={funnel}
                  onUpdate={handleUpdate}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

