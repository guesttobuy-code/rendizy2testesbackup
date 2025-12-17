import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Search, X, ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { cn } from '../ui/utils';

interface ModuleItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  submenu?: ModuleItem[];
}

interface ModuleSection {
  title: string;
  items: ModuleItem[];
}

// Estrutura baseada no MainSidebar
const MODULE_SECTIONS: ModuleSection[] = [
  {
    title: 'Principal',
    items: [
      { id: 'painel-inicial', label: 'Dashboard' },
      { id: 'calendario', label: 'Calendário' },
      { id: 'central-reservas', label: 'Reservas' },
      { id: 'central-mensagens', label: 'Chat' },
      { id: 'imoveis', label: 'Locais e Anúncios' },
      { id: 'motor-reservas', label: 'Edição de site' },
      { id: 'precos-em-lote', label: 'Preços em Lote' },
      { id: 'promocoes', label: 'Promoções' },
      { id: 'financeiro', label: 'Finanças' },
    ],
  },
  {
    title: 'Operacional',
    items: [
      {
        id: 'usuarios-hospedes',
        label: 'Usuários e Clientes',
        submenu: [
          { id: 'usuarios-usuarios', label: 'Usuários' },
          { id: 'usuarios-clientes', label: 'Clientes e Hóspedes' },
          { id: 'usuarios-proprietarios', label: 'Proprietários' },
          { id: 'usuarios-documentos-listas', label: 'Documentos e Listas' },
        ],
      },
      { id: 'notificacoes', label: 'Notificações' },
      {
        id: 'catalogo',
        label: 'Catálogo',
        submenu: [
          { id: 'catalogo-grupos', label: 'Grupos' },
          { id: 'catalogo-restricoes', label: 'Restrições dos Proprietários' },
          { id: 'catalogo-regras', label: 'Regras Tarifárias' },
          { id: 'catalogo-emails', label: 'Modelos de E-mail' },
          { id: 'catalogo-impressao', label: 'Modelos para Impressão' },
          { id: 'catalogo-midia', label: 'Gerenciador de Mídia' },
        ],
      },
    ],
  },
  {
    title: 'Módulos Avançados',
    items: [
      { id: 'modulo-crm-tasks', label: 'CRM & Tasks' },
      { id: 'modulo-automacoes', label: 'Automações' },
      { id: 'modulo-bi', label: 'BI & Relatórios' },
    ],
  },
  {
    title: 'Avançado',
    items: [
      { id: 'app-center', label: 'Loja de apps' },
      { id: 'configuracoes', label: 'Configurações' },
      {
        id: 'assistentes',
        label: 'Suporte',
        submenu: [
          { id: 'assistentes-duplicados', label: 'E-mails Duplicados' },
          { id: 'assistentes-perfis', label: 'Perfis de Cadastro' },
          { id: 'assistentes-permissoes', label: 'Funções e Permissões' },
          { id: 'assistentes-online', label: 'Usuários Online' },
          { id: 'assistentes-atividade', label: 'Atividade dos Usuários' },
          { id: 'assistentes-historico', label: 'Histórico de Login' },
        ],
      },
    ],
  },
];

interface ModuleSelectorProps {
  selectedModules: string[];
  onChange: (modules: string[]) => void;
}

export function ModuleSelector({ selectedModules, onChange }: ModuleSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Filtrar módulos baseado na busca
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return MODULE_SECTIONS;

    const query = searchQuery.toLowerCase();
    return MODULE_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const matchesItem = item.label.toLowerCase().includes(query);
        const matchesSubmenu = item.submenu?.some((sub) =>
          sub.label.toLowerCase().includes(query)
        );
        return matchesItem || matchesSubmenu;
      }),
    })).filter((section) => section.items.length > 0);
  }, [searchQuery]);

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionTitle)) {
        next.delete(sectionTitle);
      } else {
        next.add(sectionTitle);
      }
      return next;
    });
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleModule = (moduleId: string) => {
    if (selectedModules.includes(moduleId)) {
      onChange(selectedModules.filter((id) => id !== moduleId));
    } else {
      onChange([...selectedModules, moduleId]);
    }
  };

  const removeModule = (moduleId: string) => {
    onChange(selectedModules.filter((id) => id !== moduleId));
  };

  const getModuleLabel = (moduleId: string): string => {
    for (const section of MODULE_SECTIONS) {
      for (const item of section.items) {
        if (item.id === moduleId) return item.label;
        const subItem = item.submenu?.find((sub) => sub.id === moduleId);
        if (subItem) return `${item.label} > ${subItem.label}`;
      }
    }
    return moduleId;
  };

  return (
    <div className="space-y-4">
      {/* Tags dos módulos selecionados */}
      {selectedModules.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
          {selectedModules.map((moduleId) => (
            <Badge key={moduleId} variant="secondary" className="gap-1 pr-1">
              {getModuleLabel(moduleId)}
              <button
                onClick={() => removeModule(moduleId)}
                className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Módulos ({selectedModules.length} selecionados)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar módulos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Lista de módulos */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredSections.map((section) => {
              const isExpanded = expandedSections.has(section.title);
              return (
                <div key={section.title} className="space-y-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-8 text-xs font-semibold"
                    onClick={() => toggleSection(section.title)}
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <FolderOpen className="h-3 w-3" />
                      ) : (
                        <Folder className="h-3 w-3" />
                      )}
                      {section.title}
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>

                  {isExpanded && (
                    <div className="ml-4 space-y-1">
                      {section.items.map((item) => {
                        const hasSubmenu = item.submenu && item.submenu.length > 0;
                        const isItemExpanded = expandedItems.has(item.id);
                        const isSelected = selectedModules.includes(item.id);

                        return (
                          <div key={item.id} className="space-y-1">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleModule(item.id)}
                                className="h-3.5 w-3.5 rounded border-gray-300"
                              />
                              <label
                                className="flex-1 text-xs cursor-pointer flex items-center gap-2"
                                onClick={() => toggleModule(item.id)}
                              >
                                {item.label}
                              </label>
                              {hasSubmenu && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleItem(item.id)}
                                >
                                  {isItemExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>

                            {hasSubmenu && isItemExpanded && (
                              <div className="ml-6 space-y-1">
                                {item.submenu?.map((subItem) => {
                                  const isSubSelected = selectedModules.includes(subItem.id);
                                  return (
                                    <div key={subItem.id} className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isSubSelected}
                                        onChange={() => toggleModule(subItem.id)}
                                        className="h-3.5 w-3.5 rounded border-gray-300"
                                      />
                                      <label
                                        className="flex-1 text-xs cursor-pointer"
                                        onClick={() => toggleModule(subItem.id)}
                                      >
                                        {subItem.label}
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

