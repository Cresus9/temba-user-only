import { supabase } from '../lib/supabase-client';

export interface CreatePawaPayPaymentRequest {
  idempotency_key: string;
  user_id?: string;  // optional for guest checkout
  buyer_email?: string;  // for guest checkout
  event_id: string;
  order_id?: string;  // order ID if already created
  event_date_id?: string | null;  // NEW: For multi-date events
  ticket_lines: Array<{
    ticket_type_id: string;
    quantity: number;
    price_major: number;  // major units (e.g., 5000 XOF)
    currency: string;
  }>;
  amount_major: number;  // major units for UI
  currency: string;
  method: 'mobile_money';
  phone: string;  // required for mobile money
  provider: string;  // orange_money, mtn_mobile_money, moov_money, etc.
  preAuthorisationCode?: string;  // OTP code required for ORANGE_BFA (dial *144*4*6#)
  return_url?: string;
  cancel_url?: string;
  description: string;
}

// New structured response types from backend
type PawaPaySuccessResponse = {
  deposit_id: string;
  transaction_id?: string;
  payment_id: string;
  status?: string;
  payment_url: string;
  has_payment_redirect: boolean;
};

type PawaPayPreAuthResponse = {
  status: "PRE_AUTH_REQUIRED";
  requires_otp: true;
  message: string;
  provider?: string;
  instructions?: {
    ussd_code?: string;
    amount?: string;
    currency?: string;
    hint?: string;
  };
};

type PawaPayErrorResponse = {
  status: "ERROR";
  message: string;
};

type PawaPayApiResponse = PawaPaySuccessResponse | PawaPayPreAuthResponse | PawaPayErrorResponse;

// Frontend-friendly interface (for backward compatibility)
export interface PawaPayPaymentResponse {
  success: boolean;
  payment_url?: string;
  payment_token?: string;
  payment_id?: string;
  transaction_id?: string;
  status?: string;
  error?: string;
  requires_pre_auth?: boolean;  // True if pre-authorization code is needed
  error_message?: string;  // User-friendly error message
  provider?: string;  // Provider that requires pre-auth
  instructions?: {  // Instructions for getting OTP
    ussd_code?: string;
    amount?: string;
    currency?: string;
    hint?: string;
  };
  // New fields
  has_payment_redirect?: boolean;
}

class PawaPayService {
  async createPayment(request: CreatePawaPayPaymentRequest): Promise<PawaPayPaymentResponse> {
    try {
      console.log('Creating pawaPay payment with request:', request);
      
      // Ensure the request is properly serialized
      const requestBody = JSON.stringify(request);
      console.log('Serialized request body:', requestBody);
      
      // Use Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-pawapay-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
          'x-application-name': 'Temba'
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

      let data: PawaPayApiResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error(`Invalid response format: ${responseText}`);
      }
      
      console.log('pawaPay payment service response:', data);
      
      if (!data) {
        throw new Error('No response data from payment service');
      }

      // Handle structured responses from improved backend
      if ('status' in data) {
        // PRE_AUTH_REQUIRED response
        if (data.status === 'PRE_AUTH_REQUIRED') {
          return {
            success: false,
            error: 'PRE_AUTH_REQUIRED',
            error_message: data.message,
            requires_pre_auth: true,
            provider: data.provider,
            instructions: data.instructions
          };
        }
        
        // ERROR response
        if (data.status === 'ERROR') {
          throw new Error(data.message || 'Payment creation failed');
        }
      }

      // SUCCESS response (has deposit_id and payment_id)
      if ('deposit_id' in data && 'payment_id' in data) {
        return {
          success: true,
          payment_url: data.payment_url,
          payment_token: data.transaction_id || data.deposit_id,
          payment_id: data.payment_id,
          transaction_id: data.transaction_id || data.deposit_id,
          status: data.status || 'pending',
          requires_pre_auth: false,
          has_payment_redirect: data.has_payment_redirect
        };
      }
      
      // Fallback: unknown response format
      throw new Error('Unexpected response format from payment service');
    } catch (error: any) {
      console.error('pawaPay payment creation error:', error);
      throw error;
    }
  }

  async verifyPayment(paymentToken: string, paymentId?: string): Promise<{
    success: boolean;
    status: string;
    payment_id?: string;
    message: string;
  }> {
    try {
      console.log('Verifying pawaPay payment:', { paymentToken, paymentId });

      // Query payment status from database
      const { data: payment, error } = await supabase
        .from('payments')
        .select('*')
        .or(`transaction_id.eq.${paymentToken},id.eq.${paymentId || paymentToken}`)
        .single();

      if (error || !payment) {
        throw new Error(`Payment not found: ${error?.message || 'Unknown error'}`);
      }

      // Map payment status
      const statusMap: Record<string, string> = {
        'completed': 'completed',
        'pending': 'pending',
        'failed': 'failed',
        'cancelled': 'cancelled'
      };

      const mappedStatus = statusMap[payment.status] || payment.status;

      return {
        success: payment.status === 'completed',
        status: mappedStatus,
        payment_id: payment.id,
        message: payment.status === 'completed' 
          ? 'Payment verified successfully' 
          : `Payment status: ${payment.status}`
      };
    } catch (error: any) {
      console.error('pawaPay payment verification error:', error);
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
      console.error('Error fetching pawaPay payment status:', error);
      throw new Error(error.message || 'Failed to get payment status');
    }
  }

  /**
   * Check if payment is ready for mobile SDK integration
   * For now, we'll use the payment URL for redirect-based flow
   * Later can be enhanced with native SDK
   */
  async initiateMobilePayment(paymentResponse: PawaPayPaymentResponse): Promise<{
    success: boolean;
    transactionId: string;
    paymentUrl?: string;
  }> {
    try {
      if (!paymentResponse.transaction_id && !paymentResponse.payment_token) {
        throw new Error('No transaction ID in payment response');
      }

      const transactionId = paymentResponse.transaction_id || paymentResponse.payment_token;

      // For now, return the payment URL for redirect
      // TODO: Integrate with pawaPay mobile SDK for in-app payment
      return {
        success: true,
        transactionId: transactionId!,
        paymentUrl: paymentResponse.payment_url
      };
    } catch (error: any) {
      console.error('Error initiating mobile payment:', error);
      throw error;
    }
  }
}

export const pawapayService = new PawaPayService();

