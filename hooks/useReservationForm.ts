/**
 * RENDIZY - Hook para Gerenciamento de Reservas
 * 
 * Hook customizado que encapsula toda a lógica de negócio para criação de reservas.
 * Separa completamente a lógica da apresentação (UI).
 * 
 * @version 1.0.103.351
 * @date 2025-12-18
 */

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { guestsApi, reservationsApi } from '../utils/api';
import { toast } from 'sonner';

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
}

export interface Property {
  id: string;
  name: string;
  image: string;
  type: string;
  location: string;
  basePrice: number;
  cleaningFee: number;
  currency: string;
  pricing?: any;
}

export function useReservationForm(initialPropertyId?: string) {
  // ========== REACT QUERY ==========
  const queryClient = useQueryClient();

  // ========== STATE ==========
  const [currentStep, setCurrentStep] = useState(0);
  const [property, setProperty] = useState<Property | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  
  // Form data
  const [checkInDate, setCheckInDate] = useState<Date | undefined>(undefined);
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>(undefined);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [platform, setPlatform] = useState('direct');
  const [notes, setNotes] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [blockCalendar, setBlockCalendar] = useState(true);
  
  // Loading states
  const [loadingProperty, setLoadingProperty] = useState(false);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ========== COMPUTED VALUES ==========
  const nights = checkInDate && checkOutDate 
    ? Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const basePrice = property?.basePrice || 0;
  const cleaningFee = property?.cleaningFee || 0;
  const subtotal = basePrice * nights;
  const total = subtotal + cleaningFee;

  const isStep1Valid = !!property && !!checkInDate && !!checkOutDate && nights > 0;
  const isStep2Valid = !!selectedGuest;
  const canSubmit = isStep1Valid && isStep2Valid;

  // ========== API CALLS ==========
  
  /**
   * Carrega dados do imóvel do backend
   */
  const loadProperty = useCallback(async (propertyId: string) => {
    if (!propertyId) return;
    
    setLoadingProperty(true);
    try {
      const API_BASE = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/rendizy-server`;
      const ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${API_BASE}/anuncios-ultimate/${propertyId}`, {
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      
      if (result.ok && result.anuncio) {
        const anuncio = result.anuncio;
        const pricingData = anuncio.data?.pricing || anuncio.pricing || {};
        
        const propertyData: Property = {
          id: anuncio.id,
          name: anuncio.data?.title || anuncio.title || 'Sem título',
          image: anuncio.data?.photos?.[0] || '',
          type: 'Imóvel',
          location: anuncio.data?.address?.city || anuncio.address_city || 'A definir',
          basePrice: pricingData.basePrice || anuncio.data?.preco_base_noite || anuncio.pricing_base_price || 0,
          cleaningFee: pricingData.cleaningFee || anuncio.data?.taxa_limpeza || anuncio.pricing_cleaning_fee || 0,
          currency: pricingData.currency || 'BRL',
          pricing: pricingData
        };
        
        setProperty(propertyData);
        return propertyData;
      } else {
        toast.error('Imóvel não encontrado');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar imóvel:', error);
      toast.error('Erro ao carregar imóvel');
      return null;
    } finally {
      setLoadingProperty(false);
    }
  }, []);

  /**
   * Carrega lista de hóspedes
   */
  const loadGuests = useCallback(async () => {
    setLoadingGuests(true);
    try {
      const response = await guestsApi.list();
      if (response.success && response.data) {
        setGuests(response.data);
        return response.data;
      } else {
        toast.info('Nenhum hóspede encontrado');
        return [];
      }
    } catch (error) {
      console.error('❌ Erro ao carregar hóspedes:', error);
      toast.error('Erro ao carregar hóspedes');
      return [];
    } finally {
      setLoadingGuests(false);
    }
  }, []);

  /**
   * Cria novo hóspede
   */
  const createGuest = useCallback(async (guestData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }) => {
    try {
      const response = await guestsApi.create({
        ...guestData,
        source: 'direct'
      });

      if (response.success && response.data) {
        setGuests(prev => [response.data!, ...prev]);
        setSelectedGuest(response.data!);
        toast.success('Hóspede criado com sucesso!');
        return response.data;
      } else {
        toast.error(response.error || 'Erro ao criar hóspede');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao criar hóspede:', error);
      toast.error('Erro ao criar hóspede');
      return null;
    }
  }, []);

  /**
   * Submete a reserva
   */
  const submitReservation = useCallback(async (): Promise<{ success: boolean; data?: any }> => {
    console.log('🔍 DEBUG submitReservation - Início');
    console.log('🔍 canSubmit:', canSubmit);
    console.log('🔍 property:', property);
    console.log('🔍 selectedGuest:', selectedGuest);
    console.log('🔍 checkInDate:', checkInDate);
    console.log('🔍 checkOutDate:', checkOutDate);
    
    if (!canSubmit || !property || !selectedGuest || !checkInDate || !checkOutDate) {
      console.log('❌ Validação falhou!');
      toast.error('Preencha todos os campos obrigatórios');
      return { success: false };
    }

    console.log('✅ Validação passou!');
    setSubmitting(true);
    try {
      // ✅ Enviar apenas os campos que a API espera
      const reservationData = {
        propertyId: property.id,
        guestId: selectedGuest.id,
        checkIn: checkInDate.toISOString().split('T')[0],
        checkOut: checkOutDate.toISOString().split('T')[0],
        adults,
        children,
        platform,
        notes
      };

      console.log('📤 Enviando reserva:', reservationData);
      console.log('📤 Chamando reservationsApi.create...');
      const response = await reservationsApi.create(reservationData);
      console.log('📥 Resposta recebida:', response);

      if (response.success) {
        toast.success('Reserva criada com sucesso!');
        
        // 🔄 INVALIDAR CACHE DO REACT QUERY - Força reload das reservas
        console.log('🔄 Invalidando cache de reservas para forçar atualização...');
        await queryClient.invalidateQueries({ 
          queryKey: ['reservations'],
          refetchType: 'active' // Força refetch imediato de queries ativas
        });
        await queryClient.invalidateQueries({ 
          queryKey: ['calendar'],
          refetchType: 'active'
        });
        console.log('✅ Cache invalidado e refetch disparado!');
        
        return { success: true, data: response.data };
      } else {
        console.error('❌ ERRO DO BACKEND:', response);
        toast.error(response.error || 'Erro ao criar reserva');
        return { success: false };
      }
    } catch (error) {
      console.error('💥 Erro ao criar reserva:', error);
      toast.error('Erro ao criar reserva');
      return { success: false };
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, property, selectedGuest, checkInDate, checkOutDate, adults, children, platform, notes, sendEmail, blockCalendar]);

  /**
   * Reseta o formulário
   */
  const reset = useCallback(() => {
    setCurrentStep(0);
    setProperty(null);
    setSelectedGuest(null);
    setCheckInDate(undefined);
    setCheckOutDate(undefined);
    setAdults(2);
    setChildren(0);
    setPlatform('direct');
    setNotes('');
    setSendEmail(true);
    setBlockCalendar(true);
  }, []);

  // ========== EFFECTS ==========
  
  // Carrega property ao montar se initialPropertyId fornecido
  useEffect(() => {
    if (initialPropertyId) {
      loadProperty(initialPropertyId);
    }
  }, [initialPropertyId, loadProperty]);

  // ========== RETURN ==========
  return {
    // State
    currentStep,
    property,
    selectedGuest,
    guests,
    checkInDate,
    checkOutDate,
    adults,
    children,
    platform,
    notes,
    sendEmail,
    blockCalendar,
    
    // Computed
    nights,
    basePrice,
    cleaningFee,
    subtotal,
    total,
    isStep1Valid,
    isStep2Valid,
    canSubmit,
    
    // Loading
    loadingProperty,
    loadingGuests,
    submitting,
    
    // Actions
    setCurrentStep,
    setProperty,
    setSelectedGuest,
    setCheckInDate,
    setCheckOutDate,
    setAdults,
    setChildren,
    setPlatform,
    setNotes,
    setSendEmail,
    setBlockCalendar,
    loadProperty,
    loadGuests,
    createGuest,
    submitReservation,
    reset,
  };
}
