import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { parseDateLocal } from '../utils/dateLocal';

// ============================================================
// TIPOS
// ============================================================

interface Property {
  id: string;
  name: string;
  description?: string;
  location: string;
  price: number;
  images: string[];
  amenities: string[];
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  mode: ('short_term' | 'long_term' | 'sale')[];
}

interface PriceCalculation {
  nights: number;
  pricePerNight: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  totalPrice: number;
}

interface Reservation {
  propertyId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  notes?: string;
}

interface RendizyContextData {
  organizationId: string;
  siteConfig: any;
  properties: Property[];
  loading: boolean;
  
  // Funções
  searchProperties: (filters: any) => Promise<Property[]>;
  getProperty: (id: string) => Promise<Property | null>;
  checkAvailability: (propertyId: string, checkIn: string, checkOut: string) => Promise<boolean>;
  calculatePrice: (propertyId: string, checkIn: string, checkOut: string) => Promise<PriceCalculation>;
  createReservation: (reservation: Reservation) => Promise<{ success: boolean; reservationId?: string; error?: string }>;
  sendQuotation: (email: string, propertyId: string, dates: any) => Promise<boolean>;
}

// ============================================================
// CONTEXT
// ============================================================

const RendizyContext = createContext<RendizyContextData | null>(null);

// ============================================================
// HOOK PÚBLICO
// ============================================================

/**
 * Hook para usar dados e funções do RENDIZY em sites customizados
 * 
 * @example
 * ```tsx
 * function PropertyGrid() {
 *   const { properties, loading } = useRendizyData();
 *   
 *   if (loading) return <div>Carregando...</div>;
 *   
 *   return (
 *     <div className="grid">
 *       {properties.map(p => (
 *         <PropertyCard key={p.id} {...p} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRendizyData() {
  const context = useContext(RendizyContext);
  
  if (!context) {
    throw new Error('useRendizyData deve ser usado dentro de ClientSiteWrapper');
  }
  
  return context;
}

/**
 * Hook especializado para motor de reservas
 * 
 * @example
 * ```tsx
 * function BookingWidget({ propertyId }: Props) {
 *   const { calculatePrice, createReservation } = useRendizyBooking();
 *   
 *   const handleBook = async () => {
 *     const price = await calculatePrice(propertyId, checkIn, checkOut);
 *     const result = await createReservation({
 *       propertyId,
 *       guestName,
 *       checkIn,
 *       checkOut,
 *       totalPrice: price.totalPrice
 *     });
 *   };
 * }
 * ```
 */
export function useRendizyBooking() {
  const { calculatePrice, createReservation, checkAvailability } = useRendizyData();
  
  return {
    calculatePrice,
    createReservation,
    checkAvailability
  };
}

// ============================================================
// PROVIDER/WRAPPER
// ============================================================

interface ClientSiteWrapperProps {
  organizationId: string;
  children: ReactNode;
}

/**
 * Wrapper que injeta dados e funções do RENDIZY em sites customizados
 * 
 * Este componente:
 * - Carrega configurações do site do cliente
 * - Busca imóveis do organizationId
 * - Provê funções de reserva, cálculo de preço, etc
 * - Permite que qualquer site importado use dados reais do RENDIZY
 * 
 * @example
 * ```tsx
 * // No roteador principal
 * function App() {
 *   const orgId = detectOrganizationId(); // Detecta por domínio
 *   
 *   return (
 *     <ClientSiteWrapper organizationId={orgId}>
 *       <ImportedSite /> // Site criado em v0.dev, Bolt, etc (example)
 *     </ClientSiteWrapper>
 *   );
 * }
 * ```
 */
export function ClientSiteWrapper({ organizationId, children }: ClientSiteWrapperProps) {
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar configurações do site
  useEffect(() => {
    loadSiteConfig();
  }, [organizationId]);

  const loadSiteConfig = async () => {
    try {
      setLoading(true);

      // 1. Buscar config do site
      const configResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites?organizationId=${organizationId}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const configData = await configResponse.json();
      
      if (configData.success) {
        setSiteConfig(configData.data);

        // 2. Buscar imóveis do cliente
        await loadProperties(configData.data);
      }
    } catch (error) {
      console.error('[ClientSiteWrapper] Erro ao carregar config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async (config: any) => {
    try {
      // Determinar quais modalidades buscar
      const modes: string[] = [];
      if (config.features.shortTerm) modes.push('short_term');
      if (config.features.longTerm) modes.push('long_term');
      if (config.features.sale) modes.push('sale');

      const modesQuery = modes.join(',');

      // Buscar imóveis
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/properties?organizationId=${organizationId}&mode=${modesQuery}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setProperties(data.data || []);
      }
    } catch (error) {
      console.error('[ClientSiteWrapper] Erro ao carregar imóveis:', error);
    }
  };

  // ============================================================
  // FUNÇÕES DO CONTEXT
  // ============================================================

  const searchProperties = async (filters: any): Promise<Property[]> => {
    try {
      const queryParams = new URLSearchParams({
        organizationId,
        ...filters
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/properties?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      return data.success ? data.data : [];
    } catch (error) {
      console.error('[ClientSiteWrapper] Erro ao buscar imóveis:', error);
      return [];
    }
  };

  const getProperty = async (id: string): Promise<Property | null> => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/properties/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('[ClientSiteWrapper] Erro ao buscar imóvel:', error);
      return null;
    }
  };

  const checkAvailability = async (
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/calendar/availability?propertyId=${propertyId}&startDate=${checkIn}&endDate=${checkOut}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      return data.available || false;
    } catch (error) {
      console.error('[ClientSiteWrapper] Erro ao verificar disponibilidade:', error);
      return false;
    }
  };

  const calculatePrice = async (
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<PriceCalculation> => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/quotations/calculate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            propertyId,
            checkIn,
            checkOut
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }

      // Fallback
      const nights = calculateNights(checkIn, checkOut);
      return {
        nights,
        pricePerNight: 0,
        subtotal: 0,
        cleaningFee: 0,
        serviceFee: 0,
        totalPrice: 0
      };
    } catch (error) {
      console.error('[ClientSiteWrapper] Erro ao calcular preço:', error);
      const nights = calculateNights(checkIn, checkOut);
      return {
        nights,
        pricePerNight: 0,
        subtotal: 0,
        cleaningFee: 0,
        serviceFee: 0,
        totalPrice: 0
      };
    }
  };

  const createReservation = async (reservation: Reservation) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/reservations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...reservation,
            organizationId,
            source: 'client_website',
            status: 'pending'
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        return {
          success: true,
          reservationId: data.data.id
        };
      }

      return {
        success: false,
        error: data.error || 'Erro ao criar reserva'
      };
    } catch (error) {
      console.error('[ClientSiteWrapper] Erro ao criar reserva:', error);
      return {
        success: false,
        error: 'Erro ao criar reserva'
      };
    }
  };

  const sendQuotation = async (
    email: string,
    propertyId: string,
    dates: any
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/quotations`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            organizationId,
            propertyId,
            email,
            ...dates
          })
        }
      );

      const data = await response.json();
      return data.success || false;
    } catch (error) {
      console.error('[ClientSiteWrapper] Erro ao enviar cotação:', error);
      return false;
    }
  };

  // ============================================================
  // PROVIDER VALUE
  // ============================================================

  const value: RendizyContextData = {
    organizationId,
    siteConfig,
    properties,
    loading,
    searchProperties,
    getProperty,
    checkAvailability,
    calculatePrice,
    createReservation,
    sendQuotation
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <RendizyContext.Provider value={value}>
      {children}
    </RendizyContext.Provider>
  );
}

// ============================================================
// HELPERS
// ============================================================

function calculateNights(checkIn: string, checkOut: string): number {
  const start = parseDateLocal(checkIn) ?? new Date(checkIn);
  const end = parseDateLocal(checkOut) ?? new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ============================================================
// DETECÇÃO DE ORGANIZAÇÃO POR DOMÍNIO
// ============================================================

/**
 * Detecta organizationId baseado no domínio atual
 * 
 * Exemplos:
 * - imobiliaria-sol.rendizy.app → busca site com subdomain="imobiliaria-sol"
 * - www.imobiliariasol.com → busca site com domain="www.imobiliariasol.com"
 * 
 * @returns organizationId ou null
 */
export async function detectOrganizationIdByDomain(): Promise<string | null> {
  try {
    const hostname = window.location.hostname;

    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/by-domain/${hostname}`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    
    if (data.success) {
      return data.data.organizationId;
    }

    return null;
  } catch (error) {
    console.error('[detectOrganizationId] Erro:', error);
    return null;
  }
}
