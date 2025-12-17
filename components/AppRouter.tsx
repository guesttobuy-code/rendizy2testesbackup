/**
 * RENDIZY - App Router DESABILITADO
 * 
 * ⚠️ DESABILITADO em v1.0.103.167 - estava causando loops de navegação
 * 
 * A navegação agora é feita diretamente pelo MainSidebar
 * 
 * @version 1.0.103.167
 * @date 2025-10-31
 */

interface AppRouterProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
}

export function AppRouter({ activeModule, setActiveModule }: AppRouterProps) {
  // 🔥 COMPONENTE COMPLETAMENTE DESABILITADO
  // Estava causando loops de redirecionamento e conflitos
  // A navegação agora é feita diretamente pelo MainSidebar usando navigate()
  
  console.log('📍 AppRouter desabilitado - URL atual é gerenciada pelo React Router');
  
  return null;
}