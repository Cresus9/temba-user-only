import { supabase } from '../lib/supabase-client';

class NewsletterService {
  async subscribe(email: string) {
    try {
      // Validate email format
      if (!this.validateEmail(email)) {
        throw new Error('Format d\'email invalide');
      }

      // Check if already subscribed
      const { data: existing } = await supabase
        .from('newsletter_subscriptions')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        throw new Error('Cet email est déjà abonné');
      }

      // Insert new subscription
      const { error: subscriptionError } = await supabase
        .from('newsletter_subscriptions')
        .insert([{ email }]);

      if (subscriptionError) throw subscriptionError;

      return { success: true };
    } catch (error: any) {
      console.error('Erreur d\'abonnement à la newsletter:', error);
      throw new Error(error.message || 'Échec de l\'abonnement à la newsletter');
    }
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  }
}

export const newsletterService = new NewsletterService();