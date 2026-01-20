/**
 * StaysNet Integration - Config Hook
 * Manages configuration state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { StaysNetService } from '../services/staysnet.service';
import { validateStaysNetConfig, validateAndFixUrl, autoFixUrl } from '../utils/validators';
import { staysnetLogger } from '../utils/logger';
import { publicAnonKey } from '../../../utils/supabase/info';
import type { StaysNetConfig, ValidationResult } from '../types';

const DEFAULT_CONFIG: StaysNetConfig = {
  apiKey: '',
  baseUrl: 'https://stays.net/external-api',
  accountName: '',
  notificationWebhookUrl: '',
  scope: 'global',
  enabled: false,
};

const LOCAL_CACHE_KEY = 'rendizy-staysnet-config';
const LOCAL_CACHE_KEY_PLAIN = 'rendizy-staysnet-config-plain';
let lastSavedConfig: StaysNetConfig | null = null;

const obfuscate = (value: string) => {
  try {
    return btoa(value);
  } catch {
    return value;
  }
};

const deobfuscate = (value: string) => {
  try {
    return atob(value);
  } catch {
    return value;
  }
};

const saveLocalCache = (config: StaysNetConfig) => {
  try {
    const payload = JSON.stringify({ config, savedAt: new Date().toISOString() });
    localStorage.setItem(LOCAL_CACHE_KEY, obfuscate(payload));
    localStorage.setItem(LOCAL_CACHE_KEY_PLAIN, payload);
    lastSavedConfig = config;
  } catch (error) {
    console.warn('⚠️ [useStaysNetConfig] Falha ao salvar cache local', error);
  }
};

const loadLocalCache = (): StaysNetConfig | null => {
  try {
    const rawObf = localStorage.getItem(LOCAL_CACHE_KEY);
    const rawPlain = localStorage.getItem(LOCAL_CACHE_KEY_PLAIN);

    if (rawObf) {
      const parsed = JSON.parse(deobfuscate(rawObf));
      if (parsed?.config) return parsed.config as StaysNetConfig;
    }

    if (rawPlain) {
      const parsed = JSON.parse(rawPlain);
      if (parsed?.config) return parsed.config as StaysNetConfig;
    }

    if (lastSavedConfig) return lastSavedConfig;

    return null;
  } catch (error) {
    console.warn('⚠️ [useStaysNetConfig] Falha ao ler cache local', error);
    return null;
  }
};

const stableStringify = (obj: any) => JSON.stringify(obj, Object.keys(obj).sort());

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

  const fetchRemoteConfig = useCallback(async (): Promise<StaysNetConfig | null> => {
    staysnetLogger.config.info('Carregando configuração do backend...');
    try {
      const token = localStorage.getItem('rendizy-token');
      if (!token) {
        staysnetLogger.config.warning('Token não encontrado, usando config padrão');
        return null;
      }

      const projectId = import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0];
      const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/settings/staysnet`;

      const headers = {
        'X-Auth-Token': token,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'apikey': publicAnonKey,
      } as const;

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [useStaysNetConfig] Erro HTTP:', response.status, errorText);
        staysnetLogger.config.error('Erro ao carregar configuração', { status: response.status, error: errorText });
        return null;
      }

      const data = await response.json();
      console.log('🔍 [useStaysNetConfig] Dados remotos recebidos:', data);
      if (data.success && data.data) {
        return data.data as StaysNetConfig;
      }

      console.warn('⚠️ [useStaysNetConfig] Resposta sem dados válidos:', data);
      return null; // cairá para cache
    } catch (error) {
      console.error('❌ [useStaysNetConfig] Exceção capturada:', error);
      staysnetLogger.config.error('Erro ao carregar configuração', error);
      return null;
    }
  }, []);

  /**
   * Load configuration from backend
   */
  const loadConfig = async () => {
    // Primeiro mostra cache local para evitar tela vazia
    const cached = loadLocalCache();
    if (cached) {
      setConfig(cached);
      staysnetLogger.config.info('Config carregada do cache local (pré-backend)');
    }

    const remote = await fetchRemoteConfig();
    if (remote) {
      setConfig(remote);
      saveLocalCache(remote);
      staysnetLogger.config.success('Configuração carregada do backend');
      return;
    }

    if (!cached) {
      const fallback = lastSavedConfig;
      if (fallback) {
        setConfig(fallback);
        staysnetLogger.config.warning('Usando última configuração salva em memória (sem backend/cache)');
      } else {
        staysnetLogger.config.warning('Usando config padrão: sem backend e sem cache local');
      }
    } else {
      staysnetLogger.config.warning('Usando configuração do cache local (backend indisponível)');
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

       // Persistência local imediata
      saveLocalCache(finalConfig);
      lastSavedConfig = finalConfig;

      // Confirmação pós-save lendo do backend
      const confirmed = await fetchRemoteConfig();
      if (confirmed) {
        saveLocalCache(confirmed);
        setConfig(confirmed);
        lastSavedConfig = confirmed;
        const same = stableStringify(confirmed) === stableStringify(finalConfig);
        if (!same) {
          staysnetLogger.config.warning('Backend retornou configuração diferente da enviada', { sent: finalConfig, received: confirmed });
        }
      } else {
        staysnetLogger.config.warning('Configuração salva, mas não foi possível confirmar com o backend. Usando cache local.');
        setSaveError('Configuração salva localmente, mas backend não confirmou.');
        const cached = loadLocalCache();
        if (cached) {
          setConfig(cached);
        }
      }

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
