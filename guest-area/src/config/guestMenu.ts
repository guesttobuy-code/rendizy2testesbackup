export type GuestMenuItem = {
  id: string;
  label: string;
  path: string;
  icon: string;
  visible: boolean;
};

export const GUEST_MENU_ITEMS: GuestMenuItem[] = [
  { id: 'calendario', label: 'Calendário', path: '#/calendario', icon: '🗓️', visible: true },
  { id: 'reservas', label: 'Reservas', path: '#/reservas', icon: '📋', visible: true },
  { id: 'perfil', label: 'Perfil', path: '#/perfil', icon: '👤', visible: false },
];

export const getVisibleMenuItems = () => GUEST_MENU_ITEMS.filter((item) => item.visible);
