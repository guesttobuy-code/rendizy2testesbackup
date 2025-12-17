/**
 * 🚀 MODAL DE IMPORTAÇÃO STAYS.NET
 * 
 * Interface para importação completa de dados do Stays.net
 * Permite selecionar propriedades específicas ou importar todas
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import {
  Loader2,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  Users,
  Calendar,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface StaysNetImportModalProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (stats: any) => void;
}

export function StaysNetImportModal({ open, onClose, onComplete }: StaysNetImportModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState<any>(null);
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [importAll, setImportAll] = useState(true);

  // Carregar propriedades disponíveis ao abrir o modal
  useEffect(() => {
    if (open) {
      loadAvailableProperties();
    }
  }, [open]);

  const loadAvailableProperties = async () => {
    setIsLoadingProperties(true);
    try {
      const token = localStorage.getItem('rendizy-token');
      if (!token) {
        toast.error('Faça login primeiro');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/sync/properties`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token,
            'apikey': publicAnonKey,
          },
        }
      );

      const result = await response.json();
      if (result.success && result.data) {
        const properties = Array.isArray(result.data) 
          ? result.data 
          : result.data.data || result.data.properties || [];
        setAvailableProperties(properties);
      }
    } catch (error) {
      console.error('Erro ao carregar propriedades:', error);
      toast.error('Erro ao carregar propriedades disponíveis');
    } finally {
      setIsLoadingProperties(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportStats(null);

    try {
      const token = localStorage.getItem('rendizy-token');
      if (!token) {
        toast.error('Faça login primeiro');
        return;
      }

      const propertyIds = importAll ? [] : selectedPropertyIds;

      toast.info('🚀 Iniciando importação completa...', { duration: 3000 });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/import/full`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token,
            'apikey': publicAnonKey,
          },
          body: JSON.stringify({
            selectedPropertyIds: propertyIds,
          }),
        }
      );

      const result = await response.json();

      if (result.success && result.data) {
        setImportStats(result.data.stats);
        toast.success('✅ Importação concluída com sucesso!', { duration: 5000 });
        
        if (onComplete) {
          onComplete(result.data.stats);
        }
      } else {
        toast.error('❌ Erro na importação: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (error: any) {
      console.error('Erro na importação:', error);
      toast.error('❌ Erro ao executar importação: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const toggleProperty = (propertyId: string) => {
    if (selectedPropertyIds.includes(propertyId)) {
      setSelectedPropertyIds(selectedPropertyIds.filter(id => id !== propertyId));
    } else {
      setSelectedPropertyIds([...selectedPropertyIds, propertyId]);
    }
  };

  const toggleSelectAll = () => {
    if (importAll) {
      setImportAll(false);
      setSelectedPropertyIds([]);
    } else {
      setImportAll(true);
      setSelectedPropertyIds([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importar Dados do Stays.net
          </DialogTitle>
          <DialogDescription>
            Importe hóspedes, propriedades e reservas do Stays.net para o Rendizy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Seleção de Propriedades */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Propriedades</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {importAll ? 'Selecionar Específicas' : 'Importar Todas'}
                </Button>
              </div>
              <CardDescription>
                {importAll 
                  ? 'Todas as propriedades serão importadas'
                  : 'Selecione as propriedades que deseja importar'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProperties ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>Carregando propriedades...</span>
                </div>
              ) : importAll ? (
                <Alert>
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    Todas as propriedades disponíveis serão importadas automaticamente.
                  </AlertDescription>
                </Alert>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {availableProperties.map((property: any) => (
                      <div
                        key={property._id || property.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                      >
                        <Checkbox
                          checked={selectedPropertyIds.includes(property._id || property.id)}
                          onCheckedChange={() => toggleProperty(property._id || property.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{property.name || property.internalName || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">
                            {property.code || property.id}
                          </p>
                        </div>
                      </div>
                    ))}
                    {availableProperties.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhuma propriedade encontrada
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Estatísticas da Importação */}
          {importStats && (
            <Card>
              <CardHeader>
                <CardTitle>Resultado da Importação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold text-blue-600">
                      {importStats.guests?.created || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Hóspedes</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Building2 className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <p className="text-2xl font-bold text-green-600">
                      {importStats.properties?.created || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Propriedades</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <p className="text-2xl font-bold text-purple-600">
                      {importStats.reservations?.created || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Reservas</p>
                  </div>
                </div>

                {importStats.errors && importStats.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      <p className="font-medium mb-2">Erros encontrados:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {importStats.errors.slice(0, 5).map((error: string, i: number) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isImporting}>
              {importStats ? 'Fechar' : 'Cancelar'}
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || (!importAll && selectedPropertyIds.length === 0)}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Iniciar Importação
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

