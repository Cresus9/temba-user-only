import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase-client';
import { paymentMethodService } from './paymentMethodService';
import { notificationTriggers } from './notificationTriggers';

export interface CreatePaymentRequest {
  idempotency_key: string;
  user_id?: string;
  buyer_email?: string;
  event_id: string;
  ticket_lines: Array<{
    ticket_type_id: string;
    quantity: number;
    price_major: number;
    currency: string;
  }>;
  amount_major: number;
  currency: string;
  method: 'mobile_money' | 'credit_card';
  phone?: string;
  provider?: string;
  save_method?: boolean;
  return_url?: string;
  cancel_url?: string;
  description: string;
}

export interface PaymentResponse {
  success: boolean;
  payment_url?: string;
  payment_token?: string;
  payment_id?: string;
  error?: string;
}

export interface PaymentVerification {
  success: boolean;
  status: string;
  payment_id?: string;
  order_id?: string;
  message: string;
}

interface PaymentServiceOptions {
  supabaseClient?: SupabaseClient;
  fetch?: typeof fetch;
  logger?: Pick<Console, 'error' | 'warn'>;
}

const PAYMENT_ERROR_MESSAGE = 'Échec de la création du paiement';
const VERIFICATION_ERROR_MESSAGE = 'Échec de la vérification du paiement';

export class PaymentService {
  private readonly client: SupabaseClient;
  private readonly fetchImpl: typeof fetch;
  private readonly logger: Pick<Console, 'error' | 'warn'>;

  constructor(options: PaymentServiceOptions = {}) {
    this.client = options.supabaseClient ?? supabase;

    if (options.fetch) {
      this.fetchImpl = options.fetch;
    } else if (typeof fetch === 'function') {
      this.fetchImpl = fetch.bind(globalThis);
    } else {
      throw new Error('Fetch API non disponible dans cet environnement');
    }

    this.logger = options.logger ?? console;
  }

  private getEnvValue(...keys: string[]): string | undefined {
    for (const key of keys) {
      try {
        const value = (import.meta as ImportMeta)?.env?.[key as keyof ImportMetaEnv];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      } catch {
        // ignore - import.meta may not exist
      }

      if (typeof process !== 'undefined' && process.env) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }

    return undefined;
  }

  private resolveFunctionConfig(): { url: string; anonKey: string } {
    const url = this.getEnvValue('VITE_SUPABASE_URL', 'SUPABASE_URL');
    const anonKey = this.getEnvValue('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

    if (!url) {
      throw new Error('Configuration Supabase manquante (URL)');
    }

    if (!anonKey) {
      throw new Error('Configuration Supabase manquante (clé Anon)');
    }

    return {
      url: url.replace(/\/$/, ''),
      anonKey,
    };
  }

  private async readResponsePayload(response: Response): Promise<{ data: any; text: string | null }> {
    let text: string | null = null;
    let data: any = null;

    try {
      const clone = response.clone();
      const contentType = clone.headers.get('content-type');

      if (contentType && contentType.toLowerCase().includes('application/json')) {
        data = await clone.json();
      } else {
        text = await clone.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            // ignore parsing error, fall back to raw text
          }
        }
      }
    } catch (error) {
      this.logger.warn?.('Impossible d\'analyser la réponse du service de paiement', error as Error);
    }

    if (data === null && text === null) {
      try {
        text = await response.clone().text();
      } catch {
        text = null;
      }
    }

    return { data, text };
  }

  private extractErrorMessage(payload: unknown, text?: string | null): string | undefined {
    if (payload && typeof payload === 'object') {
      const candidate = (payload as { error?: string; message?: string }).error
        ?? (payload as { message?: string }).message;
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    if (text && text.trim()) {
      return text.trim();
    }

    return undefined;
  }

  private sanitizePhone(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const cleaned = value.replace(/[^+\d]/g, '').replace(/(?!^)\+/g, '');
    return cleaned.trim() || undefined;
  }

  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    if (!Array.isArray(request.ticket_lines) || request.ticket_lines.length === 0) {
      throw new Error('Au moins un billet est requis pour créer un paiement');
    }

    if (!Number.isFinite(request.amount_major) || request.amount_major <= 0) {
      throw new Error('Montant de paiement invalide');
    }

    const { url, anonKey } = this.resolveFunctionConfig();

    let response: Response;
    try {
      response = await this.fetchImpl(`${url}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
          apikey: anonKey,
        },
        body: JSON.stringify(request),
      });
    } catch (error) {
      this.logger.error('Erreur réseau lors de la création du paiement:', error as Error);
      throw new Error('Impossible de contacter le service de paiement');
    }

    const { data, text } = await this.readResponsePayload(response);

    if (!response.ok) {
      const message = this.extractErrorMessage(data, text);
      throw new Error(message ? `${PAYMENT_ERROR_MESSAGE}: ${message}` : PAYMENT_ERROR_MESSAGE);
    }

    if (!data || data.success !== true) {
      const message = this.extractErrorMessage(data, text);
      throw new Error(message ?? PAYMENT_ERROR_MESSAGE);
    }

    if (typeof data.payment_token !== 'string' || !data.payment_token) {
      throw new Error('Réponse de paiement invalide');
    }

    return {
      success: true,
      payment_url: typeof data.payment_url === 'string' ? data.payment_url : undefined,
      payment_token: data.payment_token,
      payment_id: typeof data.payment_id === 'string' ? data.payment_id : undefined,
    };
  }

  async verifyPayment(paymentToken: string, orderId?: string, saveMethod?: boolean, paymentDetails?: any): Promise<PaymentVerification> {
    const trimmedToken = paymentToken?.trim();
    if (!trimmedToken) {
      throw new Error('Jeton de paiement requis');
    }

    const payload: Record<string, unknown> = {
      order_id: orderId ?? '',
    };

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedToken)) {
      payload.internal_token = trimmedToken;
    } else {
      payload.payment_token = trimmedToken;
    }

    const { data, error } = await this.client.functions.invoke('verify-payment', {
      body: payload,
    });

    if (error) {
      this.logger.error('Erreur lors de la vérification du paiement:', error);
      throw new Error(`${VERIFICATION_ERROR_MESSAGE}: ${error.message}`);
    }

    if (!data) {
      throw new Error('Réponse inattendue du service de vérification');
    }

    const result: PaymentVerification = {
      success: Boolean(data.success),
      status: typeof data.status === 'string' ? data.status : 'unknown',
      payment_id: data.payment_id,
      order_id: data.order_id ?? orderId,
      message: data.message
        ?? (data.status === 'completed'
          ? 'Paiement vérifié avec succès'
          : `Statut du paiement: ${data.status}`),
    };

    if (result.success && result.status === 'completed' && saveMethod && paymentDetails) {
      await this.saveSuccessfulPaymentMethod(paymentDetails).catch((saveError) => {
        this.logger.error('Erreur lors de l\'enregistrement du moyen de paiement:', saveError as Error);
      });
    }

    if (result.success && result.status === 'completed' && orderId) {
      await this.triggerOrderNotification(orderId).catch((notifyError) => {
        this.logger.warn('Erreur lors de l\'envoi de la notification de commande', notifyError as Error);
      });
    }

    return result;
  }

  private async triggerOrderNotification(orderId: string): Promise<void> {
    const { data, error } = await this.client
      .from('orders')
      .select(`
        id,
        user_id,
        total,
        currency,
        events (title),
        order_items (quantity)
      `)
      .eq('id', orderId)
      .single();

    if (error || !data) {
      throw error ?? new Error('Commande introuvable');
    }

    if (!data.user_id) {
      return;
    }

    const ticketCount = Array.isArray(data.order_items)
      ? data.order_items.reduce((sum: number, item: { quantity?: number }) => sum + (Number(item.quantity) || 0), 0)
      : 0;

    await notificationTriggers.onOrderCreated({
      order_id: orderId,
      user_id: data.user_id,
      event_title: data.events?.title ?? 'Événement',
      total_amount: data.total,
      currency: data.currency,
      ticket_count: ticketCount > 0 ? ticketCount : 1,
    });
  }

  private async saveSuccessfulPaymentMethod(paymentDetails: any): Promise<void> {
    const { data, error } = await this.client.auth.getUser();
    if (error || !data?.user) {
      return;
    }

    if (paymentDetails?.method === 'mobile_money') {
      const phone = this.sanitizePhone(paymentDetails.phone);
      const provider = typeof paymentDetails.provider === 'string' ? paymentDetails.provider.trim().toLowerCase() : undefined;

      if (!phone || !provider) {
        return;
      }

      try {
        await paymentMethodService.savePaymentMethod({
          method_type: 'mobile_money',
          provider,
          account_number: phone,
          account_name: typeof paymentDetails.accountName === 'string' ? paymentDetails.accountName : '',
          is_default: false,
        });
      } catch (error) {
        this.logger.error('Erreur lors de l\'enregistrement du moyen de paiement mobile:', error as Error);
      }
      return;
    }

    if (paymentDetails?.method === 'credit_card' && typeof paymentDetails.cardNumber === 'string') {
      const digits = paymentDetails.cardNumber.replace(/\D/g, '');
      if (!digits) {
        return;
      }

      const lastFour = digits.slice(-4);
      const masked = lastFour ? `****${lastFour}` : digits;
      const provider = this.getCardProvider(digits);

      try {
        await paymentMethodService.savePaymentMethod({
          method_type: 'credit_card',
          provider,
          account_number: masked,
          account_name: typeof paymentDetails.cardholderName === 'string' ? paymentDetails.cardholderName : '',
          is_default: false,
        });
      } catch (error) {
        this.logger.error('Erreur lors de l\'enregistrement du moyen de paiement carte:', error as Error);
      }
    }
  }

  private getCardProvider(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\D/g, '');

    if (cleanNumber.startsWith('4')) return 'Visa';

    if (cleanNumber.startsWith('5') || cleanNumber.startsWith('2')) {
      const firstTwo = parseInt(cleanNumber.substring(0, 2), 10);
      if (cleanNumber.startsWith('5') || (firstTwo >= 22 && firstTwo <= 27)) {
        return 'Mastercard';
      }
    }

    if (cleanNumber.startsWith('34') || cleanNumber.startsWith('37')) return 'American Express';
    if (cleanNumber.startsWith('6011') || cleanNumber.startsWith('65') || cleanNumber.startsWith('644') || cleanNumber.startsWith('645')) return 'Discover';
    if (cleanNumber.startsWith('30') || cleanNumber.startsWith('36') || cleanNumber.startsWith('38')) return 'Diners Club';
    if (cleanNumber.startsWith('35')) return 'JCB';
    if (cleanNumber.startsWith('62')) return 'Union Pay';

    return 'Carte';
  }

  async getPaymentStatus(paymentId: string) {
    const trimmed = paymentId?.trim();
    if (!trimmed) {
      throw new Error('Identifiant de paiement requis');
    }

    try {
      const { data, error } = await this.client
        .from('payments')
        .select('*')
        .eq('id', trimmed)
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: unknown) {
      this.logger.error('Erreur lors de la récupération du paiement:', error as Error);
      throw new Error('Échec de la récupération du paiement');
    }
  }

  async getUserPayments(userId: string) {
    const trimmed = userId?.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const { data, error } = await this.client
        .from('payments')
        .select(`
          *,
          event:events(title, date, location)
        `)
        .eq('user_id', trimmed)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data ?? [];
    } catch (error: unknown) {
      this.logger.error('Erreur lors de la récupération de l\'historique des paiements:', error as Error);
      throw new Error('Échec de la récupération de l\'historique des paiements');
    }
  }
}

export const paymentService = new PaymentService();
