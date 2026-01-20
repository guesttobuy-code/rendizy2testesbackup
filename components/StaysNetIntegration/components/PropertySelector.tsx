/**
 * StaysNet Integration - Property Selector Component
 * List and select properties for import
 */

import React, { useMemo } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Checkbox } from '../../ui/checkbox';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Search, CheckSquare, Square } from 'lucide-react';
import type { StaysNetProperty } from '../types';

interface PropertySelectorProps {
  properties: StaysNetProperty[];
  selectedIds: string[];
  onToggleProperty: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function PropertySelector({
  properties,
  selectedIds,
  onToggleProperty,
  onSelectAll,
  onDeselectAll,
}: PropertySelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  const getStableId = (p: StaysNetProperty): string => {
    const anyP: any = p as any;
    // Prefer `_id` (listing primary id) when available.
    return String(anyP?._id || (p as any)?._id || p.id || anyP?.id || '').trim();
  };

  const normalizeText = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const text = String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return text;
  };

  const getSearchHaystack = (p: StaysNetProperty): string => {
    const anyP: any = p as any;
    const address = anyP?.address || anyP?.endereco || anyP?.location || anyP?.localization || null;
    const addressBits: unknown[] = [];

    if (address && typeof address === 'object') {
      addressBits.push(
        (address as any).street,
        (address as any).streetName,
        (address as any).address,
        (address as any).number,
        (address as any).neighborhood,
        (address as any).bairro,
        (address as any).city,
        (address as any).state,
        (address as any).zip,
        (address as any).zipcode,
        (address as any).postalCode,
      );
    }

    const tokens: unknown[] = [
      p.name,
      anyP?.internalName,
      anyP?.internal_name,
      anyP?.title,
      anyP?.nickname,
      anyP?.descricao,
      anyP?.description,
      p.code,
      p.id,
      anyP?._id,
      ...addressBits,
    ];

    return normalizeText(tokens.filter(Boolean).join(' '));
  };

  // Filter properties based on search
  const filteredProperties = useMemo(() => {
    if (!searchQuery) return properties;

    const terms = normalizeText(searchQuery)
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (terms.length === 0) return properties;

    return properties.filter((p) => {
      const haystack = getSearchHaystack(p);
      return terms.every((t) => haystack.includes(t));
    });
  }, [properties, searchQuery]);

  const allSelected =
    filteredProperties.length > 0 && filteredProperties.every((p) => selectedIds.includes(getStableId(p)));
  

  return (
    <div className="space-y-3">
      {/* Search and bulk actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, código ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={allSelected ? onDeselectAll : onSelectAll}
        >
          {allSelected ? (
            <>
              <Square className="w-4 h-4 mr-2" />
              Desmarcar Todos
            </>
          ) : (
            <>
              <CheckSquare className="w-4 h-4 mr-2" />
              Marcar Todos
            </>
          )}
        </Button>
      </div>

      {/* Selection summary */}
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Badge variant={selectedIds.length > 0 ? 'default' : 'outline'}>
          {selectedIds.length} selecionada(s)
        </Badge>
        <span>de {properties.length} propriedade(s)</span>
        {searchQuery && (
          <span className="text-blue-600 dark:text-blue-400">
            ({filteredProperties.length} encontrada(s))
          </span>
        )}
      </div>

      {/* Properties list */}
      <Card>
        <CardContent className="p-0 overflow-x-hidden">
          <ScrollArea className="h-[400px] overflow-x-hidden">
            <div className="divide-y">
              {filteredProperties.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  {searchQuery
                    ? 'Nenhuma propriedade encontrada com esse filtro'
                    : 'Nenhuma propriedade disponível'}
                </div>
              ) : (
                filteredProperties.map((property) => {
                  const stableId = getStableId(property);
                  const isSelected = selectedIds.includes(stableId);

                  return (
                    <label
                      key={stableId}
                      className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleProperty(stableId)}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium text-sm leading-tight break-words whitespace-normal">
                            {property.name || property.internalName || stableId}
                          </h4>
                          {property.internalName && property.name !== property.internalName && (
                            <span className="text-xs text-muted-foreground break-words whitespace-normal">
                              ({property.internalName})
                            </span>
                          )}
                          {property.code && (
                            <Badge variant="outline" className="text-xs break-words whitespace-normal">
                              {property.code}
                            </Badge>
                          )}
                          {property.status && (
                            <Badge
                              variant={property.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {property.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 break-words whitespace-normal">
                          ID: {stableId}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
