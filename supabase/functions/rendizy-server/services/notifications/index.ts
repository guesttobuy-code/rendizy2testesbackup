// ============================================================================
// NOTIFICATIONS SERVICE INDEX - Exportações centralizadas
// ============================================================================
// Arquitetura de Cápsulas para Notificações
// 
// services/notifications/
// ├── index.ts           <- Este arquivo (barrel exports)
// ├── types.ts           <- Tipos compartilhados
// ├── base-provider.ts   <- Classe base abstrata
// ├── dispatcher.ts      <- Orquestrador central
// └── providers/         <- Cápsulas de providers
//     ├── index.ts
//     ├── resend-provider.ts
//     ├── brevo-email-provider.ts
//     ├── brevo-sms-provider.ts
//     ├── evolution-whatsapp-provider.ts
//     └── in-app-provider.ts
// ============================================================================

// Types
export * from './types.ts';

// Base Provider
export { BaseProvider, MockProvider } from './base-provider.ts';

// Dispatcher (orquestrador)
export { 
  notificationDispatcher, 
  NotificationDispatcher,
  sendEmail,
  sendSms,
  sendWhatsApp,
  sendInApp,
} from './dispatcher.ts';

// Providers individuais
export * from './providers/index.ts';
