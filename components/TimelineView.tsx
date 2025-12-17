import React, { useRef, useState } from 'react';
import { Property, Reservation } from '../App';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface TimelineViewProps {
  properties: Property[];
  reservations: Reservation[];
  currentMonth: Date;
  onReservationClick: (reservation: Reservation) => void;
}

const platformColors: Record<string, { bg: string; border: string; text: string }> = {
  airbnb: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
  booking: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
  direct: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700' },
  decolar: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-700' }
};

export function TimelineView({ 
  properties, 
  reservations, 
  currentMonth,
  onReservationClick 
}: TimelineViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredReservation, setHoveredReservation] = useState<string | null>(null);

  // Generate days for the current month
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1);
    return {
      date,
      dayOfWeek: date.getDay(),
      dayOfMonth: i + 1
    };
  });

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  const getReservationPosition = (reservation: Reservation) => {
    const startDay = reservation.checkIn.getDate();
    const endDay = reservation.checkOut.getDate();
    
    // Check if reservation spans across months
    const isCurrentMonth = reservation.checkIn.getMonth() === currentMonth.getMonth();
    const endsInCurrentMonth = reservation.checkOut.getMonth() === currentMonth.getMonth();

    if (!isCurrentMonth && !endsInCurrentMonth) return null;

    const start = isCurrentMonth ? startDay : 1;
    const end = endsInCurrentMonth ? endDay : daysInMonth;
    const width = end - start + 1;

    return {
      left: (start - 1) * 60, // 60px per day
      width: width * 60 - 8, // -8px for gap
      start,
      end
    };
  };

  return (
    <div className="space-y-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-gray-900">Visualização Timeline</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={scrollLeft}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={scrollRight}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600">Plataformas:</span>
        {Object.entries(platformColors).map(([platform, colors]) => (
          <div key={platform} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded border ${colors.bg} ${colors.border}`} />
            <span className="text-gray-700 capitalize">{platform}</span>
          </div>
        ))}
      </div>

      {/* Timeline Grid */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {/* Days Header */}
        <div className="border-b bg-gray-50 sticky top-0 z-10">
          <div className="flex">
            {/* Property column header */}
            <div className="w-64 flex-shrink-0 p-4 border-r bg-gray-50">
              <span className="text-sm text-gray-700">Propriedade</span>
            </div>
            
            {/* Days scroll container */}
            <div className="flex-1 overflow-x-auto" ref={scrollRef}>
              <div className="flex" style={{ minWidth: `${daysInMonth * 60}px` }}>
                {days.map((day) => {
                  const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
                  const isToday = 
                    day.date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={day.dayOfMonth}
                      className={`
                        w-[60px] flex-shrink-0 p-2 text-center border-r
                        ${isWeekend ? 'bg-blue-50' : ''}
                        ${isToday ? 'bg-yellow-50' : ''}
                      `}
                    >
                      <div className="text-xs text-gray-500">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][day.dayOfWeek]}
                      </div>
                      <div className={`text-sm ${isToday ? 'text-yellow-700 font-semibold' : 'text-gray-900'}`}>
                        {day.dayOfMonth}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Properties Rows */}
        <div className="divide-y">
          {properties.map((property) => {
            const propertyReservations = reservations.filter(
              r => r.propertyId === property.id
            );

            return (
              <div key={property.id} className="flex hover:bg-gray-50">
                {/* Property Info */}
                <div className="w-64 flex-shrink-0 p-4 border-r">
                  <div className="flex items-center gap-3">
                    <img
                      src={property.image}
                      alt={property.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate">
                        {property.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {property.type}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-x-auto scrollbar-hide">
                  <div 
                    className="relative h-24"
                    style={{ minWidth: `${daysInMonth * 60}px` }}
                  >
                    {/* Grid lines */}
                    {days.map((day) => (
                      <div
                        key={day.dayOfMonth}
                        className={`
                          absolute top-0 bottom-0 w-[60px] border-r
                          ${(day.dayOfWeek === 0 || day.dayOfWeek === 6) ? 'bg-blue-50/30' : ''}
                        `}
                        style={{ left: (day.dayOfMonth - 1) * 60 }}
                      />
                    ))}

                    {/* Reservations */}
                    {propertyReservations.map((reservation) => {
                      const position = getReservationPosition(reservation);
                      if (!position) return null;

                      const colors = platformColors[reservation.platform];
                      const isHovered = hoveredReservation === reservation.id;

                      return (
                        <div
                          key={reservation.id}
                          className={`
                            absolute top-2 h-20 rounded-lg border-2 cursor-pointer
                            transition-all duration-200
                            ${colors.bg} ${colors.border}
                            ${isHovered ? 'shadow-lg z-10 scale-105' : 'hover:shadow-md'}
                          `}
                          style={{
                            left: position.left + 4,
                            width: position.width
                          }}
                          onClick={() => onReservationClick(reservation)}
                          onMouseEnter={() => setHoveredReservation(reservation.id)}
                          onMouseLeave={() => setHoveredReservation(null)}
                        >
                          <div className="p-2 h-full flex flex-col justify-between">
                            <div className="space-y-1">
                              <div className={`text-xs font-medium ${colors.text} truncate`}>
                                {reservation.guestName}
                              </div>
                              <div className="text-xs text-gray-600 truncate">
                                {reservation.nights} {reservation.nights === 1 ? 'noite' : 'noites'}
                              </div>
                            </div>
                            <div className={`text-xs font-medium ${colors.text}`}>
                              R$ {reservation.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                            </div>
                          </div>

                          {/* Hover tooltip */}
                          {isHovered && (
                            <div className="absolute top-full left-0 mt-2 p-3 bg-white border-2 border-gray-200 rounded-lg shadow-xl z-20 min-w-[250px]">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">{reservation.guestName}</span>
                                  <Badge variant="outline" className={`${colors.bg} ${colors.text}`}>
                                    {reservation.platform}
                                  </Badge>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3" />
                                    {reservation.checkIn.toLocaleDateString('pt-BR')} → {reservation.checkOut.toLocaleDateString('pt-BR')}
                                  </div>
                                  <div>
                                    {reservation.nights} {reservation.nights === 1 ? 'noite' : 'noites'}
                                  </div>
                                  <div className="font-medium text-gray-900">
                                    R$ {reservation.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Reservas no mês</div>
          <div className="text-2xl text-gray-900">
            {reservations.filter(r => 
              r.checkIn.getMonth() === currentMonth.getMonth() ||
              r.checkOut.getMonth() === currentMonth.getMonth()
            ).length}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Taxa de ocupação</div>
          <div className="text-2xl text-blue-600">
            {Math.round((reservations.length * 3) / (properties.length * daysInMonth) * 100)}%
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Receita prevista</div>
          <div className="text-2xl text-green-600">
            R$ {reservations.reduce((sum, r) => sum + r.price, 0).toLocaleString('pt-BR', { 
              minimumFractionDigits: 0 
            })}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Diária média</div>
          <div className="text-2xl text-purple-600">
            R$ {reservations.length > 0 
              ? (reservations.reduce((sum, r) => sum + (r.price / r.nights), 0) / reservations.length).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
              : '0'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
