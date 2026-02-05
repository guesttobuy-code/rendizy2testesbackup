/**
 * 🏘️ EmpreendimentoCard - Card de Empreendimento
 * 
 * Componente modular para exibir informações de um empreendimento
 */

import React from 'react';
import { 
  MapPin, 
  Building2, 
  BedDouble, 
  Maximize, 
  Calendar, 
  Percent,
  Eye,
  Share2,
  Heart,
  ChevronRight
} from 'lucide-react';
import type { Empreendimento } from '../../types';

interface EmpreendimentoCardProps {
  empreendimento: Empreendimento;
  onSelect?: (empreendimento: Empreendimento) => void;
  onViewDetails?: (empreendimento: Empreendimento) => void;
  onFavorite?: (empreendimento: Empreendimento) => void;
  onShare?: (empreendimento: Empreendimento) => void;
  isFavorite?: boolean;
  compact?: boolean;
}

// Helper para formatar preço
function formatPrice(value: number): string {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }
  return `R$ ${value.toLocaleString('pt-BR')}`;
}

export function EmpreendimentoCard({ 
  empreendimento, 
  onSelect, 
  onViewDetails,
  onFavorite,
  onShare,
  isFavorite = false,
  compact = false 
}: EmpreendimentoCardProps) {
  
  const statusColors = {
    launch: 'bg-orange-500',
    construction: 'bg-blue-500',
    ready: 'bg-green-500',
  };

  const statusLabels = {
    launch: 'Lançamento',
    construction: 'Em Construção',
    ready: 'Pronto',
  };

  // Calcular % vendido
  const soldPercentage = empreendimento.totalUnits > 0
    ? Math.round(((empreendimento.totalUnits - empreendimento.availableUnits) / empreendimento.totalUnits) * 100)
    : 0;

  if (compact) {
    return (
      <div 
        className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
        onClick={() => onSelect?.(empreendimento)}
      >
        {/* Imagem */}
        <div className="relative w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
          <img 
            src={empreendimento.mainImage} 
            alt={empreendimento.name}
            className="w-full h-full object-cover"
          />
          <span className={`absolute top-2 left-2 px-2 py-0.5 text-xs text-white font-medium rounded ${statusColors[empreendimento.status]}`}>
            {statusLabels[empreendimento.status]}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{empreendimento.name}</h4>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5" />
            {empreendimento.city}, {empreendimento.state}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-gray-600">
              {empreendimento.bedroomsMin === empreendimento.bedroomsMax 
                ? `${empreendimento.bedroomsMin} quartos`
                : `${empreendimento.bedroomsMin}-${empreendimento.bedroomsMax} quartos`
              }
            </span>
            <span className="text-gray-600">
              {empreendimento.areaMin === empreendimento.areaMax
                ? `${empreendimento.areaMin}m²`
                : `${empreendimento.areaMin}-${empreendimento.areaMax}m²`
              }
            </span>
          </div>
          <p className="font-semibold text-blue-600 mt-1">
            {formatPrice(empreendimento.priceMin)} - {formatPrice(empreendimento.priceMax)}
          </p>
        </div>

        {/* Stats */}
        <div className="text-right">
          <div className="text-sm text-gray-500">{empreendimento.availableUnits} disponíveis</div>
          <div className="text-xs text-gray-400">de {empreendimento.totalUnits} unidades</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
      {/* Imagem Principal */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={empreendimento.mainImage} 
          alt={empreendimento.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Overlay com gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Badge de Status */}
        <span className={`absolute top-3 left-3 px-3 py-1 text-xs text-white font-medium rounded-full ${statusColors[empreendimento.status]}`}>
          {statusLabels[empreendimento.status]}
        </span>

        {/* Ações rápidas */}
        <div className="absolute top-3 right-3 flex gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onFavorite?.(empreendimento); }}
            className={`p-2 rounded-full transition-colors ${
              isFavorite 
                ? 'bg-red-500 text-white' 
                : 'bg-white/90 text-gray-600 hover:bg-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onShare?.(empreendimento); }}
            className="p-2 bg-white/90 rounded-full text-gray-600 hover:bg-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Info da Construtora */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          {empreendimento.companyLogo && (
            <img 
              src={empreendimento.companyLogo} 
              alt={empreendimento.companyName}
              className="w-8 h-8 rounded-full border-2 border-white shadow"
            />
          )}
          <span className="text-white text-sm font-medium drop-shadow">
            {empreendimento.companyName}
          </span>
        </div>

        {/* Comissão */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded flex items-center gap-1">
          <Percent className="w-3 h-3" />
          {empreendimento.commission}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-4">
        {/* Título e Localização */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{empreendimento.name}</h3>
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
          <MapPin className="w-4 h-4" />
          {empreendimento.neighborhood ? `${empreendimento.neighborhood}, ` : ''}{empreendimento.city} - {empreendimento.state}
        </p>

        {/* Características */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex items-center gap-2 text-gray-600">
            <BedDouble className="w-4 h-4" />
            <span className="text-sm">
              {empreendimento.bedroomsMin === empreendimento.bedroomsMax 
                ? `${empreendimento.bedroomsMin} quartos`
                : `${empreendimento.bedroomsMin}-${empreendimento.bedroomsMax}`
              }
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Maximize className="w-4 h-4" />
            <span className="text-sm">
              {empreendimento.areaMin === empreendimento.areaMax
                ? `${empreendimento.areaMin}m²`
                : `${empreendimento.areaMin}-${empreendimento.areaMax}m²`
              }
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Building2 className="w-4 h-4" />
            <span className="text-sm">{empreendimento.availableUnits} disp.</span>
          </div>
        </div>

        {/* Barra de Progresso de Vendas */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Vendas</span>
            <span className="font-medium text-gray-700">{soldPercentage}% vendido</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
              style={{ width: `${soldPercentage}%` }}
            />
          </div>
        </div>

        {/* Preço e Data de Entrega */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500">A partir de</p>
            <p className="text-xl font-bold text-blue-600">{formatPrice(empreendimento.priceMin)}</p>
          </div>
          {empreendimento.deliveryDate && (
            <div className="text-right">
              <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                <Calendar className="w-3 h-3" />
                Entrega
              </p>
              <p className="text-sm font-medium text-gray-700">{empreendimento.deliveryDate}</p>
            </div>
          )}
        </div>

        {/* Botão de Ação */}
        <button
          onClick={() => onViewDetails?.(empreendimento)}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Ver Unidades
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
