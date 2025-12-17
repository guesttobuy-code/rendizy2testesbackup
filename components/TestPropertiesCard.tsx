import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Home, MapPin, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TestPropertiesCardProps {
  onLoadComplete?: () => void;
}

export function TestPropertiesCard({ onLoadComplete }: TestPropertiesCardProps) {
  const [loading, setLoading] = React.useState(false);

  const properties = [
    {
      name: 'Arraial Novo - Barra da Tijuca RJ',
      type: 'Casa',
      guests: '8 hóspedes',
      price: 'R$ 650/noite',
      icon: '🏖️',
      color: 'text-red-500'
    },
    {
      name: 'Casa 003 - Itaúnas RJ',
      type: 'Casa',
      guests: '6 hóspedes',
      price: 'R$ 450/noite',
      icon: '🌴',
      color: 'text-teal-500'
    },
    {
      name: 'Studio Centro - RJ',
      type: 'Apartamento',
      guests: '2 hóspedes',
      price: 'R$ 220/noite',
      icon: '🏢',
      color: 'text-green-500'
    },
    {
      name: 'MARICÁ - RESERVA TIPO CASA',
      type: 'Casa',
      guests: '10 hóspedes',
      price: 'R$ 850/noite',
      icon: '🏝️',
      color: 'text-pink-500'
    }
  ];

  const handleLoadProperties = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/dev/seed-test-properties`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        const reservationMsg = data.data.reservationsCount > 0 
          ? `\n✈️ ${data.data.reservationsCount} reserva de Airbnb criada (24-27 Jan)`
          : '';
        toast.success(`✅ ${data.data.propertiesCount} imóveis de teste criados com sucesso!`, {
          description: `${data.data.guestsCount} hóspedes criados${reservationMsg}`,
          duration: 6000,
        });
        onLoadComplete?.();
      } else {
        toast.error(data.error || 'Erro ao carregar imóveis de teste');
      }
    } catch (error) {
      toast.error('Erro ao carregar imóveis de teste');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/50 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Carregar Imóveis para Teste</CardTitle>
        </div>
        <CardDescription>
          Crie 4 imóveis completos com locations, hóspedes e todos os dados necessários para testar criação de reservas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Properties List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {properties.map((property, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary/50 transition-colors"
            >
              <div className="text-2xl flex-shrink-0 mt-0.5">
                {property.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{property.name}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span className={`px-1.5 py-0.5 rounded ${property.color} bg-opacity-10`}>
                    {property.type}
                  </span>
                  <span>•</span>
                  <span>{property.guests}</span>
                  <span>•</span>
                  <span className="font-medium">{property.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-blue-900">O que será criado:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span>4 Locations (endereços físicos completos)</span>
            </li>
            <li className="flex items-center gap-2">
              <Home className="h-3.5 w-3.5 flex-shrink-0" />
              <span>4 Properties (imóveis com fotos e detalhes)</span>
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              <span>3 Guests (hóspedes para teste de reservas)</span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleLoadProperties}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Carregando imóveis...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Carregar 4 Imóveis de Teste
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Após carregar, acesse o <strong>Calendário</strong> para criar reservas
        </p>
      </CardContent>
    </Card>
  );
}
