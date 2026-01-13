import { Outlet, Navigate } from 'react-router-dom';
import { useGuestAuth } from '../contexts/GuestAuthContext';
import { GuestSidebar } from './GuestSidebar';
import { GuestHeader } from './GuestHeader';

export function GuestLayout() {
  const { isAuthenticated, loading } = useGuestAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar - Desktop */}
      <div className="hidden md:block">
        <GuestSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <GuestHeader />
        
        <main className="flex-1 p-6 pb-20 md:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
          <GuestMobileNav />
        </div>
      </div>
    </div>
  );
}

function GuestMobileNav() {
  const currentPath = window.location.hash;

  const items = [
    { id: 'reservas', icon: '📋', label: 'Reservas', path: '#/reservas' },
    { id: 'perfil', icon: '👤', label: 'Perfil', path: '#/perfil' },
  ];

  return (
    <nav className="flex justify-around py-3">
      {items.map((item) => {
        const isActive = currentPath.includes(item.id);
        return (
          <a
            key={item.id}
            href={item.path}
            className={`flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors
              ${isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
