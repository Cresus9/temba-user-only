import { supabase } from '../lib/supabase-client';
import { SavedPaymentMethod, SavePaymentMethodRequest } from '../types/payment';

class PaymentMethodService {
  // Mask sensitive information
  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) return cardNumber;
    return `****-****-****-${cardNumber.slice(-4)}`;
  }

  private maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 4) return phone;
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 8) {
      return `****${cleanPhone.slice(-4)}`;
    }
    return phone;
  }

  private getMaskedAccountNumber(methodType: string, accountNumber: string): string {
    if (methodType === 'credit_card') {
      return this.maskCardNumber(accountNumber);
    } else {
      return this.maskPhoneNumber(accountNumber);
    }
  }

  async savePaymentMethod(request: SavePaymentMethodRequest): Promise<SavedPaymentMethod> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const maskedAccountNumber = this.getMaskedAccountNumber(request.method_type, request.account_number);

      // Check if this payment method already exists
      const { data: existingMethod } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('method_type', request.method_type)
        .eq('provider', request.provider)
        .eq('account_number', maskedAccountNumber)
        .eq('is_active', true)
        .single();

      if (existingMethod) {
        // Update existing method
        const { data, error } = await supabase
          .from('payment_methods')
          .update({
            is_default: request.is_default || false,
            account_name: request.account_name || existingMethod.account_name,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMethod.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Create new payment method
      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          method_type: request.method_type,
          provider: request.provider,
          account_number: maskedAccountNumber,
          account_name: request.account_name || '',
          is_default: request.is_default || false,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error saving payment method:', error);
      throw new Error(error.message || 'Failed to save payment method');
    }
  }

  async getSavedPaymentMethods(userId?: string): Promise<SavedPaymentMethod[]> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching saved payment methods:', error);
      throw new Error(error.message || 'Failed to fetch saved payment methods');
    }
  }

  async updatePaymentMethod(id: string, updates: Partial<SavedPaymentMethod>): Promise<SavedPaymentMethod> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('payment_methods')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      throw new Error(error.message || 'Failed to update payment method');
    }
  }

  async deletePaymentMethod(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Instead of deleting, mark as inactive
      const { error } = await supabase
        .from('payment_methods')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      throw new Error(error.message || 'Failed to delete payment method');
    }
  }

  async setDefaultPaymentMethod(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get the payment method to set as default
      const { data: paymentMethod, error: fetchError } = await supabase
        .from('payment_methods')
        .select('method_type')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !paymentMethod) {
        throw new Error('Payment method not found');
      }

      // Remove default from other methods of the same type
      await supabase
        .from('payment_methods')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('method_type', paymentMethod.method_type)
        .neq('id', id);

      // Set this method as default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      throw new Error(error.message || 'Failed to set default payment method');
    }
  }

  async getDefaultPaymentMethod(methodType: string): Promise<SavedPaymentMethod | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('method_type', methodType)
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      return data || null;
    } catch (error: any) {
      console.error('Error fetching default payment method:', error);
      return null;
    }
  }
}

export const paymentMethodService = new PaymentMethodService();
