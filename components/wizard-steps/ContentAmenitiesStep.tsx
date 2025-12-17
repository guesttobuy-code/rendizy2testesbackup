/**
 * RENDIZY - Content Amenities Step (PASSO 5)
 * 
 * Step 5: Amenidades da Acomodação (SEMPRE EDITÁVEL)
 * Seleção de amenidades específicas da unidade/acomodação
 * 
 * @version 1.0.103.81
 * @date 2025-10-30
 * 
 * v1.0.103.81: Adicionado collapse/expand por categoria
 */

import { useState, useEffect } from 'react';
import {
  Home,
  Search,
  CheckCircle2,
  Info,
  Edit3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { LISTING_AMENITIES } from '../../utils/amenities-categories';

// ============================================================================
// TYPES
// ============================================================================

interface ContentAmenitiesStepProps {
  value: {
    listingAmenities?: string[]; // Amenidades da Acomodação (sempre editável)
  };
  onChange: (data: any) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ContentAmenitiesStep({
  value = {},
  onChange,
}: ContentAmenitiesStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    value.listingAmenities || []
  );

  // Estado para controlar quais categorias estão expandidas
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set() // Todas fechadas por padrão
  );

  // ============================================================================
  // UPDATE PARENT
  // ============================================================================

  useEffect(() => {
    onChange({
      ...value,
      listingAmenities: selectedAmenities,
    });
  }, [selectedAmenities]);

  // ============================================================================
  // CATEGORY TOGGLE
  // ============================================================================

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // ============================================================================
  // AMENITY SELECTION
  // ============================================================================

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities((prev) => {
      if (prev.includes(amenityId)) {
        return prev.filter((id) => id !== amenityId);
      } else {
        return [...prev, amenityId];
      }
    });
  };

  // ============================================================================
  // SEARCH & FILTER
  // ============================================================================

  const filteredCategories = LISTING_AMENITIES.map((category) => ({
    ...category,
    amenities: category.amenities.filter((amenity) =>
      amenity.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((category) => category.amenities.length > 0);

  // ============================================================================
  // STATS
  // ============================================================================

  const totalSelected = selectedAmenities.length;
  const totalAvailable = LISTING_AMENITIES.reduce(
    (sum, category) => sum + category.amenities.length,
    0
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Home className="size-5 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Amenidades da Acomodação</h2>
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <Edit3 className="size-3 mr-1" />
                Editável
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Selecione as amenidades específicas desta acomodação
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Info Card */}
      <Alert className="border-green-200 bg-green-50/50">
        <CheckCircle2 className="size-4 text-green-600" />
        <AlertDescription className="text-sm text-green-900">
          <strong>Amenidades Específicas:</strong> Estas são as amenidades exclusivas desta
          acomodação, como ar-condicionado, TV, cozinha, etc. Sempre editáveis para qualquer tipo
          de anúncio.
        </AlertDescription>
      </Alert>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Buscar amenidades..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          <strong className="text-foreground">{totalSelected}</strong> de{' '}
          <strong className="text-foreground">{totalAvailable}</strong> amenidades selecionadas
        </span>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 pr-4">
          {filteredCategories.length === 0 && searchQuery && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="p-3 bg-gray-100 rounded-full mb-4">
                  <Search className="size-6 text-gray-400" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Nenhuma amenidade encontrada</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Tente buscar com outros termos
                </p>
              </CardContent>
            </Card>
          )}

          {filteredCategories.map((category) => {
            const categorySelected = category.amenities.filter((amenity) =>
              selectedAmenities.includes(amenity.id)
            ).length;
            const isExpanded = expandedCategories.has(category.id);

            return (
              <Collapsible
                key={category.id}
                open={isExpanded}
                onOpenChange={() => toggleCategory(category.id)}
              >
                <Card className="border-gray-200">
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{category.icon}</span>
                          <CardTitle className="text-base">{category.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {categorySelected}/{category.amenities.length}
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <Separator />
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {category.amenities.map((amenity) => {
                          const isChecked = selectedAmenities.includes(amenity.id);

                          return (
                            <div
                              key={amenity.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                                isChecked
                                  ? 'bg-green-50 border-green-200'
                                  : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => toggleAmenity(amenity.id)}
                            >
                              <Checkbox
                                id={`amenity-${amenity.id}`}
                                checked={isChecked}
                                onCheckedChange={() => toggleAmenity(amenity.id)}
                              />
                              <Label
                                htmlFor={`amenity-${amenity.id}`}
                                className="flex-1 text-sm leading-tight cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  {amenity.icon && <span>{amenity.icon}</span>}
                                  <span>{amenity.name}</span>
                                </div>
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer Info */}
      <div className="pt-4 border-t">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info className="size-4 mt-0.5 shrink-0" />
          <p>
            Você selecionou <strong className="text-foreground">{totalSelected}</strong>{' '}
            {totalSelected === 1 ? 'amenidade' : 'amenidades'}. Essas informações ajudarão os
            hóspedes a escolher sua acomodação.
          </p>
        </div>
      </div>
    </div>
  );
}