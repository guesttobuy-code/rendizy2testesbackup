import { useEffect, useState } from 'react';
import { getVisibleMenuItems } from '../config/guestMenu';

interface SiteConfig {
  siteName: string;
  logo?: string;
}

export function GuestSidebar() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const currentPath = window.location.hash;
  
  const config = window.GUEST_AREA_CONFIG;
  const siteSlug = config?.siteSlug || '';
  const apiBase = `${config?.supabaseUrl}/functions/v1/rendizy-public/client-sites/api`;

  useEffect(() => {
    if (siteSlug) {
      fetch(`${apiBase}/${siteSlug}/site-config`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setSiteConfig(data.data);
          }
        })
        .catch(() => {
          // Fallback
          setSiteConfig({ siteName: siteSlug });
        });
    }
  }, [siteSlug, apiBase]);

  const menuItems = getVisibleMenuItems();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {siteConfig?.logo ? (
            <img
              src={siteConfig.logo}
              alt={siteConfig.siteName}
              className="h-8 object-contain"
            />
          ) : (
            <div>
              <div className="text-lg font-bold text-gray-900">
                {siteConfig?.siteName || 'Área do Cliente'}
              </div>
              <div className="text-xs text-gray-500">RENDIZY</div>
            </div>
          )}
        </div>
      </div>

      {/* Busca */}
      <div className="px-4 pt-4 pb-2">
        <input
          type="text"
          placeholder="Buscar..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none"
        />
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        <div className="px-3 mb-2 text-xs uppercase tracking-wider text-gray-400">Principal</div>
        {menuItems.map((item) => {
          const isActive = currentPath.includes(item.id);
          return (
            <a
              key={item.id}
              href={item.path}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium
                ${isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Voltar ao Site */}
      <div className="px-4 py-3 border-t border-gray-200">
        <a
          href={`/site/${siteSlug}/`}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <span>←</span>
          <span>Voltar ao site</span>
        </a>
      </div>
    </aside>
  );
}
