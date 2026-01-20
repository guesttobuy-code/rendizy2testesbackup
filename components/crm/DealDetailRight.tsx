import React, { useState } from 'react';
import { Deal } from '../../types/crm';
import { DealChatInterface } from './DealChatInterface';
import { DealAIAgent } from './DealAIAgent';

interface DealDetailRightProps {
  deal: Deal;
  onUpdate: (deal: Deal) => void;
}

export function DealDetailRight({ deal, onUpdate }: DealDetailRightProps) {
  const [aiAgentExpanded, setAiAgentExpanded] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Interface - Ocupa espaço restante */}
      <div className={aiAgentExpanded ? 'flex-1' : 'flex-1'}>
        <DealChatInterface deal={deal} />
      </div>

      {/* AI Agent - Fixo na parte inferior */}
      <DealAIAgent
        deal={deal}
        expanded={aiAgentExpanded}
        onToggleExpand={() => setAiAgentExpanded(!aiAgentExpanded)}
        onUpdate={onUpdate}
      />
    </div>
  );
}

