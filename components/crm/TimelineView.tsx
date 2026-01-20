import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ServiceTicket, ServiceTask } from '../../types/funnels';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import { Calendar } from 'lucide-react';

interface TimelineViewProps {
  tickets: ServiceTicket[];
  startDate?: Date;
  endDate?: Date;
}

export function TimelineView({ tickets, startDate, endDate }: TimelineViewProps) {
  const now = new Date();
  const defaultStart = startOfWeek(now, { locale: ptBR });
  const defaultEnd = endOfWeek(now, { locale: ptBR });
  
  const start = startDate || defaultStart;
  const end = endDate || defaultEnd;
  
  const days = eachDayOfInterval({ start, end });

  // Agrupar tarefas por data
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Array<{ ticket: ServiceTicket; task: ServiceTask }>>();
    
    tickets.forEach(ticket => {
      ticket.tasks.forEach(task => {
        if (task.dueDate) {
          const dueDate = new Date(task.dueDate);
          const dateKey = format(dueDate, 'yyyy-MM-dd');
          
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          map.get(dateKey)!.push({ ticket, task });
        }
      });
    });
    
    return map;
  }, [tickets]);

  const getTaskColor = (priority?: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Timeline de Tarefas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {days.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const tasks = tasksByDate.get(dateKey) || [];
              const isToday = isSameDay(day, now);
              const isPast = day < now && !isToday;
              
              return (
                <div
                  key={dateKey}
                  className={`flex flex-col w-48 border rounded-lg p-2 ${
                    isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                  } ${isPast ? 'opacity-60' : ''}`}
                >
                  <div className="text-xs font-semibold mb-2">
                    {format(day, 'EEE', { locale: ptBR })}
                    <br />
                    {format(day, 'dd/MM', { locale: ptBR })}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">Sem tarefas</p>
                    ) : (
                      tasks.map(({ ticket, task }) => (
                        <div
                          key={task.id}
                          className={`p-2 rounded text-xs ${getTaskColor(ticket.priority)} text-white`}
                          title={`${ticket.title}: ${task.title}`}
                        >
                          <div className="font-medium truncate">{task.title}</div>
                          <div className="text-xs opacity-90 truncate">{ticket.title}</div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {tasks.length > 0 && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

