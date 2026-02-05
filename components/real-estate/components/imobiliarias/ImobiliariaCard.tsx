/**
 * 🏢 ImobiliariaCard - Card de Imobiliária
 * 
 * Componente modular para exibir informações de uma imobiliária
 */

import React from 'react';
import { Building, MapPin, Star, Users, CheckCircle, ArrowRight, Home } from 'lucide-react';
import type { Imobiliaria } from '../../types';

interface ImobiliariaCardProps {
  imobiliaria: Imobiliaria;
  onSelect?: (imobiliaria: Imobiliaria) => void;
  onViewDetails?: (imobiliaria: Imobiliaria) => void;
  compact?: boolean;
}

export function ImobiliariaCard({ 
  imobiliaria, 
  onSelect, 
  onViewDetails,
  compact = false 
}: ImobiliariaCardProps) {
  
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
        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all cursor-pointer"
        onClick={() => onSelect?.(imobiliaria)}
      >
        <img 
          src={imobiliaria.logo} 
          alt={imobiliaria.name}
          className="w-10 h-10 rounded-lg object-cover"
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{imobiliaria.name}</h4>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {imobiliaria.location}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="text-sm font-medium">{imobiliaria.rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">{imobiliaria.brokersCount} corretores</p>
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
              src={imobiliaria.logo} 
              alt={imobiliaria.name}
              className="w-16 h-16 rounded-xl object-cover shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{imobiliaria.name}</h3>
                {imobiliaria.verified && (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {imobiliaria.location}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusColors[imobiliaria.partnershipStatus] || statusColors.open}`}>
            {statusLabels[imobiliaria.partnershipStatus] || 'Disponível'}
          </span>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-5">
        {imobiliaria.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {imobiliaria.description}
          </p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
              <Star className="w-4 h-4 fill-current" />
              <span className="font-semibold">{imobiliaria.rating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-500">{imobiliaria.reviewsCount} avaliações</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
              <Users className="w-4 h-4" />
              <span className="font-semibold">{imobiliaria.brokersCount}</span>
            </div>
            <p className="text-xs text-gray-500">Corretores</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Home className="w-4 h-4" />
              <span className="font-semibold">{imobiliaria.activeListings}</span>
            </div>
            <p className="text-xs text-gray-500">Imóveis Ativos</p>
          </div>
        </div>

        {/* Modelo de Parceria */}
        <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
          <span className="text-sm text-emerald-700">Modelo de Parceria</span>
          <span className="font-semibold text-emerald-800">{imobiliaria.partnershipModel}</span>
        </div>
      </div>

      {/* Footer com Ações */}
      <div className="px-5 pb-5">
        <button
          onClick={() => onViewDetails?.(imobiliaria)}
          className="w-full py-2.5 px-4 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 group-hover:shadow-md"
        >
          Ver Corretores
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
