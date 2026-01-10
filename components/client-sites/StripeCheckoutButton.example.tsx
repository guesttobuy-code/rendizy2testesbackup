/**
 * StripeCheckoutButton — Componente de exemplo para sites Bolt
 * 
 * Este arquivo serve como REFERÊNCIA para o Prompt de criação de sites com I.A.
 * Sites externos devem copiar e adaptar este código.
 * 
 * @example
 * // Uso básico:
 * <StripeCheckoutButton
 *   reservationId="uuid-da-reserva"
 *   projectRef="seu-project-ref"
 *   subdomain="nome-do-site"
 * />
 */

import { useState } from 'react';

interface StripeCheckoutButtonProps {
  /** UUID da reserva criada via POST /client-sites/api/:subdomain/reservations */
  reservationId: string;
  /** Project ref do Supabase (ex: odcgnzfremrqnvtitpcc) */
  projectRef: string;
  /** Subdomain do site (ex: medhome) */
  subdomain: string;
  /** URL de sucesso após pagamento (default: window.location.origin + /sucesso) */
  successUrl?: string;
  /** URL de cancelamento (default: window.location.origin + /cancelado) */
  cancelUrl?: string;
  /** Texto do botão (default: "Pagar com Stripe") */
  buttonText?: string;
  /** Classes CSS adicionais */
  className?: string;
}

interface CheckoutResponse {
  success: boolean;
  data?: {
    sessionId: string;
    checkoutUrl: string;
    amount: number;
    currency: string;
    reservationId: string;
  };
  error?: string;
  details?: string;
}

/**
 * Botão que cria uma sessão de checkout no Stripe e redireciona o usuário.
 * 
 * Fluxo:
 * 1. Usuário clica no botão
 * 2. Componente chama POST /client-sites/api/:subdomain/checkout/session
 * 3. Recebe checkoutUrl do Stripe
 * 4. Redireciona usuário para o Stripe Checkout
 * 5. Após pagamento, Stripe redireciona para successUrl ou cancelUrl
 */
export function StripeCheckoutButton({
  reservationId,
  projectRef,
  subdomain,
  successUrl,
  cancelUrl,
  buttonText = 'Pagar com Stripe',
  className = '',
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const baseUrl = `https://${projectRef}.supabase.co/functions/v1/rendizy-public`;
      const endpoint = `${baseUrl}/client-sites/api/${encodeURIComponent(subdomain)}/checkout/session`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reservationId,
          successUrl: successUrl || `${window.location.origin}/sucesso`,
          cancelUrl: cancelUrl || `${window.location.origin}/cancelado`,
        }),
      });

      const json: CheckoutResponse = await response.json();

      if (!json.success || !json.data?.checkoutUrl) {
        throw new Error(json.error || 'Falha ao criar sessão de checkout');
      }

      // Redireciona para o Stripe Checkout
      window.location.href = json.data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{
          backgroundColor: loading ? '#9ca3af' : '#6366f1',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          minWidth: '200px',
        }}
      >
        {loading ? (
          <>
            <LoadingSpinner />
            Processando...
          </>
        ) : (
          <>
            <StripeIcon />
            {buttonText}
          </>
        )}
      </button>
      {error && (
        <p style={{ color: '#ef4444', marginTop: '8px', fontSize: '14px' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      style={{ animation: 'spin 1s linear infinite', width: 20, height: 20 }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        style={{ opacity: 0.25 }}
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        style={{ opacity: 0.75 }}
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function StripeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
    </svg>
  );
}

export default StripeCheckoutButton;

/**
 * EXEMPLO DE USO COMPLETO (fluxo de reserva + pagamento):
 * 
 * ```tsx
 * import { useState } from 'react';
 * import { StripeCheckoutButton } from './StripeCheckoutButton.example';
 * 
 * function ReservationFlow() {
 *   const [reservationId, setReservationId] = useState<string | null>(null);
 *   
 *   const projectRef = 'odcgnzfremrqnvtitpcc';
 *   const subdomain = 'medhome';
 *   
 *   // Passo 1: Criar reserva
 *   const handleCreateReservation = async () => {
 *     const response = await fetch(
 *       `https://${projectRef}.supabase.co/functions/v1/rendizy-public/client-sites/api/${subdomain}/reservations`,
 *       {
 *         method: 'POST',
 *         headers: { 'Content-Type': 'application/json' },
 *         body: JSON.stringify({
 *           propertyId: 'uuid-do-imovel',
 *           checkIn: '2025-02-01',
 *           checkOut: '2025-02-05',
 *           guestName: 'João Silva',
 *           guestEmail: 'joao@email.com',
 *         }),
 *       }
 *     );
 *     
 *     const json = await response.json();
 *     if (json.success) {
 *       setReservationId(json.data.id);
 *     }
 *   };
 *   
 *   // Passo 2: Mostrar botão de pagamento
 *   if (reservationId) {
 *     return (
 *       <StripeCheckoutButton
 *         reservationId={reservationId}
 *         projectRef={projectRef}
 *         subdomain={subdomain}
 *       />
 *     );
 *   }
 *   
 *   return <button onClick={handleCreateReservation}>Reservar</button>;
 * }
 * ```
 */
