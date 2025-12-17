/**
 * HOOK: useAnuncioDraft
 * 
 * Hook customizado para gerenciar rascunhos de anúncios com persistência garantida.
 * 
 * Características:
 * - Optimistic UI (atualiza interface antes de salvar)
 * - Retry automático em caso de falha
 * - Persistência em localStorage
 * - Sincronização em background
 * - Indicadores de estado (loading, saving, syncing)
 * 
 * @version 2.0.0
 * @date 2025-12-13
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getGlobalQueue } from '../lib/PersistenceQueue';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface AnuncioData {
  [key: string]: any;
}

interface UseAnuncioDraftReturn {
  anuncioId: string | null;
  data: AnuncioData;
  loading: boolean;
  syncing: boolean;
  completionPercentage: number;
  status: string;
  pendingChanges: number;
  
  updateField: (field: string, value: any, priority?: number) => void;
  reload: () => Promise<void>;
  getField: (field: string, fallback?: any) => any;
}

export function useAnuncioDraft(initialId?: string): UseAnuncioDraftReturn {
  const [anuncioId, setAnuncioId] = useState<string | null>(initialId || null);
  const [data, setData] = useState<AnuncioData>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [status, setStatus] = useState('draft');
  const [pendingChanges, setPendingChanges] = useState(0);

  const queueRef = useRef(getGlobalQueue());
  const loadedRef = useRef(false);

  // Configurar callbacks da fila
  useEffect(() => {
    const queue = queueRef.current;

    queue.onSync((syncing) => {
      setSyncing(syncing);
    });

    queue.onError((error) => {
      toast.error('Erro ao salvar: ' + error);
    });

    queue.onSuccess((result) => {
      // Atualizar dados após salvamento bem-sucedido
      if (result.id && !anuncioId) {
        setAnuncioId(result.id);
        queue.setAnuncioId(result.id);
      }
      
      if (result.data) {
        setData(result.data);
      }
      
      if (result.completion_percentage !== undefined) {
        setCompletionPercentage(result.completion_percentage);
      }
      
      if (result.status) {
        setStatus(result.status);
      }
    });

    // Atualizar contador de pendentes a cada segundo
    const interval = setInterval(() => {
      setPendingChanges(queue.getPendingCount());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [anuncioId]);

  // Carregar dados iniciais
  useEffect(() => {
    if (anuncioId && !loadedRef.current) {
      loadedRef.current = true;
      loadAnuncio(anuncioId);
    } else if (!anuncioId) {
      setLoading(false);
    }
  }, [anuncioId]);

  /**
   * Carrega anúncio do backend
   */
  const loadAnuncio = async (id: string) => {
    try {
      setLoading(true);
      
      const res = await fetch(`${SUPABASE_URL}/functions/v1/anuncio-ultimate/${id}`, {
        headers: { 
          'Authorization': `Bearer ${ANON_KEY}` 
        }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const result = await res.json();
      const anuncio = result.anuncio;

      if (anuncio) {
        setData(anuncio.data || {});
        setCompletionPercentage(anuncio.completion_percentage || 0);
        setStatus(anuncio.status || 'draft');
        
        // Configurar ID na fila
        queueRef.current.setAnuncioId(id);
      }

      console.log('✅ Anúncio carregado:', anuncio);
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar anúncio:', error);
      toast.error('Erro ao carregar anúncio: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Atualiza um campo (optimistic + queue)
   */
  const updateField = useCallback((field: string, value: any, priority: number = 50) => {
    // 1. Atualizar UI imediatamente (optimistic)
    setData(prev => {
      const newData = { ...prev, [field]: value };
      return newData;
    });

    // 2. Adicionar à fila de persistência
    queueRef.current.enqueue(field, value, priority);

    console.log(`[useAnuncioDraft] Campo "${field}" atualizado (optimistic)`);
  }, []);

  /**
   * Recarrega dados do backend
   */
  const reload = useCallback(async () => {
    if (anuncioId) {
      await loadAnuncio(anuncioId);
    }
  }, [anuncioId]);

  /**
   * Recupera valor de um campo com fallback
   */
  const getField = useCallback((field: string, fallback: any = '') => {
    return data[field] !== undefined ? data[field] : fallback;
  }, [data]);

  return {
    anuncioId,
    data,
    loading,
    syncing,
    completionPercentage,
    status,
    pendingChanges,
    updateField,
    reload,
    getField
  };
}

/**
 * Hook para validação de campos
 */
export function useFieldValidation() {
  const validate = useCallback((field: string, value: any): string | null => {
    const rules: Record<string, any> = {
      title: {
        required: true,
        minLength: 3,
        maxLength: 200,
        message: 'Título deve ter entre 3 e 200 caracteres'
      },
      
      tipoLocal: {
        required: true,
        enum: [
          'acomodacao_movel', 'albergue', 'apartamento', 'apartamento_residencial',
          'bangalo', 'barco', 'barco_beira', 'boutique', 'cabana', 'cama_cafe',
          'camping', 'casa', 'casa_movel', 'castelo', 'chale', 'chale_camping',
          'condominio', 'estalagem', 'fazenda', 'hotel', 'hotel_boutique',
          'hostel', 'iate', 'industrial', 'motel', 'pousada', 'residencia',
          'resort', 'treehouse', 'villa'
        ],
        message: 'Selecione um tipo de local válido'
      },
      
      tipoAcomodacao: {
        required: true,
        enum: [
          'apartamento', 'bangalo', 'cabana', 'camping', 'capsula', 'casa',
          'casa_dormitorios', 'chale', 'condominio', 'dormitorio', 'estudio',
          'holiday_home', 'hostel', 'hotel', 'iate', 'industrial', 'loft',
          'quarto_compartilhado', 'quarto_inteiro', 'quarto_privado', 'suite',
          'treehouse', 'villa'
        ],
        message: 'Selecione um tipo de acomodação válido'
      },
      
      subtype: {
        enum: ['entire_place', 'private_room', 'shared_room'],
        message: 'Subtipo inválido'
      },
      
      modalidades: {
        required: true,
        minItems: 1,
        message: 'Selecione ao menos uma modalidade'
      }
    };

    const rule = rules[field];
    if (!rule) return null;

    // Validar obrigatório
    if (rule.required) {
      if (value === null || value === undefined || value === '') {
        return rule.message || `${field} é obrigatório`;
      }
      
      if (Array.isArray(value) && value.length === 0) {
        return rule.message || `${field} é obrigatório`;
      }
    }

    // Validar comprimento mínimo
    if (rule.minLength && typeof value === 'string') {
      if (value.length < rule.minLength) {
        return `Mínimo ${rule.minLength} caracteres`;
      }
    }

    // Validar comprimento máximo
    if (rule.maxLength && typeof value === 'string') {
      if (value.length > rule.maxLength) {
        return `Máximo ${rule.maxLength} caracteres`;
      }
    }

    // Validar enum
    if (rule.enum && value !== '' && value !== null && value !== undefined) {
      if (!rule.enum.includes(value)) {
        return rule.message || 'Valor inválido';
      }
    }

    // Validar minItems (arrays)
    if (rule.minItems && Array.isArray(value)) {
      if (value.length < rule.minItems) {
        return rule.message || `Mínimo ${rule.minItems} item(ns)`;
      }
    }

    return null; // válido
  }, []);

  return { validate };
}
