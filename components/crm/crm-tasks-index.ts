/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    CRM TASKS - EXPORTS INDEX                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Arquivo central de exportações do sistema CRM Tasks V2
 * 
 * @version 1.0.0
 * @date 2026-01-27
 */

// ============================================================================
// TYPES
// ============================================================================
export * from '@/types/crm-tasks';

// ============================================================================
// SERVICES
// ============================================================================
export {
  TeamsService,
  TasksService,
  DependenciesService,
  CommentsService,
  ProjectsService,
  OperationalTasksService,
  CustomFieldsService,
} from '@/services/crmTasksService';

// ============================================================================
// SETTINGS COMPONENTS
// ============================================================================
export { TeamsConfig } from './settings/TeamsConfig';
export { CustomFieldsConfig } from './settings/CustomFieldsConfig';
export { OperationalTasksConfig } from './settings/OperationalTasksConfig';
export { CRMTasksSettings } from './settings/CRMTasksSettings';

// ============================================================================
// VIEW COMPONENTS
// ============================================================================
export { TasksListView } from './views/TasksListView';
export { TasksBoardView } from './views/TasksBoardView';
export { TasksCalendarView } from './views/TasksCalendarView';
export { TasksDashboard } from './views/TasksDashboard';

// ============================================================================
// PAGE COMPONENTS
// ============================================================================
export { CRMTasksPage } from './pages/CRMTasksPage';

// ============================================================================
// DEFAULT EXPORT - Main Page
// ============================================================================
export { CRMTasksPage as default } from './pages/CRMTasksPage';
