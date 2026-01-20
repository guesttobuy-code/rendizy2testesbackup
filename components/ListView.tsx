import React, { useState } from 'react';
import { Property, Reservation } from '../App';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Search, 
  Calendar, 
  User, 
  DollarSign,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  ArrowUpDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface ListViewProps {
  properties: Property[];
  reservations: Reservation[];
  onReservationClick: (reservation: Reservation) => void;
}

const platformColors: Record<string, string> = {
  airbnb: 'bg-red-100 text-red-700',
  booking: 'bg-blue-100 text-blue-700',
  direct: 'bg-green-100 text-green-700',
  decolar: 'bg-orange-100 text-orange-700'
};

const statusColors: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-gray-100 text-gray-700',
  maintenance: 'bg-orange-100 text-orange-700'
};

const statusLabels: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendente',
  blocked: 'Bloqueada',
  maintenance: 'Manutenção'
};

export function ListView({ properties, reservations, onReservationClick }: ListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'checkIn' | 'price' | 'guestName'>('checkIn');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'checkIn' | 'price' | 'guestName') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredReservations = reservations
    .filter(r => {
      const property = properties.find(p => p.id === r.propertyId);
      const searchLower = searchQuery.toLowerCase();
      return (
        r.guestName.toLowerCase().includes(searchLower) ||
        property?.name.toLowerCase().includes(searchLower) ||
        r.id.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let compareValue = 0;
      
      if (sortField === 'checkIn') {
        compareValue = a.checkIn.getTime() - b.checkIn.getTime();
      } else if (sortField === 'price') {
        compareValue = a.price - b.price;
      } else if (sortField === 'guestName') {
        compareValue = a.guestName.localeCompare(b.guestName);
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por hóspede, propriedade ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Total de Reservas</div>
          <div className="text-2xl text-gray-900">{filteredReservations.length}</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Confirmadas</div>
          <div className="text-2xl text-green-600">
            {filteredReservations.filter(r => r.status === 'confirmed').length}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Pendentes</div>
          <div className="text-2xl text-yellow-600">
            {filteredReservations.filter(r => r.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Receita Total</div>
          <div className="text-2xl text-gray-900">
            R$ {filteredReservations.reduce((sum, r) => sum + r.price, 0).toLocaleString('pt-BR', { 
              minimumFractionDigits: 2 
            })}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Código</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('guestName')}
                  className="hover:bg-transparent p-0"
                >
                  Hóspede
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Propriedade</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('checkIn')}
                  className="hover:bg-transparent p-0"
                >
                  Check-in
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Check-out</TableHead>
              <TableHead className="text-center">Noites</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleSort('price')}
                  className="hover:bg-transparent p-0"
                >
                  Valor
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Plataforma</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReservations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                  Nenhuma reserva encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredReservations.map((reservation) => {
                const property = properties.find(p => p.id === reservation.propertyId);
                
                return (
                  <TableRow 
                    key={reservation.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => onReservationClick(reservation)}
                  >
                    <TableCell className="font-mono text-sm">
                      #{reservation.id.toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{reservation.guestName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img
                          src={property?.image}
                          alt={property?.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                        <div className="max-w-[200px]">
                          <div className="text-sm truncate">{property?.name}</div>
                          <div className="text-xs text-gray-500">{property?.type}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {reservation.checkIn.toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {reservation.checkOut.toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {reservation.nights}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {reservation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={platformColors[reservation.platform]}>
                        {reservation.platform === 'airbnb' && 'Airbnb'}
                        {reservation.platform === 'booking' && 'Booking'}
                        {reservation.platform === 'direct' && 'Direto'}
                        {reservation.platform === 'decolar' && 'Decolar'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[reservation.status]}>
                        {statusLabels[reservation.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            onReservationClick(reservation);
                          }}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => e.stopPropagation()} 
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Cancelar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredReservations.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Mostrando {filteredReservations.length} {filteredReservations.length === 1 ? 'reserva' : 'reservas'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
