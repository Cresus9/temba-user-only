import { supabase } from '../lib/supabase-client';

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

  async verifyPayment(paymentToken: string, orderId?: string): Promise<PaymentVerification> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          payment_token: paymentToken,
          order_id: orderId || ''
        }
      });

      if (error) {
        console.error('Payment verification error:', error);
        throw new Error(`Verification Error: ${error.message}`);
      }

      if (!data) {
        throw new Error('No response data from verification service');
      }

      return {
        success: data.success,
        status: data.status,
        payment_id: data.payment_id,
        order_id: orderId,
        message: data.status === 'completed' ? 'Payment verified successfully' : `Payment status: ${data.status}`
      };
    } catch (error: any) {
      console.error('Payment verification error:', error);
      throw new Error(error.message || 'Failed to verify payment');
    }
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
