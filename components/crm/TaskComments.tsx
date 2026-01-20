import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

interface TaskCommentsProps {
  taskId: string;
  comments: TaskComment[];
  onAddComment: (content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  className?: string;
}

export function TaskComments({
  taskId,
  comments,
  onAddComment,
  onDeleteComment,
  className,
}: TaskCommentsProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim());
      setNewComment('');
      toast.success('Comentário adicionado');
    } catch (error: any) {
      console.error('Erro ao adicionar comentário:', error);
      toast.error('Erro ao adicionar comentário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5" />
        <h3 className="font-semibold">Comentários ({comments.length})</h3>
      </div>

      {/* Formulário de novo comentário */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Adicione um comentário..."
            rows={3}
            className="flex-1"
          />
        </div>
        <div className="flex justify-end mt-2">
          <Button type="submit" size="sm" disabled={isSubmitting || !newComment.trim()}>
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </form>

      {/* Lista de comentários */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      {getInitials(comment.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-medium">{comment.userName}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(comment.createdAt), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      {onDeleteComment && (user?.id === comment.userId || user?.role === 'super_admin') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDeleteComment(comment.id)}
                          className="h-6 w-6"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

