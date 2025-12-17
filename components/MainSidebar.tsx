import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Wallet,
  CheckSquare,
  Users,
  Bell,
  Settings,
  LifeBuoy,
  FolderKanban,
  ClipboardList,
  TrendingUp,
  Zap,
  Grid3x3,
  Database,
  ChevronRight,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  Building2,
  ChevronLeft,
  FolderOpen,
  Ban,
  CreditCard,
  Mail,
  Printer,
  User,
  Home,
  Image,
  Inbox,
  Plus,
  AlertCircle,
  Star,
  Award,
  ClipboardCheck,
  ImageIcon,
  PieChart,
  UserCircle,
  Download,
  Phone,
  FileText,
  UserCheck,
  Shield,
  Activity,
  LogIn,
  Crown,
  DollarSign,
  CheckSquare as CheckSquareIcon,
  Users as UsersIcon,
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { cn } from './ui/utils';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { AdvancedSearchDropdown, SearchResult } from './AdvancedSearchDropdown';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
// import rendizyLogo from '/assets/57eefd69a2e74079e948ce1356622b7f42644fd5.png'; // CORREÇÃO: Comentado para evitar erro de build do Vercel (Rollup failed to resolve import)
import { Logo, LogoIcon, LogoText } from './Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  badge?: string;
  submenu?: SubMenuItem[];
  isExternalModule?: boolean;
  externalPath?: string;
}

interface SubMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface MainSidebarProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onSearchReservation?: (query: string) => Promise<boolean>;
  onAdvancedSearch?: (query: string) => any[];
}

export function MainSidebar({
  activeModule,
  onModuleChange,
  collapsed = false,
  onToggleCollapse,
  onSearchReservation,
  onAdvancedSearch
}: MainSidebarProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<number>(7);

  // Carregar logo personalizada do localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem('rendizy-logo');
    const savedSize = localStorage.getItem('rendizy-logo-size');
    
    if (savedLogo) setCustomLogo(savedLogo);
    if (savedSize) setLogoSize(parseInt(savedSize));

    // Listener para mudanças no localStorage (sincroniza entre tabs/componentes)
    const handleStorageChange = () => {
      const logo = localStorage.getItem('rendizy-logo');
      const size = localStorage.getItem('rendizy-logo-size');
      setCustomLogo(logo);
      setLogoSize(size ? parseInt(size) : 7);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [highlightedSearchIndex, setHighlightedSearchIndex] = useState(0);

  // Simulação: verificar se é usuário Master RENDIZY
  // TODO: Integrar com AuthContext quando backend estiver pronto
  const isMasterUser = true; // Temporariamente true para você testar
  // const { user, organization } = useAuth();
  // const isMasterUser = user?.role === 'super_admin' && organization?.slug === 'rendizy';

  console.log('� [MainSidebar] RENDERIZANDO - v1.0.103.334 - REBUILD');
  console.log('🚨 [MainSidebar] isMasterUser:', isMasterUser);

  // Organizar menu items em seções com design monocromático (fundo escuro, ícone branco)
  const menuSections = [
    {
      title: '🔥 PRINCIPAL',
      items: [
        // Admin Master - APENAS para usuário RENDIZY master
        ...(isMasterUser ? [{
          id: 'admin-master',
          label: 'Admin Master',
          icon: Crown,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]'
        }] : []),
        {
          id: 'painel-inicial',
          label: 'Dashboard',
          icon: LayoutDashboard,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]'
        },
        {
          id: 'calendario',
          label: 'Calendário',
          icon: Calendar,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]',
          badge: '12'
        },
        {
          id: 'central-reservas',
          label: 'Reservas',
          icon: ClipboardList,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]'
        },
        {
          id: 'central-mensagens',
          label: 'Chat',
          icon: Mail,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]',
          badge: '8'
        },
        {
          id: 'imoveis',
          label: 'Locais e Anúncios',
          icon: Building2,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]'
        },
        {
          id: 'anuncio-ultimate',
          label: 'Anúncio Ultimate',
          icon: Plus,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]'
        },
        {
          id: 'motor-reservas',
          label: 'Edição de site',
          icon: Zap,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]'
        },
        {
          id: 'precos-em-lote',
          label: 'Preços em Lote',
          icon: TrendingUp,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]',
          badge: 'NEW'
        },
        {
          id: 'promocoes',
          label: 'Promoções',
          icon: Star,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]'
        },
        {
          id: 'financeiro',
          label: 'Finanças',
          icon: Wallet,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]',
          badge: 'BETA'
        }
      ]
    },
    {
      title: 'Operacional',
      items: [
        {
          id: 'usuarios-hospedes',
          label: 'Usuários e Clientes',
          icon: Users,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]',
          submenu: [
            { id: 'usuarios-usuarios', label: 'Usuários', icon: UserCircle },
            { id: 'usuarios-clientes', label: 'Clientes e Hóspedes', icon: Users },
            { id: 'usuarios-proprietarios', label: 'Proprietários', icon: Building2 },
            { id: 'usuarios-documentos-listas', label: 'Documentos e Listas de Clientes', icon: FileText }
          ]
        },
        {
          id: 'notificacoes',
          label: 'Notificações',
          icon: Bell,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]',
          badge: '14'
        },
        {
          id: 'catalogo',
          label: 'Catálogo',
          icon: FolderKanban,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]',
          submenu: [
            { id: 'catalogo-grupos', label: 'Grupos', icon: FolderOpen },
            { id: 'catalogo-restricoes', label: 'Restrições dos Proprietários', icon: Ban },
            { id: 'catalogo-regras', label: 'Regras Tarifárias', icon: CreditCard },
            { id: 'catalogo-emails', label: 'Modelos de E-mail', icon: Mail },
            { id: 'catalogo-impressao', label: 'Modelos para Impressão', icon: Printer },
            { id: 'catalogo-midia', label: 'Gerenciador de Mídia', icon: Image }
          ]
        }
      ]
    },
    {
      title: '⚡ MÓDULOS AVANÇADOS',
      items: [
        {
          id: 'modulo-crm-tasks',
          label: 'CRM & Tasks',
          icon: UsersIcon,
          iconColor: 'text-white',
          iconBg: 'bg-gradient-to-br from-purple-500 to-violet-600',
          badge: 'BETA',
          isExternalModule: true,
          externalPath: '/crm'
        },
        {
          id: 'modulo-automacoes',
          label: 'Automações',
          icon: Zap,
          iconColor: 'text-white',
          iconBg: 'bg-gradient-to-br from-pink-500 to-orange-500',
          badge: 'BETA',
          isExternalModule: true,
          externalPath: '/crm/automacoes-chat'
        },
        {
          id: 'modulo-bi',
          label: 'BI & Relatórios',
          icon: BarChart3,
          iconColor: 'text-white',
          iconBg: 'bg-gradient-to-br from-indigo-500 to-blue-600',
          badge: 'BETA',
          isExternalModule: true,
          externalPath: '/bi'
        }
      ]
    },
    {
      title: 'Avançado',
      items: [
        {
          id: 'app-center',
          label: 'Loja de apps',
          icon: Grid3x3,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]'
        },
        {
          id: 'configuracoes',
          label: 'Configurações',
          icon: Settings,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]'
        },
        {
          id: 'assistentes',
          label: 'Suporte',
          icon: LifeBuoy,
          iconColor: 'text-white',
          iconBg: 'bg-[#3d4451] dark:bg-[#4a5568]',
          submenu: [
            { id: 'assistentes-duplicados', label: 'E-mails Duplicados', icon: UserCheck },
            { id: 'assistentes-perfis', label: 'Perfis de Cadastro', icon: FileText },
            { id: 'assistentes-permissoes', label: 'Funções e Permissões', icon: Shield },
            { id: 'assistentes-online', label: 'Usuários Online', icon: Activity },
            { id: 'assistentes-atividade', label: 'Atividade dos Usuários', icon: Activity },
            { id: 'assistentes-historico', label: 'Histórico de Login', icon: LogIn }
          ]
        },
      ]
    }
  ];

  console.log('📋 [MainSidebar] Menu Sections criado:', menuSections.length, 'seções');
  console.log('📋 [MainSidebar] Seção Principal tem', menuSections[0]?.items?.length, 'itens');
  console.log('📋 [MainSidebar] Item "Anúncio Ultimate":', menuSections[0]?.items?.find(i => i.id === 'anuncio-ultimate'));
  console.log('📋 [MainSidebar] Seção Módulos Avançados:', menuSections.find(s => s.title === 'Módulos Avançados'));
  console.log('📋 [MainSidebar] Item "Automações":', menuSections.find(s => s.title === 'Módulos Avançados')?.items?.find(i => i.id === 'modulo-automacoes'));

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuId)
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    );
  };

  // Mapa de módulo para URL
  const MODULE_TO_URL: Record<string, string> = {
    'painel-inicial': '/',
    'admin-master': '/admin',
    'calendario': '/calendario',
    'central-reservas': '/reservations',
    'central-mensagens': '/chat',
    'imoveis': '/properties',
    'locations-manager': '/locations',
    'precificacao-lote': '/pricing',
    'integracoes-bookingcom': '/integrations',
    'motor-reservas': '/sites-clientes',
    'precos-em-lote': '/pricing',
    'anuncio-ultimate': '/anuncios-ultimate/lista',
    'promocoes': '/calendar',
    'financeiro': '/financeiro',
    'hospedes': '/guests',
    'bi-analytics': '/bi',
    'configuracoes': '/settings',
    // ✅ ROTAS USUÁRIOS E CLIENTES - v1.0.103.335
    'usuarios-usuarios': '/usuarios',
    'usuarios-clientes': '/clientes-hospedes',
    'usuarios-proprietarios': '/proprietarios',
    'usuarios-documentos-listas': '/documentos-listas',
  };

  const handleMenuClick = (menuId: string, hasSubmenu: boolean, item?: MenuItem) => {
    console.log('🖱️ Menu clicado:', menuId, 'hasSubmenu:', hasSubmenu);
    
    if (hasSubmenu) {
      toggleMenu(menuId);
    } else if (item?.isExternalModule && item.externalPath) {
      // Abrir módulo em nova aba
      console.log('🌐 Abrindo módulo externo:', item.externalPath);
      window.open(item.externalPath, '_blank');
      setMobileOpen(false);
    } else {
      console.log('✅ Mudando para módulo:', menuId);
      onModuleChange(menuId);
      
      // 🔥 NAVEGAÇÃO FORÇADA - Usa window.location para GARANTIR que funciona
      const url = MODULE_TO_URL[menuId] || '/';
      console.log('🚀 Navegando para URL (window.location):', url);
      
      // Tentar navigate primeiro (mais suave)
      try {
        navigate(url);
      } catch (e) {
        // Fallback para window.location se navigate falhar
        console.warn('⚠️ Navigate falhou, usando window.location');
        window.location.href = url;
      }
      
      setMobileOpen(false);
    }
  };

  const handleSubmenuClick = (submenuId: string) => {
    console.log('🖱️ Submenu clicado:', submenuId);
    onModuleChange(submenuId);
    
    // 🔥 NAVEGAÇÃO FORÇADA - Usa window.location para GARANTIR que funciona
    const url = MODULE_TO_URL[submenuId] || '/';
    console.log('🚀 Navegando para URL (window.location):', url);
    
    // Tentar navigate primeiro (mais suave)
    try {
      navigate(url);
    } catch (e) {
      // Fallback para window.location se navigate falhar
      console.warn('⚠️ Navigate falhou, usando window.location');
      window.location.href = url;
    }
    
    setMobileOpen(false);
  };

  const isMenuActive = (menuId: string, submenu?: SubMenuItem[]) => {
    if (activeModule === menuId) return true;
    if (submenu) {
      return submenu.some(item => item.id === activeModule);
    }
    return false;
  };

  // Handler para mudança no input de busca
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    // Se query for muito curta, fechar dropdown
    if (value.trim().length < 2) {
      setShowSearchDropdown(false);
      setSearchResults([]);
      return;
    }

    // Executar busca avançada
    if (onAdvancedSearch) {
      const results = onAdvancedSearch(value);
      
      // Converter para formato SearchResult
      const searchResults: SearchResult[] = results.map(r => ({
        type: r.type,
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        icon: r.icon === 'Calendar' ? Calendar : 
              r.icon === 'User' ? User : 
              r.icon === 'Home' ? Home : Search,
        data: r.data
      }));
      
      setSearchResults(searchResults);
      setShowSearchDropdown(searchResults.length > 0);
      setHighlightedSearchIndex(0);
    }
  };

  // Handler para seleção de resultado
  const handleSelectResult = async (result: SearchResult) => {
    console.log('🎯 Resultado selecionado:', result);
    
    if (result.type === 'reservation' && result.data) {
      // Buscar reserva usando a função existente
      if (onSearchReservation) {
        await onSearchReservation(result.data.id);
      }
    } else if (result.type === 'property' && result.data) {
      // Navegar para o calendário com a propriedade selecionada
      onModuleChange('calendario');
      // TODO: Implementar seleção da propriedade
    } else if (result.type === 'guest' && result.data) {
      // Abrir reserva do hóspede
      if (onSearchReservation) {
        await onSearchReservation(result.data.id);
      }
    }
    
    // Fechar dropdown e limpar busca
    setShowSearchDropdown(false);
    setSearchQuery('');
  };

  // Handler para Enter no campo de busca
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchDropdown || searchResults.length === 0) {
      // Se não há dropdown, fazer busca simples por código
      if (e.key === 'Enter' && onSearchReservation) {
        const reservationCodePattern = /^RSV-[A-Z0-9]{6}$/i;
        if (reservationCodePattern.test(searchQuery.trim())) {
          handleSearch(searchQuery);
        }
      }
      return;
    }

    // Navegação no dropdown
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedSearchIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedSearchIndex(prev => prev > 0 ? prev - 1 : 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[highlightedSearchIndex]) {
        handleSelectResult(searchResults[highlightedSearchIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
      setSearchQuery('');
    }
  };

  // Handler para busca - detecta códigos de reserva
  const handleSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    
    // Verificar se é um código de reserva (RSV-XXXXXX)
    const reservationCodePattern = /^RSV-[A-Z0-9]{6}$/i;
    
    if (reservationCodePattern.test(trimmedQuery) && onSearchReservation) {
      // Tentar buscar a reserva
      const found = await onSearchReservation(trimmedQuery);
      if (found) {
        // Limpar busca se encontrou
        setSearchQuery('');
        setShowSearchDropdown(false);
      }
    }
  };

  // Filtrar seções e itens do menu baseado na busca
  const filteredSections = menuSections.map(section => {
    if (!searchQuery.trim()) {
      return section; // Sem busca, retornar tudo
    }
    
    const query = searchQuery.toLowerCase();
    const filteredItems = section.items.filter(item => {
      // Buscar no label do item
      if (item.label.toLowerCase().includes(query)) return true;
      
      // Buscar nos subitens
      if (item.submenu) {
        return item.submenu.some(sub => sub.label.toLowerCase().includes(query));
      }
      
      return false;
    });
    
    return {
      ...section,
      items: filteredItems
    };
  }).filter(section => section.items.length > 0); // Remover seções vazias

  const renderMenuItem = (item: MenuItem, isDark: boolean) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = isMenuActive(item.id, item.submenu);
    const Icon = item.icon;

    const buttonContent = (
      <button
        onClick={() => handleMenuClick(item.id, !!hasSubmenu, item)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative",
          collapsed && "justify-center px-2",
          isDark ? [
            "hover:bg-white/10 group",
            isActive && "bg-blue-500/20 hover:bg-blue-500/30",
            !isActive && ""
          ] : [
            "hover:bg-gray-100 group",
            isActive && "bg-blue-50 hover:bg-blue-100",
            !isActive && ""
          ]
        )}
      >
        {isActive && !collapsed && (
          <div className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full",
            isDark ? "bg-blue-400" : "bg-blue-600"
          )} />
        )}
        
        {/* Ícone colorido em círculo */}
        <div className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all shadow-sm",
          item.iconBg || (isDark ? "bg-gray-700" : "bg-gray-200"),
          collapsed && "h-10 w-10"
        )}>
          <Icon className={cn(
            "h-5 w-5",
            item.iconColor || (isDark ? "text-gray-300" : "text-gray-600")
          )} />
        </div>
        
        {!collapsed && (
          <>
            <span className={cn(
              "flex-1 text-left text-sm",
              isDark ? "text-gray-200" : "text-gray-700"
            )}>{item.label}</span>
            
            {item.badge && (
              <span className={cn(
                "px-2 py-0.5 text-xs rounded-full font-medium",
                item.badge === 'DEV'
                  ? (isDark ? "bg-green-500/20 text-green-300" : "bg-green-100 text-green-700")
                  : item.badge === 'BETA'
                  ? (isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700")
                  : (isDark ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-600")
              )}>
                {item.badge}
              </span>
            )}
            
            {item.isExternalModule && (
              <ExternalLink className={cn(
                "h-3.5 w-3.5",
                isDark ? "text-gray-400" : "text-gray-400"
              )} />
            )}
            
            {hasSubmenu && (
              <ChevronRight className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-90",
                isDark ? "text-gray-400" : "text-gray-400"
              )} />
            )}
          </>
        )}
      </button>
    );

    return (
      <div key={item.id} className="mb-0.5">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {buttonContent}
            </TooltipTrigger>
            <TooltipContent side="right" className="flex items-center gap-2">
              <span>{item.label}</span>
              {item.badge && (
                <span className={cn(
                  "px-1.5 py-0.5 text-xs rounded-full",
                  item.badge === 'DEV' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                )}>
                  {item.badge}
                </span>
              )}
            </TooltipContent>
          </Tooltip>
        ) : (
          buttonContent
        )}

        {/* Submenu */}
        {hasSubmenu && isExpanded && !collapsed && (
          <div className="ml-8 mt-1 mb-2 space-y-0.5">
            {item.submenu!.map(subItem => {
              const SubIcon = subItem.icon;
              const isSubActive = activeModule === subItem.id;
              
              return (
                <button
                  key={subItem.id}
                  onClick={() => handleSubmenuClick(subItem.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all text-sm",
                    isDark ? [
                      "hover:bg-white/5",
                      isSubActive && "bg-blue-500/10 text-blue-300 hover:bg-blue-500/20",
                      !isSubActive && "text-gray-400"
                    ] : [
                      "hover:bg-gray-100",
                      isSubActive && "bg-blue-50 text-blue-600 hover:bg-blue-100",
                      !isSubActive && "text-gray-600"
                    ]
                  )}
                >
                  <SubIcon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isSubActive 
                      ? (isDark ? "text-blue-300" : "text-blue-600")
                      : (isDark ? "text-gray-500" : "text-gray-400")
                  )} />
                  <span className="truncate">{subItem.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const isDark = theme === 'dark';

  // Componente de Perfil do Usuário Colapsado
  function UserProfileSectionCollapsed({ isDark }: { isDark: boolean }) {
    const { user, logout, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    const handleLogout = async () => {
      try {
        setIsLoggingOut(true);
        await logout();
        toast.success('✅ Logout realizado com sucesso!');
        navigate('/login');
      } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        toast.error('❌ Erro ao fazer logout');
      } finally {
        setIsLoggingOut(false);
      }
    };

    const getInitials = (name: string) => {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    const userName = user?.name || 'Usuário';
    const userEmail = user?.email || 'usuario@rendizy.com';
    const userInitials = getInitials(userName);

    return (
      <div className={cn(
        "p-4 flex justify-center",
        isDark ? "border-t border-gray-700" : "border-t border-gray-200"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className={cn(
                    "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center ring-2 transition-transform hover:scale-110",
                    isSuperAdmin 
                      ? "from-purple-500 to-pink-600" 
                      : "from-blue-500 to-purple-600",
                    isDark ? "ring-gray-700" : "ring-white"
                  )}>
                    {isSuperAdmin ? (
                      <Crown className="h-5 w-5 text-white" />
                    ) : (
                      <span className="text-sm font-medium text-white">{userInitials}</span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{userName}</p>
                  <p className="text-xs text-gray-400">{userEmail}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent 
            align="end" 
            side="right"
            className={cn(
              "w-56",
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            )}
          >
            <DropdownMenuLabel className={cn(
              isDark ? "text-gray-200" : "text-gray-900"
            )}>
              Minha Conta
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator className={isDark ? "bg-gray-700" : "bg-gray-200"} />
            
            <div className="px-2 py-1.5">
              <p className={cn(
                "text-sm font-medium",
                isDark ? "text-gray-200" : "text-gray-900"
              )}>
                {userName}
              </p>
              <p className={cn(
                "text-xs",
                isDark ? "text-gray-400" : "text-gray-500"
              )}>
                {userEmail}
              </p>
            </div>
            
            <DropdownMenuSeparator className={isDark ? "bg-gray-700" : "bg-gray-200"} />
            
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className={cn(
                isDark 
                  ? "text-gray-200 focus:bg-gray-700 focus:text-white" 
                  : "text-gray-700 focus:bg-gray-100 focus:text-gray-900"
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => navigate('/admin')}
              className={cn(
                isDark 
                  ? "text-gray-200 focus:bg-gray-700 focus:text-white" 
                  : "text-gray-700 focus:bg-gray-100 focus:text-gray-900"
              )}
            >
              <UserCircle className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className={isDark ? "bg-gray-700" : "bg-gray-200"} />
            
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                "text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-700 dark:focus:text-red-300",
                isLoggingOut && "opacity-50 cursor-not-allowed"
              )}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Componente de Perfil do Usuário com Logout
  function UserProfileSection({ isDark }: { isDark: boolean }) {
    const { user, logout, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = React.useState(false);

    const handleLogout = async () => {
      try {
        setIsLoggingOut(true);
        console.log('🚪 Fazendo logout...');
        
        await logout();
        
        toast.success('✅ Logout realizado com sucesso!', {
          description: 'Até logo!'
        });
        
        navigate('/login');
      } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        toast.error('❌ Erro ao fazer logout', {
          description: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      } finally {
        setIsLoggingOut(false);
      }
    };

    // Pegar iniciais do nome
    const getInitials = (name: string) => {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    const userName = user?.name || 'Usuário';
    const userEmail = user?.email || 'usuario@rendizy.com';
    const userInitials = getInitials(userName);
    const userType = isSuperAdmin ? 'SuperAdmin' : 'Usuário';

    return (
      <div className={cn(
        "p-4",
        isDark ? "border-t border-gray-700" : "border-t border-gray-200"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
              isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
            )}>
              <div className={cn(
                "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center ring-2 flex-shrink-0",
                isSuperAdmin 
                  ? "from-purple-500 to-pink-600" 
                  : "from-blue-500 to-purple-600",
                isDark ? "ring-gray-700" : "ring-white"
              )}>
                {isSuperAdmin ? (
                  <Crown className="h-5 w-5 text-white" />
                ) : (
                  <span className="text-sm font-medium text-white">{userInitials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className={cn(
                  "text-sm font-medium truncate",
                  isDark ? "text-white" : "text-gray-900"
                )}>
                  {userName}
                </p>
                <p className={cn(
                  "text-xs truncate",
                  isDark ? "text-gray-400" : "text-gray-500"
                )}>
                  {isSuperAdmin && <span className="text-purple-400 font-medium">👑 </span>}
                  {userEmail}
                </p>
              </div>
              <ChevronRight className={cn(
                "h-4 w-4 flex-shrink-0",
                isDark ? "text-gray-400" : "text-gray-500"
              )} />
            </button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent 
            align="end" 
            className={cn(
              "w-56",
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            )}
          >
            <DropdownMenuLabel className={cn(
              isDark ? "text-gray-200" : "text-gray-900"
            )}>
              Minha Conta
            </DropdownMenuLabel>
            
            <DropdownMenuSeparator className={isDark ? "bg-gray-700" : "bg-gray-200"} />
            
            <div className="px-2 py-1.5">
              <p className={cn(
                "text-sm font-medium",
                isDark ? "text-gray-200" : "text-gray-900"
              )}>
                {userName}
              </p>
              <p className={cn(
                "text-xs",
                isDark ? "text-gray-400" : "text-gray-500"
              )}>
                {userEmail}
              </p>
              <p className={cn(
                "text-xs mt-1 px-2 py-0.5 rounded-full inline-block",
                isSuperAdmin
                  ? (isDark ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700")
                  : (isDark ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-700")
              )}>
                {userType}
              </p>
            </div>
            
            <DropdownMenuSeparator className={isDark ? "bg-gray-700" : "bg-gray-200"} />
            
            <DropdownMenuItem
              onClick={() => navigate('/settings')}
              className={cn(
                isDark 
                  ? "text-gray-200 focus:bg-gray-700 focus:text-white" 
                  : "text-gray-700 focus:bg-gray-100 focus:text-gray-900"
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={() => navigate('/admin')}
              className={cn(
                isDark 
                  ? "text-gray-200 focus:bg-gray-700 focus:text-white" 
                  : "text-gray-700 focus:bg-gray-100 focus:text-gray-900"
              )}
            >
              <UserCircle className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className={isDark ? "bg-gray-700" : "bg-gray-200"} />
            
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={cn(
                "text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-700 dark:focus:text-red-300",
                isLoggingOut && "opacity-50 cursor-not-allowed"
              )}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  const sidebarContent = (
    <TooltipProvider>
      <div className={cn(
        "flex flex-col h-screen overflow-hidden",
        isDark ? "bg-[#2d3748]" : "bg-white"
      )}>
        {/* Header - Fixo */}
      <div className={cn(
        "px-4 py-3.5 flex-shrink-0",
        isDark ? "border-b border-gray-700" : "border-b border-gray-200"
      )}>
        <div className="flex items-center gap-3">
          {!collapsed ? (
            <div className="flex items-center justify-between w-full">
              {customLogo ? (
                <img 
                  src={customLogo} 
                  alt="Rendizy" 
                  className="w-auto object-contain"
                  style={{ height: `${logoSize * 0.25}rem` }}
                />
              ) : (
                <Logo size="md" className="justify-start" />
              )}
              {onToggleCollapse && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className={cn(
                    "h-8 w-8 rounded-lg shrink-0 transition-all",
                    isDark 
                      ? "hover:bg-white/10 text-gray-300 hover:text-white" 
                      : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                  )}
                >
                  <Menu className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            onToggleCollapse && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className={cn(
                  "h-8 w-8 rounded-lg shrink-0 transition-all mx-auto",
                  isDark 
                    ? "hover:bg-white/10 text-gray-300 hover:text-white" 
                    : "hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </div>

      {/* Search - Fixo */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="relative">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 z-10",
              isDark ? "text-gray-400" : "text-gray-400"
            )} />
            <Input
              type="text"
              placeholder="Buscar imóveis, hóspedes, reservas..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchQuery.trim().length >= 2 && searchResults.length > 0) {
                  setShowSearchDropdown(true);
                }
              }}
              className={cn(
                "pl-9 h-9",
                isDark 
                  ? "bg-gray-700/50 border-gray-600 text-gray-200 placeholder:text-gray-500 focus:bg-gray-700" 
                  : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:bg-white"
              )}
            />
            
            {/* Advanced Search Dropdown */}
            <AdvancedSearchDropdown
              isOpen={showSearchDropdown}
              results={searchResults}
              query={searchQuery}
              onSelect={handleSelectResult}
              onClose={() => setShowSearchDropdown(false)}
              highlightedIndex={highlightedSearchIndex}
            />
          </div>
        </div>
      )}

      {/* Navigation - Com Scroll */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <nav className="space-y-6">
          {filteredSections.map((section, sectionIndex) => (
            <div key={section.title}>
              {!collapsed && (
                <div className={cn(
                  "px-3 mb-2 text-xs uppercase tracking-wider",
                  isDark ? "text-gray-500" : "text-gray-500"
                )}>
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => renderMenuItem(item, isDark))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Theme Toggle - Fixo no rodapé */}
      {!collapsed && (
        <div className={cn(
          "px-4 py-3 flex-shrink-0",
          isDark ? "border-t border-gray-700" : "border-t border-gray-200"
        )}>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme('light')}
              className={cn(
                "flex-1 gap-2",
                theme === 'light' 
                  ? "bg-gray-100 text-gray-900" 
                  : (isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-600")
              )}
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme('dark')}
              className={cn(
                "flex-1 gap-2",
                theme === 'dark' 
                  ? (isDark ? "bg-gray-700 text-gray-100" : "bg-gray-800 text-white")
                  : (isDark ? "text-gray-400 hover:text-gray-300" : "text-gray-600")
              )}
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
          </div>
        </div>
      )}

      {/* Footer - User Profile */}
      {!collapsed ? (
        <UserProfileSection isDark={isDark} />
      ) : (
        <UserProfileSectionCollapsed isDark={isDark} />
      )}
      </div>
    </TooltipProvider>
  );

  return (
    <>
      {/* Desktop Sidebar - Fixed */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r transition-all duration-300 fixed left-0 top-0 h-screen z-40",
          isDark ? "bg-[#2d3748] border-gray-700" : "bg-white border-gray-200",
          collapsed ? "w-20" : "w-72"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setMobileOpen(true)}
        className={cn(
          "lg:hidden fixed top-4 left-4 z-40 h-10 w-10 p-0 border shadow-sm",
          isDark ? "bg-[#2d3748] border-gray-700" : "bg-white border-gray-200"
        )}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-50"
            onClick={() => setMobileOpen(false)}
          />
          
          {/* Sidebar */}
          <aside className={cn(
            "lg:hidden fixed inset-y-0 left-0 z-50 w-72 border-r flex flex-col animate-in slide-in-from-left duration-300",
            isDark ? "bg-[#2d3748] border-gray-700" : "bg-white border-gray-200"
          )}>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
