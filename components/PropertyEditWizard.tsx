/**
 * RENDIZY - Property Edit Wizard
 * 
 * Wizard multi-step para edição completa de propriedades
 * ESTRUTURA: 3 BLOCOS → 14 STEPS
 * 
 * @version 1.0.103.292
 * @date 2025-11-04
 * 
 * 🆕 v1.0.103.292:
 * - Removido auto-save agressivo que causava salvamentos indesejados
 * - Botão "Próximo" → "Salvar e Avançar" com salvamento manual
 * - Cada step só salva no backend quando usuário clicar em "Salvar e Avançar"
 */

import { useState } from 'react';
import {
  Home,
  MapPin,
  DoorOpen,
  Sparkles,
  Image as ImageIcon,
  FileText,
  DollarSign,
  Receipt,
  ShieldAlert,
  Settings,
  Calendar,
  Tag,
  CalendarRange,
  Share2,
  ChevronLeft,
  ChevronRight,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  Building2,
  Users,
} from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { ContentTypeStep } from './wizard-steps/ContentTypeStep';
import { ContentLocationStep } from './wizard-steps/ContentLocationStep';
import { ContentRoomsStep } from './wizard-steps/ContentRoomsStep';
import ContentLocationAmenitiesStep from './wizard-steps/ContentLocationAmenitiesStep';
import ContentAmenitiesStep from './wizard-steps/ContentAmenitiesStep';
import ContentDescriptionStep from './wizard-steps/ContentDescriptionStep';
import SettingsRulesStep from './wizard-steps/SettingsRulesStep';
import { FinancialContractStep } from './wizard-steps/FinancialContractStep';
import { FinancialResidentialPricingStep } from './wizard-steps/FinancialResidentialPricingStep';
import { FinancialSeasonalPricingStep } from './wizard-steps/FinancialSeasonalPricingStep';
import { FinancialDerivedPricingStep } from './wizard-steps/FinancialDerivedPricingStep';
import { FinancialIndividualPricingStep } from './wizard-steps/FinancialIndividualPricingStep';
import { ContentPhotosStep } from './wizard-steps/ContentPhotosStep';
// ❌ AUTO-SAVE REMOVIDO v1.0.103.292
// import { useAutoSave, useRestoreDraft, useClearDraft } from '../hooks/useAutoSave';
// import { AutoSaveIndicator } from './AutoSaveIndicator';
import { useRestoreDraft, useClearDraft } from '../hooks/useAutoSave';
import { usePropertyActions } from '../hooks/usePropertyActions';

// ============================================================================
// DEFINIÇÃO DA ESTRUTURA DO WIZARD
// ============================================================================

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  validation: 'required' | 'recommended' | 'optional';
}

interface WizardBlock {
  id: string;
  title: string;
  icon: any;
  color: string;
  steps: WizardStep[];
}

const WIZARD_STRUCTURE: WizardBlock[] = [
  // ========================================
  // BLOCO 1: CONTEÚDO DO ANÚNCIO (7 PASSOS)
  // ========================================
  {
    id: 'content',
    title: 'Conteúdo',
    icon: FileText,
    color: 'blue',
    steps: [
      {
        id: 'content-type',
        title: 'Tipo e Identificação',
        description: 'Que tipo de propriedade você está anunciando?',
        icon: Home,
        validation: 'required',
      },
      {
        id: 'content-location',
        title: 'Localização',
        description: 'Onde fica sua propriedade?',
        icon: MapPin,
        validation: 'required',
      },
      {
        id: 'content-rooms',
        title: 'Cômodos e Distribuição',
        description: 'Como é a distribuição de cômodos?',
        icon: DoorOpen,
        validation: 'recommended',
      },
      {
        id: 'content-location-amenities',
        title: 'Amenidades do Local',
        description: 'Comodidades herdadas do local',
        icon: Building2,
        validation: 'optional',
      },
      {
        id: 'content-property-amenities',
        title: 'Amenidades da Acomodação',
        description: 'Comodidades específicas desta unidade',
        icon: Sparkles,
        validation: 'recommended',
      },
      {
        id: 'content-photos',
        title: 'Fotos e Mídia',
        description: 'Mostre sua propriedade em fotos',
        icon: ImageIcon,
        validation: 'recommended',
      },
      {
        id: 'content-description',
        title: 'Descrição',
        description: 'Descreva sua propriedade',
        icon: FileText,
        validation: 'required',
      },
    ],
  },

  // ========================================
  // BLOCO 2: FINANCEIRO
  // ========================================
  {
    id: 'financial',
    title: 'Financeiro',
    icon: DollarSign,
    color: 'green',
    steps: [
      {
        id: 'financial-contract',
        title: 'Configuração de Relacionamento',
        description: 'Configure titular, remuneração e comunicação',
        icon: FileText,
        validation: 'required',
      },
      {
        id: 'financial-residential-pricing',
        title: 'Preços Locação e Venda',
        description: 'Valores de locação residencial e venda de imóveis',
        icon: Home,
        validation: 'optional',
      },
      {
        id: 'financial-fees',
        title: 'Configuração de preço temporada',
        description: 'Configure taxas de limpeza, serviços e encargos adicionais',
        icon: Receipt,
        validation: 'recommended',
      },
      {
        id: 'financial-pricing',
        title: 'Precificação Individual de Temporada',
        description: 'Defina preços de diárias, períodos sazonais e descontos',
        icon: DollarSign,
        validation: 'required',
      },
      {
        id: 'financial-derived-pricing',
        title: 'Preços Derivados',
        description: 'Configure taxas por hóspede adicional e faixas etárias',
        icon: Users,
        validation: 'recommended',
      },
    ],
  },

  // ========================================
  // BLOCO 3: CONFIGURAÇÕES GERAIS
  // ========================================
  {
    id: 'settings',
    title: 'Configurações',
    icon: Settings,
    color: 'purple',
    steps: [
      {
        id: 'settings-rules',
        title: 'Regras de Hospedagem',
        description: 'Regras da acomodação',
        icon: ShieldAlert,
        validation: 'required',
      },
      {
        id: 'settings-booking',
        title: 'Configurações de Reserva',
        description: 'Como aceitar reservas?',
        icon: Calendar,
        validation: 'optional',
      },
      {
        id: 'settings-tags',
        title: 'Tags e Grupos',
        description: 'Organize sua propriedade',
        icon: Tag,
        validation: 'optional',
      },
      {
        id: 'settings-ical',
        title: 'iCal e Sincronização',
        description: 'Sincronizar calendários',
        icon: CalendarRange,
        validation: 'optional',
      },
      {
        id: 'settings-otas',
        title: 'Integrações OTAs',
        description: 'Canais de distribuição',
        icon: Share2,
        validation: 'optional',
      },
    ],
  },
];

// Criar WIZARD_BLOCKS a partir de WIZARD_STRUCTURE para compatibilidade
const WIZARD_BLOCKS = WIZARD_STRUCTURE.map(block => ({
  id: block.id,
  label: block.title,
  icon: block.icon,
  description: `${block.steps.length} passos neste bloco`,
  steps: block.steps
}));

// ============================================================================
// 🆕 v1.0.103.109 - LÓGICA DE OBRIGATORIEDADE BASEADA NA CATEGORIA
// ============================================================================

/**
 * Determina se um passo é obrigatório baseado na categoria selecionada
 * 
 * REGRAS:
 * - Aluguel por temporada: TODOS os 7 passos do Conteúdo são obrigatórios
 * - Locação residencial: Apenas os obrigatórios originais
 * - Compra e venda: Apenas os obrigatórios originais
 * - Múltiplas categorias: Se "Aluguel por temporada" estiver marcado, todos obrigatórios
 * 
 * 🆕 v1.0.103.109: Agora suporta array de modalidades
 */
function getStepValidation(
  step: WizardStep,
  modalidades?: string[]
): 'required' | 'recommended' | 'optional' {
  // Se é aluguel por temporada E o passo está no bloco de Conteúdo
  if (modalidades?.includes('short_term_rental')) {
    const contentBlock = WIZARD_STRUCTURE.find(b => b.id === 'content');
    const isContentStep = contentBlock?.steps.some(s => s.id === step.id);

    if (isContentStep) {
      return 'required'; // Todos os 7 passos são obrigatórios
    }
  }

  // Caso contrário, mantém a validação original
  return step.validation;
}

// ============================================================================
// TYPES
// ============================================================================

interface PropertyEditWizardProps {
  open: boolean;
  onClose: () => void;
  property: any;
  onSave: (data: any) => void;
  isSaving?: boolean;
  isFullScreen?: boolean; // Novo: indica se está em modo full-screen
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PropertyEditWizard({
  open,
  onClose,
  property,
  onSave,
  isSaving = false,
  isFullScreen = false,
}: PropertyEditWizardProps) {
  const [currentBlock, setCurrentBlock] = useState<string>('content');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [locationData, setLocationData] = useState<any>(null);

  // 🆕 v1.0.103.292 - Estado de salvamento interno
  const [isSavingInternal, setIsSavingInternal] = useState<boolean>(false);

  // Hook de ações padronizadas
  const { updateProperty, cancelEditing } = usePropertyActions();

  // Form data for all steps
  const [formData, setFormData] = useState<any>({
    id: property?.id || undefined,
    // Step 1: Tipo
    contentType: {
      propertyTypeId: property?.propertyTypeId || undefined,
      accommodationTypeId: property?.accommodationTypeId || undefined,
      subtipo: property?.subtipo || undefined,
      modalidades: property?.modalidades || [],
      registrationNumber: property?.registrationNumber || '',
      propertyType: property?.propertyType || 'individual',
    },
    // Step 2: Localização
    contentLocation: {
      mode: 'new' as 'new' | 'existing',
      selectedLocationId: property?.locationId || undefined,
      locationName: property?.locationName || undefined,
      locationAmenities: property?.locationAmenities || [],
      address: {
        country: property?.address?.country || 'BR',
        state: property?.address?.state || '',
        stateCode: property?.address?.stateCode || '',
        zipCode: property?.address?.zipCode || '',
        city: property?.address?.city || '',
        neighborhood: property?.address?.neighborhood || '',
        street: property?.address?.street || '',
        number: property?.address?.number || '',
        complement: property?.address?.complement || '',
        latitude: property?.address?.latitude || undefined,
        longitude: property?.address?.longitude || undefined,
      },
      showBuildingNumber: 'global' as 'global' | 'individual',
      photos: property?.locationPhotos || [],
      hasExpressCheckInOut: property?.hasExpressCheckInOut || false,
      hasParking: property?.hasParking || false,
      hasCableInternet: property?.hasCableInternet || false,
      hasWiFi: property?.hasWiFi || false,
      has24hReception: property?.has24hReception || false,
    },
    // Step 3: Cômodos
    contentRooms: {
      rooms: property?.rooms || [],
    },
    // Step 4: Amenidades
    contentAmenities: {
      propertyAmenities: property?.amenities || property?.propertyAmenities || [],
      inheritLocationAmenities: property?.inheritLocationAmenities !== false,
    },
    // Step 6: Descrição
    contentDescription: {
      fixedFields: property?.descriptionFields || {},
      customFieldsValues: property?.customDescriptionFieldsValues || {},
      autoTranslate: false,
    },
    // Outros steps virão aqui...
  });

  // ============================================================================
  // 🆕 v1.0.103.122 - AUTO-SAVE AUTOMÁTICO
  // ============================================================================

  // ❌ AUTO-SAVE COMPLETAMENTE DESABILITADO v1.0.103.292
  // Problema: useAutoSave estava chamando onSave toda hora!
  // Solução: Botão "Salvar e Avançar" manual em cada step
  // const { saveStatus, triggerSave } = useAutoSave(formData, {...});

  // Hook para limpar draft
  const clearDraft = useClearDraft();

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getCurrentBlock = () => {
    return WIZARD_STRUCTURE.find((block) => block.id === currentBlock) || WIZARD_STRUCTURE[0];
  };

  const getCurrentStep = () => {
    const block = getCurrentBlock();
    if (!block || !block.steps || currentStepIndex >= block.steps.length) {
      // Fallback para o primeiro step do primeiro bloco
      return WIZARD_STRUCTURE[0].steps[0];
    }
    return block.steps[currentStepIndex];
  };

  const getTotalSteps = () => {
    return WIZARD_STRUCTURE.reduce((acc, block) => acc + block.steps.length, 0);
  };

  const getCurrentStepNumber = () => {
    let stepNumber = 0;
    for (const block of WIZARD_STRUCTURE) {
      if (block.id === currentBlock) {
        stepNumber += currentStepIndex + 1;
        break;
      }
      stepNumber += block.steps.length;
    }
    return stepNumber;
  };

  const getProgress = () => {
    return (completedSteps.size / getTotalSteps()) * 100;
  };

  const getBlockProgress = (blockId: string) => {
    const block = WIZARD_STRUCTURE.find((b) => b.id === blockId)!;
    const completedInBlock = block.steps.filter((step) =>
      completedSteps.has(step.id)
    ).length;
    return (completedInBlock / block.steps.length) * 100;
  };

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  // 🆕 v1.0.103.292 - Salvar E Avançar (manual)
  const handleSaveAndNext = async () => {
    const block = getCurrentBlock();
    const step = getCurrentStep();

    console.log('💾 [Wizard] Salvando E avançando...');

    try {
      setIsSavingInternal(true);

      // 1. Calcular progresso atualizado (incluindo o passo atual)
      const nextCompletedSteps = new Set(completedSteps);
      nextCompletedSteps.add(step.id);

      const currentProgress = Math.round((nextCompletedSteps.size / getTotalSteps()) * 100);
      const completedStepsArray = Array.from(nextCompletedSteps);

      // 2. Preparar dados para salvar
      const dataToSave = {
        ...formData,
        completionPercentage: currentProgress,
        completedSteps: completedStepsArray,
        wizardData: formData // Garantir persistência completa
      };

      // 3. Salvar no backend SEM redirecionar
      if (property?.id) {
        await updateProperty(property.id, dataToSave, {
          redirectToList: false, // ✅ NÃO redirecionar ao salvar step intermediário
          customSuccessMessage: `Step ${getCurrentStepNumber()} salvo com sucesso!`,
          onSuccess: () => {
            clearDraft();
          }
        });
      } else {
        // Modo criação - chamar onSave do parent
        await onSave(dataToSave);
      }

      // 2. Marcar step atual como completo
      setCompletedSteps((prev) => new Set(prev).add(step.id));

      // 3. Aguardar um momento antes de avançar (evita conflito DOM)
      await new Promise(resolve => setTimeout(resolve, 100));

      // 4. Avançar para próximo step
      if (currentStepIndex < block.steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        // Se for o último step, ir para o próximo bloco
        const currentBlockIndex = WIZARD_STRUCTURE.findIndex((b) => b.id === currentBlock);
        if (currentBlockIndex < WIZARD_STRUCTURE.length - 1) {
          setCurrentBlock(WIZARD_STRUCTURE[currentBlockIndex + 1].id);
          setCurrentStepIndex(0);
        } else {
          // Último step do último bloco - redirecionar
          toast.success('Todos os passos concluídos!');
          // Não redireciona aqui, handleSave já faz isso
        }
      }
    } catch (error) {
      console.error('❌ Erro ao salvar e avançar:', error);
    } finally {
      setIsSavingInternal(false);
    }
  };

  const handleNext = () => {
    const block = getCurrentBlock();
    const step = getCurrentStep();

    // ✅ Apenas avançar SEM salvar
    // Usado pelo botão "Próximo" (se houver)

    // Marcar step atual como completo
    setCompletedSteps((prev) => new Set(prev).add(step.id));

    // Se não for o último step do bloco, avançar
    if (currentStepIndex < block.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      // Se for o último step, ir para o próximo bloco
      const currentBlockIndex = WIZARD_STRUCTURE.findIndex((b) => b.id === currentBlock);
      if (currentBlockIndex < WIZARD_STRUCTURE.length - 1) {
        setCurrentBlock(WIZARD_STRUCTURE[currentBlockIndex + 1].id);
        setCurrentStepIndex(0);
      } else {
        // Último step do último bloco - mostrar resumo ou salvar
        toast.success('Todos os passos concluídos!');
      }
    }
  };

  const handlePrevious = () => {
    // ✅ NÃO salvar no backend - apenas voltar!
    // Auto-save salva localmente (rascunho)

    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    } else {
      // Se for o primeiro step do bloco, voltar para o bloco anterior
      const currentBlockIndex = WIZARD_STRUCTURE.findIndex((b) => b.id === currentBlock);
      if (currentBlockIndex > 0) {
        const previousBlock = WIZARD_STRUCTURE[currentBlockIndex - 1];
        setCurrentBlock(previousBlock.id);
        setCurrentStepIndex(previousBlock.steps.length - 1);
      }
    }
  };

  const handleStepClick = (blockId: string, stepIndex: number) => {
    // ✅ NÃO salvar no backend - apenas mudar de step!
    // Auto-save salva localmente (rascunho)

    setCurrentBlock(blockId);
    setCurrentStepIndex(stepIndex);
  };

  const handleSave = async () => {
    try {
      // Validar dados antes de salvar
      // TODO: Adicionar validações específicas

      // Usar hook padronizado para atualizar
      if (property?.id) {
        await updateProperty(property.id, formData, {
          onSuccess: () => {
            // Limpar rascunho após salvar com sucesso
            clearDraft();
          }
        });
      } else {
        // Se não tem ID, chamar onSave do parent (modo criação)
        onSave(formData);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar imóvel:', error);
    }
  };

  const isFirstStep = () => {
    return currentBlock === 'content' && currentStepIndex === 0;
  };

  const isLastStep = () => {
    const lastBlock = WIZARD_STRUCTURE[WIZARD_STRUCTURE.length - 1];
    return currentBlock === lastBlock.id && currentStepIndex === lastBlock.steps.length - 1;
  };

  const handleFinish = async () => {
    // Marcar último step como completo
    const step = getCurrentStep();
    setCompletedSteps((prev) => new Set(prev).add(step.id));

    try {
      setIsSavingInternal(true);

      // Aguardar um momento antes de salvar (evita conflito DOM)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Calcular progresso final (100% ou real)
      const nextCompletedSteps = new Set(completedSteps);
      nextCompletedSteps.add(step.id);
      const currentProgress = Math.round((nextCompletedSteps.size / getTotalSteps()) * 100);
      const completedStepsArray = Array.from(nextCompletedSteps);

      const dataToSave = {
        ...formData,
        completionPercentage: currentProgress,
        completedSteps: completedStepsArray
      };

      // Validar e salvar COM redirecionamento (último step!)
      if (property?.id) {
        await updateProperty(property.id, dataToSave, {
          redirectToList: true, // ✅ REDIRECIONAR ao finalizar todos os steps
          customSuccessMessage: `${formData.contentType?.internalName || 'Imóvel'} finalizado com sucesso!`,
          onSuccess: () => {
            clearDraft();
          }
        });
      } else {
        // Modo criação - chamar onSave do parent
        await onSave(formData);
      }
    } catch (error) {
      console.error('❌ Erro ao finalizar:', error);
    } finally {
      setIsSavingInternal(false);
    }
  };

  // ============================================================================
  // VALIDATION BADGE
  // ============================================================================

  const getValidationBadge = (validation?: string) => {
    if (!validation) return null;

    switch (validation) {
      case 'required':
        return (
          <Badge variant="destructive" className="text-xs">
            Obrigatório
          </Badge>
        );
      case 'recommended':
        return (
          <Badge variant="default" className="text-xs bg-amber-500">
            Recomendado
          </Badge>
        );
      case 'optional':
        return (
          <Badge variant="outline" className="text-xs">
            Opcional
          </Badge>
        );
      default:
        return null;
    }
  };

  // ============================================================================
  // RENDER STEP CONTENT
  // ============================================================================

  const renderStepContent = () => {
    const step = getCurrentStep();

    if (!step || !step.id) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      );
    }

    // Step 1: Tipo (content-type)
    if (step.id === 'content-type') {
      return (
        <ContentTypeStep
          data={formData.contentType}
          onChange={(data) => {
            setFormData({
              ...formData,
              contentType: data,
            });
          }}
        />
      );
    }

    // Step 2: Localização (content-location)
    if (step.id === 'content-location') {
      return (
        <ContentLocationStep
          data={formData.contentLocation}
          onChange={(data) => {
            setFormData({
              ...formData,
              contentLocation: data,
            });
          }}
        />
      );
    }

    // Step 3: Cômodos (content-rooms)
    if (step.id === 'content-rooms') {
      return (
        <ContentRoomsStep
          data={formData.contentRooms}
          onChange={(data) => {
            setFormData({
              ...formData,
              contentRooms: data,
            });
          }}
          propertyId={property?.id}
        />
      );
    }

    // Step 4: Amenidades do Local (content-location-amenities) - READ ONLY
    if (step.id === 'content-location-amenities') {
      return (
        <ContentLocationAmenitiesStep
          propertyType={formData.contentType?.propertyType || 'individual'}
          locationId={formData.contentLocation?.selectedLocationId}
          locationName={formData.contentLocation?.locationName}
          locationAmenities={formData.contentLocationAmenities?.amenities || []}
          onChange={(amenities) => {
            setFormData({
              ...formData,
              contentLocationAmenities: {
                ...formData.contentLocationAmenities,
                amenities,
              },
            });
          }}
        />
      );
    }

    // Step 5: Amenidades da Acomodação (content-property-amenities) - EDITÁVEL
    if (step.id === 'content-property-amenities') {
      return (
        <ContentAmenitiesStep
          value={{
            listingAmenities: formData.contentAmenities?.listingAmenities || [],
          }}
          onChange={(data) => {
            setFormData({
              ...formData,
              contentAmenities: data,
            });
          }}
        />
      );
    }

    // Step 6: Fotos e Mídia (content-photos)
    if (step.id === 'content-photos') {
      return (
        <ContentPhotosStep
          data={formData.contentPhotos || { photos: [] }}
          onChange={(data) => {
            setFormData({
              ...formData,
              contentPhotos: data,
            });
          }}
          propertyId={property?.id}
        />
      );
    }

    // Step 4: Amenidades (content-amenities) - DEPRECATED, mantido para compatibilidade
    if (step.id === 'content-amenities') {
      return (
        <ContentAmenitiesStep
          value={{
            locationId: formData.contentLocation?.selectedLocationId,
            locationName: formData.contentLocation?.locationName,
            locationAmenities: formData.contentLocation?.locationAmenities || [],
            propertyAmenities: formData.contentAmenities?.propertyAmenities || [],
            inheritLocationAmenities: formData.contentAmenities?.inheritLocationAmenities,
          }}
          onChange={(data) => {
            setFormData({
              ...formData,
              contentAmenities: data,
            });
          }}
        />
      );
    }

    // Step 6: Descrição (content-description)
    if (step.id === 'content-description') {
      // TODO: Buscar configuredCustomFields das settings (kv_store ou API)
      const configuredCustomFields = []; // Virá das configurações globais

      return (
        <ContentDescriptionStep
          value={formData.contentDescription}
          onChange={(data) => {
            setFormData({
              ...formData,
              contentDescription: data,
            });
          }}
          configuredCustomFields={configuredCustomFields}
        />
      );
    }

    // Step 1: Regras de Hospedagem (settings-rules)
    if (step.id === 'settings-rules') {
      return (
        <SettingsRulesStep
          data={formData.settingsRules || {}}
          onChange={(data) => {
            setFormData({
              ...formData,
              settingsRules: data,
            });
          }}
        />
      );
    }

    // FINANCIAL STEP 1: Configuração de Relacionamento (financial-contract)
    if (step.id === 'financial-contract') {
      return (
        <FinancialContractStep
          data={formData.financialContract || {
            isSublet: false,
            isExclusive: false,
            blockCalendarAfterEnd: false,
            commissionModel: 'global',
            considerChannelFees: false,
            deductChannelFees: false,
            allowExclusiveTransfer: false,
            electricityChargeMode: 'global',
            showReservationsInOwnerCalendar: 'global',
            ownerPreReservationEmail: 'global',
            agentPreReservationEmail: 'global',
            ownerConfirmedReservationEmail: 'global',
            agentConfirmedReservationEmail: 'global',
            cancellationEmail: 'global',
            deletedReservationEmail: 'global',
            reserveLinkBeforeCheckout: 'global',
          }}
          onChange={(data) => {
            setFormData({
              ...formData,
              financialContract: data,
            });
          }}
          owners={[]} // TODO: Buscar do backend
          managers={[]} // TODO: Buscar do backend
        />
      );
    }

    // FINANCIAL STEP 2: Preços Locação e Venda (financial-residential-pricing)
    if (step.id === 'financial-residential-pricing') {
      return (
        <FinancialResidentialPricingStep
          data={formData.financialResidentialPricing || {
            priceType: 'rental',
            acceptsFinancing: false,
            acceptsTrade: false,
            exclusiveSale: false,
          }}
          onChange={(data) => {
            setFormData({
              ...formData,
              financialResidentialPricing: data,
            });
          }}
          categories={formData.contentType?.categoria || []}
        />
      );
    }

    // FINANCIAL STEP 3: Configuração de preço temporada (financial-fees)
    if (step.id === 'financial-fees') {
      return (
        <FinancialSeasonalPricingStep
          data={formData.financialSeasonalPricing || {
            configMode: 'global',
            region: 'global',
            currency: 'BRL',
            discountPolicy: 'global',
            longStayDiscount: 0,
            weeklyDiscount: 0,
            monthlyDiscount: 0,
            depositMode: 'global',
            depositAmount: 0,
            depositCurrency: 'BRL',
            dynamicPricingMode: 'global',
            enableDynamicPricing: false,
            feesMode: 'global',
            cleaningFee: 0,
            cleaningFeePaidBy: 'guest',
            petFee: 0,
            petFeePaidBy: 'guest',
            extraServicesFee: 0,
            extraServicesFeePaidBy: 'guest',
          }}
          onChange={(data) => {
            setFormData({
              ...formData,
              financialSeasonalPricing: data,
            });
          }}
        />
      );
    }

    // FINANCIAL STEP 4: Precificação Individual de Temporada (financial-pricing)
    if (step.id === 'financial-pricing') {
      return (
        <FinancialIndividualPricingStep
          data={formData.financialIndividualPricing || {
            pricingMode: 'global',
            basePricePerNight: 0,
            currency: 'BRL',
            enableStayDiscounts: false,
            weeklyDiscount: 0,
            monthlyDiscount: 0,
            enableSeasonalPricing: false,
            seasonalPeriods: [],
            enableWeekdayPricing: false,
            weekdayPricing: {
              monday: 0,
              tuesday: 0,
              wednesday: 0,
              thursday: 0,
              friday: 0,
              saturday: 0,
              sunday: 0,
            },
            enableSpecialDates: false,
            specialDates: [],
          }}
          onChange={(data) => {
            setFormData({
              ...formData,
              financialIndividualPricing: data,
            });
          }}
        />
      );
    }

    // FINANCIAL STEP 5: Preços Derivados (financial-derived-pricing)
    if (step.id === 'financial-derived-pricing') {
      return (
        <FinancialDerivedPricingStep
          data={formData.financialDerivedPricing || {
            pricesVaryByGuests: false,
            maxGuestsIncluded: 2,
            extraGuestFeeType: 'fixed',
            extraGuestFeeValue: 0,
            chargeForChildren: false,
            childrenChargeType: 'per_night',
            ageBrackets: [],
          }}
          onChange={(data) => {
            setFormData({
              ...formData,
              financialDerivedPricing: data,
            });
          }}
        />
      );
    }

    // Outros steps - Placeholder
    return (
      <Card className="border-2 border-dashed border-muted">
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="p-4 bg-muted rounded-full">
            <step.icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Formulário será implementado aqui</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Conteúdo do wizard (compartilhado entre modal e full-screen)
  const wizardContent = (
    <>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Progresso Geral: {Math.round(getProgress())}%
          </span>
          <span className="font-medium">
            {completedSteps.size} de {getTotalSteps()} passos
          </span>
        </div>
        <Progress value={getProgress()} className="h-2" />
      </div>

      <Separator />

      {/* Tabs Container */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={currentBlock} onValueChange={setCurrentBlock} className="h-full flex flex-col">
          {/* Tab Triggers */}
          <TabsList className="grid w-full grid-cols-3">
            {WIZARD_BLOCKS.map((block) => (
              <TabsTrigger key={block.id} value={block.id} className="gap-2">
                <block.icon className="h-4 w-4" />
                {block.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden pt-6">
            {WIZARD_BLOCKS.map((block) => (
              <TabsContent
                key={block.id}
                value={block.id}
                className="h-full m-0 flex gap-6"
              >
                {/* Sidebar - Steps List */}
                <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                      {block.label}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {block.description}
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {block.steps?.map((step, index) => {
                      if (!step) return null;
                      const isActive =
                        currentBlock === block.id && currentStepIndex === index;
                      const isCompleted = completedSteps.has(step.id);
                      const Icon = step.icon;

                      // 🆕 v1.0.103.109 - Obrigatoriedade dinâmica baseada na categoria
                      const dynamicValidation = getStepValidation(step, formData.contentType?.categoria);

                      return (
                        <button
                          key={step.id}
                          onClick={() => handleStepClick(block.id, index)}
                          className={`
                            w-full text-left px-3 py-2 rounded-lg transition-colors
                            flex items-start gap-3 group
                            ${isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                            }
                          `}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Icon
                                className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'
                                  }`}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {index + 1}. {step.title}
                              </span>
                            </div>
                            <p
                              className={`text-xs truncate ${isActive
                                ? 'text-primary-foreground/80'
                                : 'text-muted-foreground'
                                }`}
                            >
                              {step.description}
                            </p>
                            <div className="pt-1">
                              {getValidationBadge(dynamicValidation)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Current Step Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Passo {getCurrentStepNumber()} de {getTotalSteps()}
                          </Badge>
                          {getValidationBadge(getCurrentStep().validation)}
                        </div>
                        <h3 className="text-xl font-semibold">
                          {getCurrentStep().title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getCurrentStep().description}
                        </p>
                      </div>
                    </div>
                    <Separator />
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 overflow-y-auto">
                    {renderStepContent()}
                  </div>
                </div>
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>

      <Separator />

      {/* Footer - Actions */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep()}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={cancelEditing}>
            Cancelar
          </Button>
          {isLastStep() ? (
            <Button onClick={handleFinish} disabled={isSaving || isSavingInternal}>
              {(isSaving || isSavingInternal) ? (
                <>
                  <span className="mr-2">Salvando...</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Finalizar
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleSaveAndNext} disabled={isSaving || isSavingInternal}>
              {(isSaving || isSavingInternal) ? (
                <>
                  <span className="mr-2">Salvando...</span>
                  <span className="animate-spin">⏳</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar e Avançar
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </>
  );

  // Se estiver em modo full-screen, não usa Dialog
  if (isFullScreen) {
    return (
      <div className="w-full bg-card rounded-lg border shadow-sm flex flex-col h-full">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 space-y-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">
                {property?.id ? 'Editar Propriedade' : 'Nova Propriedade'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {property?.internalName || 'Nova Propriedade'} - Complete os 14 passos para finalizar a configuração
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col gap-4">
          {wizardContent}
        </div>
      </div>
    );
  }

  // Modo modal (original)
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 space-y-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl">
                Editar Propriedade
              </DialogTitle>
              <DialogDescription>
                {property?.internalName || 'Nova Propriedade'} - Complete os 14 passos para finalizar a configuração
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content com Progress Bar */}
        <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col gap-4">
          {wizardContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PropertyEditWizard;