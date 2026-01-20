/**
 * RENDIZY - Emergency Home Button
 * 
 * Botão de emergência que SEMPRE permite voltar ao dashboard
 * Aparece fixo no canto superior direito
 * 
 * @version 1.0.103.147
 * @date 2025-10-31
 */

import { Home, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

export function EmergencyHomeButton() {
  const [isVisible, setIsVisible] = useState(true);
  const navigate = useNavigate();

  const goHome = () => {
    // Tentar múltiplas estratégias de navegação
    try {
      // 1. Tentar navigate do React Router
      navigate('/');
    } catch (e) {
      // 2. Se falhar, forçar redirecionamento
      window.location.href = '/';
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2">
      {/* Mensagem de ajuda */}
      <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg text-sm flex items-center gap-2">
        <span className="font-medium">Perdido? Clique aqui →</span>
      </div>
      
      {/* Botão de voltar ao dashboard */}
      <Button
        onClick={goHome}
        size="lg"
        className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all h-12 px-6 flex items-center gap-2"
      >
        <Home className="h-5 w-5" />
        <span className="font-semibold">Voltar ao Dashboard</span>
      </Button>

      {/* Botão de fechar */}
      <Button
        onClick={() => setIsVisible(false)}
        variant="ghost"
        size="icon"
        className="h-8 w-8 bg-white/80 hover:bg-white shadow"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
