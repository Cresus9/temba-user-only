import { postEdgeFunctionAnon } from '../lib/payments/edge';
import { supabase } from '../lib/supabase-client';

export interface FXQuote {
  usd_cents: number;
  fx_num: number;
  fx_den: number;
  fx_locked_at: string;
  margin_bps: number;
  base_xof_per_usd: number;
  effective_xof_per_usd: number;
  display_amount: string;
  charge_amount: string;
}

export interface StripePaymentRequest {
  amount: number;
  currency: string;
  event_id: string;
  amount_is_minor?: boolean;
  user_id?: string;
  order_id?: string;
  description?: string;
  idempotencyKey?: string;
}

export interface StripePaymentResponse {
  clientSecret: string;
  paymentId: string;
  status: string;
  display_amount: string;
  charge_amount: string;
  fx_rate: string;
  paymentToken?: string;
  orderId?: string;
  duplicate?: boolean;
}

export interface StripePaymentError {
  error: string;
  type?: string;
}

class StripePaymentService {
  private buildFXQuote(xofAmountMinor: number, marginBps: number, baseXofPerUsd: number): FXQuote {
    const safeMarginBps = Math.min(500, Math.max(0, Math.round(marginBps)));
    const effectiveXofPerUsd = Math.max(1, Math.round(baseXofPerUsd * (1 + safeMarginBps / 10000)));
    const usdCents = Math.max(1, Math.round((xofAmountMinor * 100) / effectiveXofPerUsd));
    return {
      usd_cents: usdCents,
      fx_num: 100,
      fx_den: effectiveXofPerUsd,
      fx_locked_at: new Date().toISOString(),
      margin_bps: safeMarginBps,
      base_xof_per_usd: baseXofPerUsd,
      effective_xof_per_usd: effectiveXofPerUsd,
      display_amount: `${xofAmountMinor.toLocaleString('fr-FR')} FCFA`,
      charge_amount: `$${(usdCents / 100).toFixed(2)} USD`,
    };
  }

  /**
   * Get FX quote for XOF to USD conversion
   */
  async getFXQuote(xofAmountMinor: number, marginBps: number = 150): Promise<FXQuote> {
    try {
      // Fetch directly from DB (same source table used server-side), then compute on client.
      const { data: fxRate, error } = await supabase
        .from('fx_rates')
        .select('rate_decimal, valid_from')
        .eq('from_currency', 'USD')
        .eq('to_currency', 'XOF')
        .eq('is_active', true)
        .lte('valid_from', new Date().toISOString())
        .order('valid_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && fxRate?.rate_decimal) {
        const base = Math.max(1, Math.round(Number(fxRate.rate_decimal)));
        return this.buildFXQuote(xofAmountMinor, marginBps, base);
      }

      // Non-blocking fallback aligned with backend default
      return this.buildFXQuote(xofAmountMinor, marginBps, 566);
    } catch (error: any) {
      console.error('FX Quote error:', error);
      return this.buildFXQuote(xofAmountMinor, marginBps, 566);
    }
  }

  /**
   * Create Stripe payment with advanced mode (pre-calculated FX)
   */
  async createPaymentAdvanced(
    displayAmountMinor: number,
    chargeAmountMinor: number,
    fxNum: number,
    fxDen: number,
    fxLockedAt: string,
    eventId: string,
    options: {
      user_id?: string;
      order_id?: string;
      description?: string;
      idempotencyKey?: string;
      fx_margin_bps?: number;
      create_order?: boolean;
      ticket_quantities?: { [key: string]: number };
      payment_method?: string;
      guest_email?: string;
    } = {}
  ): Promise<StripePaymentResponse> {
    try {
      const data = await postEdgeFunctionAnon<StripePaymentResponse>('create-stripe-payment', {
        display_amount_minor: displayAmountMinor,
        display_currency: 'XOF',
        charge_amount_minor: chargeAmountMinor,
        charge_currency: 'USD',
        fx_num: fxNum,
        fx_den: fxDen,
        fx_locked_at: fxLockedAt,
        fx_margin_bps: options.fx_margin_bps || 150,
        event_id: eventId,
        user_id: options.user_id,
        order_id: options.order_id,
        description: options.description,
        idempotencyKey: options.idempotencyKey,
        create_order: options.create_order,
        ticket_quantities: options.ticket_quantities,
        payment_method: options.payment_method,
        guest_email: options.guest_email,
      });

      if (!data?.clientSecret || !data?.paymentId) {
        throw new Error('Invalid response from Stripe payment function');
      }

      return data;
    } catch (error: any) {
      console.error('Stripe payment creation error:', error);
      throw new Error(error.message || 'Failed to create Stripe payment');
    }
  }

  /**
   * Create Stripe payment with simple mode (auto-conversion)
   */
  async createPaymentSimple(
    amount: number,
    currency: string,
    eventId: string,
    options: {
      user_id?: string;
      order_id?: string;
      description?: string;
      idempotencyKey?: string;
      amount_is_minor?: boolean;
      create_order?: boolean;
      ticket_quantities?: { [key: string]: number };
      payment_method?: string;
      guest_email?: string;
    } = {}
  ): Promise<StripePaymentResponse> {
    try {
      const data = await postEdgeFunctionAnon<StripePaymentResponse>('create-stripe-payment', {
        amount,
        currency,
        event_id: eventId,
        amount_is_minor: options.amount_is_minor || false,
        user_id: options.user_id,
        order_id: options.order_id,
        description: options.description,
        idempotencyKey: options.idempotencyKey,
        create_order: options.create_order,
        ticket_quantities: options.ticket_quantities,
        payment_method: options.payment_method,
        guest_email: options.guest_email,
      });

      if (!data?.clientSecret || !data?.paymentId) {
        throw new Error('Invalid response from Stripe payment function');
      }

      return data;
    } catch (error: any) {
      console.error('Stripe payment creation error:', error);
      throw new Error(error.message || 'Failed to create Stripe payment');
    }
  }

  /**
   * Complete payment flow: Get FX quote + Create payment
   */
  async createPaymentWithFXQuote(
    xofAmountMinor: number,
    eventId: string,
    options: {
      user_id?: string;
      order_id?: string;
      description?: string;
      idempotencyKey?: string;
      margin_bps?: number;
    } = {}
  ): Promise<{ payment: StripePaymentResponse; quote: FXQuote }> {
    try {
      // Step 1: Get FX quote
      const quote = await this.getFXQuote(xofAmountMinor, options.margin_bps);
      
      // Step 2: Create payment with the quoted rates
      const payment = await this.createPaymentAdvanced(
        xofAmountMinor,
        quote.usd_cents,
        quote.fx_num,
        quote.fx_den,
        quote.fx_locked_at,
        eventId,
        {
          user_id: options.user_id,
          order_id: options.order_id,
          description: options.description,
          idempotencyKey: options.idempotencyKey,
          fx_margin_bps: options.margin_bps,
        }
      );

      return { payment, quote };
    } catch (error: any) {
      console.error('Payment with FX quote error:', error);
      throw new Error(error.message || 'Failed to create payment with FX quote');
    }
  }

  /**
   * Generate unique idempotency key
   */
  generateIdempotencyKey(): string {
    return `web-stripe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const stripePaymentService = new StripePaymentService();
