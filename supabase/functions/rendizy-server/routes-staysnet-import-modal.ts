// ⚠️ Cápsula de segurança: re-export explícito APENAS das rotas usadas pelo modal de importação.
// Mantém o acoplamento mínimo e evita que mudanças no robô de webhooks respinguem no modal.
//
// Regra:
// - O router (rendizy-server/index.ts) deve apontar rotas do modal para este arquivo.
// - Evitar importar direto de routes-staysnet.ts em outros módulos.
//
// Governança: ver docs/04-modules/STAYSNET_INTEGRATION_GOVERNANCE.md

export {
  previewStaysNetImport,
  importFullStaysNet,
  debugRawStaysNet,
} from './routes-staysnet.ts';
