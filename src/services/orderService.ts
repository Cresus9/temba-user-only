import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase-client';
import {
  paymentService,
  type CreatePaymentRequest,
} from './paymentService';

export interface PaymentDetailsInput {
  provider?: string;
  phone?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
  billingAddress?: string;
  billingCity?: string;
  billingCountry?: string;
}

export type PaymentMethod = 'MOBILE_MONEY' | 'CARD';

export interface CreateOrderInput {
  eventId: string;
  ticketQuantities: Record<string, number>;
  paymentMethod: PaymentMethod;
  paymentDetails?: PaymentDetailsInput;
}

interface GuestOrderInput {
  email: string;
  name: string;
  phone?: string;
  eventId: string;
  ticketQuantities: Record<string, number>;
  paymentMethod: PaymentMethod;
  paymentDetails?: PaymentDetailsInput;
}

interface OrderServiceDependencies {
  supabaseClient?: SupabaseClient;
  paymentClient?: Pick<typeof paymentService, 'createPayment'>;
}

type TicketTypeRow = {
  id: string;
  price: number;
  event_id: string;
};

type EventRow = {
  title: string;
  currency: string;
  status?: string | null;
};

const SUPPORTED_PAYMENT_METHODS: PaymentMethod[] = ['MOBILE_MONEY', 'CARD'];

const stripUndefined = <T extends Record<string, unknown>>(input: T): Partial<T> => {
  return Object.entries(input).reduce<Partial<T>>((accumulator, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      accumulator[key as keyof T] = value as T[keyof T];
    }
    return accumulator;
  }, {});
};

const ensurePaymentMethod = (method: string): PaymentMethod => {
  const normalised = method?.toUpperCase() as PaymentMethod;
  if (SUPPORTED_PAYMENT_METHODS.includes(normalised)) {
    return normalised;
  }
  throw new Error('Méthode de paiement invalide');
};

const sanitizeTicketQuantities = (quantities: Record<string, number>): Record<string, number> => {
  const sanitized: Record<string, number> = {};

  for (const [rawId, rawQuantity] of Object.entries(quantities ?? {})) {
    const ticketId = rawId.trim();
    if (!ticketId) {
      continue;
    }

    const quantity = typeof rawQuantity === 'number' ? rawQuantity : Number(rawQuantity);
    if (!Number.isFinite(quantity)) {
      throw new Error('Quantité de billets invalide');
    }
    if (!Number.isInteger(quantity)) {
      throw new Error('La quantité de billets doit être un entier');
    }
    if (quantity < 0) {
      throw new Error('La quantité de billets ne peut pas être négative');
    }
    if (quantity > 0) {
      sanitized[ticketId] = quantity;
    }
  }

  return sanitized;
};

const ensureTicketSelection = (quantities: Record<string, number>): Record<string, number> => {
  const sanitized = sanitizeTicketQuantities(quantities);
  if (Object.keys(sanitized).length === 0) {
    throw new Error('Aucun billet sélectionné');
  }
  return sanitized;
};

const sanitizePhoneNumber = (value?: string | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalised = trimmed.replace(/(?!^)\+/g, '').replace(/[^+\d]/g, '');
  return normalised || undefined;
};

const sanitizeProvider = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
};

const normalizeEmail = (email?: string | null): string | undefined => {
  const trimmed = email?.trim();
  return trimmed && trimmed.includes('@') ? trimmed.toLowerCase() : undefined;
};

const getApplicationOrigin = (): string | undefined => {
  const browserLocation =
    (typeof window !== 'undefined' && window?.location)
    || (globalThis as { location?: Pick<Location, 'origin'> }).location;

  const origin = browserLocation?.origin?.trim();
  return origin ? origin.replace(/\/$/, '') : undefined;
};

const buildReturnUrls = (): { returnUrl?: string; cancelUrl?: string } => {
  const origin = getApplicationOrigin();
  if (!origin) {
    return {};
  }
  return {
    returnUrl: `${origin}/payment/success`,
    cancelUrl: `${origin}/payment/cancelled`,
  };
};

const createIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `payment-${crypto.randomUUID()}`;
  }
  return `payment-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const sanitizeGuestPaymentDetails = (
  method: PaymentMethod,
  details?: PaymentDetailsInput,
): Record<string, unknown> => {
  if (!details) {
    return {};
  }

  if (method === 'MOBILE_MONEY') {
    return stripUndefined({
      provider: sanitizeProvider(details.provider),
      phone: sanitizePhoneNumber(details.phone),
    });
  }

  const sanitizedCardNumber = typeof details.cardNumber === 'string'
    ? details.cardNumber.replace(/[\s-]/g, '')
    : undefined;

  return stripUndefined({
    cardNumber: sanitizedCardNumber,
    expiryDate: details.expiryDate?.trim(),
    cvv: details.cvv?.trim(),
    cardholderName: details.cardholderName?.trim(),
    billingAddress: details.billingAddress?.trim(),
    billingCity: details.billingCity?.trim(),
    billingCountry: details.billingCountry?.trim(),
  });
};

export class OrderService {
  private readonly supabase: SupabaseClient;
  private readonly paymentClient: Pick<typeof paymentService, 'createPayment'>;

  constructor({ supabaseClient, paymentClient }: OrderServiceDependencies = {}) {
    this.supabase = supabaseClient ?? supabase;
    this.paymentClient = paymentClient ?? paymentService;
  }

  private async rollbackOrder(orderId: string): Promise<void> {
    if (!orderId) {
      return;
    }

    const { error } = await this.supabase.from('orders').delete().eq('id', orderId);
    if (error) {
      console.error('Échec de la suppression de la commande après une erreur de paiement:', error);
    }
  }

  async createOrder(input: CreateOrderInput) {
    let orderIdForCleanup: string | null = null;

    try {
      const paymentMethod = ensurePaymentMethod(input.paymentMethod);
      const ticketQuantities = ensureTicketSelection(input.ticketQuantities);

      const { data: userResult, error: userError } = await this.supabase.auth.getUser();
      if (userError) {
        console.error('Erreur de récupération de l\'utilisateur connecté:', userError);
        throw new Error('Non authentifié');
      }

      const user = userResult?.user;
      if (!user) {
        throw new Error('Non authentifié');
      }

      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('name, email, phone')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Erreur lors de la récupération du profil utilisateur:', profileError);
        throw new Error('Profil utilisateur non trouvé');
      }

      if (!profile) {
        throw new Error('Profil utilisateur non trouvé');
      }

      const { data: ticketTypes, error: ticketError } = await this.supabase
        .from<TicketTypeRow>('ticket_types')
        .select('id, price, event_id')
        .in('id', Object.keys(ticketQuantities));

      if (ticketError) {
        console.error('Erreur lors de la récupération des types de billets:', ticketError);
        throw new Error('Types de billets non trouvés');
      }

      if (!ticketTypes || ticketTypes.length === 0) {
        throw new Error('Types de billets non trouvés');
      }

      const foundIds = new Set(ticketTypes.map(ticket => ticket.id));
      const missingIds = Object.keys(ticketQuantities).filter(id => !foundIds.has(id));
      if (missingIds.length > 0) {
        throw new Error('Certains types de billets sont introuvables');
      }

      const mismatched = ticketTypes.filter(ticket => ticket.event_id !== input.eventId);
      if (mismatched.length > 0) {
        throw new Error('Certains billets ne correspondent pas à cet événement');
      }

      const { data: event, error: eventError } = await this.supabase
        .from<EventRow>('events')
        .select('title, currency, status')
        .eq('id', input.eventId)
        .single();

      if (eventError) {
        console.error('Erreur lors de la récupération de l\'événement:', eventError);
        throw new Error('Événement non trouvé');
      }

      if (!event) {
        throw new Error('Événement non trouvé');
      }

      if (event.status && event.status !== 'PUBLISHED') {
        throw new Error('Événement indisponible');
      }

      const ticketLines = ticketTypes
        .map(({ id, price }) => {
          const quantity = ticketQuantities[id] ?? 0;
          const ticketPrice = Number(price);
          if (!Number.isFinite(ticketPrice) || ticketPrice < 0) {
            throw new Error('Prix de billet invalide');
          }
          return {
            ticket_type_id: id,
            quantity,
            price_major: ticketPrice,
            currency: event.currency,
          };
        })
        .filter(line => line.quantity > 0);

      const totalAmount = ticketLines.reduce((sum, line) => sum + (line.price_major * line.quantity), 0);
      if (totalAmount <= 0) {
        throw new Error('Montant total invalide');
      }

      const providedPhone = sanitizePhoneNumber(input.paymentDetails?.phone);
      const fallbackPhone = sanitizePhoneNumber(profile.phone);
      const phone = providedPhone ?? fallbackPhone;
      const provider = sanitizeProvider(input.paymentDetails?.provider);

      if (paymentMethod === 'MOBILE_MONEY') {
        if (!provider) {
          throw new Error('Fournisseur de paiement requis');
        }
        if (!phone) {
          throw new Error('Numéro de téléphone requis');
        }
      } else {
        const cardNumber = input.paymentDetails?.cardNumber?.replace(/[\s-]/g, '') ?? '';
        const expiryDate = input.paymentDetails?.expiryDate?.trim() ?? '';
        const cvv = input.paymentDetails?.cvv?.trim() ?? '';

        if (!/^\d{12,19}$/.test(cardNumber)) {
          throw new Error('Numéro de carte invalide');
        }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
          throw new Error('Date d\'expiration invalide');
        }
        if (!/^\d{3,4}$/.test(cvv)) {
          throw new Error('CVV invalide');
        }
      }

      const { data: orderData, error: orderError } = await this.supabase
        .from('orders')
        .insert({
          user_id: user.id,
          event_id: input.eventId,
          total: totalAmount,
          status: 'PENDING',
          payment_method: paymentMethod,
          ticket_quantities: ticketQuantities,
        })
        .select()
        .single();

      if (orderError || !orderData) {
        console.error('Erreur lors de la création de la commande:', orderError);
        throw new Error('Échec de la création de la commande');
      }

      orderIdForCleanup = orderData.id;

      const { returnUrl, cancelUrl } = buildReturnUrls();

      const paymentRequest: CreatePaymentRequest = {
        idempotency_key: createIdempotencyKey(),
        user_id: user.id,
        buyer_email: normalizeEmail(profile.email),
        event_id: input.eventId,
        order_id: orderData.id,
        ticket_lines: ticketLines,
        amount_major: totalAmount,
        currency: event.currency,
        method: paymentMethod === 'MOBILE_MONEY' ? 'mobile_money' : 'credit_card',
        phone: phone ?? undefined,
        provider,
        save_method: false,
        description: `Tickets for ${event.title}`,
        ...(returnUrl ? { return_url: returnUrl } : {}),
        ...(cancelUrl ? { cancel_url: cancelUrl } : {}),
      };

      const paymentResponse = await this.paymentClient.createPayment(paymentRequest);

      if (!paymentResponse.success) {
        await this.rollbackOrder(orderData.id);
        orderIdForCleanup = null;
        throw new Error(paymentResponse.error || 'Échec de la création du paiement');
      }

      if (!paymentResponse.payment_token) {
        await this.rollbackOrder(orderData.id);
        orderIdForCleanup = null;
        throw new Error('Réponse de paiement invalide');
      }

      orderIdForCleanup = null;

      return {
        orderId: orderData.id,
        paymentUrl: paymentResponse.payment_url,
        paymentToken: paymentResponse.payment_token,
        success: true,
      };
    } catch (error: unknown) {
      if (orderIdForCleanup) {
        await this.rollbackOrder(orderIdForCleanup);
      }

      console.error('Erreur de création de commande:', error);
      const message = error instanceof Error && error.message
        ? error.message
        : 'Échec de la création de la commande';
      throw new Error(message);
    }
  }

  async createGuestOrder(input: GuestOrderInput) {
    try {
      if (!input.email?.trim()) throw new Error('Email requis');
      if (!input.name?.trim()) throw new Error('Nom requis');
      if (!input.eventId) throw new Error('ID d\'événement requis');

      const paymentMethod = ensurePaymentMethod(input.paymentMethod);
      const ticketQuantities = ensureTicketSelection(input.ticketQuantities);

      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(input.email)) throw new Error('Format d\'email invalide');

      const sanitizedPhone = sanitizePhoneNumber(input.phone);
      const paymentDetails = sanitizeGuestPaymentDetails(paymentMethod, input.paymentDetails);

      if (paymentMethod === 'MOBILE_MONEY') {
        if (!paymentDetails.provider) throw new Error('Fournisseur de paiement requis');
        if (!paymentDetails.phone && !sanitizedPhone) throw new Error('Numéro de téléphone requis');
      } else {
        const cardNumber = paymentDetails.cardNumber as string | undefined;
        const expiryDate = paymentDetails.expiryDate as string | undefined;
        const cvv = paymentDetails.cvv as string | undefined;

        if (!cardNumber || !/^\d{12,19}$/.test(cardNumber)) {
          throw new Error('Numéro de carte invalide');
        }
        if (!expiryDate || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
          throw new Error('Date d\'expiration invalide');
        }
        if (!cvv || !/^\d{3,4}$/.test(cvv)) {
          throw new Error('CVV invalide');
        }
      }

      const { data, error } = await this.supabase.rpc('guest_order_processor', {
        p_email: input.email.trim().toLowerCase(),
        p_name: input.name.trim(),
        p_phone: sanitizedPhone ?? null,
        p_event_id: input.eventId,
        p_payment_method: paymentMethod,
        p_ticket_quantities: ticketQuantities,
        p_payment_details: paymentDetails,
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
        paymentUrl: data.payment_url,
        paymentToken: data.payment_token,
        success: true,
      };
    } catch (error: unknown) {
      console.error('Erreur de création de commande invité:', error);
      const message = error instanceof Error && error.message
        ? error.message
        : 'Échec de la création de la commande invité';
      throw new Error(message);
    }
  }

  async getGuestTickets(token: string) {
    try {
      if (!token?.trim()) throw new Error('Jeton requis');

      const { data, error } = await this.supabase
        .from('guest_ticket_details')
        .select('*')
        .eq('token', token.trim());

      if (error) throw error;
      return data || [];
    } catch (error: unknown) {
      console.error('Erreur lors du chargement des billets invité:', error);
      const message = error instanceof Error && error.message
        ? error.message
        : 'Échec du chargement des billets invité';
      throw new Error(message);
    }
  }

  async verifyGuestOrder(token: string) {
    try {
      if (!token?.trim()) throw new Error('Jeton requis');

      const { data, error } = await this.supabase
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
        orderStatus: data.status,
      };
    } catch (error: unknown) {
      console.error('Erreur de vérification de commande invité:', error);
      const message = error instanceof Error && error.message
        ? error.message
        : 'Échec de la vérification de la commande invité';
      throw new Error(message);
    }
  }
}

export const orderService = new OrderService();
