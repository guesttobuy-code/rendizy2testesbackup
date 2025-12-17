import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DateRangePicker } from './DateRangePicker';
import { Calendar, ChevronLeft, ChevronRight, Search, Plus, Star, Loader2, Users, CalendarDays } from 'lucide-react';
import { Property } from '../App';
import { guestsApi, reservationsApi, propertiesApi } from '../utils/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreateReservationWizardProps {
  open: boolean;
  onClose: () => void;
  propertyId?: string;  // ✅ Recebe ID, não objeto
  startDate?: Date;
  endDate?: Date;
  onComplete: (data: any) => void;
}

interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
}

// Novo componente para criar hóspede
function NewGuestForm({ onCancel, onSuccess }: {
  onCancel: () => void;
  onSuccess: (guest: Guest) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !email || !phone) {
      toast.error('Preencha nome, email e telefone');
      return;
    }

    setCreating(true);
    try {
      console.log('📤 Criando novo hóspede:', { firstName, lastName, email, phone });
      const response = await guestsApi.create({
        firstName,
        lastName,
        email,
        phone,
        source: 'direct' // ✅ CORREÇÃO v1.0.103.339: usar 'direct' ao invés de 'manual'
      });

      if (response.success && response.data) {
        console.log('✅ Hóspede criado:', response.data);
        onSuccess(response.data);
      } else {
        console.error('❌ Erro detalhado da API:', JSON.stringify(response, null, 2));
        const errorMsg = response.error || 'Erro ao criar hóspede';
        const details = (response as any).details;
        const fullMsg = details ? `${errorMsg}: ${JSON.stringify(details)}` : errorMsg;
        toast.error(fullMsg);
      }
    } catch (error) {
      console.error('❌ Erro ao criar hóspede:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro ao criar hóspede';
      toast.error(errorMsg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border border-gray-200 rounded-lg space-y-4">
      <h4 className="text-gray-900 font-medium">Novo Hóspede</h4>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">Nome *</Label>
          <Input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="João"
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Sobrenome</Label>
          <Input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Silva"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="joao@email.com"
          required
        />
      </div>

      <div>
        <Label htmlFor="phone">Telefone *</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 99999-9999"
          required
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={creating}>
          Cancelar
        </Button>
        <Button type="submit" disabled={creating}>
          {creating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Criando...</span>
            </>
          ) : (
            <span>Criar Hóspede</span>
          )}
        </Button>
      </div>
    </form>
  );
}

export function CreateReservationWizard({
  open,
  onClose,
  propertyId,
  startDate,
  endDate,
  onComplete
}: CreateReservationWizardProps) {
  const [step, setStep] = useState(1);
  const [property, setProperty] = useState<Property | null>(null);  // ✅ State para property
  const [loadingProperty, setLoadingProperty] = useState(false);    // ✅ Loading state
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('installment');
  const [sendEmail, setSendEmail] = useState(true);
  const [blockCalendar, setBlockCalendar] = useState(true);
  const [platform, setPlatform] = useState('direct');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Função centralizada para resetar form
  const resetForm = () => {
    setStep(1);
    setProperty(null);  // ✅ Resetar property
    setSelectedGuest(null);
    setSearchTerm('');
    setNotes('');
    setShowNewGuestForm(false);
    setNewStartDate(undefined);
    setNewEndDate(undefined);
  };
  
  // Date editing states
  const [newStartDate, setNewStartDate] = useState<Date | undefined>(undefined);
  const [newEndDate, setNewEndDate] = useState<Date | undefined>(undefined);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startDate || new Date(),
    to: endDate || new Date(new Date().setDate(new Date().getDate() + 1))
  });

  // Reset form quando Dialog fecha
  useEffect(() => {
    if (!open) {
      // Aguarda animação de fechamento antes de resetar
      const timer = setTimeout(resetForm, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);
  
  // ✅ Load property when opening modal
  useEffect(() => {
    if (open && propertyId && !property) {
      loadProperty();
    }
  }, [open, propertyId]);

  // Load guests when opening step 2
  useEffect(() => {
    if (open && step === 2 && guests.length === 0) {
      loadGuests();
    }
  }, [open, step]);

  const loadProperty = async () => {
    if (!propertyId) return;
    
    setLoadingProperty(true);
    console.log('🏠 Carregando imóvel:', propertyId);
    try {
      // ✅ FIX: Usar endpoint correto /anuncios-ultimate/:id ao invés de /properties/:id
      const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rendizy-server`;
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${API_BASE}/anuncios-ultimate/${propertyId}`, {
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('📦 Resposta da API de imóvel:', result);
      
      if (result.ok && result.anuncio) {
        const anuncio = result.anuncio;
        const propertyData = {
          id: anuncio.id,
          name: anuncio.data?.title || anuncio.title || 'Sem título',
          image: anuncio.data?.photos?.[0] || '',
          type: 'Imóvel',
          location: 'A definir',
          tarifGroup: 'Ultimate',
          tags: []
        };
        console.log('✅ Imóvel carregado:', propertyData.name);
        setProperty(propertyData);
      } else {
        console.warn('⚠️ Imóvel não encontrado');
        toast.error('Imóvel não encontrado');
        onClose();
      }
    } catch (error) {
      console.error('❌ Erro ao carregar imóvel:', error);
      toast.error('Erro ao carregar imóvel');
      onClose();
    } finally {
      setLoadingProperty(false);
    }
  };

  const loadGuests = async () => {
    setLoadingGuests(true);
    console.log('🔍 Carregando hóspedes...');
    try {
      const response = await guestsApi.list();
      console.log('📦 Resposta da API de hóspedes:', response);
      if (response.success && response.data) {
        console.log(`✅ ${response.data.length} hóspedes carregados`);
        setGuests(response.data);
      } else {
        console.warn('⚠️ API retornou success=false ou data vazio');
        toast.info('Nenhum hóspede encontrado. Crie um novo hóspede para continuar.');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar hóspedes:', error);
      toast.error('Erro ao carregar hóspedes');
    } finally {
      setLoadingGuests(false);
    }
  };

  // Use new dates if they were set, otherwise use original dates
  const effectiveStartDate = newStartDate || startDate;
  const effectiveEndDate = newEndDate || endDate;
  
  const nights = effectiveStartDate && effectiveEndDate 
    ? Math.ceil((effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  // ✅ Usar preço real do imóvel ou fallback
  const basePrice = property?.pricing?.basePrice || 350.00;
  const totalPrice = basePrice * nights;

  const formatDate = (date?: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const filteredGuests = guests.filter(g => 
    g.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.phone.includes(searchTerm)
  );

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    console.log('📤 [CreateReservationWizard] === INÍCIO handleComplete ===');
    
    if (!property || !selectedGuest || !effectiveStartDate || !effectiveEndDate) {
      console.error('❌ Validação falhou - campos obrigatórios faltando');
      console.error('Property:', property ? '✅' : '❌');
      console.error('Guest:', selectedGuest ? '✅' : '❌');
      console.error('Start Date:', effectiveStartDate ? '✅' : '❌');
      console.error('End Date:', effectiveEndDate ? '✅' : '❌');
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setCreating(true);
    try {
      const reservationData = {
        propertyId: property.id,
        guestId: selectedGuest.id,
        checkIn: effectiveStartDate.toISOString().split('T')[0],
        checkOut: effectiveEndDate.toISOString().split('T')[0],
        adults,
        children,
        platform,
        notes,
      };
      
      console.log('📦 [CreateReservationWizard] Dados da reserva:');
      console.log('🏠 Property ID:', property.id);
      console.log('🏠 Property Name:', property.name);
      console.log('👤 Guest ID:', selectedGuest.id);
      console.log('👤 Guest Name:', selectedGuest.fullName);
      console.log('📅 Check-in:', reservationData.checkIn);
      console.log('📅 Check-out:', reservationData.checkOut);
      console.log('👥 Adults:', adults, '| Children:', children);
      console.log('🌐 Platform:', platform);
      console.log('📝 Notes:', notes || '(sem notas)');
      
      console.log('📤 Enviando para API...');
      const response = await reservationsApi.create(reservationData);
      
      console.log('📥 [CreateReservationWizard] Resposta recebida:', response);

      if (response.success) {
        console.log('✅ Reserva criada com sucesso:', response.data?.id);
        toast.success('Reserva criada com sucesso!');
        onComplete(response.data);
        onClose();
        // Form será resetado pelo useEffect de fechamento
      } else {
        const errorMsg = response.error || 'Erro ao criar reserva';
        console.error('❌ Erro na resposta:', errorMsg);
        toast.error(errorMsg);
        
        // Ajuda específica para erros conhecidos
        if (errorMsg.includes('Property not found')) {
          setTimeout(() => {
            toast.error('💡 Clique no botão "🔄 Resetar Dados" no topo da página', {
              duration: 8000,
            });
          }, 1000);
        } else if (errorMsg.includes('Guest not found')) {
          toast.error('💡 O hóspede selecionado não existe no sistema', {
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('💥 [CreateReservationWizard] Exceção capturada:', error);
      console.error('Tipo:', error?.constructor?.name);
      console.error('Mensagem:', error?.message);
      toast.error('Erro ao criar reserva');
    } finally {
      console.log('🏁 [CreateReservationWizard] === FIM handleComplete ===');
      setCreating(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!creating && !isOpen) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Reserva</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova reserva
          </DialogDescription>
          {/* Stepper */}
          <div className="flex items-center gap-8 mt-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}> 
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}> 
                1
              </div>
              <span className="text-sm">Disponibilidade</span>
            </div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}> 
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}> 
                2
              </div>
              <span className="text-sm">Hóspede</span>
            </div>
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}> 
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}> 
                3
              </div>
              <span className="text-sm">Detalhes</span>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Step 1: Disponibilidade */}
          {step === 1 && (
            <div className="space-y-6">
              {loadingProperty ? (
                <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-start gap-3 animate-pulse">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ) : (
              <div className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={property?.image || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=80&h=80&fit=crop'}
                    alt={property?.name}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="text-gray-900 mb-1">{property?.name}</div>
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <div className="text-gray-900 mb-1">
                      R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      R$ {basePrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / noite
                    </div>
                    <div className="text-sm text-gray-600">{property?.location}</div>
                  </div>
                </div>
              </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Check-in</Label>
                    <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {newStartDate 
                          ? format(newStartDate, 'dd/MM/yyyy', { locale: ptBR })
                          : formatDate(startDate)}
                      </span>
                      {newStartDate && <span className="text-green-600 text-xs">(alterado)</span>}
                    </div>
                  </div>
                  <div>
                    <Label>Check-out</Label>
                    <div className="mt-1.5 px-3 py-2 border border-gray-300 rounded-md flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {newEndDate 
                          ? format(newEndDate, 'dd/MM/yyyy', { locale: ptBR })
                          : formatDate(endDate)}
                      </span>
                      {newEndDate && <span className="text-green-600 text-xs">(alterado)</span>}
                    </div>
                  </div>
                </div>
                
                {/* Date Editor */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Selecione o período da reserva</Label>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={(range) => {
                      setDateRange(range);
                      setNewStartDate(range.from);
                      setNewEndDate(range.to);
                    }}
                  />
                  
                  {(newStartDate || newEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewStartDate(undefined);
                        setNewEndDate(undefined);
                        setDateRange({
                          from: startDate || new Date(),
                          to: endDate || new Date(new Date().setDate(new Date().getDate() + 1))
                        });
                      }}
                    >
                      Restaurar datas originais
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900">
                Total de {nights} {nights === 1 ? 'noite' : 'noites'}
                {(newStartDate || newEndDate) && (
                  <span className="ml-2 text-green-700">(datas atualizadas)</span>
                )}
              </div>

              {/* Guests count */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Quantidade de Hóspedes
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Adultos</Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={adults}
                      onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Crianças</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      value={children}
                      onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Platform */}
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <Select 
                  key={`select-platform-${open ? 'open' : 'closed'}`}
                  value={platform} 
                  onValueChange={setPlatform}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Reserva Direta</SelectItem>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="booking">Booking.com</SelectItem>
                    <SelectItem value="decolar">Decolar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Hóspede */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900">Buscar Hóspede</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewGuestForm(!showNewGuestForm)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar hóspede
                </Button>
              </div>

              {showNewGuestForm ? (
                <NewGuestForm
                  onCancel={() => setShowNewGuestForm(false)}
                  onSuccess={(newGuest) => {
                    setSelectedGuest(newGuest);
                    setShowNewGuestForm(false);
                    setGuests([newGuest, ...guests]);
                    toast.success('Hóspede criado com sucesso!');
                  }}
                />
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nome, email ou telefone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Resultados da busca:</Label>
                    {loadingGuests ? (
                      <div className="flex items-center justify-center p-8 border border-gray-200 rounded-lg">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-600">Carregando hóspedes...</span>
                      </div>
                    ) : filteredGuests.length === 0 ? (
                      <div className="p-8 border border-gray-200 rounded-lg text-center text-gray-600">
                        Nenhum hóspede encontrado.
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
                        {filteredGuests.map(guest => (
                          <div
                            key={guest.id}
                            onClick={() => setSelectedGuest(guest)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedGuest(guest);
                              }
                            }}
                            className={`w-full p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                              selectedGuest?.id === guest.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-gray-900 mb-1">{guest.fullName}</div>
                                <div className="text-sm text-gray-600">{guest.phone}</div>
                                <div className="text-sm text-gray-600">{guest.email}</div>
                              </div>
                              {selectedGuest?.id === guest.id && (
                                <div className="text-blue-600 font-medium">✓ Selecionado</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Condições */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="p-4 border border-gray-200 rounded-lg space-y-2">
                <h4 className="text-gray-900 mb-3">Resumo da Reserva</h4>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Imóvel:</span>
                  <span className="text-gray-900">{property?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Hóspede:</span>
                  <span className="text-gray-900">{selectedGuest?.fullName} ({selectedGuest?.phone})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Período:</span>
                  <span className="text-gray-900">
                    {newStartDate 
                      ? format(newStartDate, 'dd/MM/yyyy', { locale: ptBR })
                      : formatDate(startDate)} → {newEndDate 
                        ? format(newEndDate, 'dd/MM/yyyy', { locale: ptBR })
                        : formatDate(endDate)} ({nights} noites)
                    {(newStartDate || newEndDate) && (
                      <span className="text-green-600 ml-2 text-xs">(datas editadas)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Hóspedes:</span>
                  <span className="text-gray-900">
                    {adults} {adults === 1 ? 'adulto' : 'adultos'}{children > 0 && `, ${children} ${children === 1 ? 'criança' : 'crianças'}`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Plataforma:</span>
                  <span className="text-gray-900">
                    {platform === 'direct' && 'Reserva Direta'}
                    {platform === 'airbnb' && 'Airbnb'}
                    {platform === 'booking' && 'Booking.com'}
                    {platform === 'decolar' && 'Decolar'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Valor:</span>
                  <span className="text-gray-900">
                    R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Pagamento */}
              <div className="space-y-3">
                <Label>Condições de Pagamento</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="flex-1 cursor-pointer">
                      À vista (R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2 p-3 border border-gray-200 rounded-lg">
                    <RadioGroupItem value="installment" id="installment" className="mt-1" />
                    <Label htmlFor="installment" className="flex-1 cursor-pointer">
                      <div>Parcelado</div>
                      <div className="text-sm text-gray-600 mt-1">
                        • Entrada: R$ {(totalPrice * 0.3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (hoje)
                      </div>
                      <div className="text-sm text-gray-600">
                        • 2x de R$ {(totalPrice * 0.35).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (sem juros)
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea 
                  placeholder="Notas sobre a reserva..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Opções */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="email" 
                    checked={sendEmail}
                    onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                  />
                  <Label htmlFor="email" className="cursor-pointer">
                    Enviar confirmação por email
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="block" 
                    checked={blockCalendar}
                    onCheckedChange={(checked) => setBlockCalendar(checked as boolean)}
                  />
                  <Label htmlFor="block" className="cursor-pointer">
                    Bloquear no calendário
                  </Label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com botões */}
        <div className="flex items-center justify-between pt-4 mt-6 border-t">
          <Button
            variant="outline"
            onClick={step === 1 ? onClose : handleBack}
            disabled={creating}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>
          
          {step < 3 ? (
            <Button onClick={handleNext} disabled={step === 2 && !selectedGuest}>
              Continuar
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Reserva'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
