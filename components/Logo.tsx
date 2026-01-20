import React from 'react';

interface LogoProps {
  /**
   * Tamanho do logo (pequeno, médio, grande)
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Mostrar apenas o ícone (sem o texto)
   */
  iconOnly?: boolean;
  /**
   * Mostrar apenas o texto (sem o ícone)
   */
  textOnly?: boolean;
  /**
   * Orientação: horizontal (padrão) ou vertical
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Classe CSS adicional
   */
  className?: string;
  /**
   * Usar logo customizada do localStorage
   */
  useCustom?: boolean;
}

/**
 * Componente Logo da RENDIZY
 * Exibe o logo com ícone de casa e texto "RENDIZY"
 * Pode ser usado de forma modular (ícone separado do texto)
 */
export function Logo({
  size = 'md',
  iconOnly = false,
  textOnly = false,
  orientation = 'horizontal',
  className = '',
  useCustom = false
}: LogoProps) {
  // Tamanhos predefinidos - proporção ajustada para melhor harmonia visual
  const sizeClasses = {
    sm: {
      icon: 'h-8 w-8',
      text: 'text-xl',
      gap: 'gap-2'
    },
    md: {
      icon: 'h-12 w-12',
      text: 'text-2xl',
      gap: 'gap-3'
    },
    lg: {
      icon: 'h-12 w-12', // Reduzido para h-12 (48px) - proporção mais harmoniosa
      text: 'text-5xl',  // Aumentado para text-5xl (48px) - mesmo tamanho visual que o ícone
      gap: 'gap-3'       // Gap reduzido para aproximar ícone e texto
    },
    xl: {
      icon: 'h-16 w-16',
      text: 'text-6xl',  // Proporção mantida para xl
      gap: 'gap-4'
    }
  };

  const currentSize = sizeClasses[size];

  // Tentar carregar logo customizada do localStorage
  const [customLogo, setCustomLogo] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    if (useCustom) {
      const savedLogo = localStorage.getItem('rendizy-logo');
      if (savedLogo) {
        setCustomLogo(savedLogo);
      }
      
      // Listener para mudanças no localStorage
      const handleStorageChange = () => {
        const logo = localStorage.getItem('rendizy-logo');
        setCustomLogo(logo);
      };
      
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [useCustom]);

  // Se houver logo customizada e useCustom=true, usar ela
  if (customLogo && useCustom) {
    return (
      <img 
        src={customLogo} 
        alt="RENDIZY" 
        className={`object-contain ${currentSize.icon} ${className}`}
      />
    );
  }

  // Container flex baseado na orientação
  const containerClass = orientation === 'horizontal' 
    ? `flex items-center ${currentSize.gap} ${className}`
    : `flex flex-col items-center ${currentSize.gap} ${className}`;

  return (
    <div className={containerClass}>
      {/* Ícone - Casa */}
      {!textOnly && (
        <div className={`${currentSize.icon} flex-shrink-0`}>
          {/* SVG original - Logo marca Rendizy - Casa minimalista em #363E46 */}
          <svg
            version="1.0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 310.000000 1024.000000"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full"
          >
            <g transform="translate(0.000000,1024.000000) scale(0.100000,-0.100000)" fill="#363E46" stroke="none">
              <path d="M2275 5561 l-270 -169 -3 -436 -2 -436 88 0 88 0 -4 379 c-4 360 -3 379 14 396 11 10 96 66 191 126 l172 108 185 -117 185 -117 1 -302 0 -303 -280 0 -280 0 0 -85 0 -85 370 0 370 0 0 434 0 434 -275 171 c-152 94 -276 171 -278 171 -1 0 -123 -76 -272 -169z" />
            </g>
          </svg>
        </div>
      )}

      {/* Texto - RENDIZY */}
      {!iconOnly && (
        <span 
          className={`font-bold uppercase tracking-tight ${currentSize.text} ${className}`}
          style={{ color: '#363E46' }}
        >
          RENDIZY
        </span>
      )}
    </div>
  );
}

/**
 * Componente LogoIcon - Apenas o ícone
 */
export function LogoIcon({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <Logo iconOnly size={size} className={className} />;
}

/**
 * Componente LogoText - Apenas o texto
 */
export function LogoText({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  return <Logo textOnly size={size} className={className} />;
}
