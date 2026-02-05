/**
 * 🏗️ ConstrutoraCard - Card de Construtora
 * 
 * Componente modular para exibir informações de uma construtora
 */

import React from 'react';
import { Building2, MapPin, Star, Award, CheckCircle, ArrowRight } from 'lucide-react';
import type { Construtora } from '../../types';

interface ConstrutoraCardProps {
  construtora: Construtora;
  onSelect?: (construtora: Construtora) => void;
  onViewDetails?: (construtora: Construtora) => void;
  compact?: boolean;
}

export function ConstrutoraCard({ 
  construtora, 
  onSelect, 
  onViewDetails,
  compact = false 
}: ConstrutoraCardProps) {
  
  const statusColors = {
    open: 'bg-green-100 text-green-700 border-green-200',
    active: 'bg-blue-100 text-blue-700 border-blue-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    closed: 'bg-gray-100 text-gray-500 border-gray-200',
  };

  const statusLabels = {
    open: 'Aberto para Parcerias',
    active: 'Parceria Ativa',
    pending: 'Análise Pendente',
    closed: 'Parcerias Fechadas',
  };

  if (compact) {
    return (
      <div 
        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer"
        onClick={() => onSelect?.(construtora)}
      >
        <img 
          src={construtora.logo} 
          alt={construtora.name}
          className="w-10 h-10 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{construtora.name}</h4>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {construtora.location}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="text-sm font-medium">{construtora.rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">{construtora.launchesCount} empreend.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
      {/* Header com Logo e Status */}
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={construtora.logo} 
              alt={construtora.name}
              className="w-16 h-16 rounded-xl object-cover shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{construtora.name}</h3>
                {construtora.verified && (
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {construtora.location}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[construtora.partnershipStatus] || statusColors.open}`}>
            {statusLabels[construtora.partnershipStatus] || 'Disponível'}
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-5">
        {construtora.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {construtora.description}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-semibold">{construtora.rating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-500">{construtora.reviewsCount} avaliações</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="font-semibold">{construtora.launchesCount}</span>
            </div>
            <p className="text-xs text-gray-500">Empreendimentos</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Award className="w-4 h-4" />
              <span className="font-semibold">{construtora.commissionModel || '5%'}</span>
            </div>
            <p className="text-xs text-gray-500">Comissão</p>
          </div>
        </div>

        {/* Segmentos */}
        {construtora.segments && construtora.segments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {construtora.segments.map((segment, idx) => (
              <span 
                key={idx}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md"
              >
                {segment}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer com Ações */}
      <div className="px-5 pb-5">
        <button
          onClick={() => onViewDetails?.(construtora)}
          className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 group-hover:shadow-md"
        >
          Ver Empreendimentos
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
