import { supabase } from '../lib/supabase-client';
import { paymentMethodService } from './paymentMethodService';
import { notificationTriggers } from './notificationTriggers';

export interface CreatePaymentRequest {
  idempotency_key: string;
  user_id?: string;  // optional for guest checkout
  buyer_email?: string;  // for guest checkout
  event_id: string;
  ticket_lines: Array<{
    ticket_type_id: string;
    quantity: number;
    price_major: number;  // major units (e.g., 5000 XOF)
    currency: string;
  }>;
  amount_major: number;  // major units for UI
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
  test_mode?: boolean;
  provider?: string;
}

class PaymentService {
  /**
   * @deprecated This method is deprecated. Use pawapayService.createPayment() for mobile money payments.
   * Payment creation is now handled directly by:
   * - pawaPay: pawapayService.createPayment() for mobile money
   * - Stripe: stripePaymentService.createPaymentAdvanced() or createPaymentSimple() for cards
   */
  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    throw new Error(
      'PaymentService.createPayment() is deprecated. ' +
      'For mobile money, use pawapayService.createPayment(). ' +
      'For card payments, use stripePaymentService.createPaymentAdvanced() or createPaymentSimple().'
    );
  }

  async verifyPayment(paymentToken: string, orderId?: string, saveMethod?: boolean, paymentDetails?: any): Promise<PaymentVerification> {
    try {
      const normalizedToken = paymentToken || '';
      const isStripeToken = normalizedToken.startsWith('stripe-');
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalizedToken);

      console.log('Token analysis:', {
        token: normalizedToken,
        isStripeToken,
        isUUID,
        length: normalizedToken.length
      });

      let result: PaymentVerification;

      // For Stripe tokens, call the new verify-payment endpoint with payment_token
      if (isStripeToken) {
        const payload: any = {
          payment_token: normalizedToken,
          order_id: orderId || ''
        };

        console.log('Calling verify-payment with Stripe token:', payload);

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Payment verification timeout')), 4000);
        });

        const verificationPromise = supabase.functions.invoke('verify-payment', {
          body: payload
        });

        const { data, error } = await Promise.race([verificationPromise, timeoutPromise]) as any;

        if (error) {
          console.error('Payment verification error:', error);

          if (error.message && error.message.includes('timeout')) {
            throw new Error('Payment verification is taking longer than expected. Please check your tickets page directly.');
          }

          throw new Error(`Verification Error: ${error.message}`);
        }

        if (!data) {
          throw new Error('No response data from verification service');
        }

        // New response format uses 'state' instead of 'status'
        const responseState = data.state || data.status || 'unknown';
        const responseSuccess = data.success || false;

        console.log('Verification response from deployed function:', {
          success: responseSuccess,
          state: responseState,
          provider: data.provider,
          payment_id: data.payment_id,
          order_id: data.order_id,
          message: data.message
        });

        // Map 'state' to 'status' for backward compatibility
        const mappedStatus = responseState === 'succeeded' ? 'completed' : responseState;

        result = {
          success: responseSuccess,
          status: mappedStatus,
          payment_id: data.payment_id,
          order_id: data.order_id || orderId,
          message: data.message || (responseState === 'succeeded' ? 'Payment verified successfully' : `Payment status: ${responseState}`)
        };
      } else {
        // For non-Stripe payments (pawaPay, etc.), try pawaPay-specific function first
        const payload: any = {
          order_id: orderId || ''
        };

        if (isUUID) {
          payload.internal_token = normalizedToken;
          payload.payment_id = normalizedToken; // Also try as payment_id
          console.log('Sending as internal_token (UUID)');
        } else {
          payload.payment_token = normalizedToken;
          console.log('Sending as payment_token (pawaPay)');
        }

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Payment verification timeout')), 4000);
        });

        // Try verify-pawapay-payment first (no Stripe dependencies, faster boot)
        let verificationPromise = supabase.functions.invoke('verify-pawapay-payment', {
          body: payload
        });

        let { data, error } = await Promise.race([verificationPromise, timeoutPromise]) as any;
        
        // If pawaPay function returns error (wrong provider or not found), try unified verify-payment
        if (error && (error.message?.includes('404') || error.message?.includes('only handles pawaPay'))) {
          console.log('Falling back to unified verify-payment function');
          verificationPromise = supabase.functions.invoke('verify-payment', {
            body: payload
          });
          const fallbackResult = await Promise.race([verificationPromise, timeoutPromise]) as any;
          if (!fallbackResult.error && fallbackResult.data) {
            data = fallbackResult.data;
            error = null;
          } else {
            error = fallbackResult.error || error;
          }
        }

        if (error) {
          console.error('Payment verification error:', error);

          if (error.message && error.message.includes('timeout')) {
            throw new Error('Payment verification is taking longer than expected. Please check your tickets page directly.');
          }

          throw new Error(`Verification Error: ${error.message}`);
        }

        if (!data) {
          throw new Error('No response data from verification service');
        }

        // New response format uses 'state' instead of 'status'
        const responseState = data.state || data.status || 'unknown';
        const responseSuccess = data.success || false;

        // Map 'state' to 'status' for backward compatibility
        const mappedStatus = responseState === 'succeeded' ? 'completed' : responseState;

        // For "processing" state, don't throw error - it's a valid state for pawaPay
        const isProcessing = mappedStatus === 'processing';
        const friendlyMessage = responseState === 'succeeded' 
          ? 'Payment verified successfully' 
          : isProcessing 
          ? 'Payment is being processed' 
          : `Payment status: ${responseState}`;
        
        result = {
          success: responseSuccess || isProcessing, // Treat processing as success for UX
          status: mappedStatus,
          payment_id: data.payment_id,
          order_id: data.order_id || orderId,
          test_mode: data.test_mode,
          message: data.message || friendlyMessage
        };

        console.log('Verification response from deployed function:', {
          success: responseSuccess,
          status: mappedStatus,
          test_mode: data.test_mode,
          message: data.message
        });
      }

      if (result.success && result.status === 'completed' && saveMethod && paymentDetails) {
        try {
          await this.saveSuccessfulPaymentMethod(paymentDetails);
        } catch (saveError) {
          console.error('Error saving payment method:', saveError);
        }
      }

      if (result.success && result.status === 'completed' && orderId) {
        try {
          const { data: orderData } = await supabase
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

          if (orderData && orderData.user_id) {
            const ticketCount = orderData.order_items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 1;

            await notificationTriggers.onOrderCreated({
              order_id: orderId,
              user_id: orderData.user_id,
              event_title: (Array.isArray(orderData.events) ? orderData.events[0]?.title : (orderData.events as any)?.title) || 'Événement',
              total_amount: orderData.total,
              currency: orderData.currency,
              ticket_count: ticketCount
            });
          }
        } catch (notificationError) {
          console.error('Error creating order confirmation notification:', notificationError);
        }
      }

      return result;
    } catch (error: any) {
      console.error('Payment verification error:', error);
      throw new Error(error.message || 'Failed to verify payment');
    }
  }


  private async saveSuccessfulPaymentMethod(paymentDetails: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Can't save for guests

      if (paymentDetails.method === 'mobile_money' && paymentDetails.phone && paymentDetails.provider) {
        await paymentMethodService.savePaymentMethod({
          method_type: 'mobile_money',
          provider: paymentDetails.provider,
          account_number: paymentDetails.phone,
          account_name: paymentDetails.accountName || '',
          is_default: false
        });
      } else if (paymentDetails.method === 'credit_card' && paymentDetails.cardNumber) {
        // Determine card provider from card number
        const cardProvider = this.getCardProvider(paymentDetails.cardNumber);
        
        await paymentMethodService.savePaymentMethod({
          method_type: 'credit_card',
          provider: cardProvider,
          account_number: paymentDetails.cardNumber,
          account_name: paymentDetails.cardholderName || '',
          is_default: false
        });
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      throw error;
    }
  }

  private getCardProvider(cardNumber: string): string {
    const cleanNumber = cardNumber.replace(/\D/g, '');
    
    // Visa
    if (cleanNumber.startsWith('4')) return 'Visa';
    
    // Mastercard (5xxx or 2xxx series)
    if (cleanNumber.startsWith('5') || (cleanNumber.startsWith('2') && cleanNumber.length >= 2)) {
      const firstTwo = cleanNumber.substring(0, 2);
      if (cleanNumber.startsWith('5') || (parseInt(firstTwo) >= 22 && parseInt(firstTwo) <= 27)) {
        return 'Mastercard';
      }
    }
    
    // American Express
    if (cleanNumber.startsWith('34') || cleanNumber.startsWith('37')) return 'American Express';
    
    // Discover
    if (cleanNumber.startsWith('6011') || cleanNumber.startsWith('65') || cleanNumber.startsWith('644') || cleanNumber.startsWith('645')) return 'Discover';
    
    // Diners Club
    if (cleanNumber.startsWith('30') || cleanNumber.startsWith('36') || cleanNumber.startsWith('38')) return 'Diners Club';
    
    // JCB
    if (cleanNumber.startsWith('35')) return 'JCB';
    
    // Union Pay
    if (cleanNumber.startsWith('62')) return 'Union Pay';
    
    // Default to "Carte" (Card) instead of "Unknown"
    return 'Carte';
  }

  async getPaymentStatus(paymentId: string) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error fetching payment status:', error);
      throw new Error(error.message || 'Failed to get payment status');
    }
  }

  async getUserPayments(userId: string) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          event:events(title, date, location)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching user payments:', error);
      throw new Error(error.message || 'Failed to get payment history');
    }
  }
}

export const paymentService = new PaymentService();
