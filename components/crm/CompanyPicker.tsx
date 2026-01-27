/**
 * CompanyPicker - Seletor de Empresa para uso em formulários
 * Usado em: Deal, Contato, etc.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command';
import { cn } from '../ui/utils';
import {
  Building2,
  Plus,
  X,
  Check,
  ChevronsUpDown,
  Loader2,
  Globe,
  MapPin,
} from 'lucide-react';
import { crmCompaniesApi, CrmCompany } from '../../utils/api-crm-companies';

// ============================================================================
// TYPES
// ============================================================================

interface CompanyPickerProps {
  value?: string | null; // company_id
  onChange: (companyId: string | null, company?: CrmCompany) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowCreate?: boolean;
  error?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CompanyPicker({
  value,
  onChange,
  placeholder = 'Selecione uma empresa...',
  disabled = false,
  className,
  allowCreate = true,
  error,
}: CompanyPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState<CrmCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CrmCompany | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Carregar empresa selecionada se value mudar
  useEffect(() => {
    if (value && !selectedCompany) {
      crmCompaniesApi.get(value).then(company => {
        setSelectedCompany(company);
      }).catch(err => {
        console.error('Erro ao carregar empresa selecionada:', err);
      });
    } else if (!value) {
      setSelectedCompany(null);
    }
  }, [value]);

  // Buscar empresas quando digitar
  useEffect(() => {
    if (!open) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        let result: CrmCompany[];
        
        if (search.trim()) {
          result = await crmCompaniesApi.search(search, 20);
        } else {
          const response = await crmCompaniesApi.list({ limit: 20 });
          result = response.data;
        }

        setCompanies(result);
      } catch (error) {
        console.error('Erro ao buscar empresas:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, open]);

  // Carregar empresas iniciais ao abrir
  useEffect(() => {
    if (open && companies.length === 0) {
      setLoading(true);
      crmCompaniesApi.list({ limit: 20 }).then(res => {
        setCompanies(res.data);
      }).catch(err => {
        console.error('Erro ao carregar empresas:', err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [open]);

  const handleSelect = (company: CrmCompany) => {
    setSelectedCompany(company);
    onChange(company.id, company);
    setOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    setSelectedCompany(null);
    onChange(null);
  };

  const handleCreateQuick = async () => {
    if (!search.trim()) return;
    
    try {
      const newCompany = await crmCompaniesApi.create({ name: search.trim() });
      handleSelect(newCompany);
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedCompany && "text-muted-foreground",
            error && "border-red-500",
            className
          )}
        >
          {selectedCompany ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-6 w-6 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-4 w-4 text-gray-500" />
              </div>
              <span className="truncate">{selectedCompany.name}</span>
              {selectedCompany.trading_name && (
                <span className="text-xs text-gray-400 truncate">
                  ({selectedCompany.trading_name})
                </span>
              )}
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            {selectedCompany && (
              <X 
                className="h-4 w-4 hover:text-red-500 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Buscar por nome ou CNPJ..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : companies.length === 0 ? (
              <CommandEmpty>
                <div className="text-center py-4">
                  <Building2 className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    {search ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
                  </p>
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {companies.map((company) => (
                  <CommandItem
                    key={company.id}
                    value={company.id}
                    onSelect={() => handleSelect(company)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="h-8 w-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {company.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {company.industry && (
                            <span>{company.industry}</span>
                          )}
                          {company.address_city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {company.address_city}
                            </span>
                          )}
                        </div>
                      </div>
                      {value === company.id && (
                        <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {allowCreate && search.trim() && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateQuick}
                    className="cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span>Criar empresa "{search}"</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </Popover>
  );
}

export default CompanyPicker;
