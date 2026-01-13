import { useEffect, useState } from 'react';

interface SiteConfig {
  siteName: string;
  logo?: string;
}

const MENU_ITEMS = [
  { id: 'reservas', icon: '📋', label: 'Minhas Reservas', path: '#/reservas' },
  { id: 'perfil', icon: '👤', label: 'Meu Perfil', path: '#/perfil' },
];

export function GuestSidebar() {
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const currentPath = window.location.hash;
  const { subdomain, apiBase } = window.GUEST_AREA_CONFIG || {};

  useEffect(() => {
    if (subdomain) {
      fetch(`${apiBase}/${subdomain}/site-config`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) {
            setSiteConfig(data.data);
          }
        })
        .catch(() => {
          // Fallback
          setSiteConfig({ siteName: subdomain });
        });
    }
  }, [subdomain, apiBase]);

  return (
    <aside className="w-64 bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] min-h-screen flex flex-col">
      {/* Logo/Nome do Site */}
      <div className="p-6 border-b border-gray-700">
        {siteConfig?.logo ? (
          <img
            src={siteConfig.logo}
            alt={siteConfig.siteName}
            className="h-10 object-contain"
          />
        ) : (
          <h1 className="text-xl font-bold">{siteConfig?.siteName || 'Área do Cliente'}</h1>
        )}
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {MENU_ITEMS.map((item) => {
          const isActive = currentPath.includes(item.id);
          return (
            <a
              key={item.id}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive
                  ? 'bg-[var(--sidebar-active)] text-white'
                  : 'hover:bg-[var(--sidebar-hover)]'
                }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Voltar ao Site */}
      <div className="p-4 border-t border-gray-700">
        <a
          href={`/site/${subdomain}/`}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Voltar ao site</span>
        </a>
      </div>
    </aside>
  );
}
