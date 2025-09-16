import { supabase } from '../lib/supabase-client';
import { paymentService, CreatePaymentRequest } from './paymentService';
import { z } from 'zod';

const uuidSchema = z.string().uuid("ID d'événement invalide");
const MAX_TICKETS_PER_TYPE = 1_000;

const ticketQuantitiesSchema = z.record(
  z.string().uuid('Identifiant de billet invalide'),
  z.coerce
    .number({ invalid_type_error: 'La quantité de billets doit être un nombre' })
    .int('La quantité de billets doit être un nombre entier')
    .positive('La quantité de billets doit être positive')
    .max(MAX_TICKETS_PER_TYPE, `Impossible de commander plus de ${MAX_TICKETS_PER_TYPE} billets par type`)
);

const allowedPaymentMethods = new Set(['MOBILE_MONEY', 'CARD']);

const normalizePaymentMethod = (method: string) => {
  const normalized = method?.trim().toUpperCase();
  if (!allowedPaymentMethods.has(normalized)) {
    throw new Error('Méthode de paiement invalide');
  }
  return normalized as 'MOBILE_MONEY' | 'CARD';
};

const sanitizeTicketQuantities = (quantities: { [key: string]: number }) => {
  const parsed = ticketQuantitiesSchema.safeParse(quantities);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(issue?.message || 'Quantités de billets invalides');
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new Error('Aucun billet sélectionné');
  }
  return parsed.data;
};

const createSecureIdempotencyKey = () => {
  if (globalThis.crypto?.randomUUID) {
    return `payment-${globalThis.crypto.randomUUID()}`;
  }

  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `payment-${hex}`;
  }

  throw new Error('Générateur aléatoire sécurisé indisponible');
};

interface TicketTypeRow {
  id: string;
  event_id: string;
  name: string;
  price: number;
  available: number | null;
  max_per_order: number | null;
  sales_enabled?: boolean | null;
  is_paused?: boolean | null;
  on_sale?: boolean | null;
  is_active?: boolean | null;
  status?: string | null;
}

const isTicketPaused = (ticket: TicketTypeRow) =>
  ticket.sales_enabled === false ||
  ticket.is_paused === true ||
  ticket.on_sale === false ||
  ticket.is_active === false ||
  ticket.status === 'PAUSED';

const normalizeAvailable = (ticket: TicketTypeRow) => {
  const available = Number(ticket.available ?? 0);
  if (!Number.isFinite(available) || available < 0) {
    return 0;
  }
  return Math.floor(available);
};

const normalizeMaxPerOrder = (ticket: TicketTypeRow) => {
  const max = ticket.max_per_order == null ? null : Number(ticket.max_per_order);
  if (max == null || !Number.isFinite(max) || max <= 0) {
    return Infinity;
  }
  return Math.floor(max);
};

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

      if (!input.eventId) throw new Error("ID d'événement requis");

      const eventIdResult = uuidSchema.safeParse(input.eventId.trim());
      if (!eventIdResult.success) {
        throw new Error("ID d'événement invalide");
      }
      const eventId = eventIdResult.data;

      if (!input.ticketQuantities || Object.keys(input.ticketQuantities).length === 0) {
        throw new Error('Aucun billet sélectionné');
      }

      const ticketQuantities = sanitizeTicketQuantities(input.ticketQuantities);

      const paymentMethod = normalizePaymentMethod(input.paymentMethod);

      // Get user profile for payment
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email, phone')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profil utilisateur non trouvé');

      const requestedTicketIds = Object.keys(ticketQuantities);

      const { data: ticketTypes, error: ticketError } = await supabase
        .from('ticket_types')
        .select('id, event_id, name, price, available, max_per_order, sales_enabled, is_paused, on_sale, is_active, status')
        .eq('event_id', eventId)
        .in('id', requestedTicketIds);

      if (ticketError) throw ticketError;
      if (!ticketTypes || ticketTypes.length === 0) {
        throw new Error('Types de billets non trouvés');
      }

      const fetchedIds = new Set(ticketTypes.map((ticket) => ticket.id));
      const missingIds = requestedTicketIds.filter((id) => !fetchedIds.has(id));
      if (missingIds.length > 0) {
        throw new Error('Certains billets sélectionnés sont introuvables ou ne sont plus disponibles');
      }

      let totalAmount = 0;

      for (const ticket of ticketTypes as TicketTypeRow[]) {
        if (ticket.event_id !== eventId) {
          throw new Error('Certains billets sélectionnés ne correspondent pas à cet événement');
        }

        const quantity = ticketQuantities[ticket.id];
        if (!quantity) continue;

        if (isTicketPaused(ticket)) {
          throw new Error(`Les billets « ${ticket.name} » ne sont plus en vente`);
        }

        const available = normalizeAvailable(ticket);
        if (available < quantity) {
          throw new Error(`La quantité demandée pour « ${ticket.name} » dépasse le stock disponible`);
        }

        const maxPerOrder = normalizeMaxPerOrder(ticket);
        if (quantity > maxPerOrder) {
          throw new Error(`Impossible de commander plus de ${maxPerOrder} billets pour « ${ticket.name} »`);
        }

        const price = Number(ticket.price);
        if (!Number.isFinite(price) || price < 0) {
          throw new Error(`Prix invalide pour le billet « ${ticket.name} »`);
        }

        totalAmount += price * quantity;
      }

      if (totalAmount <= 0) {
        throw new Error('Le total de la commande doit être supérieur à zéro');
      }

      // Get event details
      const { data: event } = await supabase
        .from('events')
        .select('title, currency')
        .eq('id', eventId)
        .single();

      if (!event) throw new Error('Événement non trouvé');

      // Create order in database first
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          event_id: eventId,
          total: totalAmount,
          status: 'PENDING',
          payment_method: paymentMethod,
          ticket_quantities: ticketQuantities
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create payment using edge function
      // Build ticket lines for the edge function
      const ticketLines = (ticketTypes as TicketTypeRow[])
        .map(ticket => ({
          ticket_type_id: ticket.id,
          quantity: ticketQuantities[ticket.id] || 0,
          price_major: Number(ticket.price),
          currency: event.currency
        }))
        .filter(line => line.quantity > 0);

      const paymentRequest: CreatePaymentRequest = {
        idempotency_key: createSecureIdempotencyKey(),
        user_id: user.id,
        event_id: eventId,
        order_id: orderData.id,
        ticket_lines: ticketLines,
        amount_major: totalAmount,
        currency: event.currency,
        method: paymentMethod === 'MOBILE_MONEY' ? 'mobile_money' : 'credit_card',
        phone: input.paymentDetails?.phone?.trim() || profile.phone?.trim(),
        provider: input.paymentDetails?.provider?.trim(),
        save_method: false,
        return_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancelled`,
        description: `Tickets for ${event.title}`
      };

      const paymentResponse = await paymentService.createPayment(paymentRequest);

      if (!paymentResponse.success) {
        // Delete the order if payment creation failed
        const { error: rollbackError } = await supabase.from('orders').delete().eq('id', orderData.id);
        if (rollbackError) {
          console.error('Échec du nettoyage de la commande après un paiement refusé:', rollbackError);
        }
        throw new Error(paymentResponse.error || 'Failed to create payment');
      }


      return {
        orderId: orderData.id,
        paymentUrl: paymentResponse.payment_url,
        paymentToken: paymentResponse.payment_token,
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
      if (!input.eventId) throw new Error("ID d'événement requis");
      if (!input.ticketQuantities || Object.keys(input.ticketQuantities).length === 0) {
        throw new Error('Aucun billet sélectionné');
      }

      const eventIdResult = uuidSchema.safeParse(input.eventId.trim());
      if (!eventIdResult.success) {
        throw new Error("ID d'événement invalide");
      }

      const ticketQuantities = sanitizeTicketQuantities(input.ticketQuantities);

      const paymentMethod = normalizePaymentMethod(input.paymentMethod);

      // Validate email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(input.email)) throw new Error('Format d\'email invalide');

      // Validate payment details
      if (paymentMethod === 'MOBILE_MONEY') {
        if (!input.paymentDetails?.provider) throw new Error('Fournisseur de paiement requis');
        if (!input.paymentDetails?.phone) throw new Error('Numéro de téléphone requis');
      } else if (paymentMethod === 'CARD') {
        if (!input.paymentDetails?.cardNumber) throw new Error('Numéro de carte requis');
        if (!input.paymentDetails?.expiryDate) throw new Error('Date d\'expiration de la carte requise');
        if (!input.paymentDetails?.cvv) throw new Error('CVV de la carte requis');
      }

      // Create guest order using database function
      const { data, error } = await supabase.rpc('guest_order_processor', {
        p_email: input.email.trim(),
        p_name: input.name.trim(),
        p_phone: input.phone?.trim(),
        p_event_id: eventIdResult.data,
        p_payment_method: paymentMethod,
        p_ticket_quantities: ticketQuantities,
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