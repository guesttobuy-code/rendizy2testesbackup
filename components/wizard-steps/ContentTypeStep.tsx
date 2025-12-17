/**
 * RENDIZY - Wizard Step: Tipo de Unidade
 * 
 * Step 1 do Wizard de Edição de Propriedades
 * Baseado na imagem fornecida pelo usuário
 * 
 * @version 1.0.103.181
 * @date 2025-10-31
 * 
 * NOVA FEATURE v1.0.103.80:
 * - Seleção de Property Type: 'individual' vs 'location-linked'
 * - Individual: amenidades do local editáveis
 * - Location-linked: amenidades do local herdadas (read-only)
 * 
 * 🆕 v1.0.103.109:
 * - Subtipo: Botões → Select (dropdown)
 * - Categoria → Modalidade: Múltipla escolha com Checkbox
 * - Campos financeiros condicionais por modalidade
 */

import { useEffect, useState } from 'react';
import { Building2, Home, House, Check } from 'lucide-react';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { DeployBackendBanner } from '../DeployBackendBanner';

// ============================================================================
// TYPES
// ============================================================================

interface PropertyType {
  id: string;
  name: string;
  category: 'location' | 'accommodation';
  subcategory?: string;
  platforms: {
    airbnb?: string;
    booking?: string;
    vrbo?: string;
  };
  isActive: boolean;
}

type Subtipo = 'entire_place' | 'private_room' | 'shared_room';
type Modalidade = 'short_term_rental' | 'buy_sell' | 'residential_rental';
type PropertyTypeEnum = 'individual' | 'location-linked';

interface FormData {
  propertyTypeId?: string;
  accommodationTypeId?: string;
  subtipo?: Subtipo;
  modalidades?: Modalidade[]; // 🆕 v1.0.103.109 - Array de modalidades
  registrationNumber?: string;
  propertyType?: PropertyTypeEnum;
  // 🆕 v1.0.103.108 - Campos Financeiros Condicionais
  financialData?: {
    // Locação Residencial
    monthlyRent?: number;
    iptu?: number;
    condo?: number;
    fees?: number;
    // Compra e Venda
    salePrice?: number;
  };
  internalName?: string; // 🆕 v1.0.103.300 - Nome interno para identificação
}

interface ContentTypeStepProps {
  data: FormData;
  onChange: (data: FormData) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ContentTypeStep({ data, onChange }: ContentTypeStepProps) {
  const [locationTypes, setLocationTypes] = useState<PropertyType[]>([]);
  const [accommodationTypes, setAccommodationTypes] = useState<PropertyType[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // FETCH PROPERTY TYPES
  // ============================================================================

  useEffect(() => {
    const fetchPropertyTypes = async () => {
      console.log('🔍 [ContentTypeStep] Iniciando carregamento de tipos...');
      try {
        setLoading(true);
        const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/property-types`;
        console.log('📡 [ContentTypeStep] Fazendo request para:', url);

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        });

        console.log('📡 [ContentTypeStep] Response status:', response.status);

        if (!response.ok) {
          throw new Error('Erro ao carregar tipos de propriedades');
        }

        const types: PropertyType[] = await response.json();
        console.log('📦 [ContentTypeStep] Tipos recebidos:', types.length, 'tipos');

        // Filtrar apenas tipos ativos e do sistema
        const activeTypes = types.filter((t) => t.isActive);
        console.log('✅ [ContentTypeStep] Tipos ativos:', activeTypes.length);

        // Separar por categoria e ordenar alfabeticamente
        const locations = activeTypes
          .filter((t) => t.category === 'location')
          .sort((a, b) => a.name.localeCompare(b.name));

        const accommodations = activeTypes
          .filter((t) => t.category === 'accommodation')
          .sort((a, b) => a.name.localeCompare(b.name));

        console.log('🏢 [ContentTypeStep] Locations:', locations.length);
        console.log('🏠 [ContentTypeStep] Accommodations:', accommodations.length);

        setLocationTypes(locations);
        setAccommodationTypes(accommodations);
      } catch (error) {
        // ⚠️ FALLBACK: Usar dados mockados se o backend não estiver disponível
        console.warn('⚠️ [ContentTypeStep] Erro ao buscar tipos do backend:', error);
        console.info('ℹ️ [ContentTypeStep] Usando dados mockados temporariamente.');
        console.info('📘 [ContentTypeStep] Para habilitar 50+ tipos reais, execute: ./DEPLOY_BACKEND_NOW.sh');

        // 🔥 MOCK COMPLETO: Todos os 30 tipos de LOCAL disponíveis no backend
        const mockLocationTypes: PropertyType[] = [
          { id: 'loc_acomodacao_movel', name: 'Acomodação Móvel', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_albergue', name: 'Albergue', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_apartamento', name: 'Apartamento', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_apartamento_residencial', name: 'Apartamento/Residencial', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_bangalo', name: 'Bangalô', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_barco', name: 'Barco', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_barco_beira', name: 'Barco/Beira', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_boutique', name: 'Boutique Hotel', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_cabana', name: 'Cabana', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_cama_cafe', name: 'Cama e Café (B&B)', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_camping', name: 'Camping', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_casa', name: 'Casa', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_casa_movel', name: 'Casa Móvel', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_castelo', name: 'Castelo', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_chale', name: 'Chalé', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_chale_camping', name: 'Chalé (Área de Camping)', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_condominio', name: 'Condomínio', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_estalagem', name: 'Estalagem', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_fazenda', name: 'Fazenda para Viajantes', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_hotel', name: 'Hotel', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_hotel_boutique', name: 'Hotel Boutique', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_hostel', name: 'Hostel', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_iate', name: 'Iate', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_industrial', name: 'Industrial', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_motel', name: 'Motel/Carro', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_pousada', name: 'Pousada Exclusiva', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_residencia', name: 'Residência', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_resort', name: 'Resort', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_treehouse', name: 'Treehouse (Casa na Árvore)', category: 'location', platforms: {}, isActive: true },
          { id: 'loc_villa', name: 'Villa/Casa', category: 'location', platforms: {}, isActive: true },
        ].sort((a, b) => a.name.localeCompare(b.name));

        // 🔥 MOCK COMPLETO: Todos os 23 tipos de ACOMODAÇÃO disponíveis no backend
        const mockAccommodationTypes: PropertyType[] = [
          { id: 'acc_apartamento', name: 'Apartamento', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_bangalo', name: 'Bangalô', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_cabana', name: 'Cabana', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_camping', name: 'Camping', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_capsula', name: 'Cápsula/Trailer/Casa Móvel', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_casa', name: 'Casa', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_casa_dormitorios', name: 'Casa em Dormitórios', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_chale', name: 'Chalé', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_condominio', name: 'Condomínio', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_dormitorio', name: 'Dormitório', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_estudio', name: 'Estúdio', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_holiday_home', name: 'Holiday Home', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_hostel', name: 'Hostel', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_hotel', name: 'Hotel', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_iate', name: 'Iate', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_industrial', name: 'Industrial', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_loft', name: 'Loft', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_quarto_compartilhado', name: 'Quarto Compartilhado', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_quarto_inteiro', name: 'Quarto Inteiro', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_quarto_privado', name: 'Quarto Privado', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_suite', name: 'Suíte', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_treehouse', name: 'Treehouse', category: 'accommodation', platforms: {}, isActive: true },
          { id: 'acc_villa', name: 'Villa/Casa', category: 'accommodation', platforms: {}, isActive: true },
        ].sort((a, b) => a.name.localeCompare(b.name));

        setLocationTypes(mockLocationTypes || []);
        setAccommodationTypes(mockAccommodationTypes || []);
      } finally {
        setLoading(false);
        console.log('🏁 [ContentTypeStep] Carregamento finalizado');
      }
    };

    console.log('🚀 [ContentTypeStep] Componente montado, iniciando fetch...');
    fetchPropertyTypes();
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleChange = (field: keyof FormData, value: any) => {
    console.log('🔄 [ContentTypeStep] Campo alterado:', field, '→', value);
    console.log('📊 [ContentTypeStep] Dados atuais:', data);

    const newData = {
      ...data,
      [field]: value,
    };

    console.log('📦 [ContentTypeStep] Novos dados:', newData);

    // ✅ FIX v1.0.103.290: Usando <select> nativo em vez de shadcn Select
    // Sem Portal = sem race condition = sem NotFoundError!
    onChange(newData);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  console.log('🎨 [ContentTypeStep] Renderizando componente');
  console.log('📊 [ContentTypeStep] Props data:', data);
  console.log('⏳ [ContentTypeStep] Loading:', loading);
  console.log('🏢 [ContentTypeStep] LocationTypes count:', locationTypes.length);
  console.log('🏠 [ContentTypeStep] AccommodationTypes count:', accommodationTypes.length);
  console.log('🔥 [ContentTypeStep] *** BUILD v1.0.103.298 - CACHE BUSTER ATIVADO ***');
  console.log('✅ [ContentTypeStep] Label Campo 1: "Tipo do local"');
  console.log('✅ [ContentTypeStep] Label Campo 2: "Tipo de acomodação"');

  return (
    <div className="space-y-8 max-w-3xl" data-step="content-type" data-version="v1.0.103.299">
      {/* BANNER DE DEPLOY DO BACKEND */}
      {loading === false && locationTypes.length <= 10 && (
        <DeployBackendBanner />
      )}

      {/* 🆕 NOME INTERNO (v1.0.103.300) */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Identificação Interna</h3>
          <p className="text-sm text-muted-foreground">
            Nome para identificar este imóvel no painel administrativo (visível apenas para equipe).
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="internalName">Nome Interno</Label>
          <Input
            id="internalName"
            placeholder="Ex: Apt Copacabana 202 - Prop. João"
            value={data.internalName || ''}
            onChange={(e) => handleChange('internalName', e.target.value)}
          />
        </div>
      </div>

      {/* TIPO */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Tipo</h3>
          <p className="text-sm text-muted-foreground">
            Qual é o tipo da acomodação?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Tipo do local */}
          <div className="space-y-2">
            <Label htmlFor="propertyType" className="block w-full">Tipo do local</Label>
            <select
              id="propertyType"
              value={data.propertyTypeId || ''}
              onChange={(e) => handleChange('propertyTypeId', e.target.value)}
              disabled={loading}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{loading ? 'Carregando...' : 'Selecione'}</option>
              {locationTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de acomodação */}
          <div className="space-y-2">
            <Label htmlFor="accommodationType" className="block w-full">Tipo de acomodação</Label>
            <select
              id="accommodationType"
              value={data.accommodationTypeId || ''}
              onChange={(e) => handleChange('accommodationTypeId', e.target.value)}
              disabled={loading}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{loading ? 'Carregando...' : 'Selecione'}</option>
              {accommodationTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* SUBTIPO */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Subtipo</h3>
          <p className="text-sm text-muted-foreground">
            Qual é o subtipo desta acomodação?
          </p>
        </div>

        <select
          value={data.subtipo || ''}
          onChange={(e) => handleChange('subtipo', e.target.value)}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Selecione o subtipo</option>
          <option value="entire_place">Imóvel inteiro</option>
          <option value="private_room">Quarto privativo</option>
          <option value="shared_room">Quarto compartilhado</option>
        </select>
      </div>

      {/* MODALIDADE */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">Modalidade</h3>
          <p className="text-sm text-muted-foreground">
            Em quais modalidades essa unidade se aplica?
          </p>
        </div>

        <div className="space-y-3">
          {/* Aluguel por temporada */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <Checkbox
              id="short_term_rental"
              checked={data.modalidades?.includes('short_term_rental') || false}
              onCheckedChange={(checked) => {
                const current = data.modalidades || [];
                if (checked) {
                  handleChange('modalidades', [...current, 'short_term_rental']);
                } else {
                  handleChange('modalidades', current.filter(m => m !== 'short_term_rental'));
                }
              }}
            />
            <Label
              htmlFor="short_term_rental"
              className="flex-1 cursor-pointer"
            >
              Aluguel por temporada
            </Label>
          </div>

          {/* Compra e venda */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <Checkbox
              id="buy_sell"
              checked={data.modalidades?.includes('buy_sell') || false}
              onCheckedChange={(checked) => {
                const current = data.modalidades || [];
                if (checked) {
                  handleChange('modalidades', [...current, 'buy_sell']);
                } else {
                  handleChange('modalidades', current.filter(m => m !== 'buy_sell'));
                }
              }}
            />
            <Label
              htmlFor="buy_sell"
              className="flex-1 cursor-pointer"
            >
              Compra e venda
            </Label>
          </div>

          {/* Locação residencial */}
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <Checkbox
              id="residential_rental"
              checked={data.modalidades?.includes('residential_rental') || false}
              onCheckedChange={(checked) => {
                const current = data.modalidades || [];
                if (checked) {
                  handleChange('modalidades', [...current, 'residential_rental']);
                } else {
                  handleChange('modalidades', current.filter(m => m !== 'residential_rental'));
                }
              }}
            />
            <Label
              htmlFor="residential_rental"
              className="flex-1 cursor-pointer"
            >
              Locação residencial
            </Label>
          </div>
        </div>
      </div>

      {/* 🆕 v1.0.103.108 - CAMPOS FINANCEIROS CONDICIONAIS */}
      {data.modalidades?.includes('residential_rental') && (
        <div className="space-y-4 p-6 border-2 border-dashed border-purple-300 rounded-lg bg-purple-50/30">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              💰 Valores - Locação Residencial
            </h3>
            <p className="text-sm text-muted-foreground">
              Informe os valores mensais para locação residencial
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyRent">Aluguel Mensal (R$)</Label>
              <Input
                id="monthlyRent"
                type="number"
                placeholder="R$ 0,00"
                value={data.financialData?.monthlyRent || ''}
                onChange={(e) =>
                  handleChange('financialData', {
                    ...data.financialData,
                    monthlyRent: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iptu">IPTU Mensal (R$)</Label>
              <Input
                id="iptu"
                type="number"
                placeholder="R$ 0,00"
                value={data.financialData?.iptu || ''}
                onChange={(e) =>
                  handleChange('financialData', {
                    ...data.financialData,
                    iptu: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condo">Condomínio (R$)</Label>
              <Input
                id="condo"
                type="number"
                placeholder="R$ 0,00"
                value={data.financialData?.condo || ''}
                onChange={(e) =>
                  handleChange('financialData', {
                    ...data.financialData,
                    condo: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fees">Taxas Extras (R$)</Label>
              <Input
                id="fees"
                type="number"
                placeholder="R$ 0,00"
                value={data.financialData?.fees || ''}
                onChange={(e) =>
                  handleChange('financialData', {
                    ...data.financialData,
                    fees: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </div>
          </div>

          {/* Total Mensal */}
          {(data.financialData?.monthlyRent ||
            data.financialData?.iptu ||
            data.financialData?.condo ||
            data.financialData?.fees) && (
              <div className="pt-4 border-t border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Mensal:</span>
                  <span className="text-lg font-bold text-purple-600">
                    R${' '}
                    {(
                      (data.financialData?.monthlyRent || 0) +
                      (data.financialData?.iptu || 0) +
                      (data.financialData?.condo || 0) +
                      (data.financialData?.fees || 0)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
        </div>
      )}

      {data.modalidades?.includes('buy_sell') && (
        <div className="space-y-4 p-6 border-2 border-dashed border-green-300 rounded-lg bg-green-50/30">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              🏡 Valores - Compra e Venda
            </h3>
            <p className="text-sm text-muted-foreground">
              Informe os valores e custos para venda do imóvel
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="salePrice">Preço de Venda (R$)</Label>
              <Input
                id="salePrice"
                type="number"
                placeholder="R$ 0,00"
                value={data.financialData?.salePrice || ''}
                onChange={(e) =>
                  handleChange('financialData', {
                    ...data.financialData,
                    salePrice: parseFloat(e.target.value) || undefined,
                  })
                }
                className="text-lg font-semibold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iptuSale">IPTU Anual (R$)</Label>
              <Input
                id="iptuSale"
                type="number"
                placeholder="R$ 0,00"
                value={data.financialData?.iptu || ''}
                onChange={(e) =>
                  handleChange('financialData', {
                    ...data.financialData,
                    iptu: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condoSale">Condomínio Mensal (R$)</Label>
              <Input
                id="condoSale"
                type="number"
                placeholder="R$ 0,00"
                value={data.financialData?.condo || ''}
                onChange={(e) =>
                  handleChange('financialData', {
                    ...data.financialData,
                    condo: parseFloat(e.target.value) || undefined,
                  })
                }
              />
            </div>
          </div>

          {data.financialData?.salePrice && (
            <div className="pt-4 border-t border-green-200">
              <div className="flex items-center justify-between">
                <span className="font-medium">Preço Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  R$ {data.financialData.salePrice.toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Property Type Selection (v1.0.103.80) */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">🆕 Estrutura do Anúncio</h3>
          <p className="text-sm text-muted-foreground">
            Selecione como as amenidades do local serão gerenciadas.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Individual */}
          <Card
            className={`cursor-pointer transition-all hover:border-primary ${data.propertyType === 'individual'
                ? 'border-2 border-primary bg-primary/5'
                : 'border-2 border-transparent'
              }`}
            onClick={() => handleChange('propertyType', 'individual')}
          >
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <House className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Anúncio Individual</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Casa, apartamento sem prédio, etc.
                </p>
                <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                  <div>✅ Amenidades do local: <strong>Editáveis</strong></div>
                  <div>✅ Amenidades da acomodação: <strong>Editáveis</strong></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location-linked */}
          <Card
            className={`cursor-pointer transition-all hover:border-primary ${data.propertyType === 'location-linked'
                ? 'border-2 border-primary bg-primary/5'
                : 'border-2 border-transparent'
              }`}
            onClick={() => handleChange('propertyType', 'location-linked')}
          >
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Anúncio Vinculado</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Apartamento em prédio, quarto em hotel, etc.
                </p>
                <div className="pt-2 space-y-1 text-xs text-muted-foreground">
                  <div>🔒 Amenidades do local: <strong>Herdadas</strong></div>
                  <div>✅ Amenidades da acomodação: <strong>Editáveis</strong></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Card (Opcional - para ajudar o usuário) */}
      {(data.propertyTypeId || data.accommodationTypeId) && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Resumo da Configuração:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                {data.propertyTypeId && (
                  <div>
                    • Tipo de propriedade:{' '}
                    <span className="font-medium text-foreground">
                      {locationTypes.find((t) => t.id === data.propertyTypeId)?.name}
                    </span>
                  </div>
                )}
                {data.accommodationTypeId && (
                  <div>
                    • Tipo de anúncio:{' '}
                    <span className="font-medium text-foreground">
                      {accommodationTypes.find((t) => t.id === data.accommodationTypeId)?.name}
                    </span>
                  </div>
                )}
                {data.subtipo && (
                  <div>
                    • Subtipo:{' '}
                    <span className="font-medium text-foreground">
                      {data.subtipo === 'entire_place'
                        ? 'Imóvel inteiro'
                        : data.subtipo === 'private_room'
                          ? 'Quarto privativo'
                          : 'Quarto compartilhado'}
                    </span>
                  </div>
                )}
                {data.modalidades && (
                  <div>
                    • Modalidades:{' '}
                    <span className="font-medium text-foreground">
                      {data.modalidades.map((m) =>
                        m === 'short_term_rental'
                          ? 'Aluguel por temporada'
                          : m === 'buy_sell'
                            ? 'Compra e venda'
                            : 'Locação residencial'
                      ).join(', ')}
                    </span>
                  </div>
                )}
                {data.registrationNumber && (
                  <div>
                    • Registro:{' '}
                    <span className="font-medium text-foreground">
                      {data.registrationNumber}
                    </span>
                  </div>
                )}
                {data.propertyType && (
                  <div>
                    • Tipo de Propriedade:{' '}
                    <span className="font-medium text-foreground">
                      {data.propertyType === 'individual'
                        ? 'Individual'
                        : 'Vinculada a um local'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ContentTypeStep;