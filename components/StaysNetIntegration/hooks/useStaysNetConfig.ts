/**
 * StaysNet Integration - Config Hook
 * Manages configuration state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { StaysNetService } from '../services/staysnet.service';
import { validateStaysNetConfig, validateAndFixUrl, autoFixUrl } from '../utils/validators';
import { staysnetLogger } from '../utils/logger';
import type { StaysNetConfig, ValidationResult } from '../types';

const DEFAULT_CONFIG: StaysNetConfig = {
  apiKey: '',
  baseUrl: 'https://stays.net/external-api',
  accountName: '',
  notificationWebhookUrl: '',
  scope: 'global',
  enabled: false,
};

interface UseStaysNetConfigReturn {
  config: StaysNetConfig;
  setConfig: (config: StaysNetConfig) => void;
  isSaving: boolean;
  saveError: string | null;
  urlValidation: ValidationResult;
  configValidation: ValidationResult;
  saveConfig: () => Promise<void>;
  autoFix: () => void;
  resetConfig: () => void;
}

export function useStaysNetConfig(): UseStaysNetConfigReturn {
  const [config, setConfig] = useState<StaysNetConfig>(DEFAULT_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [urlValidation, setUrlValidation] = useState<ValidationResult>({
    isValid: false,
    status: 'idle',
    message: '',
    errors: [],
  });

  // Load config from backend on mount
  useEffect(() => {
    loadConfig();
  }, []);

  /**
   * Load configuration from backend
   */
  const loadConfig = async () => {
    staysnetLogger.config.info('Carregando configuração do backend...');
    try {
      const token = localStorage.getItem('rendizy-token');
      if (!token) {
        staysnetLogger.config.warning('Token não encontrado, usando config padrão');
        return;
      }

      console.log('🔍 [useStaysNetConfig] Token encontrado:', token.substring(0, 20) + '...');

      const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0];
      const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/settings/staysnet`;
      
      console.log('🔍 [useStaysNetConfig] URL da requisição:', url);

      // ⚠️ CRÍTICO: Header de autenticação customizado
      // ✅ USAR: 'X-Auth-Token' (custom token system)
      // ❌ NÃO USAR: 'Authorization: Bearer' (Supabase valida como JWT e falha)
      // Histórico: 19/12/2024 - Mudança para Bearer causou 401 "Invalid JWT"
      const headers = {
        'X-Auth-Token': token, // ⚠️ NÃO MUDAR - Sistema de token customizado
        'Content-Type': 'application/json',
      };
      
      console.log('🔍 [useStaysNetConfig] Headers enviados:', headers);

      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
      });

      console.log('🔍 [useStaysNetConfig] Status da resposta:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [useStaysNetConfig] Dados recebidos:', data);
        
        if (data.success && data.data) {
          setConfig(data.data);
          staysnetLogger.config.success('Configuração carregada do backend');
          console.log('✅ [useStaysNetConfig] Configuração aplicada:', data.data);
        } else {
          console.warn('⚠️ [useStaysNetConfig] Resposta sem dados válidos:', data);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ [useStaysNetConfig] Erro HTTP:', response.status, errorText);
        staysnetLogger.config.error('Erro ao carregar configuração', { status: response.status, error: errorText });
      }
    } catch (error) {
      console.error('❌ [useStaysNetConfig] Exceção capturada:', error);
      staysnetLogger.config.error('Erro ao carregar configuração', error);
    }
  };

  // Validate URL whenever baseUrl changes
  useEffect(() => {
    if (config.baseUrl) {
      const validation = validateAndFixUrl(config.baseUrl);
      setUrlValidation(validation);
    } else {
      setUrlValidation({
        isValid: false,
        status: 'invalid',
        message: 'URL vazia',
        errors: ['Base URL é obrigatória'],
      });
    }
  }, [config.baseUrl]);

  // Validate entire config
  const configValidation = validateStaysNetConfig(config);

  /**
   * Save configuration
   */
  const saveConfig = useCallback(async () => {
    staysnetLogger.config.info('Salvando configuração...');
    setIsSaving(true);
    setSaveError(null);

    try {
      // Auto-fix URL if fixable before saving
      let finalConfig = { ...config };
      if (urlValidation.status === 'fixable') {
        finalConfig.baseUrl = autoFixUrl(config.baseUrl);
        setConfig(finalConfig);
        staysnetLogger.config.info('URL corrigida automaticamente antes de salvar');
      }

      await StaysNetService.saveConfig(finalConfig);

      // Update lastSync
      setConfig((prev) => ({
        ...prev,
        lastSync: new Date().toISOString(),
      }));
    } catch (error) {
      const errorMessage = (error as Error).message;
      setSaveError(errorMessage);
      staysnetLogger.config.error('Erro ao salvar', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [config, configValidation, urlValidation]);

  /**
   * Auto-fix URL
   */
  const autoFix = useCallback(() => {
    if (urlValidation.status === 'fixable') {
      const fixedUrl = autoFixUrl(config.baseUrl);
      setConfig((prev) => ({ ...prev, baseUrl: fixedUrl }));
      staysnetLogger.config.info('URL corrigida automaticamente', { fixedUrl });
    }
  }, [config.baseUrl, urlValidation]);

  /**
   * Reset configuration to default
   */
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    setSaveError(null);
    staysnetLogger.config.info('Configuração resetada');
  }, []);

  return {
    config,
    setConfig,
    isSaving,
    saveError,
    urlValidation,
    configValidation,
    saveConfig,
    autoFix,
    resetConfig,
  };
}
