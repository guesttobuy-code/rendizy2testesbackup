/**
 * RENDIZY - Create Individual Property Modal
 * 
 * Modal completo para cadastrar anúncio individual (casa, apartamento, etc)
 * 
 * @version 1.0.103.1
 * @date 2025-10-28
 */

import { useState } from 'react';
import { Home, MapPin, Users, Bed, Bath, DollarSign, Calendar, Tag, FileText, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { propertiesApi } from '../utils/api';
import { toast } from 'sonner';
import { usePropertyActions } from '../hooks/usePropertyActions';

interface CreateIndividualPropertyModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Tipos de imóveis individuais
const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartamento' },
  { value: 'house', label: 'Casa' },
  { value: 'studio', label: 'Studio' },
  { value: 'loft', label: 'Loft' },
  { value: 'condo', label: 'Condomínio' },
  { value: 'villa', label: 'Vila' },
  { value: 'other', label: 'Outro' },
];

// Estados brasileiros
const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const CreateIndividualPropertyModal = ({
  open,
  onClose,
  onSuccess,
}: CreateIndividualPropertyModalProps) => {
  // Estado do formulário
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'basic' | 'details' | 'pricing'>('basic');
  
  // Hook de ações padronizadas
  const { createProperty } = usePropertyActions();
  
  // Dados básicos
  const [internalName, setInternalName] = useState('');
  const [publicName, setPublicName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  
  // Endereço
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  
  // Capacidade
  const [maxGuests, setMaxGuests] = useState('4');
  const [bedrooms, setBedrooms] = useState('2');
  const [beds, setBeds] = useState('2');
  const [bathrooms, setBathrooms] = useState('1');
  const [area, setArea] = useState('');
  
  // Preços e Restrições
  const [basePrice, setBasePrice] = useState('');
  const [currency, setCurrency] = useState('BRL');
  const [minNights, setMinNights] = useState('1');
  
  // Tags
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const handleClose = () => {
    // Reset all fields
    setCurrentStep('basic');
    setInternalName('');
    setPublicName('');
    setCode('');
    setType('');
    setDescription('');
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
    setZipCode('');
    setMaxGuests('4');
    setBedrooms('2');
    setBeds('2');
    setBathrooms('1');
    setArea('');
    setBasePrice('');
    setCurrency('BRL');
    setMinNights('1');
    setTags([]);
    setTagInput('');
    onClose();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Validação de campos obrigatórios por step
  const isBasicStepValid = () => {
    return internalName.trim() && code.trim() && type;
  };

  const isDetailsStepValid = () => {
    return city.trim() && state.trim() && maxGuests && bedrooms && bathrooms;
  };

  const isPricingStepValid = () => {
    return basePrice && parseFloat(basePrice) > 0;
  };

  const handleNext = () => {
    if (currentStep === 'basic' && isBasicStepValid()) {
      setCurrentStep('details');
    } else if (currentStep === 'details' && isDetailsStepValid()) {
      setCurrentStep('pricing');
    }
  };

  const handleBack = () => {
    if (currentStep === 'pricing') {
      setCurrentStep('details');
    } else if (currentStep === 'details') {
      setCurrentStep('basic');
    }
  };

  const handleSubmit = async () => {
    if (!isPricingStepValid()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      // Converter preço de reais para centavos
      const priceInCents = Math.round(parseFloat(basePrice) * 100);

      const propertyData = {
        internalName: internalName.trim(),
        publicName: publicName.trim() || internalName.trim(),
        name: publicName.trim() || internalName.trim(),
        code: code.toUpperCase().trim(),
        type,
        address: {
          street: street.trim(),
          number: number.trim(),
          complement: complement.trim() || undefined,
          neighborhood: neighborhood.trim(),
          city: city.trim(),
          state: state.trim(),
          zipCode: zipCode.trim(),
          country: 'BR',
        },
        maxGuests: parseInt(maxGuests),
        bedrooms: parseInt(bedrooms),
        beds: parseInt(beds),
        bathrooms: parseInt(bathrooms),
        area: area ? parseFloat(area) : undefined,
        basePrice: priceInCents,
        currency,
        minNights: parseInt(minNights),
        description: description.trim() || undefined,
        tags,
        amenities: [],
      };

      console.log('📤 Criando anúncio individual:', propertyData);

      // Usar hook padronizado
      await createProperty(propertyData, {
        onSuccess: () => {
          handleClose();
          onSuccess?.();
        }
      });
    } catch (error: any) {
      console.error('❌ Erro ao criar anúncio:', error);
      // O erro já foi tratado pelo hook
    } finally {
      setLoading(false);
    }
  };

  // Auto-gerar código baseado no nome interno
  const handleInternalNameChange = (value: string) => {
    setInternalName(value);
    
    // Se código estiver vazio, gerar automaticamente
    if (!code) {
      const autoCode = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 6);
      setCode(autoCode);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Home className="w-5 h-5 text-emerald-600" />
            Criar Anúncio Individual
          </DialogTitle>
          <DialogDescription>
            Cadastre uma casa, apartamento ou outro tipo de imóvel único
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2">
            {/* Step 1 */}
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                  ${currentStep === 'basic' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-emerald-100 text-emerald-600'
                  }
                `}
              >
                1
              </div>
              <span className={`text-sm ${currentStep === 'basic' ? 'text-gray-900' : 'text-gray-500'}`}>
                Informações Básicas
              </span>
            </div>
            
            <div className="h-0.5 flex-1 bg-gray-200">
              <div 
                className={`h-full transition-all ${
                  currentStep !== 'basic' ? 'bg-emerald-600' : 'bg-gray-200'
                }`} 
              />
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                  ${currentStep === 'details' 
                    ? 'bg-emerald-600 text-white' 
                    : currentStep === 'pricing'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                2
              </div>
              <span className={`text-sm ${currentStep === 'details' ? 'text-gray-900' : 'text-gray-500'}`}>
                Detalhes
              </span>
            </div>
            
            <div className="h-0.5 flex-1 bg-gray-200">
              <div 
                className={`h-full transition-all ${
                  currentStep === 'pricing' ? 'bg-emerald-600' : 'bg-gray-200'
                }`} 
              />
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors
                  ${currentStep === 'pricing' 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                3
              </div>
              <span className={`text-sm ${currentStep === 'pricing' ? 'text-gray-900' : 'text-gray-500'}`}>
                Preços
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Content */}
        <ScrollArea className="flex-1 px-6 py-4" style={{ maxHeight: 'calc(90vh - 250px)' }}>
          {/* STEP 1: Informações Básicas */}
          {currentStep === 'basic' && (
            <div className="space-y-6">
              {/* Nome Interno e Código */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="internalName" className="text-gray-700">
                    Nome Interno <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="internalName"
                    value={internalName}
                    onChange={(e) => handleInternalNameChange(e.target.value)}
                    placeholder="Ex: Casa Praia do Rosa"
                    className="border-gray-300"
                  />
                  <p className="text-xs text-gray-500">
                    Nome usado internamente no sistema
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="code" className="text-gray-700">
                    Código <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Ex: CASAPR"
                    maxLength={10}
                    className="border-gray-300 uppercase"
                  />
                  <p className="text-xs text-gray-500">
                    Código único do imóvel (máx 10 caracteres)
                  </p>
                </div>
              </div>

              {/* Nome Público */}
              <div className="space-y-2">
                <Label htmlFor="publicName" className="text-gray-700">
                  Nome Público (opcional)
                </Label>
                <Input
                  id="publicName"
                  value={publicName}
                  onChange={(e) => setPublicName(e.target.value)}
                  placeholder="Nome que aparece nos anúncios"
                  className="border-gray-300"
                />
                <p className="text-xs text-gray-500">
                  Se não preenchido, usará o nome interno
                </p>
              </div>

              {/* Tipo de Imóvel */}
              <div className="space-y-2">
                <Label htmlFor="type" className="text-gray-700">
                  Tipo de Imóvel <span className="text-red-500">*</span>
                </Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type" className="border-gray-300">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>
                        {pt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-gray-700">
                  Descrição
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o imóvel, suas características e diferenciais..."
                  rows={4}
                  className="border-gray-300 resize-none"
                />
                <p className="text-xs text-gray-500">
                  Descrição detalhada que aparecerá nos anúncios
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Detalhes */}
          {currentStep === 'details' && (
            <div className="space-y-6">
              {/* Endereço */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">Endereço</span>
                </div>

                {/* Rua e Número */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="street" className="text-gray-700">
                      Rua/Avenida
                    </Label>
                    <Input
                      id="street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Ex: Av. Atlântica"
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number" className="text-gray-700">
                      Número
                    </Label>
                    <Input
                      id="number"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder="Ex: 1500"
                      className="border-gray-300"
                    />
                  </div>
                </div>

                {/* Complemento e Bairro */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="complement" className="text-gray-700">
                      Complemento
                    </Label>
                    <Input
                      id="complement"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Ex: Apto 101, Bloco A"
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="neighborhood" className="text-gray-700">
                      Bairro
                    </Label>
                    <Input
                      id="neighborhood"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Ex: Copacabana"
                      className="border-gray-300"
                    />
                  </div>
                </div>

                {/* Cidade, Estado e CEP */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-700">
                      Cidade <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Rio de Janeiro"
                      className="border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-gray-700">
                      Estado <span className="text-red-500">*</span>
                    </Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger id="state" className="border-gray-300">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_BR.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-gray-700">
                      CEP
                    </Label>
                    <Input
                      id="zipCode"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                      className="border-gray-300"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Capacidade */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Capacidade</span>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {/* Hóspedes */}
                  <div className="space-y-2">
                    <Label htmlFor="maxGuests" className="text-gray-700 text-sm">
                      Hóspedes <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <Input
                        id="maxGuests"
                        type="number"
                        min="1"
                        value={maxGuests}
                        onChange={(e) => setMaxGuests(e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                  </div>

                  {/* Quartos */}
                  <div className="space-y-2">
                    <Label htmlFor="bedrooms" className="text-gray-700 text-sm">
                      Quartos <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-gray-400" />
                      <Input
                        id="bedrooms"
                        type="number"
                        min="0"
                        value={bedrooms}
                        onChange={(e) => setBedrooms(e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                  </div>

                  {/* Camas */}
                  <div className="space-y-2">
                    <Label htmlFor="beds" className="text-gray-700 text-sm">
                      Camas
                    </Label>
                    <div className="flex items-center gap-2">
                      <Bed className="w-4 h-4 text-gray-400" />
                      <Input
                        id="beds"
                        type="number"
                        min="0"
                        value={beds}
                        onChange={(e) => setBeds(e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                  </div>

                  {/* Banheiros */}
                  <div className="space-y-2">
                    <Label htmlFor="bathrooms" className="text-gray-700 text-sm">
                      Banheiros <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Bath className="w-4 h-4 text-gray-400" />
                      <Input
                        id="bathrooms"
                        type="number"
                        min="0"
                        step="0.5"
                        value={bathrooms}
                        onChange={(e) => setBathrooms(e.target.value)}
                        className="border-gray-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Área */}
                <div className="space-y-2">
                  <Label htmlFor="area" className="text-gray-700">
                    Área (m²)
                  </Label>
                  <Input
                    id="area"
                    type="number"
                    min="0"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Ex: 85"
                    className="border-gray-300 max-w-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preços */}
          {currentStep === 'pricing' && (
            <div className="space-y-6">
              {/* Preço Base */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium">Precificação</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="basePrice" className="text-gray-700">
                      Preço Base (por noite) <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">R$</span>
                      <Input
                        id="basePrice"
                        type="number"
                        min="0"
                        step="0.01"
                        value={basePrice}
                        onChange={(e) => setBasePrice(e.target.value)}
                        placeholder="0.00"
                        className="border-gray-300"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Valor da diária padrão
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-gray-700">
                      Moeda
                    </Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency" className="border-gray-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">BRL - Real</SelectItem>
                        <SelectItem value="USD">USD - Dólar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Restrições */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Restrições</span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minNights" className="text-gray-700">
                    Mínimo de Noites
                  </Label>
                  <Input
                    id="minNights"
                    type="number"
                    min="1"
                    value={minNights}
                    onChange={(e) => setMinNights(e.target.value)}
                    className="border-gray-300 max-w-xs"
                  />
                  <p className="text-xs text-gray-500">
                    Número mínimo de noites para reserva
                  </p>
                </div>
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Tag className="w-4 h-4" />
                  <span className="font-medium">Tags de Organização</span>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Digite uma tag e pressione Enter"
                      className="border-gray-300"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddTag}
                      disabled={!tagInput.trim()}
                    >
                      Adicionar
                    </Button>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="pl-3 pr-1 py-1 flex items-center gap-1"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-gray-500">
                    Tags ajudam a organizar e filtrar seus imóveis (Ex: praia, luxo, pet-friendly)
                  </p>
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-emerald-900 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Resumo do Anúncio
                </h4>
                <div className="text-sm text-emerald-800 space-y-1">
                  <p><strong>Nome:</strong> {internalName || '---'}</p>
                  <p><strong>Código:</strong> {code || '---'}</p>
                  <p><strong>Tipo:</strong> {PROPERTY_TYPES.find(t => t.value === type)?.label || '---'}</p>
                  <p><strong>Local:</strong> {city && state ? `${city}, ${state}` : '---'}</p>
                  <p><strong>Capacidade:</strong> {maxGuests} hóspedes · {bedrooms} quartos · {bathrooms} banheiros</p>
                  <p><strong>Preço:</strong> R$ {basePrice || '0.00'} / noite</p>
                  <p><strong>Mínimo:</strong> {minNights} noite(s)</p>
                  {tags.length > 0 && (
                    <p><strong>Tags:</strong> {tags.join(', ')}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4">
          <Button 
            variant="outline" 
            onClick={currentStep === 'basic' ? handleClose : handleBack}
          >
            {currentStep === 'basic' ? 'Cancelar' : 'Voltar'}
          </Button>

          <div className="flex items-center gap-2">
            {currentStep !== 'pricing' && (
              <Button
                onClick={handleNext}
                disabled={
                  (currentStep === 'basic' && !isBasicStepValid()) ||
                  (currentStep === 'details' && !isDetailsStepValid())
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Próximo
              </Button>
            )}

            {currentStep === 'pricing' && (
              <Button
                onClick={handleSubmit}
                disabled={!isPricingStepValid() || loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? 'Criando...' : 'Criar Anúncio'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
