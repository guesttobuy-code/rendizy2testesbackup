/**
 * State Machine de Autenticação
 *
 * Gerencia estados de autenticação de forma explícita e previsível
 */

import { User, Organization } from '../types/tenancy';

export type AuthStatus =
  | 'idle' // Inicial
  | 'checking' // Validando token existente
  | 'authenticated' // Logado e válido
  | 'refreshing' // Renovando token
  | 'unauthenticated'; // Deslogado

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  organization: Organization | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'CHECK_START' }
  | { type: 'CHECK_SUCCESS'; user: User; organization: Organization | null; accessToken: string }
  | { type: 'CHECK_FAILURE'; error?: string }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_SUCCESS'; accessToken: string }
  | { type: 'REFRESH_FAILURE'; error?: string }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: User; organization: Organization | null; accessToken: string }
  | { type: 'LOGIN_FAILURE'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; user: User; organization: Organization | null };

const initialState: AuthState = {
  status: 'idle',
  user: null,
  organization: null,
  accessToken: null,
  isLoading: false,
  error: null
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'CHECK_START':
      return {
        ...state,
        status: 'checking',
        isLoading: true,
        error: null
      };

    case 'CHECK_SUCCESS':
      return {
        ...state,
        status: 'authenticated',
        user: action.user,
        organization: action.organization,
        accessToken: action.accessToken,
        isLoading: false,
        error: null
      };

    case 'CHECK_FAILURE':
      return {
        ...state,
        status: 'unauthenticated',
        user: null,
        organization: null,
        accessToken: null,
        isLoading: false,
        error: action.error || null
      };

    case 'REFRESH_START':
      return {
        ...state,
        status: 'refreshing',
        isLoading: true,
        error: null
      };

    case 'REFRESH_SUCCESS':
      return {
        ...state,
        status: 'authenticated',
        accessToken: action.accessToken,
        isLoading: false,
        error: null
      };

    case 'REFRESH_FAILURE':
      return {
        ...state,
        status: 'unauthenticated',
        user: null,
        organization: null,
        accessToken: null,
        isLoading: false,
        error: action.error || null
      };

    case 'LOGIN_START':
      return {
        ...state,
        status: 'checking',
        isLoading: true,
        error: null
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        status: 'authenticated',
        user: action.user,
        organization: action.organization,
        accessToken: action.accessToken,
        isLoading: false,
        error: null
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        status: 'unauthenticated',
        user: null,
        organization: null,
        accessToken: null,
        isLoading: false,
        error: action.error
      };

    case 'LOGOUT':
      return {
        ...initialState,
        status: 'unauthenticated'
      };

    case 'SET_USER':
      return {
        ...state,
        user: action.user,
        organization: action.organization
      };

    default:
      return state;
  }
}

/**
 * Helpers para verificar estado
 */
export const authHelpers = {
  isAuthenticated: (state: AuthState): boolean => {
    return state.status === 'authenticated' && !!state.user && !!state.accessToken;
  },

  isChecking: (state: AuthState): boolean => {
    return state.status === 'checking' || state.status === 'refreshing';
  },

  canRefresh: (state: AuthState): boolean => {
    return state.status === 'authenticated' || state.status === 'refreshing';
  },

  needsLogin: (state: AuthState): boolean => {
    return state.status === 'unauthenticated' || state.status === 'idle';
  }
};

