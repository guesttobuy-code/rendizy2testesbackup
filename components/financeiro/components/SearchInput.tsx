/**
 * RENDIZY - Componente de Busca Reutilizável
 * Campo de busca padronizado para todas as páginas do módulo financeiro
 * 
 * @version v1.0.103.1200
 */

import { Input } from '../../ui/input';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = "Buscar...",
  className = "w-64"
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          title="Limpar busca"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

