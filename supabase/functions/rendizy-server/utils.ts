// ============================================================================
// UTILS E HELPERS - BACKEND
// ============================================================================

import type { ApiResponse } from './types.ts';

// ============================================================================
// GERAÇÃO DE IDs
// ============================================================================

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function generateLocationId(): string {
  return generateId('loc');
}

export function generatePropertyId(): string {
  return generateId('acc'); // Accommodation ID
}

export function generateReservationId(): string {
  return generateId('res');
}

export function generateGuestId(): string {
  // ✅ CORREÇÃO v2 (14-12-2024 21:43): Retornar UUID puro sem prefixo para compatibilidade com coluna UUID do PostgreSQL
  // FORCE REBUILD: Deploy timestamp 21:43 BRT
  return crypto.randomUUID();
}

export function generateBlockId(): string {
  return generateId('block');
}

export function generatePriceId(): string {
  return generateId('price');
}

export function generateRoomId(): string {
  return generateId('room');
}

export function generateListingId(): string {
  return generateId('listing');
}

// ============================================================================
// MANIPULAÇÃO DE DATAS
// ============================================================================

export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function getCurrentDate(): string {
  return formatDate(new Date());
}

export function getCurrentDateTime(): string {
  return new Date().toISOString();
}

export function calculateNights(checkIn: string, checkOut: string): number {
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function isDateInRange(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  const d = parseDate(date);
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  return d >= start && d <= end;
}

export function getDatesInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = parseDate(startDate);
  const end = parseDate(endDate);

  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function datesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = parseDate(start1);
  const e1 = parseDate(end1);
  const s2 = parseDate(start2);
  const e2 = parseDate(end2);

  return s1 < e2 && s2 < e1;
}

// ============================================================================
// MANIPULAÇÃO DE PREÇOS
// ============================================================================

export function centsToCurrency(cents: number): number {
  return cents / 100;
}

export function currencyToCents(amount: number): number {
  return Math.round(amount * 100);
}

export function formatCurrency(
  cents: number,
  currency: 'BRL' | 'USD' | 'EUR' = 'BRL'
): string {
  const amount = centsToCurrency(cents);
  const locale = currency === 'BRL' ? 'pt-BR' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function calculateDiscount(
  basePrice: number,
  discountPercent: number
): number {
  return Math.round(basePrice * (discountPercent / 100));
}

export function applyDiscount(
  basePrice: number,
  discountPercent: number
): number {
  const discount = calculateDiscount(basePrice, discountPercent);
  return basePrice - discount;
}

// ============================================================================
// VALIDAÇÕES
// ============================================================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

export function isValidPhone(phone: string): boolean {
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/[^\d]/g, '');
  // Aceita telefones com 10 ou 11 dígitos (Brasil)
  return cleaned.length >= 10 && cleaned.length <= 11;
}

export function isValidDate(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  
  const date = parseDate(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

export function validateDateRange(checkIn: string, checkOut: string): {
  valid: boolean;
  error?: string;
} {
  if (!isValidDate(checkIn)) {
    return { valid: false, error: 'Invalid check-in date format' };
  }
  
  if (!isValidDate(checkOut)) {
    return { valid: false, error: 'Invalid check-out date format' };
  }
  
  const start = parseDate(checkIn);
  const end = parseDate(checkOut);
  
  if (start >= end) {
    return { valid: false, error: 'Check-out must be after check-in' };
  }
  
  const nights = calculateNights(checkIn, checkOut);
  if (nights < 1) {
    return { valid: false, error: 'Minimum 1 night required' };
  }
  
  return { valid: true };
}

// ============================================================================
// RESPOSTAS DA API
// ============================================================================

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: getCurrentDateTime(),
  };
}

export function errorResponse(error: string, details?: any): ApiResponse {
  return {
    success: false,
    error,
    ...(details && { details }),
    timestamp: getCurrentDateTime(),
  };
}

export function notFoundResponse(resource: string): ApiResponse {
  return errorResponse(`${resource} not found`);
}

export function validationErrorResponse(message: string): ApiResponse {
  return {
    success: false,
    error: 'Validation error',
    message,
    timestamp: getCurrentDateTime(),
  };
}

export function unauthorizedResponse(): ApiResponse {
  return {
    success: false,
    error: 'Unauthorized',
    message: 'You are not authorized to perform this action',
    timestamp: getCurrentDateTime(),
  };
}

// ============================================================================
// PAGINAÇÃO
// ============================================================================

export interface PaginationParams {
  page: number;
  limit: number;
}

export function parsePaginationParams(
  page?: string,
  limit?: string
): PaginationParams {
  const pageNum = parseInt(page || '1', 10);
  const limitNum = parseInt(limit || '50', 10);
  
  return {
    page: Math.max(1, pageNum),
    limit: Math.min(100, Math.max(1, limitNum)), // Max 100 items per page
  };
}

export function calculatePagination(
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit,
    total,
    totalPages,
    offset,
    hasMore: page < totalPages,
  };
}

export function paginateArray<T>(
  array: T[],
  page: number,
  limit: number
): T[] {
  const { offset } = calculatePagination(array.length, page, limit);
  return array.slice(offset, offset + limit);
}

// ============================================================================
// SANITIZAÇÃO
// ============================================================================

export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function sanitizeCPF(cpf: string): string {
  return cpf.replace(/[^\d]/g, '');
}

export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

// ============================================================================
// GERAÇÃO DE CÓDIGOS
// ============================================================================

export function generatePropertyCode(name: string, existingCodes: string[]): string {
  // Gera código baseado nas 3 primeiras letras do nome + número
  const prefix = name
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase();
  
  let counter = 1;
  let code = `${prefix}${counter.toString().padStart(3, '0')}`;
  
  while (existingCodes.includes(code)) {
    counter++;
    code = `${prefix}${counter.toString().padStart(3, '0')}`;
  }
  
  return code;
}

// ============================================================================
// BUSCA E FILTROS
// ============================================================================

export function matchesSearch(text: string, search: string): boolean {
  if (!search) return true;
  const normalized = text.toLowerCase();
  const searchNormalized = search.toLowerCase();
  return normalized.includes(searchNormalized);
}

export function matchesAnyTag(itemTags: string[], filterTags: string[]): boolean {
  if (!filterTags || filterTags.length === 0) return true;
  return itemTags.some(tag => filterTags.includes(tag));
}

export function matchesAllTags(itemTags: string[], filterTags: string[]): boolean {
  if (!filterTags || filterTags.length === 0) return true;
  return filterTags.every(tag => itemTags.includes(tag));
}

// ============================================================================
// LOGS E DEBUG
// ============================================================================

export function logInfo(message: string, data?: any): void {
  console.log(`[INFO] ${message}`, data || '');
}

export function logError(message: string, error?: any): void {
  console.error(`[ERROR] ${message}`, error || '');
}

export function logWarning(message: string, data?: any): void {
  console.warn(`[WARNING] ${message}`, data || '');
}

// ============================================================================
// GERAÇÃO DE NOMES COMPLETOS
// ============================================================================

export function generateFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

// ============================================================================
// CORES ALEATÓRIAS
// ============================================================================

const PROPERTY_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function getRandomPropertyColor(): string {
  return PROPERTY_COLORS[Math.floor(Math.random() * PROPERTY_COLORS.length)];
}

// ============================================================================
// CONVERSÃO DE OBJETOS
// ============================================================================

export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result: any = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

// ============================================================================
// DELAY (Para testes)
// ============================================================================

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
