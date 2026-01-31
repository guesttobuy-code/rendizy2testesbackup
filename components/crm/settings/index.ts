/**
 * CRM Settings Module - Index
 * 
 * Exporta todos os componentes do módulo de configurações do CRM.
 */

export { default as CRMSettingsModule } from './CRMSettingsModule';
export { AutomationsSettingsTab } from './AutomationsSettingsTab';
export { TasksSettingsTab } from './TasksSettingsTab';
export { GeneralSettingsTab } from './GeneralSettingsTab';
export { PropertyServiceConfig } from './PropertyServiceConfig';

// Novas tabs de Tarefas Operacionais
export { CleaningVistoriaTab } from './CleaningVistoriaTab';
export { MaintenanceTab } from './MaintenanceTab';
export { CheckinTab } from './CheckinTab';

// Catálogo de automações
export * from './automation-catalog';
