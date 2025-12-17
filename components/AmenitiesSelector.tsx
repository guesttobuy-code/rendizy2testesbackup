/**
 * RENDIZY - Amenities Selector Component
 * 
 * Componente completo para seleção de amenities com:
 * - 252 amenities em 13 categorias
 * - Accordion por categoria
 * - Filtros por canal (Airbnb, Booking, VRBO, Direct)
 * - Busca rápida
 * - Contador de selecionadas
 * - Validação de mínimo (5-10 recomendado)
 * 
 * @version 1.0.78
 * @date 2025-10-28
 */

import React, { useState, useMemo } from 'react';
import { Search, AlertCircle, CheckCircle2, ChevronDown, Filter } from 'lucide-react';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import {
  AMENITIES,
  AMENITY_CATEGORIES,
  getAmenitiesByCategory,
  getAmenitiesByChannel,
  searchAmenities,
  countAmenitiesByCategory,
  type AmenityCategory,
  type Amenity,
} from '../utils/amenities-data';

interface AmenitiesSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  minRecommended?: number;
  maxRecommended?: number;
  showChannelFilter?: boolean;
  showStats?: boolean;
  className?: string;
}

export function AmenitiesSelector({
  selectedIds = [],
  onChange,
  minRecommended = 5,
  maxRecommended = 10,
  showChannelFilter = true,
  showStats = true,
  className = '',
}: AmenitiesSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'airbnb' | 'booking' | 'vrbo' | 'direct'>('all');
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Filtrar amenities
  const filteredAmenities = useMemo(() => {
    let result = AMENITIES;

    // Filtro de busca
    if (searchQuery) {
      result = searchAmenities(searchQuery);
    }

    // Filtro de canal
    if (channelFilter !== 'all') {
      result = result.filter(a => a.channels.includes(channelFilter));
    }

    // Filtro de selecionados
    if (showOnlySelected) {
      result = result.filter(a => selectedIds.includes(a.id));
    }

    return result;
  }, [searchQuery, channelFilter, showOnlySelected, selectedIds]);

  // Agrupar por categoria
  const amenitiesByCategory = useMemo(() => {
    const grouped: Record<AmenityCategory, Amenity[]> = {} as any;
    
    Object.keys(AMENITY_CATEGORIES).forEach(cat => {
      grouped[cat as AmenityCategory] = [];
    });

    filteredAmenities.forEach(amenity => {
      grouped[amenity.category].push(amenity);
    });

    return grouped;
  }, [filteredAmenities]);

  // Contar selecionadas por categoria
  const countsByCategory = useMemo(() => {
    return countAmenitiesByCategory(selectedIds);
  }, [selectedIds]);

  // Toggle amenity
  const toggleAmenity = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  // Select/Deselect all in category
  const toggleCategory = (category: AmenityCategory, select: boolean) => {
    const categoryAmenities = getAmenitiesByCategory(category).map(a => a.id);
    
    if (select) {
      const newIds = new Set([...selectedIds, ...categoryAmenities]);
      onChange(Array.from(newIds));
    } else {
      onChange(selectedIds.filter(id => !categoryAmenities.includes(id)));
    }
  };

  // Validação
  const isValid = selectedIds.length >= minRecommended;
  const isOptimal = selectedIds.length >= minRecommended && selectedIds.length <= maxRecommended;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats e Validação */}
      {showStats && (
        <div className="space-y-3">
          {/* Counter Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge 
                variant={isValid ? 'default' : 'destructive'}
                className="text-sm px-3 py-1"
              >
                {selectedIds.length} selecionadas
              </Badge>
              
              {isValid && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOnlySelected(!showOnlySelected)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {showOnlySelected ? 'Mostrar todas' : 'Apenas selecionadas'}
            </Button>
          </div>

          {/* Alert de Recomendação */}
          <Alert variant={isValid ? (isOptimal ? 'default' : 'default') : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {!isValid ? (
                <>Selecione pelo menos <strong>{minRecommended} amenities</strong> para um anúncio completo.</>
              ) : !isOptimal ? (
                <>Ótimo! Para melhor resultado, recomendamos entre <strong>{minRecommended} a {maxRecommended} amenities</strong>.</>
              ) : (
                <>Perfeito! Você selecionou um número ideal de amenities.</>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Filtros e Busca */}
      <Card className="bg-[#1e2029] border-[#2a2d3a]">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Buscar amenities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#2a2d3a] border-[#363945] text-white"
              />
            </div>

            {showChannelFilter && (
              <Select value={channelFilter} onValueChange={(v: any) => setChannelFilter(v)}>
                <SelectTrigger className="w-[200px] bg-[#2a2d3a] border-[#363945] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os canais</SelectItem>
                  <SelectItem value="airbnb">🏠 Airbnb</SelectItem>
                  <SelectItem value="booking">🏢 Booking.com</SelectItem>
                  <SelectItem value="vrbo">🌍 VRBO</SelectItem>
                  <SelectItem value="direct">💳 Site Direto</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Categorias em Accordion */}
      <Accordion type="multiple" defaultValue={Object.keys(AMENITY_CATEGORIES)} className="space-y-2">
        {Object.values(AMENITY_CATEGORIES).map((category) => {
          const categoryAmenities = amenitiesByCategory[category.id];
          const selectedCount = countsByCategory[category.id];
          const totalCount = categoryAmenities.length;

          // Pular categoria vazia (por filtro)
          if (totalCount === 0) return null;

          const allSelected = totalCount > 0 && totalCount === selectedCount;
          const someSelected = selectedCount > 0 && selectedCount < totalCount;

          return (
            <AccordionItem 
              key={category.id} 
              value={category.id}
              className="bg-[#1e2029] border-[#2a2d3a] rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{category.icon}</span>
                    <div className="text-left">
                      <h3 className={`text-white ${category.color}`}>
                        {category.name}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {selectedCount > 0 ? `${selectedCount} de ${totalCount}` : `${totalCount} disponíveis`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedCount > 0 && (
                      <Badge variant="default" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        {selectedCount}
                      </Badge>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(category.id, !allSelected);
                      }}
                      className="text-xs"
                    >
                      {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 pb-4">
                  {categoryAmenities.map((amenity) => {
                    const isSelected = selectedIds.includes(amenity.id);

                    return (
                      <div
                        key={amenity.id}
                        className={`
                          flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all
                          ${isSelected 
                            ? 'bg-blue-500/10 border border-blue-500/30' 
                            : 'bg-[#2a2d3a] border border-transparent hover:border-[#363945]'
                          }
                        `}
                        onClick={() => toggleAmenity(amenity.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleAmenity(amenity.id)}
                          className="mt-0.5"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                            {amenity.name}
                          </p>
                          {amenity.description && (
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {amenity.description}
                            </p>
                          )}
                          
                          {/* Channel badges */}
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {amenity.channels.map(channel => (
                              <Badge 
                                key={channel} 
                                variant="outline" 
                                className="text-[10px] px-1.5 py-0 h-4"
                              >
                                {channel === 'airbnb' && '🏠'}
                                {channel === 'booking' && '🏢'}
                                {channel === 'vrbo' && '🌍'}
                                {channel === 'direct' && '💳'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Resultados vazios */}
      {filteredAmenities.length === 0 && (
        <Card className="bg-[#1e2029] border-[#2a2d3a]">
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
            <p className="text-neutral-400">Nenhuma amenity encontrada</p>
            <p className="text-sm text-neutral-500 mt-1">
              Tente ajustar os filtros de busca
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
