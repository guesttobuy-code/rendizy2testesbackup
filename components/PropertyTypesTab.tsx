/**
 * RENDIZY - Property Types Tab
 * 
 * Tab para gerenciamento de tipos de propriedades
 * Wrapper simples para o PropertyTypesSettings
 * 
 * @version 1.0.103
 * @date 2025-10-28
 */

import { PropertyTypesSettings } from './PropertyTypesSettings';

export const PropertyTypesTab = () => {
  return (
    <div className="p-6">
      <PropertyTypesSettings />
    </div>
  );
};
