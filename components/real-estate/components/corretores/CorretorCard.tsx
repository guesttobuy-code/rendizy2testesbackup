/**
 * 👤 CorretorCard - Card de Corretor
 * 
 * Componente modular para exibir informações de um corretor
 */

import React from 'react';
import { 
  MapPin, 
  Star, 
  CheckCircle, 
  Phone,
  Mail,
  Award,
  TrendingUp,
  MessageCircle
} from 'lucide-react';
import type { Corretor } from '../../types';

interface CorretorCardProps {
  corretor: Corretor;
  onSelect?: (corretor: Corretor) => void;
  onContact?: (corretor: Corretor, method: 'whatsapp' | 'phone' | 'email') => void;
  compact?: boolean;
}

export function CorretorCard({ 
  corretor, 
  onSelect, 
  onContact,
  compact = false 
}: CorretorCardProps) {
  
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-500',
    pending: 'bg-yellow-100 text-yellow-700',
  };

  if (compact) {
    return (
      <div 
        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all cursor-pointer"
        onClick={() => onSelect?.(corretor)}
      >
        <div className="relative">
          <img 
            src={corretor.avatar} 
            alt={corretor.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          {corretor.verified && (
            <CheckCircle className="absolute -bottom-0.5 -right-0.5 w-4 h-4 text-blue-500 bg-white rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{corretor.name}</h4>
          <p className="text-xs text-gray-500">{corretor.companyName}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span className="text-sm font-medium">{corretor.rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">{corretor.salesCount} vendas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
      {/* Header com Avatar */}
      <div className="p-5 bg-gradient-to-br from-purple-50 to-white">
        <div className="flex items-start gap-4">
          <div className="relative">
            <img 
              src={corretor.avatar} 
              alt={corretor.name}
              className="w-20 h-20 rounded-xl object-cover shadow-md"
            />
            {corretor.verified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{corretor.name}</h3>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[corretor.status]}`}>
                {corretor.status === 'active' ? 'Ativo' : corretor.status === 'pending' ? 'Pendente' : 'Inativo'}
              </span>
            </div>
            
            {corretor.creci && (
              <p className="text-sm text-purple-600 font-medium mt-0.5">CRECI: {corretor.creci}</p>
            )}
            
            <p className="text-sm text-gray-500 mt-1">{corretor.companyName}</p>
            
            {(corretor.city || corretor.state) && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {[corretor.city, corretor.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-px bg-gray-100">
        <div className="bg-white p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
            <Star className="w-4 h-4 fill-current" />
            <span className="font-bold text-gray-900">{corretor.rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">{corretor.reviewsCount} avaliações</p>
        </div>
        <div className="bg-white p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
            <Award className="w-4 h-4" />
            <span className="font-bold text-gray-900">{corretor.salesCount}</span>
          </div>
          <p className="text-xs text-gray-500">Vendas</p>
        </div>
        <div className="bg-white p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="font-bold text-gray-900">{corretor.leadsCount}</span>
          </div>
          <p className="text-xs text-gray-500">Leads</p>
        </div>
      </div>

      {/* Especialidades */}
      {corretor.specialties && corretor.specialties.length > 0 && (
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Especialidades</p>
          <div className="flex flex-wrap gap-2">
            {corretor.specialties.map((specialty, idx) => (
              <span 
                key={idx}
                className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded-md"
              >
                {specialty}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      {corretor.bio && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-600 line-clamp-2">{corretor.bio}</p>
        </div>
      )}

      {/* Ações de Contato */}
      <div className="p-4 border-t border-gray-100 grid grid-cols-3 gap-2">
        <button
          onClick={() => onContact?.(corretor, 'whatsapp')}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
        <button
          onClick={() => onContact?.(corretor, 'phone')}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <Phone className="w-4 h-4" />
          Ligar
        </button>
        <button
          onClick={() => onContact?.(corretor, 'email')}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
      </div>
    </div>
  );
}
