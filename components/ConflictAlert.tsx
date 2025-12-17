import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Reservation } from '../App';

interface ConflictInfo {
  propertyId: string;
  propertyName: string;
  date: string;
  reservations: Reservation[];
}

interface ConflictAlertProps {
  conflicts: ConflictInfo[];
  onReservationClick: (reservation: Reservation) => void;
  onDismiss: () => void;
}

export function ConflictAlert({ conflicts, onReservationClick, onDismiss }: ConflictAlertProps) {
  if (conflicts.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-6 border-2 border-red-600 bg-red-50 shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3 flex-1 min-w-0">
          <AlertTriangle className="h-6 w-6 mt-0.5 text-red-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <AlertTitle className="text-red-900 mb-3 text-lg font-bold">
              ⚠️ OVERBOOKING DETECTADO
            </AlertTitle>
            <AlertDescription className="text-red-800 space-y-4">
              <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                <p className="font-semibold mb-1">
                  {conflicts.length} conflito{conflicts.length > 1 ? 's' : ''} encontrado{conflicts.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm">
                  <strong>ATENÇÃO:</strong> Foram detectadas reservas sobrepostas na mesma propriedade. 
                  Isso pode ter ocorrido por reservas simultâneas ou erro de sincronização.
                </p>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {conflicts.map((conflict, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border-2 border-red-300 shadow-sm">
                    <div className="mb-3 pb-2 border-b border-red-200">
                      <p className="font-bold text-red-900 text-base">
                        {conflict.propertyName}
                      </p>
                      <p className="text-sm text-red-700 mt-1">
                        Data conflitante: {new Date(conflict.date).toLocaleDateString('pt-BR', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-red-800 font-semibold mb-2">
                        Reservas sobrepostas ({conflict.reservations.length}):
                      </p>
                      {conflict.reservations.map((reservation) => (
                        <button
                          key={reservation.id}
                          onClick={() => onReservationClick(reservation)}
                          className="w-full text-left p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors border border-red-200 group"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Badge variant="outline" className="bg-white border-red-400 text-red-700 font-semibold flex-shrink-0">
                                {reservation.platform}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-red-900 truncate">
                                  {reservation.guestName}
                                </p>
                                <p className="text-xs text-red-700 mt-0.5">
                                  {new Date(reservation.checkIn).toLocaleDateString('pt-BR')} → {new Date(reservation.checkOut).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              Ver detalhes →
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t-2 border-red-300 bg-red-100 rounded-lg p-3">
                <p className="text-sm font-semibold text-red-900">
                  <strong>📌 Ação necessária:</strong> Clique em uma das reservas acima para visualizar detalhes e resolver o conflito.
                </p>
              </div>
            </AlertDescription>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-red-900 hover:text-red-700 hover:bg-red-100 ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}
