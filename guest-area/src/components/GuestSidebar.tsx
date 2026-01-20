import { useEffect, useState } from 'react';
import { getVisibleMenuItems } from '../config/guestMenu';

interface SiteConfig {
  siteName: string;
  logo?: string;
  domain?: string | null; // domínio customizado do site (ex: suacasamobiliada.com.br)
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

  const iconMap: Record<string, JSX.Element> = {
    dashboard: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
        <path d="M4 4h7v7H4z" />
        <path d="M13 4h7v4h-7z" />
        <path d="M13 10h7v10h-7z" />
        <path d="M4 13h7v7H4z" />
      </svg>
    ),
    reservas: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </svg>
    ),
  };

  return (
    <aside className="w-64 bg-slate-50 border-r border-gray-200 min-h-screen flex flex-col">
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
              <div className="text-lg font-semibold text-gray-900">
                {siteConfig?.siteName || 'Área do Cliente'}
              </div>
              <div className="text-[11px] tracking-wide text-gray-400">RENDIZY</div>
            </div>
          )}
        </div>
      </div>

      {/* Busca */}
      <div className="px-4 pt-4 pb-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar imóveis, hóspedes, res"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        <div className="flex items-center gap-2 px-3 mb-3">
          <span className="text-orange-500">🔥</span>
          <span className="text-[11px] uppercase tracking-wider text-gray-500 font-medium">Principal</span>
        </div>
        {menuItems.map((item) => {
          const isActive = currentPath.includes(item.id);
          return (
            <a
              key={item.id}
              href={item.path}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm font-medium
                ${isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <span className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {iconMap[item.id] ?? <span className="text-sm">{item.icon}</span>}
              </span>
              <span className="truncate">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Voltar ao Site */}
      <div className="px-4 py-3 border-t border-gray-200">
        <a
          href={
            siteConfig?.domain
              ? (siteConfig.domain.startsWith('http') ? siteConfig.domain : `https://${siteConfig.domain}/`)
              : (config?.siteUrl || `/site/${siteSlug}/`)
          }
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <span>←</span>
          <span>Voltar ao site</span>
        </a>
      </div>
    </aside>
  );
}
