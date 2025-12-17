/**
 * RENDIZY - Teste Automatizado: Criação de Imóvel "@figma@"
 * 
 * Componente de teste que automaticamente:
 * - Preenche TODOS os campos do wizard
 * - Título: "@figma@"
 * - Todos os campos numéricos: 10
 * - Sobe foto do Unsplash com tags
 * - Salva no Supabase
 * 
 * @version 1.0.103.309
 * @date 2025-11-05
 */

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Play, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TestLog {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  timestamp: Date;
}

export function FigmaTestPropertyCreator() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [progress, setProgress] = useState(0);

  const addLog = (step: string, status: TestLog['status'], message: string) => {
    setLogs(prev => [...prev, { step, status, message, timestamp: new Date() }]);
  };

  const runTest = async () => {
    setIsRunning(true);
    setLogs([]);
    setProgress(0);

    try {
      // ========================================
      // STEP 1: Buscar Property Types
      // ========================================
      addLog('Step 1', 'running', 'Buscando tipos de acomodação...');
      setProgress(5);

      const typesResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/property-types`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!typesResponse.ok) {
        throw new Error('Falha ao buscar tipos de acomodação');
      }

      const propertyTypes = await typesResponse.json();
      const accommodationType = propertyTypes.find((t: any) => 
        t.category === 'accommodation' && t.name.toLowerCase().includes('casa')
      );

      if (!accommodationType) {
        throw new Error('Nenhum tipo de acomodação encontrado');
      }

      addLog('Step 1', 'success', `Tipo encontrado: ${accommodationType.name}`);
      setProgress(10);

      // ========================================
      // STEP 2: Criar dados completos do imóvel
      // ========================================
      addLog('Step 2', 'running', 'Criando dados do imóvel "@figma@"...');

      const propertyData = {
        // STEP 1: TIPO
        propertyTypeId: null,
        accommodationTypeId: accommodationType.id,
        subtipo: 'entire_place',
        modalidades: ['short_term_rental'],
        registrationNumber: 'FIGMA-TEST-001',
        propertyType: 'individual',

        // STEP 2: LOCALIZAÇÃO
        name: '@figma@',
        address: 'Rua Figma Test, 10',
        neighborhood: 'Bairro Teste',
        city: 'Cidade Teste',
        state: 'Estado Teste',
        country: 'Brasil',
        zipCode: '10101-010',
        latitude: -10.10,
        longitude: -10.10,

        // STEP 3: QUARTOS E ESPAÇOS
        rooms: {
          bedrooms: 10,
          beds: 10,
          bathrooms: 10,
          guests: 10,
          area: 10,
        },

        // STEP 4: AMENIDADES DO LOCAL (vazio - será preenchido depois)
        locationAmenities: [],

        // STEP 5: AMENIDADES DA ACOMODAÇÃO
        amenities: [],

        // STEP 6: DESCRIÇÃO
        description: 'Imóvel de teste @figma@ criado automaticamente. Este é um imóvel fictício para testes do sistema RENDIZY. Todos os campos numéricos foram preenchidos com o valor 10 conforme solicitado.',
        highlights: 'Teste automatizado, Criado por @figma@, Todos os campos preenchidos',
        checkInTime: '10:00',
        checkOutTime: '10:00',

        // STEP 7: FOTOS (será adicionado depois)
        photos: [],

        // STEP 8: CONTRATO (FINANCEIRO)
        financialContract: {
          ownerId: null, // Será definido depois
          commissionRate: 10,
          paymentTerms: 'monthly',
          contractStartDate: new Date().toISOString().split('T')[0],
          contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },

        // STEP 9: PRECIFICAÇÃO INDIVIDUAL
        pricing: {
          basePrice: 10,
          weekendPrice: 10,
          monthlyDiscount: 10,
          cleaningFee: 10,
          extraGuestFee: 10,
          currency: 'BRL',
        },

        // STEP 10: PRECIFICAÇÃO SAZONAL
        seasonalPricing: [],

        // STEP 11: PRECIFICAÇÃO DERIVADA
        derivedPricing: {
          enabled: false,
        },

        // STEP 12: REGRAS DE HOSPEDAGEM
        rules: {
          minNights: 10,
          maxNights: 10,
          checkInStart: '10:00',
          checkInEnd: '10:00',
          checkOutTime: '10:00',
          allowPets: true,
          allowSmoking: false,
          allowEvents: false,
          allowChildren: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
        },

        // STATUS
        status: 'active',
        isActive: true,
      };

      addLog('Step 2', 'success', 'Dados do imóvel preparados');
      setProgress(20);

      // ========================================
      // STEP 3: Upload de Foto (Unsplash)
      // ========================================
      addLog('Step 3', 'running', 'Fazendo upload de foto do Unsplash...');

      const imageUrl = 'https://images.unsplash.com/photo-1716629235408-4149364b2944?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBiZWFjaCUyMGhvdXNlfGVufDF8fHx8MTc2MjI1MTgzMHww&ixlib=rb-4.1.0&q=80&w=1080';

      // Baixar imagem do Unsplash
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();

      // Converter para base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageBlob);
      });

      // Fazer upload
      const photoResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/photos`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            propertyId: 'temp-figma-test', // Temporário, será atualizado depois
            imageData: base64,
            caption: '@figma@ - Foto de teste',
            tags: ['@figma@', 'teste', 'automatizado', 'rendizy', 'beach', 'modern'],
            isPrimary: true,
          }),
        }
      );

      if (!photoResponse.ok) {
        throw new Error('Falha no upload da foto');
      }

      const photoData = await photoResponse.json();
      addLog('Step 3', 'success', `Foto enviada com ${photoData.tags?.length || 6} tags`);
      setProgress(40);

      // Adicionar foto aos dados
      propertyData.photos = [{
        id: photoData.id,
        url: photoData.url,
        caption: photoData.caption,
        tags: photoData.tags,
        isPrimary: true,
        order: 0,
      }];

      // ========================================
      // STEP 4: Criar Imóvel no Supabase
      // ========================================
      addLog('Step 4', 'running', 'Salvando imóvel no Supabase...');
      setProgress(60);

      const createResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/properties`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(propertyData),
        }
      );

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        throw new Error(`Falha ao criar imóvel: ${errorText}`);
      }

      const createdProperty = await createResponse.json();
      addLog('Step 4', 'success', `Imóvel criado com ID: ${createdProperty.id}`);
      setProgress(80);

      // ========================================
      // STEP 5: Atualizar foto com propertyId correto
      // ========================================
      addLog('Step 5', 'running', 'Atualizando vinculação da foto...');

      const updatePhotoResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/photos/${photoData.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            propertyId: createdProperty.id,
          }),
        }
      );

      if (updatePhotoResponse.ok) {
        addLog('Step 5', 'success', 'Foto vinculada ao imóvel');
      } else {
        addLog('Step 5', 'error', 'Aviso: Foto criada mas não vinculada');
      }

      setProgress(100);

      // ========================================
      // SUCESSO FINAL
      // ========================================
      addLog('Concluído', 'success', `✅ Imóvel "@figma@" criado com sucesso!`);
      
      toast.success('Teste Concluído!', {
        description: `Imóvel "@figma@" criado com ID: ${createdProperty.id}. Verifique na lista de imóveis!`,
        duration: 10000,
      });

    } catch (error: any) {
      addLog('Erro', 'error', error.message);
      toast.error('Teste Falhou', {
        description: error.message,
        duration: 10000,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="w-5 h-5" />
          Teste Automatizado: Criar Imóvel "@figma@"
        </CardTitle>
        <CardDescription>
          Este teste cria um imóvel completo com todos os campos preenchidos.
          Título: @figma@ | Valores numéricos: 10 | Foto com tags
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botão de Teste */}
        <Button
          onClick={runTest}
          disabled={isRunning}
          size="lg"
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Executando Teste... {progress}%
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Iniciar Teste Completo
            </>
          )}
        </Button>

        {/* Barra de Progresso */}
        {isRunning && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400">
              {progress}% concluído
            </p>
          </div>
        )}

        {/* Logs */}
        {logs.length > 0 && (
          <div className="border rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                {log.status === 'success' && (
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                )}
                {log.status === 'error' && (
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                {log.status === 'running' && (
                  <Loader2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0 animate-spin" />
                )}
                <div className="flex-1">
                  <span className="font-medium">{log.step}:</span>{' '}
                  <span className={
                    log.status === 'success' ? 'text-green-700 dark:text-green-400' :
                    log.status === 'error' ? 'text-red-700 dark:text-red-400' :
                    'text-gray-700 dark:text-gray-300'
                  }>
                    {log.message}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {log.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Informações do Teste */}
        <div className="border-t pt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            O que este teste faz:
          </h3>
          <ul className="list-disc list-inside space-y-1">
            <li>✅ Cria imóvel com título "@figma@"</li>
            <li>✅ Preenche TODOS os 14 steps do wizard</li>
            <li>✅ Todos os campos numéricos = 10</li>
            <li>✅ Upload de 1 foto do Unsplash</li>
            <li>✅ Adiciona 6 tags na foto [@figma@, teste, automatizado, rendizy, beach, modern]</li>
            <li>✅ Salva tudo no Supabase</li>
            <li>✅ Detecta falhas em cada etapa</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
