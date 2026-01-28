/**
 * Página de Tarefas em Lista (Todas as Tarefas)
 * Utiliza o componente TasksListView integrado
 */
import { TasksListView } from '../views/TasksListView';

export function TodasTarefasPage() {
  return (
    <div className="h-full">
      <TasksListView />
    </div>
  );
}

export default TodasTarefasPage;
