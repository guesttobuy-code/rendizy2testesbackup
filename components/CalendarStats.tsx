import React from 'react';
import { Property, Reservation } from '../App';
import { TrendingUp, Calendar, DollarSign, Percent } from 'lucide-react';

interface CalendarStatsProps {
  properties: Property[];
  reservations: Reservation[];
  currentMonth: Date;
}

export function CalendarStats({ properties, reservations, currentMonth }: CalendarStatsProps) {
  // Safety check
  if (!currentMonth || !properties || !reservations) {
    return null;
  }

  // Calculate stats
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const totalPossibleNights = properties.length * daysInMonth;
  
  const occupiedNights = reservations.reduce((acc, res) => {
    const checkIn = new Date(res.checkIn);
    const checkOut = new Date(res.checkOut);
    
    // Only count if reservation is in current month
    if (checkIn.getMonth() === currentMonth.getMonth() || checkOut.getMonth() === currentMonth.getMonth()) {
      return acc + res.nights;
    }
    return acc;
  }, 0);

  const occupancyRate = totalPossibleNights > 0 
    ? Math.round((occupiedNights / totalPossibleNights) * 100) 
    : 0;

  const totalRevenue = reservations
    .filter(res => {
      const checkIn = new Date(res.checkIn);
      return checkIn.getMonth() === currentMonth.getMonth() && 
             checkIn.getFullYear() === currentMonth.getFullYear();
    })
    .reduce((acc, res) => acc + res.price, 0);

  const confirmedReservations = reservations.filter(res => {
    const checkIn = new Date(res.checkIn);
    return res.status === 'confirmed' && 
           checkIn.getMonth() === currentMonth.getMonth() &&
           checkIn.getFullYear() === currentMonth.getFullYear();
  }).length;

  const stats = [
    {
      label: 'Ocupação',
      value: `${occupancyRate}%`,
      icon: Percent,
      color: occupancyRate >= 70 ? 'text-green-600' : occupancyRate >= 40 ? 'text-yellow-600' : 'text-red-600',
      bgColor: occupancyRate >= 70 ? 'bg-green-50' : occupancyRate >= 40 ? 'bg-yellow-50' : 'bg-red-50'
    },
    {
      label: 'Reservas',
      value: confirmedReservations.toString(),
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Receita',
      value: `R$ ${(totalRevenue / 1000).toFixed(1)}k`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Noites',
      value: `${occupiedNights}/${totalPossibleNights}`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => (
        <div key={idx} className={`${stat.bgColor} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">{stat.label}</span>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </div>
          <div className={`text-2xl ${stat.color}`}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}
