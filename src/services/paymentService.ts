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
}

class PaymentService {
  async createPayment(request: CreatePaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('Creating payment with request:', request);
      
      // Ensure the request is properly serialized
      const requestBody = JSON.stringify(request);
      console.log('Serialized request body:', requestBody);
      
      // Try direct fetch instead of supabase.functions.invoke
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey
        },
        body: requestBody
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error(`Invalid response format: ${responseText}`);
      }
      
      console.log('Payment service response:', data);
      
      if (!data) {
        throw new Error('No response data from payment service');
      }

      if (!data.success) {
        const errorMsg = data.error || 'Unknown payment error';
        console.error('Payment creation failed:', errorMsg);
        throw new Error(`Payment Error: ${errorMsg}`);
      }
      
      return {
        success: data.success,
        payment_url: data.payment_url,
        payment_token: data.payment_token,
        payment_id: data.payment_id
      };
    } catch (error: any) {
      console.error('Payment creation error:', error);
      throw error;
    }
  }

  async verifyPayment(paymentToken: string, orderId?: string, saveMethod?: boolean, paymentDetails?: any): Promise<PaymentVerification> {
    try {
      // Determine if token looks like UUID (internal_token) or Paydunya token (payment_token)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentToken);
      const isPaydunyaTestToken = paymentToken.startsWith('test_');
      
      console.log('Token analysis:', {
        token: paymentToken,
        isUUID,
        isPaydunyaTestToken,
        length: paymentToken.length
      });

      // Prepare payload for the deployed function
      const payload: any = {
        order_id: orderId || ''
      };

      // Send token in the appropriate field based on format
      if (isUUID) {
        payload.internal_token = paymentToken;
        console.log('Sending as internal_token (UUID)');
      } else {
        payload.payment_token = paymentToken;
        console.log('Sending as payment_token (Paydunya)');
      }

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: payload
      });

      if (error) {
        console.error('Payment verification error:', error);
        throw new Error(`Verification Error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response data from verification service');
      }

      const result = {
        success: data.success,
        status: data.status,
        payment_id: data.payment_id,
        order_id: data.order_id || orderId,
        test_mode: data.test_mode,
        message: data.message || (data.status === 'completed' ? 'Payment verified successfully' : `Payment status: ${data.status}`)
      };

      console.log('Verification response from deployed function:', {
        success: data.success,
        status: data.status,
        test_mode: data.test_mode,
        message: data.message
      });

      // If payment was successful and user wants to save the method
      if (result.success && result.status === 'completed' && saveMethod && paymentDetails) {
        try {
          await this.saveSuccessfulPaymentMethod(paymentDetails);
        } catch (saveError) {
          console.error('Error saving payment method:', saveError);
          // Don't fail the verification if saving fails
        }
      }

      // Trigger notification for successful payment
      if (result.success && result.status === 'completed' && orderId) {
        try {
          // Get order details for notification
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
              event_title: orderData.events?.title || 'Événement',
              total_amount: orderData.total,
              currency: orderData.currency,
              ticket_count: ticketCount
            });
          }
        } catch (notificationError) {
          console.error('Error creating order confirmation notification:', notificationError);
          // Don't fail the verification if notification fails
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
