/**
 * StaysNet Integration - Validators
 * Robust validation functions for config, URLs, and import data
 */

import type { StaysNetConfig, ValidationResult, ImportOptions } from '../types';

/**
 * Validate StaysNet configuration
 */
export function validateStaysNetConfig(config: Partial<StaysNetConfig>): ValidationResult {
  const errors: string[] = [];

  // API Key validation
  if (!config.apiKey) {
    errors.push('API Key é obrigatória');
  } else if (config.apiKey.length < 10) {
    errors.push('API Key deve ter no mínimo 10 caracteres');
  }

  // Base URL validation
  if (!config.baseUrl) {
    errors.push('Base URL é obrigatória');
  } else {
    if (!config.baseUrl.startsWith('https://')) {
      errors.push('Base URL deve começar com https://');
    }
    if (!config.baseUrl.includes('stays.net')) {
      errors.push('Base URL deve conter "stays.net"');
    }
    if (config.baseUrl.endsWith('/')) {
      errors.push('Base URL não deve terminar com "/"');
    }
  }

  return {
    isValid: errors.length === 0,
    status: errors.length === 0 ? 'correct' : 'invalid',
    message: errors.length === 0 ? 'Configuração válida' : errors.join(', '),
    errors,
  };
}

/**
 * Validate and fix URLs with smart corrections
 */
export function validateAndFixUrl(url: string): ValidationResult {
  const errors: string[] = [];
  let status: ValidationResult['status'] = 'idle';
  let message = '';

  if (!url) {
    return {
      isValid: false,
      status: 'invalid',
      message: 'URL vazia',
      errors: ['URL é obrigatória'],
    };
  }

  // Common fixes
  const fixedUrl = url
    .trim()
    .replace(/\/$/, '') // Remove trailing slash
    .replace(/^http:/, 'https:'); // Force HTTPS

  // Check if URL needs fixing
  if (fixedUrl !== url) {
    status = 'fixable';
    message = 'URL pode ser corrigida automaticamente';
  }

  // Validate structure
  try {
    const urlObj = new URL(fixedUrl);

    if (urlObj.protocol !== 'https:') {
      errors.push('URL deve usar HTTPS');
      status = 'invalid';
    }

    if (!urlObj.hostname.includes('stays.net')) {
      errors.push('URL deve ser do domínio stays.net');
      status = 'invalid';
    }

    if (errors.length === 0) {
      status = status === 'fixable' ? 'fixable' : 'correct';
      message = message || 'URL válida';
    }
  } catch (error) {
    errors.push('URL inválida');
    status = 'invalid';
    message = 'Formato de URL inválido';
  }

  return {
    isValid: status === 'correct' || status === 'fixable',
    status,
    message,
    errors,
  };
}

/**
 * Validate import options
 */
export function validateImportOptions(options: Partial<ImportOptions>): ValidationResult {
  const errors: string[] = [];

  if (options.dateType) {
    const allowed = new Set(['creation', 'checkin', 'checkout', 'included']);
    if (!allowed.has(String(options.dateType))) {
      errors.push('Tipo de data inválido (dateType)');
    }
  }

  // Date validation
  if (options.startDate && options.endDate) {
    const start = new Date(options.startDate);
    const end = new Date(options.endDate);

    if (isNaN(start.getTime())) {
      errors.push('Data inicial inválida');
    }

    if (isNaN(end.getTime())) {
      errors.push('Data final inválida');
    }

    if (start > end) {
      errors.push('Data inicial deve ser anterior à data final');
    }

    // Warn if range is too large (more than 2 years)
    const diffYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (diffYears > 2) {
      errors.push('Período muito longo (máximo 2 anos recomendado)');
    }
  }

  return {
    isValid: errors.length === 0,
    status: errors.length === 0 ? 'correct' : 'invalid',
    message: errors.length === 0 ? 'Opções válidas' : errors.join(', '),
    errors,
  };
}

/**
 * Validate property IDs
 */
export function validatePropertyIds(ids: string[]): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(ids)) {
    errors.push('IDs devem ser um array');
  } else if (ids.length === 0) {
    errors.push('Selecione pelo menos uma propriedade');
  } else if (ids.some((id) => typeof id !== 'string' || id.trim() === '')) {
    errors.push('IDs inválidos detectados');
  }

  return {
    isValid: errors.length === 0,
    status: errors.length === 0 ? 'correct' : 'invalid',
    message: errors.length === 0 ? `${ids.length} propriedade(s) selecionada(s)` : errors.join(', '),
    errors,
  };
}

/**
 * Auto-fix URL
 */
export function autoFixUrl(url: string): string {
  return url
    .trim()
    .replace(/\/$/, '')
    .replace(/^http:/, 'https:')
    .replace(/\/+$/, '');
}
