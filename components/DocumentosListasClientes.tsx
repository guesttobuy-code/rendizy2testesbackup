/**
 * RENDIZY - Documentos e Listas de Clientes
 * Visualização unificada e exportação de dados de:
 * - Usuários (do sistema)
 * - Clientes (hóspedes, compradores, locadores)
 * - Proprietários
 * 
 * @version v1.0.103.232
 * @date 2025-11-01
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import {
  Download,
  Search,
  FileText,
  Mail,
  Phone,
  User,
  TrendingUp,
  Users,
  Building2
} from 'lucide-react';
import { cn } from './ui/utils';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Types
type FilterType = 
  | 'all'                 // Exportação de Leads (todos)
  | 'with_purchases'      // Compras (tem histórico)
  | 'by_email'            // Compras por E-mail
  | 'by_name'             // Compras por Nome
  | 'by_channel'          // Lista de Canal
  | 'with_phone'          // Lista de Telefones
  | 'with_document';      // Lista de Documentos

interface UnifiedData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  type: 'user' | 'client' | 'owner';
  source?: string;
  channel?: string;
  createdAt: string;
  // Campos específicos
  role?: string;
  clientType?: string;
  contractType?: string;
  isPremium?: boolean;
}

const filterLabels: Record<FilterType, string> = {
  all: 'Exportação de Leads',
  with_purchases: 'Compras (Histórico)',
  by_email: 'Compras (por E-mail)',
  by_name: 'Compras (por Nome)',
  by_channel: 'Lista de Canal',
  with_phone: 'Lista de Telefones',
  with_document: 'Lista de Documentos'
};

export function DocumentosListasClientes() {
  const [data, setData] = useState<UnifiedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  // Load all data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load users
      const usersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/users`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Load clients
      const clientsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/clients`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Load owners
      const ownersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/owners`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const users = usersResponse.ok ? (await usersResponse.json()).users || [] : [];
      const clients = clientsResponse.ok ? (await clientsResponse.json()).clients || [] : [];
      const owners = ownersResponse.ok ? (await ownersResponse.json()).owners || [] : [];

      // Unify data
      const unified: UnifiedData[] = [
        ...users.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          type: 'user' as const,
          role: u.role,
          createdAt: u.createdAt
        })),
        ...clients.map((c: any) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          document: c.document,
          type: 'client' as const,
          clientType: c.type,
          createdAt: c.createdAt
        })),
        ...owners.map((o: any) => ({
          id: o.id,
          name: o.name,
          email: o.email,
          phone: o.phone,
          document: o.document,
          type: 'owner' as const,
          contractType: o.contractType,
          isPremium: o.isPremium,
          createdAt: o.createdAt
        }))
      ];

      setData(unified);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredData = data.filter(item => {
    // Search filter
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.phone && item.phone.includes(searchQuery)) ||
      (item.document && item.document.includes(searchQuery));

    if (!matchesSearch) return false;

    // Type filter
    switch (selectedFilter) {
      case 'all':
        return true;
      case 'with_purchases':
        // Only clients with purchase history
        return item.type === 'client' && item.clientType === 'buyer';
      case 'by_email':
      case 'by_name':
        // Same as with_purchases but different sorting
        return item.type === 'client' && item.clientType === 'buyer';
      case 'by_channel':
        // Group by source/channel
        return true;
      case 'with_phone':
        return !!item.phone;
      case 'with_document':
        return !!item.document;
      default:
        return true;
    }
  });

  // Sort data based on filter
  const sortedData = [...filteredData].sort((a, b) => {
    switch (selectedFilter) {
      case 'by_email':
        return a.email.localeCompare(b.email);
      case 'by_name':
        return a.name.localeCompare(b.name);
      case 'by_channel':
        return (a.channel || '').localeCompare(b.channel || '');
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  // Export to CSV
  const handleExport = () => {
    if (sortedData.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    try {
      // Define columns based on filter
      let columns: string[];
      let rows: string[][];

      switch (selectedFilter) {
        case 'with_phone':
          columns = ['Nome', 'Telefone', 'Email', 'Tipo'];
          rows = sortedData.map(item => [
            item.name,
            item.phone || '',
            item.email,
            getTypeLabel(item)
          ]);
          break;

        case 'with_document':
          columns = ['Nome', 'CPF/CNPJ', 'Email', 'Telefone', 'Tipo'];
          rows = sortedData.map(item => [
            item.name,
            item.document || '',
            item.email,
            item.phone || '',
            getTypeLabel(item)
          ]);
          break;

        case 'by_channel':
          columns = ['Canal', 'Nome', 'Email', 'Telefone', 'Data'];
          rows = sortedData.map(item => [
            item.channel || 'Direto',
            item.name,
            item.email,
            item.phone || '',
            new Date(item.createdAt).toLocaleDateString('pt-BR')
          ]);
          break;

        default:
          columns = ['Nome', 'Email', 'Telefone', 'CPF/CNPJ', 'Tipo', 'Data'];
          rows = sortedData.map(item => [
            item.name,
            item.email,
            item.phone || '',
            item.document || '',
            getTypeLabel(item),
            new Date(item.createdAt).toLocaleDateString('pt-BR')
          ]);
      }

      // Create CSV
      const csvContent = [
        columns.map(col => `"${col}"`).join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Add BOM for Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const filename = `${filterLabels[selectedFilter]}_${new Date().toISOString().split('T')[0]}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`${sortedData.length} registros exportados!`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  const getTypeLabel = (item: UnifiedData): string => {
    if (item.type === 'user') return `Usuário${item.role ? ` (${item.role})` : ''}`;
    if (item.type === 'client') {
      const labels: Record<string, string> = {
        guest: 'Hóspede',
        buyer: 'Comprador',
        renter: 'Locador'
      };
      return labels[item.clientType || ''] || 'Cliente';
    }
    if (item.type === 'owner') {
      const labels: Record<string, string> = {
        exclusivity: 'Proprietário (Exclusivo)',
        non_exclusive: 'Proprietário (Não Exclusivo)',
        temporary: 'Proprietário (Temporário)'
      };
      return labels[item.contractType || ''] || 'Proprietário';
    }
    return 'Desconhecido';
  };

  // Statistics
  const stats = {
    total: data.length,
    withEmail: data.filter(d => d.email).length,
    withPhone: data.filter(d => d.phone).length,
    withDocument: data.filter(d => d.document).length
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Filtro Lateral Esquerdo */}
      <div className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Visualizações</h3>
        
        <div className="space-y-2">
          {(Object.keys(filterLabels) as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg transition-colors text-sm",
                selectedFilter === filter
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              )}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">
            DESCRIÇÕES
          </h4>
          <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <strong>Exportação de Leads:</strong>
              <p className="mt-1">Todos os dados do sistema</p>
            </div>
            <div>
              <strong>Compras:</strong>
              <p className="mt-1">Clientes com histórico de compra</p>
            </div>
            <div>
              <strong>Lista de Canal:</strong>
              <p className="mt-1">Agrupado por origem</p>
            </div>
            <div>
              <strong>Lista de Telefones:</strong>
              <p className="mt-1">Apenas com telefone cadastrado</p>
            </div>
            <div>
              <strong>Lista de Documentos:</strong>
              <p className="mt-1">Apenas com CPF/CNPJ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {filterLabels[selectedFilter]}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Visualize e exporte listas de clientes, documentos, leads, compras e canais
              </p>
            </div>
            <Button onClick={handleExport} disabled={sortedData.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Total de Registros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stats.total}
                  </span>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Com Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {stats.withEmail}
                  </span>
                  <Mail className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Com Telefone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {stats.withPhone}
                  </span>
                  <Phone className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                  Com Documento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {stats.withDocument}
                  </span>
                  <FileText className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Busca */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome, email, telefone ou documento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Info sobre filtro atual */}
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    {filterLabels[selectedFilter]}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {sortedData.length} registro(s) encontrado(s)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    {selectedFilter !== 'by_email' && <TableHead>Telefone</TableHead>}
                    {(selectedFilter === 'with_document' || selectedFilter === 'all') && (
                      <TableHead>CPF/CNPJ</TableHead>
                    )}
                    {selectedFilter === 'by_channel' && <TableHead>Canal</TableHead>}
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : sortedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Nenhum registro encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedData.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.type === 'user' && <User className="h-4 w-4 text-blue-500" />}
                            {item.type === 'client' && <Users className="h-4 w-4 text-green-500" />}
                            {item.type === 'owner' && <Building2 className="h-4 w-4 text-purple-500" />}
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {item.email}
                        </TableCell>
                        {selectedFilter !== 'by_email' && (
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {item.phone || '-'}
                          </TableCell>
                        )}
                        {(selectedFilter === 'with_document' || selectedFilter === 'all') && (
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {item.document || '-'}
                          </TableCell>
                        )}
                        {selectedFilter === 'by_channel' && (
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            <Badge variant="secondary">{item.channel || 'Direto'}</Badge>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge variant="outline">
                            {getTypeLabel(item)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
