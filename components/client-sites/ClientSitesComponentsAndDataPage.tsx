import { Database } from 'lucide-react';
import { ComponentsAndDataTab } from './ComponentsAndDataTab';
import { CATALOG_VERSION, CATALOG_UPDATED_AT } from './catalog';

// Re-exportar para compatibilidade
export { CATALOG_VERSION };
export const CATALOG_VERSION_DATE = CATALOG_UPDATED_AT.split('T')[0]; // "2026-01-14"

export function ClientSitesComponentsAndDataPage() {
  return (
    <div className="flex flex-col h-full">
      {/* Spacer para TopBar */}
      <div className="h-14 flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" />
      
      <div className="flex-1 overflow-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Componentes &amp; Dados</h1>
            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
              {CATALOG_VERSION}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            Contrato canônico público + catálogo de componentes para evitar remendos por site.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <Database className="h-4 w-4" />
            <span>Single source of truth</span>
          </div>
        </div>
      </div>

      <ComponentsAndDataTab />
      </div>
    </div>
  );
}
