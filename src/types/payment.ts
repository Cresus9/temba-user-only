export interface Payment {
  id: string;
  user_id?: string;
  event_id: string;
  order_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  transaction_id?: string;
  token: string;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'mobile_money' | 'credit_card';

export interface CreatePaymentRequest {
  idempotency_key: string;
  user_id?: string;
  buyer_email?: string;
  event_id: string;
  order_id?: string;
  ticket_lines: TicketLine[];
  amount_major: number;
  currency: string;
  method: PaymentMethod;
  phone?: string;
  provider?: string;
  return_url?: string;
  cancel_url?: string;
  description: string;
}

export interface TicketLine {
  ticket_type_id: string;
  quantity: number;
  price_major: number;
  currency: string;
}

export interface PaymentResponse {
  success: boolean;
  payment_url?: string;
  payment_token: string;
  payment_id: string;
  error?: string;
}

export interface PaymentVerification {
  success: boolean;
  status: PaymentStatus;
  payment_id: string;
  order_id?: string;
  message: string;
  error?: string;
}

export interface PaydunyaPaymentRequest {
  store: {
    name: string;
    tagline?: string;
    postal_address?: string;
    phone?: string;
    website_url?: string;
    logo_url?: string;
  };
  actions: {
    callback_url: string;
    cancel_url: string;
    return_url: string;
  };
  custom_data?: Record<string, any>;
  items: PaydunyaItem[];
  total_amount: number;
  currency: string;
  description: string;
  channels: string[];
  customer: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface PaydunyaItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  description?: string;
}

export interface PaydunyaResponse {
  success: boolean;
  token?: string;
  response_code?: string;
  response_text?: string;
  description?: string;
  redirect_url?: string;
}

export interface PaydunyaVerificationResponse {
  success: boolean;
  status?: string;
  response_code?: string;
  response_text?: string;
  description?: string;
  transaction_id?: string;
  amount?: number;
  currency?: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  type: PaymentMethod;
  logo?: string;
  description?: string;
}

export interface MobileMoneyProvider extends PaymentProvider {
  type: 'mobile_money';
  country_codes: string[];
  phone_format: string;
}

export interface CreditCardProvider extends PaymentProvider {
  type: 'credit_card';
  supported_cards: string[];
}

// Saved Payment Methods (matching existing table structure)
export interface SavedPaymentMethod {
  id: string;
  user_id: string;
  method_type: 'mobile_money' | 'credit_card' | 'bank_transfer';
  provider: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavePaymentMethodRequest {
  method_type: 'mobile_money' | 'credit_card' | 'bank_transfer';
  provider: string;
  account_number: string; // Phone number or card number
  account_name?: string;
  is_default?: boolean;
}

export interface PaymentMethodService {
  savePaymentMethod(request: SavePaymentMethodRequest): Promise<SavedPaymentMethod>;
  getSavedPaymentMethods(userId: string): Promise<SavedPaymentMethod[]>;
  updatePaymentMethod(id: string, updates: Partial<SavedPaymentMethod>): Promise<SavedPaymentMethod>;
  deletePaymentMethod(id: string): Promise<void>;
  setDefaultPaymentMethod(id: string): Promise<void>;
}
