/**
 * Página de Calendário de Tarefas
 * Utiliza o componente TasksCalendarView integrado
 */
import { TasksCalendarView } from '../views/TasksCalendarView';

export function CalendarioTarefasPage() {
  return (
    <div className="h-full">
      <TasksCalendarView />
    </div>
  );
}

export default CalendarioTarefasPage;
