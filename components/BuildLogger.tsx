import { useEffect } from 'react';
import BUILD_INFO from '../CACHE_BUSTER';

/**
 * Componente invisível que loga informações de build no console
 * Serve como cache buster adicional
 */
export function BuildLogger() {
  useEffect(() => {
    const styles = {
      title: 'background: #6366f1; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold',
      info: 'background: #10b981; color: white; padding: 4px 8px; border-radius: 3px',
      warn: 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 3px',
    };

    console.log('%c🚀 RENDIZY PMS LOADED', styles.title);
    console.log('%c📦 Version: ' + BUILD_INFO.version, styles.info);
    console.log('%c🔨 Build: ' + BUILD_INFO.build, styles.info);
    console.log('%c⏰ Timestamp: ' + new Date(BUILD_INFO.timestamp).toLocaleString('pt-BR'), styles.info);
    console.log('%c📝 Description: ' + BUILD_INFO.description, styles.info);
    console.log('%c💬 Message: ' + BUILD_INFO.message, styles.info);
    console.log('%c✅ Status: ' + BUILD_INFO.status, styles.title);
  }, []);

  return null; // Componente invisível
}