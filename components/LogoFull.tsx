import React from 'react';
import { Logo } from './Logo';

interface LogoFullProps {
  /**
   * Tamanho do logo
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
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
 * Componente LogoFull - Logo completo com ícone e texto
 * Versão simplificada para uso comum
 */
export function LogoFull({ size = 'md', className = '', useCustom = false }: LogoFullProps) {
  return (
    <Logo 
      size={size}
      orientation="horizontal"
      className={className}
      useCustom={useCustom}
    />
  );
}

