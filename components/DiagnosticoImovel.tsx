import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, CheckCircle, XCircle, Image, MapPin, Home } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface DiagnosticoProps {
  propertyId: string;
}

export function DiagnosticoImovel({ propertyId }: DiagnosticoProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const consultarBanco = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 [DIAGNÓSTICO] Consultando imóvel:', propertyId);
      
      const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/properties/${propertyId}`;
      console.log('🌐 [DIAGNÓSTICO] URL:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 [DIAGNÓSTICO] Status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ [DIAGNÓSTICO] Dados recebidos:', result);
      
      if (!result.success || !result.data) {
        throw new Error('Imóvel não encontrado no banco de dados');
      }
      
      setData(result.data);
      
    } catch (err: any) {
      console.error('❌ [DIAGNÓSTICO] Erro:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    consultarBanco();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Consultando banco de dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <XCircle className="w-5 h-5" />
            Erro ao Consultar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
          <Button onClick={consultarBanco} className="mt-4">
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // Análise dos dados
  const hasName = !!data.name;
  const hasPhotos = data.photos && Array.isArray(data.photos) && data.photos.length > 0;
  const hasCoverPhoto = !!data.coverPhoto;
  const hasLocationAmenities = data.locationAmenities && data.locationAmenities.length > 0;
  const hasListingAmenities = data.listingAmenities && data.listingAmenities.length > 0;
  const hasContentPhotos = data.contentPhotos?.photos && data.contentPhotos.photos.length > 0;

  const totalProblemas = [
    !hasName,
    !hasPhotos,
    !hasLocationAmenities,
    !hasListingAmenities,
    hasContentPhotos // contentPhotos aninhado é um problema
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Status Geral */}
      <Card className={totalProblemas > 0 ? 'border-yellow-500' : 'border-emerald-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {totalProblemas === 0 ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span>✅ Dados Completos</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <span>⚠️ {totalProblemas} Problema(s) Encontrado(s)</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatusItem label="Nome" hasData={hasName} />
            <StatusItem 
              label="Fotos (photos)" 
              hasData={hasPhotos} 
              count={hasPhotos ? data.photos.length : 0}
            />
            <StatusItem label="Foto de Capa" hasData={hasCoverPhoto} />
            <StatusItem 
              label="Amenities Local" 
              hasData={hasLocationAmenities}
              count={hasLocationAmenities ? data.locationAmenities.length : 0}
            />
            <StatusItem 
              label="Amenities Anúncio" 
              hasData={hasListingAmenities}
              count={hasListingAmenities ? data.listingAmenities.length : 0}
            />
            {hasContentPhotos && (
              <StatusItem 
                label="ContentPhotos (⚠️ aninhado)" 
                hasData={hasContentPhotos}
                count={data.contentPhotos.photos.length}
                isWarning
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dados Básicos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Dados Básicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <DataRow label="ID" value={data.id} mono />
            <DataRow label="Nome" value={data.name || '❌ VAZIO'} />
            <DataRow label="Código" value={data.code || '❌ VAZIO'} />
            <DataRow label="Tipo" value={data.type || '❌ VAZIO'} />
            <DataRow label="Status" value={data.status || 'N/A'} />
            <DataRow label="Endereço" value={data.address || 'N/A'} />
          </div>
        </CardContent>
      </Card>

      {/* Fotos */}
      {hasPhotos && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Fotos ({data.photos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.photos.map((photo: any, index: number) => {
                const photoUrl = typeof photo === 'string' ? photo : photo.url;
                const isCover = typeof photo === 'object' && photo.isCover;
                
                return (
                  <div key={index} className="relative border rounded-lg overflow-hidden">
                    <img 
                      src={photoUrl} 
                      alt={`Foto ${index + 1}`}
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27150%27%3E%3Crect fill=%27%23ddd%27 width=%27200%27 height=%27150%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 fill=%27%23999%27%3EErro%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {isCover && (
                      <Badge className="absolute top-2 right-2 bg-yellow-500">
                        ⭐ Capa
                      </Badge>
                    )}
                    <div className="p-2 text-xs text-center">
                      #{index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ContentPhotos Aninhado (PROBLEMA) */}
      {hasContentPhotos && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="w-5 h-5" />
              ⚠️ ContentPhotos (Estrutura Aninhada)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>PROBLEMA:</strong> As fotos estão salvas na estrutura aninhada do wizard 
                (<code>contentPhotos.photos</code>) em vez de estarem no campo raiz (<code>photos</code>).
              </p>
              <p className="text-sm text-yellow-800 mt-2">
                <strong>SOLUÇÃO:</strong> A versão v1.0.103.313 já corrige isso no backend. 
                Re-salve o imóvel para aplicar a correção.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.contentPhotos.photos.map((photo: any, index: number) => (
                <div key={index} className="relative border border-yellow-300 rounded-lg overflow-hidden">
                  <img 
                    src={photo.url} 
                    alt={`Foto aninhada ${index + 1}`}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27200%27 height=%27150%27%3E%3Crect fill=%27%23ffc107%27 width=%27200%27 height=%27150%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 fill=%27%23fff%27%3EBlob%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  {photo.isCover && (
                    <Badge className="absolute top-2 right-2 bg-yellow-500">
                      ⭐ Capa
                    </Badge>
                  )}
                  <div className="p-2 text-xs text-center bg-yellow-100">
                    #{index + 1} - {photo.category || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Amenities do Local */}
      <Card className={hasLocationAmenities ? '' : 'border-yellow-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Amenidades do Local
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasLocationAmenities ? (
            <div className="flex flex-wrap gap-2">
              {data.locationAmenities.map((amenity: string, index: number) => (
                <Badge key={index} variant="secondary">
                  ✅ {amenity}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ❌ Nenhuma amenidade do local foi salva. Verifique se o Step 3 foi preenchido.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amenities do Anúncio */}
      <Card className={hasListingAmenities ? '' : 'border-yellow-500'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Amenidades do Anúncio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasListingAmenities ? (
            <div className="flex flex-wrap gap-2">
              {data.listingAmenities.map((amenity: string, index: number) => (
                <Badge key={index} variant="secondary">
                  ✅ {amenity}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ❌ Nenhuma amenidade do anúncio foi salva. Verifique se o Step 4 foi preenchido.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* JSON Completo */}
      <Card>
        <CardHeader>
          <CardTitle>💻 JSON Completo</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      </Card>

      {/* Ações */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Ações Recomendadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {!hasPhotos && hasContentPhotos && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>1. Re-salvar o imóvel:</strong> Edite o imóvel e clique em "Salvar". 
                  A v1.0.103.313 irá extrair as fotos de <code>contentPhotos</code> para <code>photos</code>.
                </p>
              </div>
            )}
            
            {!hasLocationAmenities && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>2. Preencher Amenidades do Local:</strong> Edite o imóvel e preencha o Step 3 
                  (Amenidades do Local) com as comodidades do condomínio/prédio.
                </p>
              </div>
            )}
            
            {!hasListingAmenities && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>3. Preencher Amenidades do Anúncio:</strong> Edite o imóvel e preencha o Step 4 
                  (Amenidades) com os itens do imóvel (wifi, ar-condicionado, etc).
                </p>
              </div>
            )}
            
            <Button onClick={consultarBanco} className="w-full">
              🔄 Recarregar Diagnóstico
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusItem({ 
  label, 
  hasData, 
  count, 
  isWarning = false 
}: { 
  label: string; 
  hasData: boolean; 
  count?: number;
  isWarning?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {hasData ? (
        isWarning ? (
          <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
        ) : (
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        )
      ) : (
        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground truncate">{label}</p>
        <p className={`text-sm font-medium ${
          hasData ? (isWarning ? 'text-yellow-600' : 'text-emerald-600') : 'text-red-600'
        }`}>
          {hasData ? (count !== undefined ? `${count} item(ns)` : 'OK') : 'VAZIO'}
        </p>
      </div>
    </div>
  );
}

function DataRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4 pb-2 border-b">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className={`text-sm ${mono ? 'font-mono' : 'font-medium'} text-right`}>{value}</span>
    </div>
  );
}
