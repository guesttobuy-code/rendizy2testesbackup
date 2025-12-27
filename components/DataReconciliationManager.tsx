/**
 * RENDIZY - Data Reconciliation Manager
 * 
 * Interface de mapeamento de campos entre RENDIZY e plataformas integradas
 * Permite linkar campos do sistema com campos de APIs externas
 * 
 * @version 1.0.103.401
 * @date 2024-12-18
 */

import { useState } from 'react';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Search,
  Link2,
  Check,
  X,
  Trash2,
  Save,
  Download,
  ChevronDown,
  ChevronUp,
  Calendar,
  Building2,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { getSupabaseClient } from '../utils/supabase/client';
import { publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// SIMILARITY ALGORITHMS - Sugestões Automáticas
// ============================================================================

// Calcula similaridade de Levenshtein (distância de edição)
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

// Normaliza string para comparação
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[_\-\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrai palavras-chave de um campo
function extractKeywords(fieldName: string, fieldLabel: string): string[] {
  const combined = `${fieldName} ${fieldLabel}`;
  const normalized = normalizeString(combined);
  return normalized.split(' ').filter(word => word.length > 2);
}

// Calcula score de similaridade entre dois campos (0-100)
function calculateSimilarityScore(
  rendizyField: RendizyField,
  platformField: PlatformField
): number {
  let score = 0;

  // 1. Comparação direta de nomes (40 pontos)
  const rendizyName = normalizeString(rendizyField.name);
  const platformName = normalizeString(platformField.name);
  
  if (rendizyName === platformName) {
    score += 40;
  } else {
    const distance = levenshteinDistance(rendizyName, platformName);
    const maxLen = Math.max(rendizyName.length, platformName.length);
    const similarity = 1 - (distance / maxLen);
    score += similarity * 40;
  }

  // 2. Comparação de labels (30 pontos)
  const rendizyLabel = normalizeString(rendizyField.label);
  const platformLabel = normalizeString(platformField.label);
  
  const labelDistance = levenshteinDistance(rendizyLabel, platformLabel);
  const labelMaxLen = Math.max(rendizyLabel.length, platformLabel.length);
  const labelSimilarity = 1 - (labelDistance / labelMaxLen);
  score += labelSimilarity * 30;

  // 3. Palavras-chave em comum (20 pontos)
  const rendizyKeywords = extractKeywords(rendizyField.name, rendizyField.label);
  const platformKeywords = extractKeywords(platformField.name, platformField.label);
  
  const commonKeywords = rendizyKeywords.filter(kw => 
    platformKeywords.some(pkw => pkw.includes(kw) || kw.includes(pkw))
  );
  
  if (rendizyKeywords.length > 0 && platformKeywords.length > 0) {
    const keywordScore = (commonKeywords.length / Math.max(rendizyKeywords.length, platformKeywords.length)) * 20;
    score += keywordScore;
  }

  // 4. Compatibilidade de tipos (10 pontos)
  const typeCompatibility = areTypesCompatible(rendizyField.type, platformField.type);
  if (typeCompatibility) {
    score += 10;
  }

  // 5. Mesma categoria (boost para ordenar melhor sugestões)
  if (platformField.category && rendizyField.category === platformField.category) {
    score += 8;
  }

  return Math.min(100, Math.round(score));
}

// Verifica se tipos são compatíveis
function areTypesCompatible(rendizyType: string, platformType: string): boolean {
  const typeMap: Record<string, string[]> = {
    'text': ['string', 'text'],
    'number': ['number', 'integer', 'float', 'decimal'],
    'date': ['date', 'datetime', 'timestamp'],
    'boolean': ['boolean', 'bool'],
    'object': ['object', 'json'],
    'array': ['array', 'list']
  };

  const compatibleTypes = typeMap[rendizyType] || [];
  return compatibleTypes.includes(platformType.toLowerCase()) || 
         rendizyType === platformType;
}

function contextHintsForReport(field: { name?: string; label?: string; example?: string }): string {
  const name = normalizeString(field?.name || '');
  const label = normalizeString(field?.label || '');
  const text = `${name} ${label}`.trim();

  const hints: string[] = [];

  // Prefixos do Rendizy que carregam contexto
  if (name.startsWith('data.staysnet_raw.')) {
    hints.push('Campo dentro do JSON bruto da Stays (staysnet_raw)');
  }
  if (name.includes('_t_typemeta') || name.includes('_mstitle') || name.includes('_t_propertytypemeta')) {
    hints.push('Metadados de tipo/idioma (provavelmente não é campo de negócio)');
  }

  if (text.includes('internalname') || text.includes('internal name')) hints.push('Identificação interna / nome interno do imóvel');
  if (text.includes('checkin') || text.includes('arrival')) hints.push('Check-in / chegada');
  if (text.includes('checkout') || text.includes('departure')) hints.push('Check-out / saída');
  if (text.includes('guest') || text.includes('client') || text.includes('customer')) hints.push('Hóspede / cliente');
  if (text.includes('email')) hints.push('Email');
  if (text.includes('phone') || text.includes('telefone')) hints.push('Telefone');
  if (text.includes('price') || text.includes('amount') || text.includes('total')) hints.push('Valor / total / preço');
  if (text.includes('id')) hints.push('Identificador');

  const example = String(field?.example || '');
  if (example.includes('@')) hints.push('Parece email pelo exemplo');
  if (/^\d{4}-\d{2}-\d{2}/.test(example)) hints.push('Parece data pelo exemplo');

  return Array.from(new Set(hints)).join('; ');
}

function dedupeByKey<T>(items: T[], keyFn: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// ============================================================================
// TYPES
// ============================================================================

interface PlatformIntegration {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  icon: string;
  color: string;
}

interface FieldMapping {
  id: string;
  rendizyField: string;
  rendizyFieldLabel: string;
  rendizyFieldType: string;
  platformField: string;
  platformFieldLabel: string;
  platformFieldType: string;
  notes: string;
  status: 'mapped' | 'pending' | 'conflict';
  createdAt: string;
  updatedAt: string;
  similarityScore?: number;
  isAutoSuggested?: boolean;
}

interface SuggestedMapping extends FieldMapping {
  confidence: 'high' | 'medium' | 'low';
}

interface RendizyField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'object' | 'array';
  category: 'reservation' | 'property' | 'guest' | 'pricing';
  required: boolean;
  description: string;
  example?: string;
}

interface PlatformField {
  id: string;
  name: string;
  label: string;
  type: string;
  description: string;
  example?: string;
  category?: 'reservation' | 'property' | 'guest' | 'pricing';
}

// ============================================================================
// MOCK DATA - Campos do RENDIZY
// ============================================================================

const RENDIZY_FIELDS: RendizyField[] = [
  // Reservas
  { id: 'res_1', name: 'id', label: 'ID da Reserva', type: 'text', category: 'reservation', required: true, description: 'Identificador único da reserva' },
  { id: 'res_2', name: 'property_id', label: 'ID do Imóvel', type: 'text', category: 'reservation', required: true, description: 'Referência ao imóvel' },
  { id: 'res_3', name: 'guest_id', label: 'ID do Hóspede', type: 'text', category: 'reservation', required: true, description: 'Referência ao hóspede' },
  { id: 'res_4', name: 'check_in', label: 'Check-in', type: 'date', category: 'reservation', required: true, description: 'Data de entrada' },
  { id: 'res_5', name: 'check_out', label: 'Check-out', type: 'date', category: 'reservation', required: true, description: 'Data de saída' },
  { id: 'res_6', name: 'status', label: 'Status', type: 'text', category: 'reservation', required: true, description: 'Status da reserva' },
  { id: 'res_7', name: 'total_amount', label: 'Valor Total', type: 'number', category: 'reservation', required: true, description: 'Valor total da reserva' },
  { id: 'res_8', name: 'platform', label: 'Plataforma', type: 'text', category: 'reservation', required: true, description: 'Canal de origem' },
  { id: 'res_9', name: 'adults', label: 'Adultos', type: 'number', category: 'reservation', required: true, description: 'Número de adultos' },
  { id: 'res_10', name: 'children', label: 'Crianças', type: 'number', category: 'reservation', required: false, description: 'Número de crianças' },
  { id: 'res_11', name: 'nights', label: 'Noites', type: 'number', category: 'reservation', required: true, description: 'Número de noites' },
  
  // Propriedades
  { id: 'prop_1', name: 'id', label: 'ID do Imóvel', type: 'text', category: 'property', required: true, description: 'Identificador único do imóvel' },
  { id: 'prop_2', name: 'title', label: 'Título', type: 'text', category: 'property', required: true, description: 'Nome do imóvel' },
  { id: 'prop_3', name: 'codigo', label: 'Código', type: 'text', category: 'property', required: false, description: 'Código interno do imóvel' },
  { id: 'prop_4', name: 'tipo', label: 'Tipo', type: 'text', category: 'property', required: true, description: 'Tipo do imóvel' },
  { id: 'prop_5', name: 'capacidade', label: 'Capacidade', type: 'object', category: 'property', required: true, description: 'Capacidade de hóspedes' },
  { id: 'prop_6', name: 'endereco', label: 'Endereço', type: 'object', category: 'property', required: true, description: 'Endereço completo' },
  { id: 'prop_7', name: 'comodidades', label: 'Comodidades', type: 'array', category: 'property', required: false, description: 'Lista de amenidades' },
  
  // Hóspedes
  { id: 'guest_1', name: 'id', label: 'ID do Hóspede', type: 'text', category: 'guest', required: true, description: 'Identificador único do hóspede' },
  { id: 'guest_2', name: 'name', label: 'Nome', type: 'text', category: 'guest', required: true, description: 'Nome completo' },
  { id: 'guest_3', name: 'email', label: 'E-mail', type: 'text', category: 'guest', required: true, description: 'E-mail do hóspede' },
  { id: 'guest_4', name: 'phone', label: 'Telefone', type: 'text', category: 'guest', required: false, description: 'Telefone do hóspede' },
  { id: 'guest_5', name: 'document', label: 'Documento', type: 'text', category: 'guest', required: false, description: 'CPF/RG/Passaporte' },
  
  // Precificação
  { id: 'price_1', name: 'base_price', label: 'Preço Base', type: 'number', category: 'pricing', required: true, description: 'Preço base da diária' },
  { id: 'price_2', name: 'cleaning_fee', label: 'Taxa de Limpeza', type: 'number', category: 'pricing', required: false, description: 'Taxa de limpeza' },
  { id: 'price_3', name: 'service_fee', label: 'Taxa de Serviço', type: 'number', category: 'pricing', required: false, description: 'Taxa de serviço' },
  { id: 'price_4', name: 'discount', label: 'Desconto', type: 'number', category: 'pricing', required: false, description: 'Desconto aplicado' },
];

// ============================================================================
// MOCK DATA - Plataformas
// ============================================================================

const PLATFORMS: PlatformIntegration[] = [
  { id: 'airbnb', name: 'Airbnb', status: 'active', icon: '🏠', color: 'bg-pink-500' },
  { id: 'booking', name: 'Booking.com', status: 'active', icon: '🌐', color: 'bg-blue-600' },
  { id: 'decolar', name: 'Decolar', status: 'inactive', icon: '✈️', color: 'bg-orange-500' },
  { id: 'stays', name: 'Stays.net', status: 'active', icon: '🏢', color: 'bg-purple-600' },
];

// ============================================================================
// MOCK DATA - Campos da Plataforma (exemplo Airbnb)
// ============================================================================

const PLATFORM_FIELDS: Record<string, PlatformField[]> = {
  airbnb: [
    { id: 'airbnb_1', name: 'confirmation_code', label: 'Confirmation Code', type: 'string', description: 'Unique reservation code' },
    { id: 'airbnb_2', name: 'listing_id', label: 'Listing ID', type: 'string', description: 'Property identifier' },
    { id: 'airbnb_3', name: 'guest_id', label: 'Guest ID', type: 'string', description: 'Guest identifier' },
    { id: 'airbnb_4', name: 'start_date', label: 'Start Date', type: 'date', description: 'Check-in date' },
    { id: 'airbnb_5', name: 'end_date', label: 'End Date', type: 'date', description: 'Check-out date' },
    { id: 'airbnb_6', name: 'status_type', label: 'Status Type', type: 'string', description: 'Reservation status' },
    { id: 'airbnb_7', name: 'expected_payout_amount_accurate', label: 'Payout Amount', type: 'number', description: 'Total payout' },
    { id: 'airbnb_8', name: 'number_of_adults', label: 'Adults', type: 'number', description: 'Number of adults' },
    { id: 'airbnb_9', name: 'number_of_children', label: 'Children', type: 'number', description: 'Number of children' },
    { id: 'airbnb_10', name: 'nights', label: 'Nights', type: 'number', description: 'Number of nights' },
    { id: 'airbnb_11', name: 'guest_details.full_name', label: 'Guest Name', type: 'string', description: 'Guest full name' },
    { id: 'airbnb_12', name: 'guest_details.email', label: 'Guest Email', type: 'string', description: 'Guest email address' },
    { id: 'airbnb_13', name: 'guest_details.phone', label: 'Guest Phone', type: 'string', description: 'Guest phone number' },
    { id: 'airbnb_14', name: 'listing.name', label: 'Listing Name', type: 'string', description: 'Property name' },
    { id: 'airbnb_15', name: 'listing.property_type', label: 'Property Type', type: 'string', description: 'Type of property' },
    { id: 'airbnb_16', name: 'listing.address', label: 'Address', type: 'object', description: 'Property address' },
  ],
  booking: [
    { id: 'booking_1', name: 'reservation_id', label: 'Reservation ID', type: 'string', description: 'Booking reference' },
    { id: 'booking_2', name: 'hotel_id', label: 'Hotel ID', type: 'string', description: 'Property ID' },
    { id: 'booking_3', name: 'guest_name', label: 'Guest Name', type: 'string', description: 'Guest full name' },
    { id: 'booking_4', name: 'arrival', label: 'Arrival', type: 'date', description: 'Check-in date' },
    { id: 'booking_5', name: 'departure', label: 'Departure', type: 'date', description: 'Check-out date' },
    { id: 'booking_6', name: 'status', label: 'Status', type: 'string', description: 'Reservation status' },
    { id: 'booking_7', name: 'total_price', label: 'Total Price', type: 'number', description: 'Total amount' },
    { id: 'booking_8', name: 'commission', label: 'Commission', type: 'number', description: 'Platform commission' },
  ],
  stays: [
    // RESERVATIONS - Campos completos da API Stays.net /booking/reservations
    { id: 'stays_res_1', name: 'id', label: 'ID', type: 'string', description: 'ID único da reserva' },
    { id: 'stays_res_2', name: 'code', label: 'Code', type: 'string', description: 'Código da reserva' },
    { id: 'stays_res_3', name: 'reservation_code', label: 'Reservation Code', type: 'string', description: 'Código alternativo de reserva' },
    { id: 'stays_res_4', name: 'external_id', label: 'External ID', type: 'string', description: 'ID externo (channel)' },
    { id: 'stays_res_5', name: 'status', label: 'Status', type: 'string', description: 'Status da reserva (confirmed, cancelled, etc)' },
    { id: 'stays_res_6', name: 'reservation_status', label: 'Reservation Status', type: 'string', description: 'Status detalhado' },
    
    // Datas
    { id: 'stays_res_7', name: 'arrival', label: 'Arrival', type: 'date', description: 'Data de chegada (check-in)' },
    { id: 'stays_res_8', name: 'checkin', label: 'Checkin', type: 'date', description: 'Data de check-in' },
    { id: 'stays_res_9', name: 'check_in', label: 'Check In', type: 'date', description: 'Check-in date' },
    { id: 'stays_res_10', name: 'departure', label: 'Departure', type: 'date', description: 'Data de saída (check-out)' },
    { id: 'stays_res_11', name: 'checkout', label: 'Checkout', type: 'date', description: 'Data de check-out' },
    { id: 'stays_res_12', name: 'check_out', label: 'Check Out', type: 'date', description: 'Check-out date' },
    { id: 'stays_res_13', name: 'created_at', label: 'Created At', type: 'datetime', description: 'Data de criação da reserva' },
    { id: 'stays_res_14', name: 'booking_date', label: 'Booking Date', type: 'date', description: 'Data da reserva' },
    { id: 'stays_res_15', name: 'modified_at', label: 'Modified At', type: 'datetime', description: 'Data de modificação' },
    { id: 'stays_res_16', name: 'cancelled_at', label: 'Cancelled At', type: 'datetime', description: 'Data de cancelamento' },
    
    // Propriedade/Unidade
    { id: 'stays_res_17', name: 'property_id', label: 'Property ID', type: 'string', description: 'ID da propriedade' },
    { id: 'stays_res_18', name: 'unit_id', label: 'Unit ID', type: 'string', description: 'ID da unidade' },
    { id: 'stays_res_19', name: 'property_name', label: 'Property Name', type: 'string', description: 'Nome da propriedade' },
    { id: 'stays_res_20', name: 'unit_name', label: 'Unit Name', type: 'string', description: 'Nome da unidade' },
    { id: 'stays_res_21', name: 'listing_id', label: 'Listing ID', type: 'string', description: 'ID do anúncio' },
    
    // Hóspede/Cliente
    { id: 'stays_res_22', name: 'client_id', label: 'Client ID', type: 'string', description: 'ID do cliente/hóspede' },
    { id: 'stays_res_23', name: 'guest_id', label: 'Guest ID', type: 'string', description: 'ID do hóspede' },
    { id: 'stays_res_24', name: 'guest_name', label: 'Guest Name', type: 'string', description: 'Nome do hóspede' },
    { id: 'stays_res_25', name: 'customer_name', label: 'Customer Name', type: 'string', description: 'Nome do cliente' },
    { id: 'stays_res_26', name: 'first_name', label: 'First Name', type: 'string', description: 'Primeiro nome' },
    { id: 'stays_res_27', name: 'last_name', label: 'Last Name', type: 'string', description: 'Sobrenome' },
    { id: 'stays_res_28', name: 'guest_email', label: 'Guest Email', type: 'string', description: 'Email do hóspede' },
    { id: 'stays_res_29', name: 'email', label: 'Email', type: 'string', description: 'Email' },
    { id: 'stays_res_30', name: 'guest_phone', label: 'Guest Phone', type: 'string', description: 'Telefone do hóspede' },
    { id: 'stays_res_31', name: 'phone', label: 'Phone', type: 'string', description: 'Telefone' },
    { id: 'stays_res_32', name: 'guest_document', label: 'Guest Document', type: 'string', description: 'Documento do hóspede' },
    { id: 'stays_res_33', name: 'document_number', label: 'Document Number', type: 'string', description: 'Número do documento' },
    { id: 'stays_res_34', name: 'document_type', label: 'Document Type', type: 'string', description: 'Tipo de documento' },
    { id: 'stays_res_35', name: 'country', label: 'Country', type: 'string', description: 'País do hóspede' },
    { id: 'stays_res_36', name: 'nationality', label: 'Nationality', type: 'string', description: 'Nacionalidade' },
    
    // Valores/Preços
    { id: 'stays_res_37', name: 'total', label: 'Total', type: 'number', description: 'Valor total' },
    { id: 'stays_res_38', name: 'total_amount', label: 'Total Amount', type: 'number', description: 'Valor total da reserva' },
    { id: 'stays_res_39', name: 'price', label: 'Price', type: 'number', description: 'Preço' },
    { id: 'stays_res_40', name: 'accommodation_total', label: 'Accommodation Total', type: 'number', description: 'Total de acomodação' },
    { id: 'stays_res_41', name: 'accommodation_fare', label: 'Accommodation Fare', type: 'number', description: 'Tarifa de acomodação' },
    { id: 'stays_res_42', name: 'cleaning_fee', label: 'Cleaning Fee', type: 'number', description: 'Taxa de limpeza' },
    { id: 'stays_res_43', name: 'service_fee', label: 'Service Fee', type: 'number', description: 'Taxa de serviço' },
    { id: 'stays_res_44', name: 'tax', label: 'Tax', type: 'number', description: 'Impostos' },
    { id: 'stays_res_45', name: 'taxes', label: 'Taxes', type: 'number', description: 'Impostos totais' },
    { id: 'stays_res_46', name: 'vat', label: 'VAT', type: 'number', description: 'IVA/VAT' },
    { id: 'stays_res_47', name: 'commission', label: 'Commission', type: 'number', description: 'Comissão' },
    { id: 'stays_res_48', name: 'commission_amount', label: 'Commission Amount', type: 'number', description: 'Valor da comissão' },
    { id: 'stays_res_49', name: 'commission_percentage', label: 'Commission %', type: 'number', description: 'Percentual de comissão' },
    { id: 'stays_res_50', name: 'discount', label: 'Discount', type: 'number', description: 'Desconto' },
    { id: 'stays_res_51', name: 'currency', label: 'Currency', type: 'string', description: 'Moeda (BRL, USD, EUR)' },
    { id: 'stays_res_52', name: 'paid_amount', label: 'Paid Amount', type: 'number', description: 'Valor pago' },
    { id: 'stays_res_53', name: 'balance', label: 'Balance', type: 'number', description: 'Saldo pendente' },
    { id: 'stays_res_54', name: 'deposit', label: 'Deposit', type: 'number', description: 'Depósito/Caução' },
    
    // Ocupação
    { id: 'stays_res_55', name: 'nights', label: 'Nights', type: 'number', description: 'Número de noites' },
    { id: 'stays_res_56', name: 'adults', label: 'Adults', type: 'number', description: 'Número de adultos' },
    { id: 'stays_res_57', name: 'number_of_adults', label: 'Number of Adults', type: 'number', description: 'Quantidade de adultos' },
    { id: 'stays_res_58', name: 'children', label: 'Children', type: 'number', description: 'Número de crianças' },
    { id: 'stays_res_59', name: 'number_of_children', label: 'Number of Children', type: 'number', description: 'Quantidade de crianças' },
    { id: 'stays_res_60', name: 'infants', label: 'Infants', type: 'number', description: 'Número de bebês' },
    { id: 'stays_res_61', name: 'pets', label: 'Pets', type: 'number', description: 'Número de pets' },
    { id: 'stays_res_62', name: 'guests', label: 'Guests', type: 'number', description: 'Total de hóspedes' },
    { id: 'stays_res_63', name: 'total_guests', label: 'Total Guests', type: 'number', description: 'Total de hóspedes' },
    
    // Canal/Origem
    { id: 'stays_res_64', name: 'source', label: 'Source', type: 'string', description: 'Origem da reserva' },
    { id: 'stays_res_65', name: 'channel', label: 'Channel', type: 'string', description: 'Canal de distribuição' },
    { id: 'stays_res_66', name: 'platform', label: 'Platform', type: 'string', description: 'Plataforma (Airbnb, Booking, etc)' },
    { id: 'stays_res_67', name: 'channel_name', label: 'Channel Name', type: 'string', description: 'Nome do canal' },
    { id: 'stays_res_68', name: 'channel_commission', label: 'Channel Commission', type: 'number', description: 'Comissão do canal' },
    
    // Notas e Observações
    { id: 'stays_res_69', name: 'notes', label: 'Notes', type: 'text', description: 'Notas internas' },
    { id: 'stays_res_70', name: 'internal_notes', label: 'Internal Notes', type: 'text', description: 'Notas internas' },
    { id: 'stays_res_71', name: 'special_requests', label: 'Special Requests', type: 'text', description: 'Solicitações especiais' },
    { id: 'stays_res_72', name: 'guest_notes', label: 'Guest Notes', type: 'text', description: 'Observações do hóspede' },
    { id: 'stays_res_73', name: 'comments', label: 'Comments', type: 'text', description: 'Comentários' },
    
    // Pagamento
    { id: 'stays_res_74', name: 'payment_status', label: 'Payment Status', type: 'string', description: 'Status do pagamento' },
    { id: 'stays_res_75', name: 'payment_method', label: 'Payment Method', type: 'string', description: 'Método de pagamento' },
    { id: 'stays_res_76', name: 'payment_date', label: 'Payment Date', type: 'date', description: 'Data do pagamento' },
    { id: 'stays_res_77', name: 'payment_type', label: 'Payment Type', type: 'string', description: 'Tipo de pagamento' },
    
    // Check-in/Check-out Info
    { id: 'stays_res_78', name: 'checkin_time', label: 'Checkin Time', type: 'time', description: 'Horário de check-in' },
    { id: 'stays_res_79', name: 'checkout_time', label: 'Checkout Time', type: 'time', description: 'Horário de check-out' },
    { id: 'stays_res_80', name: 'actual_checkin', label: 'Actual Checkin', type: 'datetime', description: 'Check-in real realizado' },
    { id: 'stays_res_81', name: 'actual_checkout', label: 'Actual Checkout', type: 'datetime', description: 'Check-out real realizado' },
    
    // Extras/Adicionais
    { id: 'stays_res_82', name: 'extras', label: 'Extras', type: 'array', description: 'Serviços extras' },
    { id: 'stays_res_83', name: 'addons', label: 'Addons', type: 'array', description: 'Complementos' },
    { id: 'stays_res_84', name: 'amenities_used', label: 'Amenities Used', type: 'array', description: 'Amenidades utilizadas' },
    
    // Cancelamento
    { id: 'stays_res_85', name: 'cancellation_policy', label: 'Cancellation Policy', type: 'string', description: 'Política de cancelamento' },
    { id: 'stays_res_86', name: 'cancellation_reason', label: 'Cancellation Reason', type: 'string', description: 'Motivo do cancelamento' },
    { id: 'stays_res_87', name: 'cancelled_by', label: 'Cancelled By', type: 'string', description: 'Cancelado por' },
    { id: 'stays_res_88', name: 'refund_amount', label: 'Refund Amount', type: 'number', description: 'Valor do reembolso' },
    
    // Metadados
    { id: 'stays_res_89', name: 'metadata', label: 'Metadata', type: 'object', description: 'Metadados adicionais' },
    { id: 'stays_res_90', name: 'custom_fields', label: 'Custom Fields', type: 'object', description: 'Campos personalizados' },
    { id: 'stays_res_91', name: 'tags', label: 'Tags', type: 'array', description: 'Tags/Etiquetas' },
    { id: 'stays_res_92', name: 'reference', label: 'Reference', type: 'string', description: 'Referência externa' },
    { id: 'stays_res_93', name: 'confirmation_url', label: 'Confirmation URL', type: 'string', description: 'URL de confirmação' },
    
    // PROPERTIES - Campos da API /content/properties
    { id: 'stays_prop_1', name: 'property.id', label: 'Property ID', type: 'string', description: 'ID da propriedade' },
    { id: 'stays_prop_2', name: 'property.name', label: 'Property Name', type: 'string', description: 'Nome da propriedade' },
    { id: 'stays_prop_3', name: 'property.code', label: 'Property Code', type: 'string', description: 'Código da propriedade' },
    { id: 'stays_prop_4', name: 'property.type', label: 'Property Type', type: 'string', description: 'Tipo de propriedade' },
    { id: 'stays_prop_5', name: 'property.bedrooms', label: 'Bedrooms', type: 'number', description: 'Quantidade de quartos' },
    { id: 'stays_prop_6', name: 'property.bathrooms', label: 'Bathrooms', type: 'number', description: 'Quantidade de banheiros' },
    { id: 'stays_prop_7', name: 'property.max_guests', label: 'Max Guests', type: 'number', description: 'Capacidade máxima' },
    { id: 'stays_prop_8', name: 'property.address', label: 'Address', type: 'object', description: 'Endereço completo' },
    { id: 'stays_prop_9', name: 'property.city', label: 'City', type: 'string', description: 'Cidade' },
    { id: 'stays_prop_10', name: 'property.state', label: 'State', type: 'string', description: 'Estado' },
    { id: 'stays_prop_11', name: 'property.country', label: 'Country', type: 'string', description: 'País' },
    { id: 'stays_prop_12', name: 'property.zipcode', label: 'Zipcode', type: 'string', description: 'CEP' },
    { id: 'stays_prop_13', name: 'property.latitude', label: 'Latitude', type: 'number', description: 'Latitude' },
    { id: 'stays_prop_14', name: 'property.longitude', label: 'Longitude', type: 'number', description: 'Longitude' },
    { id: 'stays_prop_15', name: 'property.amenities', label: 'Amenities', type: 'array', description: 'Comodidades' },
    { id: 'stays_prop_16', name: 'property.description', label: 'Description', type: 'text', description: 'Descrição' },
    { id: 'stays_prop_17', name: 'property.photos', label: 'Photos', type: 'array', description: 'Fotos' },
    
    // GUESTS/CLIENTS - Campos da API /booking/clients
    { id: 'stays_client_1', name: 'client.id', label: 'Client ID', type: 'string', description: 'ID do cliente' },
    { id: 'stays_client_2', name: 'client.first_name', label: 'First Name', type: 'string', description: 'Primeiro nome' },
    { id: 'stays_client_3', name: 'client.last_name', label: 'Last Name', type: 'string', description: 'Sobrenome' },
    { id: 'stays_client_4', name: 'client.email', label: 'Email', type: 'string', description: 'Email' },
    { id: 'stays_client_5', name: 'client.phone', label: 'Phone', type: 'string', description: 'Telefone' },
    { id: 'stays_client_6', name: 'client.document', label: 'Document', type: 'string', description: 'Documento' },
    { id: 'stays_client_7', name: 'client.address', label: 'Address', type: 'object', description: 'Endereço' },
    { id: 'stays_client_8', name: 'client.city', label: 'City', type: 'string', description: 'Cidade' },
    { id: 'stays_client_9', name: 'client.country', label: 'Country', type: 'string', description: 'País' },
    { id: 'stays_client_10', name: 'client.birthdate', label: 'Birthdate', type: 'date', description: 'Data de nascimento' },
  ],
};

// ============================================================================
// COMPONENT
// ============================================================================

export function DataReconciliationManager() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server';

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('stays');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [rendizySearchQuery, setRendizySearchQuery] = useState('');
  const [platformSearchQuery, setPlatformSearchQuery] = useState('');
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [selectedRendizyField, setSelectedRendizyField] = useState<string | null>(null);
  const [selectedPlatformField, setSelectedPlatformField] = useState<string | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
  const [suggestedMappings, setSuggestedMappings] = useState<SuggestedMapping[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingRealData, setLoadingRealData] = useState(false);
  const [realDataLoaded, setRealDataLoaded] = useState<string | null>(null);
  const [platformFieldsWithRealData, setPlatformFieldsWithRealData] = useState<PlatformField[]>([]);
  const [rendizyFieldsWithRealData, setRendizyFieldsWithRealData] = useState<RendizyField[]>([]);
  
  // Estados para o modal de filtros
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [availableProperties, setAvailableProperties] = useState<Array<{id: string, name: string, code?: string}>>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [recordLimit, setRecordLimit] = useState(10);

  const getAuthHeaders = async (includeJson: boolean = true): Promise<Record<string, string>> => {
    try {
      // Token real do sistema (arquitetura SQL): fica no localStorage
      const localToken = typeof window !== 'undefined'
        ? window.localStorage.getItem('rendizy-token')
        : null;

      // Fallback: se houver sessão do Supabase, usamos o access_token
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const supabaseToken = data?.session?.access_token;

      const token = localToken || supabaseToken;
      const headers: Record<string, string> = includeJson
        ? { 'Content-Type': 'application/json' }
        : {};

      // Supabase Edge Functions: use anon key for Authorization/apikey.
      // Our backend reads the user session token from X-Auth-Token.
      if (publicAnonKey) {
        headers['Authorization'] = `Bearer ${publicAnonKey}`;
        headers['apikey'] = publicAnonKey;
      }
      if (token) headers['X-Auth-Token'] = token;
      return headers;
    } catch {
      return includeJson ? { 'Content-Type': 'application/json' } : {};
    }
  };

  const toRendizyType = (t: string): RendizyField['type'] => {
    const x = (t || '').toLowerCase();
    if (x === 'number') return 'number';
    if (x === 'boolean') return 'boolean';
    if (x === 'date' || x === 'datetime') return 'date';
    if (x === 'array') return 'array';
    if (x === 'object') return 'object';
    return 'text';
  };

  // Filtrar campos RENDIZY (somente dados reais)
  const filteredRendizyFields = rendizyFieldsWithRealData.filter(field => {
    const matchesCategory = selectedCategory === 'all' || field.category === selectedCategory;
    const query = rendizySearchQuery.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      field.label.toLowerCase().includes(query) ||
      field.name.toLowerCase().includes(query) ||
      (field.description ?? '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  // Filtrar campos da plataforma (somente dados reais)
  const platformFields = platformFieldsWithRealData;
  const filteredPlatformFields = platformFields.filter(field => {
    const matchesCategory =
      selectedCategory === 'all' || (field.category && field.category === selectedCategory);
    const query = platformSearchQuery.trim().toLowerCase();
    const matchesSearch =
      query.length === 0 ||
      field.label.toLowerCase().includes(query) ||
      field.name.toLowerCase().includes(query) ||
      (field.description ?? '').toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  // Criar mapeamento
  const handleCreateMapping = () => {
    if (!selectedRendizyField || !selectedPlatformField) {
      toast.error('Selecione campos nos dois lados para criar o mapeamento');
      return;
    }

    const rendizyField = rendizyFieldsWithRealData.find(f => f.id === selectedRendizyField);
    const platformField = platformFields.find(f => f.id === selectedPlatformField);

    if (!rendizyField || !platformField) return;

    const newMapping: FieldMapping = {
      id: `map_${Date.now()}`,
      rendizyField: rendizyField.name,
      rendizyFieldLabel: rendizyField.label,
      rendizyFieldType: rendizyField.type,
      platformField: platformField.name,
      platformFieldLabel: platformField.label,
      platformFieldType: platformField.type,
      notes: '',
      status: 'mapped',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMappings([...mappings, newMapping]);
    setSelectedRendizyField(null);
    setSelectedPlatformField(null);
    toast.success('Mapeamento criado com sucesso!');
  };

  // Remover mapeamento
  const handleRemoveMapping = (mappingId: string) => {
    setMappings(mappings.filter(m => m.id !== mappingId));
    toast.success('Mapeamento removido');
  };

  // Atualizar notas
  const handleUpdateNotes = (mappingId: string, notes: string) => {
    setMappings(mappings.map(m => 
      m.id === mappingId 
        ? { ...m, notes, updatedAt: new Date().toISOString() }
        : m
    ));
  };

  // Salvar todos os mapeamentos
  const handleSaveAllMappings = () => {
    // TODO: Implementar salvamento no backend
    toast.success('Mapeamentos salvos com sucesso!');
  };

  const handleExportReportXlsx = () => {
    if (rendizyFieldsWithRealData.length === 0 || platformFieldsWithRealData.length === 0) {
      toast.error('Carregue dados reais antes de exportar', {
        description: 'Clique em "Buscar Dados Reais" para puxar campos reais da Stays.net e do Supabase.'
      });
      return;
    }

    // Dedup de campos Rendizy (reduz ruído de colunas repetidas)
    const rendizyFields = dedupeByKey(rendizyFieldsWithRealData, (f) => `${f.name}::${f.category}::${f.description}`);
    const platformFields = platformFieldsWithRealData;

    type ReportRow = {
      status: string;
      notes: string;
      rendizy_category: string;
      rendizy_field: string;
      rendizy_label: string;
      rendizy_type: string;
      rendizy_example: string;
      rendizy_source: string;
      rendizy_context: string;
      platform_category: string;
      platform_field: string;
      platform_label: string;
      platform_type: string;
      platform_example: string;
      platform_source: string;
      platform_context: string;
      similarity_score: number;
      confidence: string;
    };

    const confidenceFromScore = (score: number) => {
      if (score >= 88) return 'high';
      if (score >= 72) return 'medium';
      return 'low';
    };

    const sourceFromDescription = (desc: string) => {
      const d = String(desc || '').toLowerCase();
      if (d.includes('supabase reservations')) return 'Supabase: reservations';
      if (d.includes('supabase guests')) return 'Supabase: guests';
      if (d.includes('supabase anuncios_ultimate')) return 'Supabase: anuncios_ultimate';
      if (d.includes('stays /booking/reservations')) return 'Stays: /booking/reservations';
      if (d.includes('stays /content/properties')) return 'Stays: /content/properties';
      return desc || '';
    };

    const rows: ReportRow[] = [];

    for (const rf of rendizyFields) {
      let best: { pf: PlatformField; score: number } | null = null;
      for (const pf of platformFields) {
        const score = calculateSimilarityScore(rf, pf);
        if (!best || score > best.score) best = { pf, score };
      }

      const suggested = best?.pf;
      const score = best?.score ?? 0;

      rows.push({
        status: '',
        notes: '',
        rendizy_category: rf.category,
        rendizy_field: rf.name,
        rendizy_label: rf.label,
        rendizy_type: rf.type,
        rendizy_example: rf.example || '',
        rendizy_source: sourceFromDescription(rf.description),
        rendizy_context: contextHintsForReport({ name: rf.name, label: rf.label, example: rf.example }),
        platform_category: suggested?.category || '',
        platform_field: suggested?.name || '',
        platform_label: suggested?.label || '',
        platform_type: suggested?.type || '',
        platform_example: suggested?.example || '',
        platform_source: suggested ? sourceFromDescription(suggested.description) : '',
        platform_context: suggested ? contextHintsForReport({ name: suggested.name, label: suggested.label, example: suggested.example }) : '',
        similarity_score: score,
        confidence: confidenceFromScore(score),
      });
    }

    // Ordenar por confiança e score
    const weight = (c: string) => (c === 'high' ? 3 : c === 'medium' ? 2 : 1);
    rows.sort((a, b) => {
      const dw = weight(b.confidence) - weight(a.confidence);
      if (dw !== 0) return dw;
      return (b.similarity_score || 0) - (a.similarity_score || 0);
    });

    const headers = [
      'status',
      'notes',
      'rendizy_category',
      'rendizy_field',
      'rendizy_label',
      'rendizy_type',
      'rendizy_example',
      'rendizy_source',
      'rendizy_context',
      'platform_category',
      'platform_field',
      'platform_label',
      'platform_type',
      'platform_example',
      'platform_source',
      'platform_context',
      'similarity_score',
      'confidence',
    ] as const;

    const aoa: (string | number)[][] = [
      headers as unknown as string[],
      ...rows.map((r) =>
        headers.map((h) => {
          const v = (r as any)[h];
          return typeof v === 'number' ? v : String(v ?? '');
        })
      ),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'reconciliation');

    const startDate = dateRange.startDate;
    const endDate = dateRange.endDate;
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `data-reconciliation-report_${startDate}_to_${endDate}_${ts}.xlsx`;

    const xlsxArrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([xlsxArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast.success('Relatório exportado!', {
      description: `Arquivo: ${filename}`
    });
  };

  // Gerar sugestões automáticas de mapeamento
  const generateSuggestions = () => {
    if (rendizyFieldsWithRealData.length === 0 || platformFields.length === 0) {
      toast.error('Carregue dados reais antes de gerar sugestões', {
        description: 'Clique em "Buscar Dados Reais" para puxar campos reais da Stays.net e do Supabase.'
      });
      return;
    }

    const suggestions: SuggestedMapping[] = [];
    
    // Para cada campo RENDIZY, encontrar o melhor match na plataforma
    rendizyFieldsWithRealData.forEach(rendizyField => {
      // Pular se já está mapeado
      if (mappings.some(m => m.rendizyField === rendizyField.name)) {
        return;
      }

      type BestMatchType = { field: PlatformField; score: number };
      let bestMatch: BestMatchType | null = null;

      platformFields.forEach(platformField => {
        // Pular se já está mapeado
        if (mappings.some(m => m.platformField === platformField.name)) {
          return;
        }

        const score = calculateSimilarityScore(rendizyField, platformField);
        
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { field: platformField, score } as BestMatchType;
        }
      });

      // Adicionar sugestão se score for significativo (>= 50)
      // @ts-ignore - TypeScript bug with type narrowing in nested forEach
      if (bestMatch && bestMatch.score >= 50) {
        // @ts-ignore
        const matchScore = bestMatch.score;
        // @ts-ignore
        const matchField = bestMatch.field;
        
        const confidence: 'high' | 'medium' | 'low' = 
          matchScore >= 80 ? 'high' :
          matchScore >= 65 ? 'medium' : 'low';

        suggestions.push({
          id: `suggestion_${Date.now()}_${Math.random()}`,
          rendizyField: rendizyField.name,
          rendizyFieldLabel: rendizyField.label,
          rendizyFieldType: rendizyField.type,
          platformField: matchField.name,
          platformFieldLabel: matchField.label,
          platformFieldType: matchField.type,
          notes: `Sugestão automática com ${matchScore}% de confiança`,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          similarityScore: matchScore,
          isAutoSuggested: true,
          confidence
        });
      }
    });

    // Ordenar por score (maior primeiro)
    suggestions.sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0));
    
    setSuggestedMappings(suggestions);
    setShowSuggestions(true);
    
    toast.success(`${suggestions.length} sugestões encontradas!`);
  };

  // Aceitar uma sugestão
    const acceptSuggestion = (suggestion: SuggestedMapping) => {
      const newMapping: FieldMapping = {
      ...suggestion,
      id: `map_${Date.now()}`,
      status: 'mapped',
      notes: suggestion.notes + '\n✅ Sugestão aceita automaticamente'
    };
    
    setMappings([...mappings, newMapping]);
    setSuggestedMappings(suggestedMappings.filter(s => s.id !== suggestion.id));
    toast.success('Mapeamento aceito!');
  };

  // Aceitar todas as sugestões de alta confiança
  const acceptAllHighConfidence = () => {
    const highConfidenceSuggestions = suggestedMappings.filter(s => s.confidence === 'high');
    
    const newMappings = highConfidenceSuggestions.map(suggestion => ({
      ...suggestion,
      id: `map_${Date.now()}_${Math.random()}`,
      status: 'mapped' as const,
      notes: suggestion.notes + '\n✅ Aceito automaticamente (alta confiança)'
    }));
    
    setMappings([...mappings, ...newMappings]);
    setSuggestedMappings(suggestedMappings.filter(s => s.confidence !== 'high'));
    toast.success(`${highConfidenceSuggestions.length} mapeamentos de alta confiança aceitos!`);
  };

  // Rejeitar sugestão
  const rejectSuggestion = (suggestionId: string) => {
    setSuggestedMappings(suggestedMappings.filter(s => s.id !== suggestionId));
    toast.info('Sugestão rejeitada');
  };

  // Buscar lista de propriedades disponíveis
  const fetchAvailableProperties = async () => {
    setLoadingProperties(true);
    try {
      if (selectedPlatform !== 'stays') {
        throw new Error('Busca de propriedades reais só está disponível para Stays.net');
      }

      const res = await fetch(`${API_BASE_URL}/data-reconciliation/stays/properties`, {
        method: 'GET',
        headers: await getAuthHeaders(false),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Rota não encontrada (backend desatualizado). Faça deploy da Edge Function rendizy-server.');
        }
        throw new Error('Falha ao buscar propriedades reais');
      }

      const payload = await res.json();
      const list = payload?.data?.properties || [];
      setAvailableProperties(list);
      setSelectedProperties(list.map((p: any) => p.id));
    } catch (error: any) {
      console.error('Erro ao buscar propriedades:', error);
      toast.error('Falha ao buscar propriedades', {
        description: error.message
      });
    } finally {
      setLoadingProperties(false);
    }
  };

  // Abrir modal de filtros
  const handleOpenFiltersModal = async () => {
    setShowFiltersModal(true);
    if (availableProperties.length === 0) {
      await fetchAvailableProperties();
    }
  };

  // Buscar dados reais (Stays.net + Supabase) com filtros (somente para conciliação/mapeamento)
  const fetchRealDataFromAPI = async () => {
    setLoadingRealData(true);
    setShowFiltersModal(false);
    
    try {
      const startDate = dateRange.startDate;
      const endDate = dateRange.endDate;
      if (selectedPlatform !== 'stays') {
        throw new Error('Busca de dados reais só está disponível para Stays.net no momento');
      }

      const res = await fetch(`${API_BASE_URL}/data-reconciliation/real-samples`, {
        method: 'POST',
        headers: await getAuthHeaders(true),
        body: JSON.stringify({
          startDate,
          endDate,
          propertyIds: selectedProperties,
          limit: recordLimit,
        }),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Rota não encontrada (backend desatualizado). Faça deploy da Edge Function rendizy-server.');
        }
        throw new Error('Falha ao buscar dados reais para conciliação');
      }

      const payload = await res.json();
      if (!payload?.success) {
        throw new Error(payload?.error || 'Falha ao buscar dados reais');
      }

      const platform = payload?.data?.platform;
      const rendizy = payload?.data?.rendizy;
      const platformFields: PlatformField[] = (platform?.fields || []) as PlatformField[];

      const rendizyFields: RendizyField[] = (rendizy?.fields || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        label: f.label || f.name,
        type: toRendizyType(f.type),
        category: f.category || 'reservation',
        required: Boolean(f.required),
        description: f.description || 'Campo real',
        example: f.example,
      }));

      setPlatformFieldsWithRealData(platformFields);
      setRendizyFieldsWithRealData(rendizyFields);

      setRealDataLoaded(`✅ Real: ${startDate} → ${endDate} | Plataforma: ${platformFields.length} | Rendizy: ${rendizyFields.length}`);
      toast.success('✅ Dados reais carregados para conciliação!', {
        description: `Período: ${startDate} até ${endDate} | Propriedades: ${selectedProperties.length}`
      });
    } catch (error: any) {
      console.error('Erro ao buscar dados reais:', error);
      toast.error('Falha ao buscar dados reais', {
        description: error.message || 'Verifique se a integração Stays.net está configurada'
      });
    } finally {
      setLoadingRealData(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Sidebar com Filtros */}
      <div 
        className={`
          border-r border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-800 
          flex flex-col 
          transition-all duration-300 
          relative 
          flex-shrink-0 
          rounded-lg 
          shadow-sm
          ${isSidebarCollapsed ? 'w-12' : 'w-80'}
        `}
      >
        {/* Collapse/Expand Button */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-4 right-2 z-10 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group"
          title={isSidebarCollapsed ? 'Expandir painel' : 'Minimizar painel'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        {/* Header - Fixo */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <h2 className="text-gray-900 dark:text-gray-100 mb-3 text-sm font-semibold">Mapeamento de Campos</h2>
          
          {/* Filter toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filtros Avançados
            </span>
            {showAdvancedFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Filters Content */}
        {!isSidebarCollapsed && showAdvancedFilters && (
          <div className="flex-1 p-4 space-y-4">
              {/* Plataforma */}
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">Plataforma</Label>
                <div className="space-y-2">
                  {PLATFORMS.map(platform => (
                    <button
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform.id)}
                      className={`
                        w-full flex items-center gap-2 p-2 rounded-md text-left
                        transition-colors
                        ${selectedPlatform === platform.id 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' 
                          : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300'}
                      `}
                    >
                      <span className="text-xl">{platform.icon}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{platform.name}</div>
                      </div>
                      <Badge variant={platform.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {platform.status === 'active' ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Categoria */}
              <div>
                <Label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">Categoria de Campos</Label>
                <div className="space-y-1">
                  {[
                    { value: 'all', label: 'Todos os Campos' },
                    { value: 'reservation', label: 'Reservas' },
                    { value: 'property', label: 'Propriedades' },
                    { value: 'guest', label: 'Hóspedes' },
                    { value: 'pricing', label: 'Precificação' },
                  ].map(category => (
                    <button
                      key={category.value}
                      onClick={() => setSelectedCategory(category.value)}
                      className={`
                        w-full text-left px-3 py-2 rounded text-sm
                        transition-colors
                        ${selectedCategory === category.value 
                          ? 'bg-blue-500 text-white' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                      `}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Conciliação de Dados - {PLATFORMS.find(p => p.id === selectedPlatform)?.name}</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Mapeie os campos do RENDIZY com os campos da plataforma externa
              </p>
              {realDataLoaded && (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                  📊 Dados Reais: {realDataLoaded}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleOpenFiltersModal}
              disabled={loadingRealData || selectedPlatform !== 'stays'}
              variant="outline"
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              {loadingRealData ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Filter className="h-4 w-4 mr-2" />
              )}
              {loadingRealData ? 'Buscando...' : 'Buscar Dados Reais'}
            </Button>
            <Button 
              onClick={generateSuggestions} 
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Gerar Sugestões
            </Button>
            <Button onClick={handleCreateMapping} disabled={!selectedRendizyField || !selectedPlatformField}>
              <Link2 className="h-4 w-4 mr-2" />
              Criar Mapeamento
            </Button>
            <Button
              onClick={handleExportReportXlsx}
              variant="outline"
              disabled={loadingRealData || rendizyFieldsWithRealData.length === 0 || platformFieldsWithRealData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={handleSaveAllMappings} variant="default">
              <Save className="h-4 w-4 mr-2" />
              Salvar Tudo
            </Button>
          </div>
        </div>

        {/* Mapping Grid */}
        <div className="grid grid-cols-2 gap-6">
          {/* RENDIZY Fields - Left */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">R</span>
                </div>
                Campos RENDIZY
              </CardTitle>
              <CardDescription>
                {filteredRendizyFields.length} campos disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar campo do RENDIZY..."
                    value={rendizySearchQuery}
                    onChange={(e) => setRendizySearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              {rendizyFieldsWithRealData.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum dado real carregado.
                  <div className="mt-1">Clique em "Buscar Dados Reais" para puxar campos do Supabase.</div>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredRendizyFields.map(field => {
                    const isMapped = mappings.some(m => m.rendizyField === field.name);
                    const isSelected = selectedRendizyField === field.id;

                    return (
                      <button
                        key={field.id}
                        onClick={() => setSelectedRendizyField(isSelected ? null : field.id)}
                        className={`
                          w-full text-left p-3 rounded-lg border-2 transition-all
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : isMapped
                            ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800'}
                        `}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">{field.label}</span>
                              {field.required && (
                                <Badge variant="destructive" className="text-xs px-1 py-0">Obrigatório</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {field.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {field.description}
                            </div>
                            {field.example && (
                              <div className="mt-2 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                                <span className="text-amber-700 dark:text-amber-400 font-medium">Ex: </span>
                                <span className="text-amber-900 dark:text-amber-200 font-mono">{field.example}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                            {isMapped && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platform Fields - Right */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-gradient-to-br from-pink-500 to-orange-600 flex items-center justify-center">
                  <span className="text-xl">{PLATFORMS.find(p => p.id === selectedPlatform)?.icon}</span>
                </div>
                Campos {PLATFORMS.find(p => p.id === selectedPlatform)?.name}
              </CardTitle>
              <CardDescription>
                {filteredPlatformFields.length} campos disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar campo da plataforma..."
                    value={platformSearchQuery}
                    onChange={(e) => setPlatformSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              {platformFieldsWithRealData.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum dado real carregado.
                  <div className="mt-1">Clique em "Buscar Dados Reais" para puxar campos da Stays.net.</div>
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredPlatformFields.map(field => {
                    const isMapped = mappings.some(m => m.platformField === field.name);
                    const isSelected = selectedPlatformField === field.id;

                    return (
                      <button
                        key={field.id}
                        onClick={() => setSelectedPlatformField(isSelected ? null : field.id)}
                        className={`
                          w-full text-left p-3 rounded-lg border-2 transition-all
                          ${isSelected 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : isMapped
                            ? 'border-green-300 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 hover:border-gray-300 bg-white dark:bg-gray-800'}
                        `}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">{field.label}</span>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono truncate">
                              {field.name}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {field.description}
                            </div>
                            {field.example && (
                              <div className="mt-2 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs">
                                <span className="text-amber-700 dark:text-amber-400 font-medium">Ex: </span>
                                <span className="text-amber-900 dark:text-amber-200 font-mono">{field.example}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                            {isMapped && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Suggested Mappings */}

        {/* Suggested Mappings */}
        {showSuggestions && suggestedMappings.length > 0 && (
          <Card className="border-2 border-purple-300">
            <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-purple-600" />
                  Sugestões Automáticas ({suggestedMappings.length})
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={acceptAllHighConfidence}
                    disabled={!suggestedMappings.some(s => s.confidence === 'high')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aceitar Alta Confiança ({suggestedMappings.filter(s => s.confidence === 'high').length})
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setShowSuggestions(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <ScrollArea className="h-64">
                <div className="space-y-3 pr-4">
                  {suggestedMappings.map(suggestion => (
                    <div 
                      key={suggestion.id} 
                      className={`border-2 rounded-lg p-4 transition-all ${
                        suggestion.confidence === 'high' 
                          ? 'bg-green-50 border-green-300 dark:bg-green-900/20' 
                          : suggestion.confidence === 'medium'
                          ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-900/20'
                          : 'bg-gray-50 border-gray-300 dark:bg-gray-900/20'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          {/* RENDIZY Field */}
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">RENDIZY</div>
                            <div className="font-medium text-sm">{suggestion.rendizyFieldLabel}</div>
                            <div className="text-xs text-muted-foreground font-mono">{suggestion.rendizyField}</div>
                            <Badge variant="outline" className="text-xs mt-1">{suggestion.rendizyFieldType}</Badge>
                          </div>

                          {/* Platform Field */}
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Plataforma</div>
                            <div className="font-medium text-sm">{suggestion.platformFieldLabel}</div>
                            <div className="text-xs text-muted-foreground font-mono">{suggestion.platformField}</div>
                            <Badge variant="outline" className="text-xs mt-1">{suggestion.platformFieldType}</Badge>
                          </div>
                        </div>

                        {/* Confidence & Actions */}
                        <div className="flex flex-col gap-2 items-end">
                          <Badge 
                            className={`text-xs ${
                              suggestion.confidence === 'high' 
                                ? 'bg-green-600 text-white' 
                                : suggestion.confidence === 'medium'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-gray-600 text-white'
                            }`}
                          >
                            {suggestion.similarityScore}% Match
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acceptSuggestion(suggestion)}
                              className="h-8 text-green-600 hover:bg-green-50 border-green-300"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectSuggestion(suggestion.id)}
                              className="h-8 text-red-600 hover:bg-red-50 border-red-300"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/*         );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Mappings List */}
        {mappings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-5 w-5 text-green-600" />
                Mapeamentos Criados ({mappings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3 pr-4">
                  {mappings.map(mapping => (
                    <div key={mapping.id} className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/10 dark:to-blue-900/10">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          {/* RENDIZY Field */}
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">RENDIZY</div>
                            <div className="font-medium text-sm">{mapping.rendizyFieldLabel}</div>
                            <div className="text-xs text-muted-foreground font-mono">{mapping.rendizyField}</div>
                            <Badge variant="outline" className="text-xs mt-1">{mapping.rendizyFieldType}</Badge>
                          </div>

                          {/* Arrow */}
                          <div className="flex items-center">
                            <div className="text-xs text-muted-foreground mb-1">Plataforma</div>
                            <div className="font-medium text-sm">{mapping.platformFieldLabel}</div>
                            <div className="text-xs text-muted-foreground font-mono">{mapping.platformField}</div>
                            <Badge variant="outline" className="text-xs mt-1">{mapping.platformFieldType}</Badge>
                          </div>
                        </div>

                        {/* Actions */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMapping(mapping.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Notes Field */}
                      <div className="mt-3">
                        <Label className="text-xs text-muted-foreground mb-1">Anotações</Label>
                        <Textarea
                          value={mapping.notes}
                          onChange={(e) => handleUpdateNotes(mapping.id, e.target.value)}
                          placeholder="Adicione observações sobre este mapeamento (regras de conversão, validações, etc)..."
                          className="min-h-[60px] text-sm"
                        />
                      </div>

                      {/* Metadata */}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Criado: {new Date(mapping.createdAt).toLocaleString('pt-BR')}</span>
                        {mapping.notes && (
                          <span>Atualizado: {new Date(mapping.updatedAt).toLocaleString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Filtros para Importação */}
      <Dialog open={showFiltersModal} onOpenChange={setShowFiltersModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-emerald-600" />
              Configurar Importação de Dados
            </DialogTitle>
            <DialogDescription>
              Selecione os critérios para buscar dados reais (Stays.net + Supabase) para conciliação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Período de Datas */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período das Reservas
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Data Início</Label>
                  <Input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Fim</Label>
                  <Input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Propriedades */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Propriedades
                </Label>
                {availableProperties.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedProperties(availableProperties.map(p => p.id))}
                      className="text-xs"
                    >
                      Selecionar Todas
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedProperties([])}
                      className="text-xs"
                    >
                      Limpar Seleção
                    </Button>
                  </div>
                )}
              </div>

              {loadingProperties ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                  <span className="ml-2 text-sm text-muted-foreground">Carregando propriedades...</span>
                </div>
              ) : availableProperties.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  Nenhuma propriedade encontrada na API
                </div>
              ) : (
                <ScrollArea className="h-48 border rounded-md p-3">
                  <div className="space-y-2">
                    {availableProperties.map((property) => (
                      <div key={property.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`prop-${property.id}`}
                          checked={selectedProperties.includes(property.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProperties([...selectedProperties, property.id]);
                            } else {
                              setSelectedProperties(selectedProperties.filter(id => id !== property.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`prop-${property.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {property.name}
                          {property.code && (
                            <span className="text-xs text-muted-foreground ml-2">({property.code})</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            <Separator />

            {/* Limite de Registros */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                Quantidade de Registros
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={recordLimit}
                  onChange={(e) => setRecordLimit(parseInt(e.target.value) || 1)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  Número máximo de reservas a buscar (1-100)
                </span>
              </div>
            </div>

            <Separator />

            {/* Resumo */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Resumo da Importação
              </h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>📅 Período: {dateRange.startDate} até {dateRange.endDate}</li>
                <li>🏢 Propriedades: {selectedProperties.length} selecionada(s)</li>
                <li>📊 Limite: {recordLimit} registro(s)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFiltersModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={fetchRealDataFromAPI}
              disabled={selectedProperties.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Buscar Dados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
