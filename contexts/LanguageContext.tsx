import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export type Language = 'pt-BR' | 'en-US' | 'es-ES';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ============================================
// TRANSLATIONS
// ============================================

const translations: Record<Language, Record<string, string>> = {
  'pt-BR': {
    // Common
    'common.loading': 'Carregando...',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.create': 'Criar',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.actions': 'Ações',
    'common.close': 'Fechar',
    'common.back': 'Voltar',
    'common.next': 'Próximo',
    'common.previous': 'Anterior',
    'common.confirm': 'Confirmar',
    'common.yes': 'Sim',
    'common.no': 'Não',
    'common.success': 'Sucesso',
    'common.error': 'Erro',
    'common.warning': 'Aviso',
    'common.info': 'Informação',
    
    // Sidebar
    'sidebar.dashboard': 'Dashboard',
    'sidebar.calendar': 'Calendário',
    'sidebar.reservations': 'Reservas',
    'sidebar.guests': 'Hóspedes',
    'sidebar.properties': 'Imóveis',
    'sidebar.locations': 'Locais',
    'sidebar.chat': 'Central de Mensagens',
    'sidebar.settings': 'Configurações',
    
    // Guests
    'guests.title': 'Hóspedes',
    'guests.subtitle': 'Gerencie o cadastro de hóspedes',
    'guests.new': 'Novo Hóspede',
    'guests.total': 'Total',
    'guests.filtered': 'Filtrados',
    'guests.search': 'Buscar por nome, email, telefone, documento...',
    'guests.noResults': 'Nenhum hóspede encontrado',
    'guests.clearSearch': 'Limpar busca',
    'guests.reservations': '{count} {count, plural, one {reserva} other {reservas}}',
    'guests.lastStay': 'Última estadia',
    'guests.history': 'Histórico',
    'guests.editGuest': 'Editar Hóspede',
    'guests.newGuest': 'Novo Hóspede',
    'guests.updateInfo': 'Atualize as informações do hóspede',
    'guests.registerNew': 'Cadastre um novo hóspede no sistema',
    'guests.deleteConfirm': 'Tem certeza que deseja excluir este hóspede?',
    'guests.deleteSuccess': 'Hóspede excluído com sucesso',
    'guests.createSuccess': 'Hóspede cadastrado com sucesso',
    'guests.updateSuccess': 'Hóspede atualizado com sucesso',
    'guests.deleteError': 'Erro ao excluir hóspede',
    'guests.createError': 'Erro ao cadastrar hóspede',
    'guests.updateError': 'Erro ao atualizar hóspede',
    'guests.loadError': 'Erro ao carregar hóspedes',
    'guests.fillRequired': 'Preencha os campos obrigatórios',
    
    // Guest Form
    'guestForm.basicInfo': 'Informações Básicas',
    'guestForm.firstName': 'Primeiro Nome',
    'guestForm.lastName': 'Sobrenome',
    'guestForm.email': 'Email',
    'guestForm.phone': 'Telefone',
    'guestForm.documentation': 'Documentação',
    'guestForm.cpf': 'CPF',
    'guestForm.rg': 'RG',
    'guestForm.passport': 'Passaporte',
    'guestForm.birthDate': 'Data de Nascimento',
    'guestForm.nationality': 'Nacionalidade',
    'guestForm.address': 'Endereço',
    'guestForm.city': 'Cidade',
    'guestForm.country': 'País',
    'guestForm.notes': 'Observações',
    'guestForm.notesPlaceholder': 'Informações adicionais sobre o hóspede...',
    'guestForm.addressComingSoon': 'Endereço completo será implementado em breve',
    
    // Reservations History
    'history.title': 'Histórico de Reservas',
    'history.noReservations': 'Nenhuma reserva encontrada',
    'history.nights': '{count} {count, plural, one {noite} other {noites}}',
    'history.status.confirmed': 'Confirmada',
    'history.status.pending': 'Pendente',
    'history.status.cancelled': 'Cancelada',
    
    // Chat
    'chat.title': 'Central de Mensagens',
    'chat.searchConversations': 'Buscar conversas...',
    'chat.allConversations': 'Todas as conversas',
    'chat.unread': 'Não lidas',
    'chat.resolved': 'Resolvidas',
    'chat.typeMessage': 'Digite sua mensagem...',
    'chat.send': 'Enviar',
    'chat.internalNote': 'Nota interna (visível apenas para equipe)',
    'chat.attachment': 'Anexo',
    'chat.uploadSuccess': 'Arquivo enviado com sucesso',
    'chat.uploadError': 'Erro ao enviar arquivo',
    'chat.messageSent': 'Mensagem enviada',
    'chat.messageError': 'Erro ao enviar mensagem',
    'chat.templates': 'Templates',
    'chat.tags': 'Tags',
    'chat.newConversation': 'Nova Conversa',
    'chat.markAsRead': 'Marcar como lida',
    'chat.markAsResolved': 'Marcar como resolvida',
    'chat.delete': 'Excluir conversa',
    
    // Calendar
    'calendar.title': 'Calendário',
    'calendar.today': 'Hoje',
    'calendar.month': 'Mês',
    'calendar.week': 'Semana',
    'calendar.day': 'Dia',
    'calendar.list': 'Lista',
    'calendar.newReservation': 'Nova Reserva',
    'calendar.newBlock': 'Novo Bloqueio',
    'calendar.selectProperty': 'Selecione um imóvel',
    
    // Dashboard
    'dashboard.welcome': 'Bem-vindo ao RENDIZY',
    'dashboard.overview': 'Visão Geral',
    'dashboard.todayReservations': 'Reservas Hoje',
    'dashboard.occupancy': 'Ocupação',
    'dashboard.revenue': 'Receita',
    'dashboard.guests': 'Hóspedes',
    
    // Settings
    'settings.title': 'Configurações',
    'settings.general': 'Geral',
    'settings.language': 'Idioma',
    'settings.theme': 'Tema',
    'settings.notifications': 'Notificações',
    'settings.account': 'Conta',
    
    // Languages
    'language.pt-BR': 'Português',
    'language.en-US': 'English',
    'language.es-ES': 'Español',
  },
  
  'en-US': {
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.actions': 'Actions',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.success': 'Success',
    'common.error': 'Error',
    'common.warning': 'Warning',
    'common.info': 'Information',
    
    // Sidebar
    'sidebar.dashboard': 'Dashboard',
    'sidebar.calendar': 'Calendar',
    'sidebar.reservations': 'Reservations',
    'sidebar.guests': 'Guests',
    'sidebar.properties': 'Properties',
    'sidebar.locations': 'Locations',
    'sidebar.chat': 'Message Center',
    'sidebar.settings': 'Settings',
    
    // Guests
    'guests.title': 'Guests',
    'guests.subtitle': 'Manage guest records',
    'guests.new': 'New Guest',
    'guests.total': 'Total',
    'guests.filtered': 'Filtered',
    'guests.search': 'Search by name, email, phone, document...',
    'guests.noResults': 'No guests found',
    'guests.clearSearch': 'Clear search',
    'guests.reservations': '{count} {count, plural, one {reservation} other {reservations}}',
    'guests.lastStay': 'Last stay',
    'guests.history': 'History',
    'guests.editGuest': 'Edit Guest',
    'guests.newGuest': 'New Guest',
    'guests.updateInfo': 'Update guest information',
    'guests.registerNew': 'Register a new guest in the system',
    'guests.deleteConfirm': 'Are you sure you want to delete this guest?',
    'guests.deleteSuccess': 'Guest deleted successfully',
    'guests.createSuccess': 'Guest created successfully',
    'guests.updateSuccess': 'Guest updated successfully',
    'guests.deleteError': 'Error deleting guest',
    'guests.createError': 'Error creating guest',
    'guests.updateError': 'Error updating guest',
    'guests.loadError': 'Error loading guests',
    'guests.fillRequired': 'Please fill in the required fields',
    
    // Guest Form
    'guestForm.basicInfo': 'Basic Information',
    'guestForm.firstName': 'First Name',
    'guestForm.lastName': 'Last Name',
    'guestForm.email': 'Email',
    'guestForm.phone': 'Phone',
    'guestForm.documentation': 'Documentation',
    'guestForm.cpf': 'CPF',
    'guestForm.rg': 'ID',
    'guestForm.passport': 'Passport',
    'guestForm.birthDate': 'Birth Date',
    'guestForm.nationality': 'Nationality',
    'guestForm.address': 'Address',
    'guestForm.city': 'City',
    'guestForm.country': 'Country',
    'guestForm.notes': 'Notes',
    'guestForm.notesPlaceholder': 'Additional information about the guest...',
    'guestForm.addressComingSoon': 'Full address will be implemented soon',
    
    // Reservations History
    'history.title': 'Reservations History',
    'history.noReservations': 'No reservations found',
    'history.nights': '{count} {count, plural, one {night} other {nights}}',
    'history.status.confirmed': 'Confirmed',
    'history.status.pending': 'Pending',
    'history.status.cancelled': 'Cancelled',
    
    // Chat
    'chat.title': 'Message Center',
    'chat.searchConversations': 'Search conversations...',
    'chat.allConversations': 'All conversations',
    'chat.unread': 'Unread',
    'chat.resolved': 'Resolved',
    'chat.typeMessage': 'Type your message...',
    'chat.send': 'Send',
    'chat.internalNote': 'Internal note (visible to team only)',
    'chat.attachment': 'Attachment',
    'chat.uploadSuccess': 'File uploaded successfully',
    'chat.uploadError': 'Error uploading file',
    'chat.messageSent': 'Message sent',
    'chat.messageError': 'Error sending message',
    'chat.templates': 'Templates',
    'chat.tags': 'Tags',
    'chat.newConversation': 'New Conversation',
    'chat.markAsRead': 'Mark as read',
    'chat.markAsResolved': 'Mark as resolved',
    'chat.delete': 'Delete conversation',
    
    // Calendar
    'calendar.title': 'Calendar',
    'calendar.today': 'Today',
    'calendar.month': 'Month',
    'calendar.week': 'Week',
    'calendar.day': 'Day',
    'calendar.list': 'List',
    'calendar.newReservation': 'New Reservation',
    'calendar.newBlock': 'New Block',
    'calendar.selectProperty': 'Select a property',
    
    // Dashboard
    'dashboard.welcome': 'Welcome to RENDIZY',
    'dashboard.overview': 'Overview',
    'dashboard.todayReservations': 'Today\'s Reservations',
    'dashboard.occupancy': 'Occupancy',
    'dashboard.revenue': 'Revenue',
    'dashboard.guests': 'Guests',
    
    // Settings
    'settings.title': 'Settings',
    'settings.general': 'General',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.notifications': 'Notifications',
    'settings.account': 'Account',
    
    // Languages
    'language.pt-BR': 'Português',
    'language.en-US': 'English',
    'language.es-ES': 'Español',
  },
  
  'es-ES': {
    // Common
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.actions': 'Acciones',
    'common.close': 'Cerrar',
    'common.back': 'Volver',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.confirm': 'Confirmar',
    'common.yes': 'Sí',
    'common.no': 'No',
    'common.success': 'Éxito',
    'common.error': 'Error',
    'common.warning': 'Advertencia',
    'common.info': 'Información',
    
    // Sidebar
    'sidebar.dashboard': 'Panel',
    'sidebar.calendar': 'Calendario',
    'sidebar.reservations': 'Reservas',
    'sidebar.guests': 'Huéspedes',
    'sidebar.properties': 'Propiedades',
    'sidebar.locations': 'Ubicaciones',
    'sidebar.chat': 'Centro de Mensajes',
    'sidebar.settings': 'Configuración',
    
    // Guests
    'guests.title': 'Huéspedes',
    'guests.subtitle': 'Gestionar registros de huéspedes',
    'guests.new': 'Nuevo Huésped',
    'guests.total': 'Total',
    'guests.filtered': 'Filtrados',
    'guests.search': 'Buscar por nombre, email, teléfono, documento...',
    'guests.noResults': 'No se encontraron huéspedes',
    'guests.clearSearch': 'Limpiar búsqueda',
    'guests.reservations': '{count} {count, plural, one {reserva} other {reservas}}',
    'guests.lastStay': 'Última estadía',
    'guests.history': 'Historial',
    'guests.editGuest': 'Editar Huésped',
    'guests.newGuest': 'Nuevo Huésped',
    'guests.updateInfo': 'Actualizar información del huésped',
    'guests.registerNew': 'Registrar un nuevo huésped en el sistema',
    'guests.deleteConfirm': '¿Está seguro de que desea eliminar este huésped?',
    'guests.deleteSuccess': 'Huésped eliminado con éxito',
    'guests.createSuccess': 'Huésped creado con éxito',
    'guests.updateSuccess': 'Huésped actualizado con éxito',
    'guests.deleteError': 'Error al eliminar huésped',
    'guests.createError': 'Error al crear huésped',
    'guests.updateError': 'Error al actualizar huésped',
    'guests.loadError': 'Error al cargar huéspedes',
    'guests.fillRequired': 'Por favor complete los campos obligatorios',
    
    // Guest Form
    'guestForm.basicInfo': 'Información Básica',
    'guestForm.firstName': 'Nombre',
    'guestForm.lastName': 'Apellido',
    'guestForm.email': 'Email',
    'guestForm.phone': 'Teléfono',
    'guestForm.documentation': 'Documentación',
    'guestForm.cpf': 'CPF',
    'guestForm.rg': 'Documento',
    'guestForm.passport': 'Pasaporte',
    'guestForm.birthDate': 'Fecha de Nacimiento',
    'guestForm.nationality': 'Nacionalidad',
    'guestForm.address': 'Dirección',
    'guestForm.city': 'Ciudad',
    'guestForm.country': 'País',
    'guestForm.notes': 'Observaciones',
    'guestForm.notesPlaceholder': 'Información adicional sobre el huésped...',
    'guestForm.addressComingSoon': 'La dirección completa se implementará pronto',
    
    // Reservations History
    'history.title': 'Historial de Reservas',
    'history.noReservations': 'No se encontraron reservas',
    'history.nights': '{count} {count, plural, one {noche} other {noches}}',
    'history.status.confirmed': 'Confirmada',
    'history.status.pending': 'Pendiente',
    'history.status.cancelled': 'Cancelada',
    
    // Chat
    'chat.title': 'Centro de Mensajes',
    'chat.searchConversations': 'Buscar conversaciones...',
    'chat.allConversations': 'Todas las conversaciones',
    'chat.unread': 'No leídas',
    'chat.resolved': 'Resueltas',
    'chat.typeMessage': 'Escriba su mensaje...',
    'chat.send': 'Enviar',
    'chat.internalNote': 'Nota interna (visible solo para el equipo)',
    'chat.attachment': 'Adjunto',
    'chat.uploadSuccess': 'Archivo enviado con éxito',
    'chat.uploadError': 'Error al enviar archivo',
    'chat.messageSent': 'Mensaje enviado',
    'chat.messageError': 'Error al enviar mensaje',
    'chat.templates': 'Plantillas',
    'chat.tags': 'Etiquetas',
    'chat.newConversation': 'Nueva Conversación',
    'chat.markAsRead': 'Marcar como leída',
    'chat.markAsResolved': 'Marcar como resuelta',
    'chat.delete': 'Eliminar conversación',
    
    // Calendar
    'calendar.title': 'Calendario',
    'calendar.today': 'Hoy',
    'calendar.month': 'Mes',
    'calendar.week': 'Semana',
    'calendar.day': 'Día',
    'calendar.list': 'Lista',
    'calendar.newReservation': 'Nueva Reserva',
    'calendar.newBlock': 'Nuevo Bloqueo',
    'calendar.selectProperty': 'Seleccione una propiedad',
    
    // Dashboard
    'dashboard.welcome': 'Bienvenido a RENDIZY',
    'dashboard.overview': 'Resumen',
    'dashboard.todayReservations': 'Reservas de Hoy',
    'dashboard.occupancy': 'Ocupación',
    'dashboard.revenue': 'Ingresos',
    'dashboard.guests': 'Huéspedes',
    
    // Settings
    'settings.title': 'Configuración',
    'settings.general': 'General',
    'settings.language': 'Idioma',
    'settings.theme': 'Tema',
    'settings.notifications': 'Notificaciones',
    'settings.account': 'Cuenta',
    
    // Languages
    'language.pt-BR': 'Português',
    'language.en-US': 'English',
    'language.es-ES': 'Español',
  },
};

// ============================================
// CONTEXT
// ============================================

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Get from localStorage or browser language or default to pt-BR
    const stored = localStorage.getItem('rendizy-language');
    if (stored && (stored === 'pt-BR' || stored === 'en-US' || stored === 'es-ES')) {
      return stored as Language;
    }
    
    // Try to get from browser
    const browserLang = navigator.language;
    if (browserLang.startsWith('pt')) return 'pt-BR';
    if (browserLang.startsWith('es')) return 'es-ES';
    if (browserLang.startsWith('en')) return 'en-US';
    
    return 'pt-BR';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('rendizy-language', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || key;
    
    // Simple parameter replacement
    if (params) {
      Object.keys(params).forEach(paramKey => {
        text = text.replace(`{${paramKey}}`, String(params[paramKey]));
      });
      
      // Simple plural handling
      if (params.count !== undefined) {
        const count = params.count as number;
        const pluralMatch = text.match(/\{count, plural, one \{([^}]+)\} other \{([^}]+)\}\}/);
        if (pluralMatch) {
          const [, one, other] = pluralMatch;
          text = text.replace(pluralMatch[0], count === 1 ? one : other);
        }
      }
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
