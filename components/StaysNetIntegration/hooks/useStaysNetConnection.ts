/**
 * StaysNet Integration - Connection Hook
 * Manages connection testing state
 */

import { useState, useCallback } from 'react';
import { StaysNetService } from '../services/staysnet.service';
import { staysnetLogger } from '../utils/logger';
import type { StaysNetConfig, ConnectionStatus } from '../types';

interface UseStaysNetConnectionReturn {
  isTesting: boolean;
  connectionStatus: ConnectionStatus;
  testConnection: (config: StaysNetConfig) => Promise<boolean>;
  resetStatus: () => void;
}

export function useStaysNetConnection(): UseStaysNetConnectionReturn {
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'idle',
  });

  /**
   * Test connection to StaysNet API
   */
  const testConnection = useCallback(async (config: StaysNetConfig): Promise<boolean> => {
    staysnetLogger.connection.info('Iniciando teste de conexão...');
    setIsTesting(true);
    setConnectionStatus({ status: 'idle' });

    try {
      // Validate config before testing
      if (!config.baseUrl || !config.apiKey) {
        throw new Error('Preencha Base URL e API Key antes de testar');
      }

      const result = await StaysNetService.testConnection(config);

      if (result.success) {
        setConnectionStatus({
          status: 'success',
          message: result.message || 'Conexão estabelecida com sucesso!',
          timestamp: new Date().toISOString(),
        });
        staysnetLogger.connection.success('Conexão bem-sucedida');
        return true;
      } else {
        setConnectionStatus({
          status: 'error',
          message: result.message || 'Falha na conexão',
          timestamp: new Date().toISOString(),
        });
        staysnetLogger.connection.error('Falha na conexão', result.message);
        return false;
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      setConnectionStatus({
        status: 'error',
        message: errorMessage,
        timestamp: new Date().toISOString(),
      });
      staysnetLogger.connection.error('Erro ao testar conexão', error);
      return false;
    } finally {
      setIsTesting(false);
    }
  }, []);

  /**
   * Reset connection status
   */
  const resetStatus = useCallback(() => {
    setConnectionStatus({ status: 'idle' });
  }, []);

  return {
    isTesting,
    connectionStatus,
    testConnection,
    resetStatus,
  };
}
