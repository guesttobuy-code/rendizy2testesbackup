import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TrialBannerProps {
  trialEndsAt?: string | Date;
  onUpgrade?: () => void;
}

export function TrialBanner({ trialEndsAt, onUpgrade }: TrialBannerProps) {
  const { organization } = useAuth();
  
  // Usar trialEndsAt das props ou da organização
  const endDate = trialEndsAt 
    ? new Date(trialEndsAt) 
    : organization?.trialEndsAt 
      ? new Date(organization.trialEndsAt) 
      : null;

  // Se não está em trial ou não tem data de expiração, não mostrar
  if (!endDate || organization?.plan !== 'trial') {
    return null;
  }

  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Se trial já expirou
  if (diffDays <= 0) {
    return (
      <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4" />
        <span className="font-medium">Seu período de teste expirou!</span>
        <button
          onClick={onUpgrade}
          className="bg-white text-red-500 px-3 py-1 rounded-md font-medium hover:bg-red-50 transition-colors flex items-center gap-1"
        >
          Assinar agora
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // Últimos 3 dias - urgente
  if (diffDays <= 3) {
    return (
      <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm">
        <Clock className="h-4 w-4" />
        <span>
          <strong>{diffDays === 1 ? 'Último dia' : `${diffDays} dias restantes`}</strong> do seu período de teste!
        </span>
        <button
          onClick={onUpgrade}
          className="bg-white text-orange-600 px-3 py-1 rounded-md font-medium hover:bg-orange-50 transition-colors flex items-center gap-1"
        >
          Assinar agora
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // Entre 4 e 7 dias - atenção
  if (diffDays <= 7) {
    return (
      <div className="bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-center gap-3 text-sm">
        <Clock className="h-4 w-4" />
        <span>
          <strong>{diffDays} dias restantes</strong> do seu período de teste
        </span>
        <button
          onClick={onUpgrade}
          className="bg-yellow-900 text-white px-3 py-1 rounded-md font-medium hover:bg-yellow-800 transition-colors flex items-center gap-1"
        >
          Ver planos
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // Mais de 7 dias - informativo
  return (
    <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <Clock className="h-4 w-4" />
      <span>
        Você está no período de teste gratuito • <strong>{diffDays} dias restantes</strong>
      </span>
      <button
        onClick={onUpgrade}
        className="bg-white/20 text-white px-3 py-1 rounded-md font-medium hover:bg-white/30 transition-colors"
      >
        Ver planos
      </button>
    </div>
  );
}
