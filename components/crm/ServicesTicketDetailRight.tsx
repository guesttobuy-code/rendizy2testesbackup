import React, { useState } from 'react';
import { ServiceTicket } from '../../types/funnels';
import { ServicesTicketChatInterface } from './ServicesTicketChatInterface';
import { ServicesTicketAIAgent } from './ServicesTicketAIAgent';

interface ServicesTicketDetailRightProps {
  ticket: ServiceTicket;
  onUpdate: (ticket: ServiceTicket) => void;
}

export function ServicesTicketDetailRight({
  ticket,
  onUpdate,
}: ServicesTicketDetailRightProps) {
  const [aiAgentExpanded, setAiAgentExpanded] = useState(false);

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      {/* Chat Interface - Ocupa espaço restante */}
      <div className="flex-1 min-h-0 overflow-hidden w-full">
        <ServicesTicketChatInterface ticket={ticket} />
      </div>

      {/* AI Agent - Fixo na parte inferior */}
      <ServicesTicketAIAgent
        ticket={ticket}
        expanded={aiAgentExpanded}
        onToggleExpand={() => setAiAgentExpanded(!aiAgentExpanded)}
        onUpdate={onUpdate}
      />
    </div>
  );
}
