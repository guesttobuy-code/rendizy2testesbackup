import React, { useState } from 'react';
import { Deal } from '../../types/crm';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { ChevronUp, ChevronDown, Bot, Sparkles, Calendar, Mail, CheckCircle2 } from 'lucide-react';
import { cn } from '../ui/utils';

interface DealAIAgentProps {
  deal: Deal;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (deal: Deal) => void;
}

export function DealAIAgent({
  deal,
  expanded,
  onToggleExpand,
  onUpdate,
}: DealAIAgentProps) {
  const [aiQuery, setAiQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleQuickAction = (action: string) => {
    setIsTyping(true);
    // Simular processamento
    setTimeout(() => {
      setIsTyping(false);
      // TODO: Processar ação via API de automações
    }, 1500);
  };

  const handleSubmit = () => {
    if (!aiQuery.trim()) return;
    setIsTyping(true);
    // TODO: Enviar query para API de IA
    setTimeout(() => {
      setIsTyping(false);
      setAiQuery('');
    }, 2000);
  };

  if (!expanded) {
    // Minimized state - apenas barra
    return (
      <div className="border-t border-gray-200 dark:border-gray-700">
        <Card
          className={cn(
            'rounded-none border-x-0 border-b-0 cursor-pointer',
            'bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800',
            'transition-all duration-200'
          )}
          onClick={onToggleExpand}
        >
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-white" />
              <div>
                <p className="text-sm font-semibold text-white">Rendizy AI Agent</p>
                <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                  Automations Active
                </Badge>
              </div>
            </div>
            <ChevronUp className="w-5 h-5 text-white" />
          </div>
        </Card>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 flex flex-col" style={{ height: '40%' }}>
      <Card className="rounded-none border-x-0 border-b-0 flex flex-col h-full bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
        {/* Header */}
        <div
          className={cn(
            'px-6 py-3 flex items-center justify-between cursor-pointer',
            'bg-gradient-to-r from-indigo-600 to-purple-700'
          )}
          onClick={onToggleExpand}
        >
          <div className="flex items-center gap-3">
            <Bot className="w-5 h-5 text-white" />
            <div>
              <p className="text-sm font-semibold text-white">Rendizy AI Agent</p>
              <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                Automations Active
              </Badge>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-4">
            {/* AI Greeting */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-1">AI ASSISTANT</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Hi! I can help you update this deal, schedule follow-ups, or summarize the conversation. What would you like to do?
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('schedule-call')}
                className="bg-white dark:bg-gray-800"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Call
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('draft-email')}
                className="bg-white dark:bg-gray-800"
              >
                <Mail className="w-4 h-4 mr-2" />
                Draft Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAction('mark-qualified')}
                className="bg-white dark:bg-gray-800"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Mark Qualified
              </Button>
            </div>

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span>AI is thinking...</span>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ask AI to automate tasks..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit();
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800"
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

