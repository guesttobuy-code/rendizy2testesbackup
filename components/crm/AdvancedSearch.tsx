import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Search, X, Filter, Calendar, User, Tag, FileText } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { DateRangePicker } from '../DateRangePicker';
import { TagsManager } from './TagsManager';

export interface AdvancedSearchFilters {
  query: string;
  status: string[];
  priority: string[];
  assignedTo: string[];
  tags: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  taskType: string[];
  stageId: string[];
  hasAttachments: boolean | null;
  hasForms: boolean | null;
  overdue: boolean | null;
}

interface AdvancedSearchProps {
  filters: AdvancedSearchFilters;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  onReset: () => void;
  availableTags?: string[];
  availableUsers?: Array<{ id: string; name: string }>;
  availableStages?: Array<{ id: string; name: string }>;
}

export function AdvancedSearch({
  filters,
  onFiltersChange,
  onReset,
  availableTags = [],
  availableUsers = [],
  availableStages = [],
}: AdvancedSearchProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof AdvancedSearchFilters>(
    key: K,
    value: AdvancedSearchFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = <K extends 'status' | 'priority' | 'assignedTo' | 'taskType' | 'stageId'>(
    key: K,
    value: string
  ) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFilter(key, updated as any);
  };

  const activeFiltersCount = [
    filters.status.length,
    filters.priority.length,
    filters.assignedTo.length,
    filters.tags.length,
    filters.taskType.length,
    filters.stageId.length,
    filters.dateRange ? 1 : 0,
    filters.hasAttachments !== null ? 1 : 0,
    filters.hasForms !== null ? 1 : 0,
    filters.overdue !== null ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-2">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar tickets e tarefas..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="icon" onClick={onReset}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filtros Avançados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div>
              <Label className="text-xs">Status</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['PENDING', 'IN_ANALYSIS', 'RESOLVED', 'UNRESOLVED', 'CANCELLED'].map(status => (
                  <Badge
                    key={status}
                    variant={filters.status.includes(status) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter('status', status)}
                  >
                    {status}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <Label className="text-xs">Prioridade</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['urgent', 'high', 'medium', 'low'].map(priority => (
                  <Badge
                    key={priority}
                    variant={filters.priority.includes(priority) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter('priority', priority)}
                  >
                    {priority}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Task Type */}
            <div>
              <Label className="text-xs">Tipo de Tarefa</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {['STANDARD', 'FORM', 'ATTACHMENT'].map(type => (
                  <Badge
                    key={type}
                    variant={filters.taskType.includes(type) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleArrayFilter('taskType', type)}
                  >
                    {type === 'STANDARD' ? 'Padrão' : type === 'FORM' ? 'Formulário' : 'Anexo'}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Assigned To */}
            {availableUsers.length > 0 && (
              <div>
                <Label className="text-xs">Atribuído a</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {availableUsers.map(user => (
                    <Badge
                      key={user.id}
                      variant={filters.assignedTo.includes(user.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter('assignedTo', user.id)}
                    >
                      {user.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Stage */}
            {availableStages.length > 0 && (
              <div>
                <Label className="text-xs">Etapa</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {availableStages.map(stage => (
                    <Badge
                      key={stage.id}
                      variant={filters.stageId.includes(stage.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleArrayFilter('stageId', stage.id)}
                    >
                      {stage.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Date Range */}
            <div>
              <Label className="text-xs">Período</Label>
              <DateRangePicker
                value={filters.dateRange}
                onChange={(range) => updateFilter('dateRange', range || undefined)}
              />
            </div>

            {/* Tags */}
            <div>
              <Label className="text-xs">Tags</Label>
              <TagsManager
                tags={filters.tags}
                onTagsChange={(tags) => updateFilter('tags', tags)}
                availableTags={availableTags}
                maxTags={10}
              />
            </div>

            {/* Boolean Filters */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">Com Anexos</Label>
                <Select
                  value={filters.hasAttachments === null ? 'all' : filters.hasAttachments ? 'yes' : 'no'}
                  onValueChange={(v) => updateFilter('hasAttachments', v === 'all' ? null : v === 'yes')}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Sim</SelectItem>
                    <SelectItem value="no">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Com Formulários</Label>
                <Select
                  value={filters.hasForms === null ? 'all' : filters.hasForms ? 'yes' : 'no'}
                  onValueChange={(v) => updateFilter('hasForms', v === 'all' ? null : v === 'yes')}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Sim</SelectItem>
                    <SelectItem value="no">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Atrasadas</Label>
                <Select
                  value={filters.overdue === null ? 'all' : filters.overdue ? 'yes' : 'no'}
                  onValueChange={(v) => updateFilter('overdue', v === 'all' ? null : v === 'yes')}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="yes">Sim</SelectItem>
                    <SelectItem value="no">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

