/**
 * RENDIZY - Property Types Seed Tool
 * 
 * Ferramenta para forçar o seed dos tipos de propriedade no banco Supabase
 * 
 * @version 1.0.103.302
 * @date 2025-11-04
 */

import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle2, Database, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner';

export function PropertyTypesSeedTool() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleForceSeed = async () => {
    try {
      setLoading(true);
      setResult(null);

      console.log('🌱 [SEED TOOL] Forçando seed de tipos...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/property-types/seed`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      console.log('✅ [SEED TOOL] Seed completo:', data);

      setResult(data);
      toast.success(`✅ ${data.message}`, {
        description: `${data.breakdown.location} tipos de local + ${data.breakdown.accommodation} tipos de acomodação`,
      });
    } catch (error: any) {
      console.error('❌ [SEED TOOL] Erro ao fazer seed:', error);
      toast.error('Erro ao fazer seed', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-lg">Seed de Tipos de Propriedade</CardTitle>
          </div>
          {result && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {result.breakdown.location + result.breakdown.accommodation} tipos
            </Badge>
          )}
        </div>
        <CardDescription>
          Força o seed de TODOS os tipos de propriedade no banco Supabase
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Aviso */}
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Esta ação irá:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>Deletar TODOS os tipos existentes no banco</li>
              <li>Recriar 30 tipos de local</li>
              <li>Recriar 23 tipos de acomodação</li>
              <li>Total: 53 tipos do sistema</li>
            </ul>
          </div>
        </div>

        {/* Botão de Seed */}
        <Button
          onClick={handleForceSeed}
          disabled={loading}
          className="w-full"
          variant="default"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Seedando tipos...
            </>
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Forçar Seed de Tipos
            </>
          )}
        </Button>

        {/* Resultado */}
        {result && (
          <div className="space-y-2 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Seed Completo!
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between p-2 bg-white rounded border border-green-100">
                <span className="text-gray-600">Tipos de Local:</span>
                <Badge variant="outline">{result.breakdown.location}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-green-100">
                <span className="text-gray-600">Tipos de Acomodação:</span>
                <Badge variant="outline">{result.breakdown.accommodation}</Badge>
              </div>
            </div>

            <div className="text-xs text-green-700 mt-2">
              Agora você pode cadastrar imóveis com os tipos: Casa, Holiday Home, Villa, Chalé, etc.
            </div>
          </div>
        )}

        {/* Lista de tipos que serão criados */}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
            Ver todos os 53 tipos que serão criados
          </summary>
          <div className="mt-3 space-y-3">
            {/* Tipos de Local */}
            <div>
              <p className="font-medium text-gray-800 mb-2">📍 Tipos de Local (30):</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                <div>Acomodação Móvel</div>
                <div>Albergue</div>
                <div>Apartamento</div>
                <div>Apartamento/Residencial</div>
                <div>Bangalô</div>
                <div>Barco</div>
                <div>Barco/Beira</div>
                <div>Boutique Hotel</div>
                <div>Cabana</div>
                <div>Cama e Café (B&B)</div>
                <div>Camping</div>
                <div>Casa</div>
                <div>Casa Móvel</div>
                <div>Castelo</div>
                <div>Chalé</div>
                <div>Chalé (Área de Camping)</div>
                <div>Condomínio</div>
                <div>Estalagem</div>
                <div>Fazenda</div>
                <div>Hotel</div>
                <div>Hotel Boutique</div>
                <div>Hostel</div>
                <div>Iate</div>
                <div>Industrial</div>
                <div>Motel/Carro</div>
                <div>Pousada Exclusiva</div>
                <div>Residência</div>
                <div>Resort</div>
                <div>Treehouse</div>
                <div>Villa/Casa</div>
              </div>
            </div>

            {/* Tipos de Acomodação */}
            <div>
              <p className="font-medium text-gray-800 mb-2">🏠 Tipos de Acomodação (23):</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                <div>Apartamento</div>
                <div>Bangalô</div>
                <div>Cabana</div>
                <div>Camping</div>
                <div>Cápsula/Trailer/Casa Móvel</div>
                <div className="font-semibold text-green-700">Casa</div>
                <div>Casa em Dormitórios</div>
                <div>Chalé</div>
                <div>Condomínio</div>
                <div>Dormitório</div>
                <div>Estúdio</div>
                <div className="font-semibold text-green-700">Holiday Home</div>
                <div>Hostel</div>
                <div>Hotel</div>
                <div>Iate</div>
                <div>Industrial</div>
                <div>Loft</div>
                <div>Quarto Compartilhado</div>
                <div>Quarto Inteiro</div>
                <div>Quarto Privado</div>
                <div>Suíte</div>
                <div>Treehouse</div>
                <div className="font-semibold text-green-700">Villa/Casa</div>
              </div>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
