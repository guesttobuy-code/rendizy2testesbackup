// ============================================================================
// PROVIDERS INDEX - Exporta todos os providers de notificação
// ============================================================================
// Arquivo barrel para imports centralizados
// ============================================================================

// Email Providers
export { ResendProvider, resendProvider } from './resend-provider.ts';
export { BrevoEmailProvider, brevoEmailProvider } from './brevo-email-provider.ts';

// SMS Providers
export { BrevoSmsProvider, brevoSmsProvider } from './brevo-sms-provider.ts';

// WhatsApp Providers
export { EvolutionWhatsAppProvider, evolutionWhatsAppProvider } from './evolution-whatsapp-provider.ts';

// In-App Provider
export { InAppProvider, inAppProvider } from './in-app-provider.ts';

// Push Provider (futuro)
// export { FirebasePushProvider, firebasePushProvider } from './firebase-push-provider.ts';
// export { OneSignalPushProvider, oneSignalPushProvider } from './onesignal-push-provider.ts';
