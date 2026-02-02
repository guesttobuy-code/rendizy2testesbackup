/**
 * CHAT DRAWER CONTEXT - Provider global para chat inline
 * 
 * Permite abrir o chat drawer de qualquer componente da aplicação.
 * 
 * Uso:
 *   // No layout principal, envolva com o provider:
 *   <ChatDrawerProvider>
 *     {children}
 *   </ChatDrawerProvider>
 * 
 *   // Em qualquer componente:
 *   const { openChat, closeChat } = useChatDrawer();
 *   
 *   <Button onClick={() => openChat({
 *     targetOrgId: 'uuid',
 *     targetOrgName: 'Construtora XYZ',
 *     context: { type: 'partnership', id: 'uuid', title: 'Residencial Aurora' }
 *   })}>
 *     Propor Parceria
 *   </Button>
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ChatDrawer, ChatDrawerConfig, ChatContext } from './ChatDrawer';

// ============================================================
// TYPES
// ============================================================

interface ChatDrawerContextType {
  /**
   * Abre o chat drawer com a configuração especificada
   */
  openChat: (config: ChatDrawerConfig) => void;
  
  /**
   * Fecha o chat drawer
   */
  closeChat: () => void;
  
  /**
   * Indica se o chat está aberto
   */
  isOpen: boolean;
  
  /**
   * Configuração atual do chat
   */
  currentConfig: ChatDrawerConfig | null;

  /**
   * Helper para abrir chat de parceria com empreendimento
   */
  openPartnershipChat: (params: {
    constructorOrgId: string;
    constructorName: string;
    constructorLogo?: string;
    developmentId: string;
    developmentName: string;
  }) => void;

  /**
   * Helper para abrir chat de demanda
   */
  openDemandChat: (params: {
    targetOrgId: string;
    targetOrgName: string;
    targetOrgLogo?: string;
    demandId: string;
    demandTitle: string;
  }) => void;

  /**
   * Helper para abrir chat genérico B2B
   */
  openB2BChat: (params: {
    targetOrgId: string;
    targetOrgName: string;
    targetOrgLogo?: string;
    initialMessage?: string;
  }) => void;
}

// ============================================================
// CONTEXT
// ============================================================

const ChatDrawerContext = createContext<ChatDrawerContextType | undefined>(undefined);

// ============================================================
// PROVIDER
// ============================================================

interface ChatDrawerProviderProps {
  children: ReactNode;
}

export function ChatDrawerProvider({ children }: ChatDrawerProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<ChatDrawerConfig | null>(null);

  const openChat = useCallback((config: ChatDrawerConfig) => {
    setCurrentConfig(config);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    // Limpar config após animação de fechar
    setTimeout(() => setCurrentConfig(null), 300);
  }, []);

  // Helper: Chat de parceria
  const openPartnershipChat = useCallback((params: {
    constructorOrgId: string;
    constructorName: string;
    constructorLogo?: string;
    developmentId: string;
    developmentName: string;
  }) => {
    openChat({
      targetOrgId: params.constructorOrgId,
      targetOrgName: params.constructorName,
      targetOrgLogo: params.constructorLogo,
      context: {
        type: 'partnership',
        id: params.developmentId,
        title: params.developmentName
      },
      initialMessage: `Olá! Tenho interesse em estabelecer uma parceria para comercialização do empreendimento "${params.developmentName}". Podemos conversar?`
    });
  }, [openChat]);

  // Helper: Chat de demanda
  const openDemandChat = useCallback((params: {
    targetOrgId: string;
    targetOrgName: string;
    targetOrgLogo?: string;
    demandId: string;
    demandTitle: string;
  }) => {
    openChat({
      targetOrgId: params.targetOrgId,
      targetOrgName: params.targetOrgName,
      targetOrgLogo: params.targetOrgLogo,
      context: {
        type: 'demand',
        id: params.demandId,
        title: params.demandTitle
      },
      initialMessage: `Olá! Vi sua demanda "${params.demandTitle}" e tenho interesse em apresentar opções. Podemos conversar?`
    });
  }, [openChat]);

  // Helper: Chat B2B genérico
  const openB2BChat = useCallback((params: {
    targetOrgId: string;
    targetOrgName: string;
    targetOrgLogo?: string;
    initialMessage?: string;
  }) => {
    openChat({
      targetOrgId: params.targetOrgId,
      targetOrgName: params.targetOrgName,
      targetOrgLogo: params.targetOrgLogo,
      initialMessage: params.initialMessage
    });
  }, [openChat]);

  const value: ChatDrawerContextType = {
    openChat,
    closeChat,
    isOpen,
    currentConfig,
    openPartnershipChat,
    openDemandChat,
    openB2BChat
  };

  return (
    <ChatDrawerContext.Provider value={value}>
      {children}
      <ChatDrawer 
        config={currentConfig}
        onClose={closeChat}
        isOpen={isOpen}
      />
    </ChatDrawerContext.Provider>
  );
}

// ============================================================
// HOOK
// ============================================================

export function useChatDrawer(): ChatDrawerContextType {
  const context = useContext(ChatDrawerContext);
  
  if (context === undefined) {
    throw new Error('useChatDrawer must be used within a ChatDrawerProvider');
  }
  
  return context;
}

// ============================================================
// EXPORTS
// ============================================================

export type { ChatDrawerConfig, ChatContext };
