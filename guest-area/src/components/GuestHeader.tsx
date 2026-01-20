import { useState, useRef, useEffect } from 'react';
import { useGuestAuth } from '../contexts/GuestAuthContext';
import { getVisibleMenuItems } from '../config/guestMenu';

export function GuestHeader() {
  const { user, logout } = useGuestAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuItems = getVisibleMenuItems();
  const siteSlug = window.GUEST_AREA_CONFIG?.siteSlug || '';

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      {/* Título */}
      <div className="flex items-center gap-4">
        <button className="md:hidden text-gray-500 hover:text-gray-700">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Área do Cliente</h1>
          {siteSlug && <p className="text-xs text-gray-500">{siteSlug}</p>}
        </div>
      </div>

      {/* Avatar e Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-1 z-50">
            <div className="px-4 py-3 border-b">
              <p className="text-sm font-medium text-gray-800">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            {menuItems.map((item) => (
              <a
                key={item.id}
                href={item.path}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setDropdownOpen(false)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
            <hr className="my-1" />
            <button
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
            >
              <span>🚪</span>
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
