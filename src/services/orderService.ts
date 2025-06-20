import { supabase } from '../lib/supabase-client';

export interface CreateOrderInput {
  eventId: string;
  ticketQuantities: { [key: string]: number };
  paymentMethod: string;
  paymentDetails?: {
    provider?: string;
    phone?: string;
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
  };
}

class OrderService {
  async createOrder(input: CreateOrderInput) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Validate input
      if (!input.eventId) throw new Error('ID d\'événement requis');
      if (!input.ticketQuantities || Object.keys(input.ticketQuantities).length === 0) {
        throw new Error('Aucun billet sélectionné');
      }
      if (!input.paymentMethod) throw new Error('Méthode de paiement requise');

      // Validate payment details
      if (input.paymentMethod === 'MOBILE_MONEY') {
        if (!input.paymentDetails?.provider) throw new Error('Fournisseur de paiement requis');
        if (!input.paymentDetails?.phone) throw new Error('Numéro de téléphone requis');
      } else if (input.paymentMethod === 'CARD') {
        if (!input.paymentDetails?.cardNumber) throw new Error('Numéro de carte requis');
        if (!input.paymentDetails?.expiryDate) throw new Error('Date d\'expiration de la carte requise');
        if (!input.paymentDetails?.cvv) throw new Error('CVV de la carte requis');
      }

      // Create order using database function
      const { data, error } = await supabase.rpc('order_processor', {
        p_event_id: input.eventId,
        p_payment_method: input.paymentMethod,
        p_ticket_quantities: input.ticketQuantities,
        p_user_id: user.id,
        p_payment_details: input.paymentDetails || {}
      });

      if (error) {
        console.error('Erreur de base de données:', error);
        throw new Error(error.message || 'Échec de la création de la commande');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Échec du traitement de la commande');
      }

      return {
        orderId: data.id,
        success: true
      };
    } catch (error: any) {
      console.error('Erreur de création de commande:', error);
      throw new Error(error.message || 'Échec de la création de la commande');
    }
  }

  async createGuestOrder(input: {
    email: string;
    name: string;
    phone?: string;
    eventId: string;
    ticketQuantities: { [key: string]: number };
    paymentMethod: string;
    paymentDetails?: {
      provider?: string;
      phone?: string;
      cardNumber?: string;
      expiryDate?: string;
      cvv?: string;
    };
  }) {
    try {
      // Input validation
      if (!input.email?.trim()) throw new Error('Email requis');
      if (!input.name?.trim()) throw new Error('Nom requis');
      if (!input.eventId) throw new Error('ID d\'événement requis');
      if (!input.ticketQuantities || Object.keys(input.ticketQuantities).length === 0) {
        throw new Error('Aucun billet sélectionné');
      }
      if (!input.paymentMethod) throw new Error('Méthode de paiement requise');

      // Validate email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(input.email)) throw new Error('Format d\'email invalide');

      // Validate payment details
      if (input.paymentMethod === 'MOBILE_MONEY') {
        if (!input.paymentDetails?.provider) throw new Error('Fournisseur de paiement requis');
        if (!input.paymentDetails?.phone) throw new Error('Numéro de téléphone requis');
      } else if (input.paymentMethod === 'CARD') {
        if (!input.paymentDetails?.cardNumber) throw new Error('Numéro de carte requis');
        if (!input.paymentDetails?.expiryDate) throw new Error('Date d\'expiration de la carte requise');
        if (!input.paymentDetails?.cvv) throw new Error('CVV de la carte requis');
      }

      // Create guest order using database function
      const { data, error } = await supabase.rpc('guest_order_processor', {
        p_email: input.email.trim(),
        p_name: input.name.trim(),
        p_phone: input.phone?.trim(),
        p_event_id: input.eventId,
        p_payment_method: input.paymentMethod,
        p_ticket_quantities: input.ticketQuantities,
        p_payment_details: input.paymentDetails || {}
      });

      if (error) {
        console.error('Erreur de base de données:', error);
        throw new Error(error.message || 'Échec de la création de la commande invité');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Échec du traitement de la commande');
      }

      return {
        orderId: data.order_id,
        token: data.token,
        success: true
      };
    } catch (error: any) {
      console.error('Erreur de création de commande invité:', error);
      throw new Error(error.message || 'Échec de la création de la commande invité');
    }
  }

  async getGuestTickets(token: string) {
    try {
      if (!token?.trim()) throw new Error('Jeton requis');

      const { data, error } = await supabase
        .from('guest_ticket_details')
        .select('*')
        .eq('token', token.trim());

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Erreur lors du chargement des billets invité:', error);
      throw new Error(error.message || 'Échec du chargement des billets invité');
    }
  }

  async verifyGuestOrder(token: string) {
    try {
      if (!token?.trim()) throw new Error('Jeton requis');

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          guest_orders!inner(token)
        `)
        .eq('guest_orders.token', token.trim())
        .single();

      if (error) throw error;

      return {
        success: true,
        orderStatus: data.status
      };
    } catch (error: any) {
      console.error('Erreur de vérification de commande invité:', error);
      throw new Error(error.message || 'Échec de la vérification de la commande invité');
    }
  }
}

export const orderService = new OrderService();