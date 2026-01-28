/**
 * Página de Dashboard de Tarefas
 * Utiliza o componente TasksDashboard integrado
 */
import { TasksDashboard as TasksDashboardView } from '../views/TasksDashboard';

export function TasksDashboardPage() {
  return (
    <div className="h-full">
      <TasksDashboardView />
    </div>
  );
}

export default TasksDashboardPage;
