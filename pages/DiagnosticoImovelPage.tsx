import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DiagnosticoImovel } from '../components/DiagnosticoImovel';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function DiagnosticoImovelPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">❌ ID do imóvel não fornecido</p>
          <Button onClick={() => navigate('/properties')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Imóveis
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl mb-2">🔍 Diagnóstico de Imóvel</h1>
          <p className="text-muted-foreground">
            Análise completa dos dados salvos no Supabase
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            ID: {id}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/properties')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>

      <DiagnosticoImovel propertyId={id} />
    </div>
  );
}
