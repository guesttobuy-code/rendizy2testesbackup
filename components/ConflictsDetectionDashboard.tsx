import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Calendar,
  Home,
  Users,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConflictInfo {
  propertyId: string;
  propertyName: string;
  date: string;
  reservations: {
    id: string;
    guestId: string;
    checkIn: string;
    checkOut: string;
    platform: string;
    status: string;
  }[];
}

interface DetectionResult {
  conflictsCount: number;
  affectedReservations: number;
  conflicts: ConflictInfo[];
  conflictingReservationIds: string[];
}

export function ConflictsDetectionDashboard() {
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);

  const detectConflicts = async () => {
    setDetecting(true);
    setResult(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/reservations/detect-conflicts`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        
        if (data.data.conflictsCount === 0) {
          toast.success('✅ Nenhum overbooking detectado!');
        } else {
          toast.error(
            `⚠️ ${data.data.conflictsCount} conflito(s) detectado(s)`,
            { duration: 5000 }
          );
        }
      } else {
        toast.error('Erro ao detectar conflitos');
      }
    } catch (error) {
      console.error('Erro ao detectar conflitos:', error);
      toast.error('Erro ao detectar conflitos');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Detecção de Conflitos (Overbooking)
            </CardTitle>
            <CardDescription>
              Verifique se existem reservas sobrepostas na mesma propriedade
            </CardDescription>
          </div>
          <Button
            onClick={detectConflicts}
            disabled={detecting}
            variant={result?.conflictsCount ? 'destructive' : 'default'}
          >
            {detecting ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            {detecting ? 'Detectando...' : 'Detectar Conflitos'}
          </Button>
        </div>
      </CardHeader>

      {result && (
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border-2 ${
              result.conflictsCount === 0 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {result.conflictsCount === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                )}
                <span className={`font-medium ${
                  result.conflictsCount === 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  Conflitos Detectados
                </span>
              </div>
              <div className={`text-3xl font-bold ${
                result.conflictsCount === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {result.conflictsCount}
              </div>
            </div>

            <div className="p-4 rounded-lg border-2 bg-orange-50 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-900">
                  Reservas Afetadas
                </span>
              </div>
              <div className="text-3xl font-bold text-orange-600">
                {result.affectedReservations}
              </div>
            </div>

            <div className="p-4 rounded-lg border-2 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Home className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">
                  Propriedades Afetadas
                </span>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {new Set(result.conflicts.map(c => c.propertyId)).size}
              </div>
            </div>
          </div>

          {/* No Conflicts */}
          {result.conflictsCount === 0 && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                <span className="font-medium">Parabéns!</span> Nenhum overbooking detectado. 
                Todas as reservas estão organizadas corretamente.
              </AlertDescription>
            </Alert>
          )}

          {/* Conflicts List */}
          {result.conflictsCount > 0 && (
            <div className="space-y-4">
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  <span className="font-medium">Atenção!</span> Foram detectados conflitos de overbooking. 
                  Resolva esses conflitos o mais rápido possível para evitar problemas operacionais.
                </AlertDescription>
              </Alert>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium text-lg">Detalhes dos Conflitos</h3>

                {result.conflicts.map((conflict, index) => (
                  <Card key={index} className="border-red-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            {conflict.propertyName}
                          </CardTitle>
                          <CardDescription className="text-red-600 font-medium mt-1">
                            Conflito em {format(new Date(conflict.date), 'dd/MM/yyyy', { locale: ptBR })}
                          </CardDescription>
                        </div>
                        <Badge variant="destructive">
                          {conflict.reservations.length} reservas sobrepostas
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {conflict.reservations.map((reservation, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500 block">ID</span>
                              <span className="font-mono">{reservation.id}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">Check-in</span>
                              <span className="font-medium">
                                {format(new Date(reservation.checkIn), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">Check-out</span>
                              <span className="font-medium">
                                {format(new Date(reservation.checkOut), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">Status</span>
                              <Badge variant="outline">{reservation.status}</Badge>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline">
                          <Users className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </Button>
                        <Button size="sm" variant="destructive">
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancelar Mais Recente
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
