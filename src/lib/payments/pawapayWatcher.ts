import { supabase } from '../supabase-client';
import { postEdgeFunctionAnon } from './edge';

export interface PawaPayVerificationResponse {
  success: boolean;
  state: 'pending' | 'submitted' | 'completed' | 'failed' | string;
  payment_id: string;
  order_id: string;
  ticket_ids?: string[];
  ticketIds?: string[];
  requires_pre_auth?: boolean;
  message?: string;
  error_code?: string;
}

export interface WaitPawaPayOptions {
  fallbackIntervalMs?: number;
  fallbackMaxAttempts?: number;
}

function isTerminal(r: PawaPayVerificationResponse): boolean {
  if (r.requires_pre_auth) return true;
  if (r.state === 'failed') return true;
  if (['completed', 'succeeded'].includes(String(r.state).toLowerCase())) return true;
  return false;
}

async function verifyPawaPayPayment(
  paymentId: string,
  orderId?: string
): Promise<PawaPayVerificationResponse> {
  return postEdgeFunctionAnon<PawaPayVerificationResponse>('verify-pawapay-payment', {
    payment_id: paymentId,
    order_id: orderId,
  });
}

export async function waitForPawaPayPaymentTerminal(
  paymentId: string,
  orderId?: string,
  options: WaitPawaPayOptions = {}
): Promise<PawaPayVerificationResponse> {
  const fallbackIntervalMs = options.fallbackIntervalMs ?? 12000;
  const fallbackMaxAttempts = options.fallbackMaxAttempts ?? 25;

  return new Promise((resolve, reject) => {
    let done = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`payment-watch-${paymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentId}`,
        },
        (payload: any) => {
          const oldStatus = String(payload?.old?.status ?? '').toLowerCase();
          const newStatus = String(payload?.new?.status ?? '').toLowerCase();
          if (!newStatus || newStatus === oldStatus) return;
          if (!['pending', 'completed', 'failed'].includes(newStatus)) return;
          void (async () => {
            try {
              const hit = await verifyPawaPayPayment(paymentId, orderId);
              if (!done && isTerminal(hit)) {
                done = true;
                cleanup();
                resolve(hit);
              }
            } catch (e) {
              if (!done) {
                done = true;
                cleanup();
                reject(e);
              }
            }
          })();
        }
      )
      .subscribe();

    const runFallback = async () => {
      if (done) return;
      attempts += 1;
      try {
        const hit = await verifyPawaPayPayment(paymentId, orderId);
        if (isTerminal(hit)) {
          done = true;
          cleanup();
          resolve(hit);
          return;
        }
      } catch (e) {
        if (attempts >= fallbackMaxAttempts) {
          done = true;
          cleanup();
          reject(e);
          return;
        }
      }

      if (attempts >= fallbackMaxAttempts) {
        done = true;
        cleanup();
        resolve({
          success: false,
          state: 'pending',
          payment_id: paymentId,
          order_id: orderId || '',
          message:
            'La vérification du paiement prend plus de temps que prévu. Veuillez vérifier vos billets dans quelques minutes.',
        });
        return;
      }
      timer = setTimeout(runFallback, fallbackIntervalMs);
    };

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };

    timer = setTimeout(runFallback, fallbackIntervalMs);
    void runFallback();
  });
}
