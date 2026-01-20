/**
 * Clean BroadcastChannel helper for auth sync between tabs.
 * New canonical module to avoid corrupted legacy file.
 */

const CHANNEL_NAME = 'rendizy-auth-sync';

export type AuthBroadcastMessage =
  | { type: 'LOGIN'; token: string; user: any }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESHED'; token: string }
  | { type: 'SESSION_EXPIRED' };

class AuthBroadcastChannel {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<string, Set<(message: AuthBroadcastMessage) => void>> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => this.handleMessage(event.data);
    }
  }

  postMessage(message: AuthBroadcastMessage): void {
    if (this.channel) this.channel.postMessage(message);
  }

  onMessage(type: AuthBroadcastMessage['type'], callback: (message: AuthBroadcastMessage) => void): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(callback);
    return () => this.listeners.get(type)?.delete(callback);
  }

  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.listeners.clear();
  }

  private handleMessage(message: AuthBroadcastMessage): void {
    const listeners = this.listeners.get(message.type);
    if (!listeners) return;
    listeners.forEach(callback => {
      try {
        callback(message);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AuthBroadcast] listener error', err);
      }
    });
  }
}

let broadcastInstance: AuthBroadcastChannel | null = null;

export function getAuthBroadcast(): AuthBroadcastChannel {
  if (!broadcastInstance) broadcastInstance = new AuthBroadcastChannel();
  return broadcastInstance;
}

export const authBroadcast = {
  notifyLogin: (token: string, user: any) => getAuthBroadcast().postMessage({ type: 'LOGIN', token, user }),
  notifyLogout: () => getAuthBroadcast().postMessage({ type: 'LOGOUT' }),
  notifyTokenRefreshed: (token: string) => getAuthBroadcast().postMessage({ type: 'TOKEN_REFRESHED', token }),
  notifySessionExpired: () => getAuthBroadcast().postMessage({ type: 'SESSION_EXPIRED' }),
};
