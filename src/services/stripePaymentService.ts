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
  /**
   * Get FX quote for XOF to USD conversion
   */
  async getFXQuote(xofAmountMinor: number, marginBps: number = 150): Promise<FXQuote> {
    try {
      const { data, error } = await supabase.functions.invoke('fx-quote', {
        body: {
          xof_amount_minor: xofAmountMinor,
          margin_bps: marginBps,
        },
      });

      if (error) {
        throw new Error(`FX quote failed: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error('FX Quote error:', error);
      throw new Error(error.message || 'Failed to get FX quote');
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
    } = {}
  ): Promise<StripePaymentResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-payment', {
        body: {
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
        },
      });

      if (error) {
        throw new Error(`Payment creation failed: ${error.message}`);
      }

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
    } = {}
  ): Promise<StripePaymentResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-payment', {
        body: {
          amount,
          currency,
          event_id: eventId,
          amount_is_minor: options.amount_is_minor || false,
          user_id: options.user_id,
          order_id: options.order_id,
          description: options.description,
          idempotencyKey: options.idempotencyKey,
        },
      });

      if (error) {
        throw new Error(`Payment creation failed: ${error.message}`);
      }

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
    return `stripe-payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const stripePaymentService = new StripePaymentService();
