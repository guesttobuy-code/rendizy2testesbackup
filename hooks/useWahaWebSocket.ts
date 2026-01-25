/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         USE WAHA WEBSOCKET                                 ║
 * ║                                                                            ║
 * ║  🔒 ZONA_CRITICA_CHAT - NÃO MODIFICAR SEM REVISAR ADR-007                 ║
 * ║  ⚠️  WAHA_INTEGRATION - Conexão WebSocket com WAHA                        ║
 * ║  📱 WHATSAPP_JID - Recebe mensagens em tempo real                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Hook para conexão WebSocket com WAHA API para receber mensagens
 * em tempo real, indicador de digitação e status de entrega.
 * 
 * @version 1.0.0
 * @date 2026-01-18
 * @see /docs/REALTIME-CHAT-IMPLEMENTATION-GUIDE.md
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ EVENTOS SUPORTADOS:                                             │
 * │ - message        → Nova mensagem recebida (de outros)           │
 * │ - message.any    → Todas as mensagens (incluindo suas)          │
 * │ - message.ack    → Confirmação de leitura                       │
 * │ - presence.update→ Status de digitação                          │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * USO:
 * ```tsx
 * const { isConnected } = useWahaWebSocket({
 *   onMessage: (msg) => console.log('Nova mensagem:', msg),
 *   enabled: true
 * });
 * ```
 */

import { useEffect, useRef, useCallback, useState } from 'react';

// ============================================
// CONSTANTS - WAHA Configuration
// ============================================

// 🔒 ZONA_CRITICA: Configuração do WAHA WebSocket
const WAHA_WS_BASE = 'ws://76.13.82.60:3001/ws';
const WAHA_API_KEY = 'rendizy-waha-secret-2026';
const WAHA_SESSION = 'default';

// Eventos que queremos escutar
const DEFAULT_EVENTS = ['message', 'message.any', 'message.ack', 'presence.update'];

// Configuração de reconexão
const RECONNECT_DELAY_MS = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;

// ============================================
// TYPES
// ============================================

export interface WAHAMessagePayload {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  hasMedia: boolean;
  ack?: number;
  ackName?: 'PENDING' | 'SERVER' | 'DEVICE' | 'READ' | 'PLAYED' | 'ERROR';
  media?: {
    url: string;
    mimetype: string;
    filename?: string;
  };
  replyTo?: string;
  _data?: Record<string, unknown>;
}

export interface WAHAPresencePayload {
  id: string;
  presences: Array<{
    participant: string;
    lastKnownPresence: 'online' | 'offline' | 'typing' | 'recording' | 'paused';
    lastSeen?: number | null;
  }>;
}

export interface WAHAEvent {
  id?: string;
  event: 'message' | 'message.any' | 'message.ack' | 'presence.update' | 'session.status';
  session: string;
  timestamp?: number;
  me?: {
    id: string;
    pushName: string;
  };
  payload: WAHAMessagePayload | WAHAPresencePayload;
  engine?: string;
  environment?: {
    version: string;
    tier: string;
  };
}

export interface UseWahaWebSocketOptions {
  /** Callback quando receber nova mensagem */
  onMessage?: (event: WAHAEvent) => void;
  
  /** Callback quando receber atualização de presença (digitando...) */
  onPresence?: (event: WAHAEvent) => void;
  
  /** Callback quando receber ACK (leitura confirmada) */
  onAck?: (event: WAHAEvent) => void;
  
  /** Callback em erro */
  onError?: (error: Event) => void;
  
  /** Callback quando conectar */
  onConnected?: () => void;
  
  /** Callback quando desconectar */
  onDisconnected?: () => void;
  
  /** Habilitar/desabilitar conexão */
  enabled?: boolean;
  
  /** Eventos a escutar (default: message, message.any, message.ack, presence.update) */
  events?: string[];
  
  /** Sessão WAHA (default: 'default') */
  session?: string;
  
  /** Auto-reconnect em caso de desconexão */
  autoReconnect?: boolean;
}

export interface UseWahaWebSocketReturn {
  /** Se está conectado ao WebSocket */
  isConnected: boolean;
  
  /** Status de conexão detalhado */
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  
  /** Número de reconexões tentadas */
  reconnectAttempts: number;
  
  /** Forçar reconexão */
  reconnect: () => void;
  
  /** Desconectar manualmente */
  disconnect: () => void;
  
  /** Último erro (se houver) */
  lastError: string | null;
}

// ============================================
// HOOK
// ============================================

export function useWahaWebSocket(options: UseWahaWebSocketOptions = {}): UseWahaWebSocketReturn {
  const {
    onMessage,
    onPresence,
    onAck,
    onError,
    onConnected,
    onDisconnected,
    enabled = true,
    events = DEFAULT_EVENTS,
    session = WAHA_SESSION,
    autoReconnect = true,
  } = options;

  // State
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Refs
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef = useRef(false);

  // ============================================
  // CONNECT FUNCTION
  // ============================================

  const connect = useCallback(() => {
    if (isUnmountedRef.current) return;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WAHA-WS] Já conectado, ignorando connect()');
      return;
    }

    setConnectionStatus('connecting');
    setLastError(null);

    // Montar URL com parâmetros
    const wsUrl = new URL(WAHA_WS_BASE);
    wsUrl.searchParams.set('x-api-key', WAHA_API_KEY);
    wsUrl.searchParams.set('session', session);
    
    // Adicionar eventos
    events.forEach(event => {
      wsUrl.searchParams.append('events', event);
    });

    console.log('[WAHA-WS] 🔌 Conectando...', wsUrl.toString().replace(WAHA_API_KEY, '***'));

    try {
      const socket = new WebSocket(wsUrl.toString());
      socketRef.current = socket;

      // ─────────────────────────────────────
      // ON OPEN
      // ─────────────────────────────────────
      socket.onopen = () => {
        if (isUnmountedRef.current) return;
        
        console.log('[WAHA-WS] ✅ Conectado!');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        setLastError(null);
        onConnected?.();
      };

      // ─────────────────────────────────────
      // ON MESSAGE
      // ─────────────────────────────────────
      socket.onmessage = (event) => {
        if (isUnmountedRef.current) return;

        try {
          const data = JSON.parse(event.data) as WAHAEvent;
          
          // Log mínimo
          console.log(`[WAHA-WS] 📨 ${data.event}`, {
            from: (data.payload as WAHAMessagePayload)?.from?.substring(0, 15),
            body: (data.payload as WAHAMessagePayload)?.body?.substring(0, 30),
          });

          // Dispatch baseado no tipo de evento
          switch (data.event) {
            case 'message':
            case 'message.any':
              onMessage?.(data);
              break;
            case 'message.ack':
              onAck?.(data);
              break;
            case 'presence.update':
              onPresence?.(data);
              break;
            default:
              console.log('[WAHA-WS] Evento não tratado:', data.event);
          }
        } catch (err) {
          console.error('[WAHA-WS] Erro ao parsear mensagem:', err);
        }
      };

      // ─────────────────────────────────────
      // ON ERROR
      // ─────────────────────────────────────
      socket.onerror = (error) => {
        if (isUnmountedRef.current) return;
        
        console.error('[WAHA-WS] ❌ Erro:', error);
        setConnectionStatus('error');
        setLastError('Erro de conexão WebSocket');
        onError?.(error);
      };

      // ─────────────────────────────────────
      // ON CLOSE
      // ─────────────────────────────────────
      socket.onclose = (event) => {
        if (isUnmountedRef.current) return;
        
        console.log('[WAHA-WS] 🔌 Desconectado. Código:', event.code, 'Razão:', event.reason);
        setConnectionStatus('disconnected');
        socketRef.current = null;
        onDisconnected?.();

        // Auto-reconnect
        if (autoReconnect && enabled && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          console.log(`[WAHA-WS] 🔄 Reconectando em ${RECONNECT_DELAY_MS / 1000}s... (tentativa ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, RECONNECT_DELAY_MS);
        } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('[WAHA-WS] ⛔ Máximo de tentativas de reconexão atingido');
          setLastError('Máximo de tentativas de reconexão atingido');
        }
      };

    } catch (err) {
      console.error('[WAHA-WS] Erro ao criar WebSocket:', err);
      setConnectionStatus('error');
      setLastError(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }, [enabled, events, session, autoReconnect, reconnectAttempts, onMessage, onPresence, onAck, onError, onConnected, onDisconnected]);

  // ============================================
  // DISCONNECT FUNCTION
  // ============================================

  const disconnect = useCallback(() => {
    console.log('[WAHA-WS] 🛑 Desconectando manualmente...');
    
    // Limpar timeout de reconexão
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Fechar socket
    if (socketRef.current) {
      socketRef.current.close(1000, 'Disconnected by user');
      socketRef.current = null;
    }

    setConnectionStatus('disconnected');
    setReconnectAttempts(0);
  }, []);

  // ============================================
  // RECONNECT FUNCTION
  // ============================================

  const reconnect = useCallback(() => {
    console.log('[WAHA-WS] 🔄 Forçando reconexão...');
    disconnect();
    setReconnectAttempts(0);
    
    // Pequeno delay antes de reconectar
    setTimeout(() => {
      connect();
    }, 100);
  }, [connect, disconnect]);

  // ============================================
  // EFFECT: Connect/Disconnect based on enabled
  // ============================================

  useEffect(() => {
    isUnmountedRef.current = false;

    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      isUnmountedRef.current = true;
      disconnect();
    };
  }, [enabled]); // Apenas enabled como dependência para evitar loops

  // ============================================
  // RETURN
  // ============================================

  return {
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    reconnectAttempts,
    reconnect,
    disconnect,
    lastError,
  };
}

// ============================================
// UTILITY: Parse JID from WAHA format
// ============================================

export function parseJidFromWaha(jid: string | undefined): string {
  if (!jid) return '';
  
  // Remove sufixos comuns
  return jid
    .replace('@c.us', '')
    .replace('@s.whatsapp.net', '')
    .replace('@g.us', '')
    .replace('@lid', '');
}

// ============================================
// UTILITY: Check if message is for a specific chat
// ============================================

export function isMessageForChat(
  event: WAHAEvent, 
  targetChatId: string
): boolean {
  const payload = event.payload as WAHAMessagePayload;
  if (!payload) return false;

  const targetPhone = parseJidFromWaha(targetChatId);
  const fromPhone = parseJidFromWaha(payload.from);
  const toPhone = parseJidFromWaha(payload.to);

  // Mensagem é do chat se from ou to bate com o targetChatId
  return fromPhone === targetPhone || toPhone === targetPhone;
}

export default useWahaWebSocket;
