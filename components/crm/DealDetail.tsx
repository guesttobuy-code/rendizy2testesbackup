import React, { useState } from 'react';
import { Deal } from '../../types/crm';
import { DealDetailLeft } from './DealDetailLeft';
import { DealDetailRight } from './DealDetailRight';
import { Button } from '../ui/button';
import { X, CheckCircle2, XCircle, MessageSquare, FileText } from 'lucide-react';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { cn } from '../ui/utils';

interface DealDetailProps {
  deal: Deal;
  onClose: () => void;
  onUpdate: (deal: Deal) => void;
}

export function DealDetail({ deal, onClose, onUpdate }: DealDetailProps) {
  const [currentDeal, setCurrentDeal] = useState<Deal>(deal);
  const [activeView, setActiveView] = useState<'chat' | 'details'>('chat'); // Mobile: começa no chat

  const handleUpdate = (updatedDeal: Deal) => {
    setCurrentDeal(updatedDeal);
    onUpdate(updatedDeal);
  };

  const handleStageChange = (newStage: Deal['stage']) => {
    const updated = { ...currentDeal, stage: newStage };
    handleUpdate(updated);
  };

  const stages: Array<{ id: Deal['stage']; label: string }> = [
    { id: 'QUALIFIED', label: 'Qualified' },
    { id: 'CONTACT_MADE', label: 'Contact Made' },
    { id: 'MEETING_ARRANGED', label: 'Meeting Arranged' },
    { id: 'PROPOSAL_MADE', label: 'Proposal Made' },
    { id: 'NEGOTIATIONS', label: 'Negotiations' },
  ];

  const currentStageIndex = stages.findIndex(s => s.id === currentDeal.stage);

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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentDeal.title}
            </h1>
            <span className="text-xl font-semibold text-gray-700 dark:text-gray-300">
              {currentDeal.currency} {currentDeal.value.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
              onClick={() => handleStageChange('WON')}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Won
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-600 hover:bg-red-50"
              onClick={() => handleStageChange('LOST')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Lost
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            {stages.map((stage, index) => (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => handleStageChange(stage.id)}
                  className={`
                    flex-1 h-2 rounded-full transition-colors
                    ${index <= currentStageIndex
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                    }
                  `}
                  title={stage.label}
                />
                {index < stages.length - 1 && (
                  <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {stages[currentStageIndex]?.label} • {currentDeal.probability}% probability
            </span>
          </div>
        </div>
      </div>

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

      {/* Split View Desktop / Swipe Mobile */}
      <div
        ref={swipeNav.containerRef}
        {...swipeNav.touchHandlers}
        {...swipeNav.mouseHandlers}
        className="flex-1 relative overflow-hidden"
      >
        {/* Desktop: Layout - Detalhes ocupa resto, Chat fixo à direita */}
        <div className="hidden lg:flex lg:flex-1 lg:overflow-hidden lg:min-h-0">
          {/* Left Column - CRM Details - Ocupa todo espaço restante */}
          <div className="flex-1 min-w-0 border-r border-gray-200 dark:border-gray-700 overflow-y-auto min-h-0">
            <DealDetailLeft deal={currentDeal} onUpdate={handleUpdate} />
          </div>

          {/* Right Column - Chat + IA - Fixo colado na borda direita, largura fixa */}
          <div className="w-[400px] min-w-[400px] flex flex-col overflow-hidden min-h-0 flex-shrink-0 bg-white dark:bg-gray-800">
            <DealDetailRight deal={currentDeal} onUpdate={handleUpdate} />
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
            <DealDetailRight deal={currentDeal} onUpdate={handleUpdate} />
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
              <DealDetailLeft deal={currentDeal} onUpdate={handleUpdate} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

