import { Database } from 'lucide-react';
import { ComponentsAndDataTab } from './ComponentsAndDataTab';

export function ClientSitesComponentsAndDataPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Componentes &amp; Dados</h1>
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
  );
}
