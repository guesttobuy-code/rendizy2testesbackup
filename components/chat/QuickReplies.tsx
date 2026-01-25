/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         QUICK REPLIES / TEMPLATES                          ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - Respostas rápidas pré-configuradas                ║
 * ║  💬 CHAT_UX - Aumenta produtividade do atendente                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Componente para exibir e selecionar respostas rápidas.
 * Pode ser usado standalone ou integrado ao ChatMessagePanel.
 * 
 * Templates podem ser:
 * - Globais (da organização)
 * - Por propriedade
 * - Pessoais (do usuário)
 * 
 * @version 1.0.0
 * @date 2026-01-25
 * @see /docs/ROADMAP-CHAT.md
 */

import { useState, useMemo } from 'react';
import { 
  MessageSquare, 
  Search, 
  Star, 
  StarOff, 
  Plus,
  Pencil,
  Trash2,
  Zap,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '../ui/utils';

// ============================================
// TYPES
// ============================================

export interface QuickReply {
  /** ID único */
  id: string;
  /** Título/atalho da resposta */
  title: string;
  /** Texto da resposta (pode ter placeholders como {{nome}}) */
  text: string;
  /** Categoria/tag */
  category?: string;
  /** Se é favorita */
  isFavorite?: boolean;
  /** Escopo: global, property, personal */
  scope?: 'global' | 'property' | 'personal';
  /** ID da propriedade (se scope = property) */
  propertyId?: string;
  /** Contagem de uso */
  usageCount?: number;
}

export interface QuickRepliesProps {
  /** Lista de respostas rápidas */
  replies: QuickReply[];
  /** Callback ao selecionar uma resposta */
  onSelect: (reply: QuickReply) => void;
  /** Callback ao favoritar */
  onToggleFavorite?: (replyId: string) => void;
  /** Callback ao editar */
  onEdit?: (reply: QuickReply) => void;
  /** Callback ao deletar */
  onDelete?: (replyId: string) => void;
  /** Callback ao criar nova */
  onCreate?: () => void;
  /** Variáveis para substituir nos placeholders */
  variables?: Record<string, string>;
  /** Variante: dropdown ou panel */
  variant?: 'dropdown' | 'panel';
  /** Se está carregando */
  isLoading?: boolean;
  /** Classe CSS adicional */
  className?: string;
}

// ============================================
// DEFAULT REPLIES (para organizações sem templates)
// ============================================

export const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  {
    id: 'default-1',
    title: '👋 Boas-vindas',
    text: 'Olá! Bem-vindo(a) à {{propriedade}}! Como posso ajudá-lo(a)?',
    category: 'saudação',
    scope: 'global',
  },
  {
    id: 'default-2',
    title: '⏰ Check-in',
    text: 'O check-in é a partir das 14h. Você receberá as instruções de acesso por aqui mesmo.',
    category: 'informativo',
    scope: 'global',
  },
  {
    id: 'default-3',
    title: '🚪 Check-out',
    text: 'O check-out deve ser feito até as 11h. Por favor, deixe as chaves na recepção.',
    category: 'informativo',
    scope: 'global',
  },
  {
    id: 'default-4',
    title: '📍 Localização',
    text: 'O endereço completo é: {{endereco}}. Você pode usar o Google Maps para chegar.',
    category: 'informativo',
    scope: 'global',
  },
  {
    id: 'default-5',
    title: '📶 Wi-Fi',
    text: 'O Wi-Fi da propriedade é:\n🔑 Rede: {{wifi_nome}}\n🔐 Senha: {{wifi_senha}}',
    category: 'informativo',
    scope: 'global',
  },
  {
    id: 'default-6',
    title: '✅ Confirmação',
    text: 'Perfeito! Sua reserva está confirmada. Qualquer dúvida, estou à disposição.',
    category: 'confirmação',
    scope: 'global',
  },
  {
    id: 'default-7',
    title: '💬 Aguarde',
    text: 'Um momento, estou verificando essa informação para você.',
    category: 'aguarde',
    scope: 'global',
  },
  {
    id: 'default-8',
    title: '🙏 Agradecimento',
    text: 'Muito obrigado(a) por se hospedar conosco! Esperamos vê-lo(a) novamente em breve.',
    category: 'despedida',
    scope: 'global',
  },
];

// ============================================
// HELPERS
// ============================================

/**
 * Substitui placeholders {{variavel}} no texto
 */
export function replaceVariables(
  text: string, 
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

/**
 * Extrai placeholders de um texto
 */
export function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(2, -2)))];
}

// ============================================
// REPLY ITEM
// ============================================

interface ReplyItemProps {
  reply: QuickReply;
  variables?: Record<string, string>;
  onSelect: () => void;
  onToggleFavorite?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

function ReplyItem({
  reply,
  variables = {},
  onSelect,
  onToggleFavorite,
  onEdit,
  onDelete,
  showActions = false,
}: ReplyItemProps) {
  const previewText = replaceVariables(reply.text, variables);
  
  return (
    <div
      className="group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{reply.title}</span>
          {reply.isFavorite && (
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          )}
          {reply.category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {reply.category}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
          {previewText}
        </p>
      </div>
      
      {showActions && (
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onToggleFavorite && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              title={reply.isFavorite ? 'Remover favorito' : 'Favoritar'}
            >
              {reply.isFavorite ? (
                <StarOff className="h-3 w-3" />
              ) : (
                <Star className="h-3 w-3" />
              )}
            </Button>
          )}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              title="Editar"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-red-500"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Excluir"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPONENT
// ============================================

export function QuickReplies({
  replies,
  onSelect,
  onToggleFavorite,
  onEdit,
  onDelete,
  onCreate,
  variables = {},
  variant = 'dropdown',
  isLoading = false,
  className,
}: QuickRepliesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtrar e ordenar replies
  const filteredReplies = useMemo(() => {
    let result = replies;
    
    // Filtrar por termo de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.title.toLowerCase().includes(term) ||
        r.text.toLowerCase().includes(term) ||
        r.category?.toLowerCase().includes(term)
      );
    }
    
    // Ordenar: favoritos primeiro, depois por uso
    return result.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return (b.usageCount || 0) - (a.usageCount || 0);
    });
  }, [replies, searchTerm]);
  
  // Agrupar por categoria
  const groupedReplies = useMemo(() => {
    const groups: Record<string, QuickReply[]> = {};
    filteredReplies.forEach(reply => {
      const cat = reply.category || 'Outros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(reply);
    });
    return groups;
  }, [filteredReplies]);
  
  const hasActions = !!(onToggleFavorite || onEdit || onDelete);
  
  // ============================================
  // DROPDOWN VARIANT
  // ============================================
  
  if (variant === 'dropdown') {
    return (
      <div className={cn(
        'w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden',
        className
      )}>
        {/* Search */}
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar resposta..."
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        
        {/* Replies List */}
        <ScrollArea className="max-h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full" />
            </div>
          ) : filteredReplies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma resposta encontrada</p>
            </div>
          ) : (
            <div className="p-1">
              {filteredReplies.map(reply => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  variables={variables}
                  onSelect={() => onSelect(reply)}
                  onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(reply.id) : undefined}
                  onEdit={onEdit ? () => onEdit(reply) : undefined}
                  onDelete={onDelete ? () => onDelete(reply.id) : undefined}
                  showActions={hasActions}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Create Button */}
        {onCreate && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={onCreate}
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar nova resposta
            </Button>
          </div>
        )}
      </div>
    );
  }
  
  // ============================================
  // PANEL VARIANT
  // ============================================
  
  return (
    <div className={cn(
      'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          <h3 className="font-medium text-sm">Respostas Rápidas</h3>
        </div>
        {onCreate && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCreate}>
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Search */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>
      
      {/* Grouped Replies */}
      <ScrollArea className="max-h-96">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full" />
          </div>
        ) : Object.keys(groupedReplies).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma resposta encontrada</p>
          </div>
        ) : (
          <div className="p-2">
            {Object.entries(groupedReplies).map(([category, categoryReplies]) => (
              <div key={category} className="mb-3 last:mb-0">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 px-2">
                  {category}
                </h4>
                {categoryReplies.map(reply => (
                  <ReplyItem
                    key={reply.id}
                    reply={reply}
                    variables={variables}
                    onSelect={() => onSelect(reply)}
                    onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(reply.id) : undefined}
                    onEdit={onEdit ? () => onEdit(reply) : undefined}
                    onDelete={onDelete ? () => onDelete(reply.id) : undefined}
                    showActions={hasActions}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================
// QUICK REPLY TRIGGER BUTTON
// ============================================

export interface QuickReplyTriggerProps {
  /** Se está aberto */
  isOpen: boolean;
  /** Callback ao clicar */
  onClick: () => void;
  /** Classe CSS adicional */
  className?: string;
}

export function QuickReplyTrigger({ isOpen, onClick, className }: QuickReplyTriggerProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-9 w-9', isOpen && 'bg-gray-100 dark:bg-gray-800', className)}
      onClick={onClick}
      title="Respostas rápidas"
    >
      {isOpen ? (
        <X className="h-4 w-4" />
      ) : (
        <Zap className="h-4 w-4 text-yellow-500" />
      )}
    </Button>
  );
}

export default QuickReplies;
