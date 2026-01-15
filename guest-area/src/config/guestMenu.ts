export type GuestMenuItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  visible: boolean;
};

export const GUEST_MENU_ITEMS: GuestMenuItem[] = [
  { id: 'dashboard', label: 'Dashboard Inicial', path: '#/dashboard', icon: '📊', visible: true },
  { id: 'reservas', label: 'Reservas', path: '#/reservas', icon: '📋', visible: true },
  { id: 'perfil', label: 'Perfil', path: '#/perfil', icon: '👤', visible: false },
  { id: 'calendario', label: 'Calendário', path: '#/calendario', icon: '🗓️', visible: false },
];

export const getVisibleMenuItems = () => GUEST_MENU_ITEMS.filter((item) => item.visible);
