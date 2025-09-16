import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaymentService, type CreatePaymentRequest } from '../paymentService';
import { paymentMethodService } from '../paymentMethodService';
import { notificationTriggers } from '../notificationTriggers';

const ORIGINAL_ENV_URL = process.env.VITE_SUPABASE_URL;
const ORIGINAL_ENV_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const createLogger = () => ({
  error: vi.fn(),
  warn: vi.fn(),
});

describe('PaymentService', () => {
  beforeEach(() => {
    process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.VITE_SUPABASE_URL = ORIGINAL_ENV_URL;
    process.env.VITE_SUPABASE_ANON_KEY = ORIGINAL_ENV_KEY;
  });

  const baseRequest: CreatePaymentRequest = {
    idempotency_key: 'key-1',
    event_id: 'event-1',
    ticket_lines: [
      { ticket_type_id: 'ticket-1', quantity: 2, price_major: 1000, currency: 'XOF' },
    ],
    amount_major: 2000,
    currency: 'XOF',
    method: 'mobile_money',
    description: 'Tickets',
  };

  const createSupabaseMock = (): SupabaseClient => {
    const auth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    };

    const functions = {
      invoke: vi.fn(),
    };

    const from = vi.fn();

    return { auth, functions, from } as unknown as SupabaseClient;
  };

  it('sends the payment request to the Supabase function and returns the provider response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ success: true, payment_url: 'https://pay.example', payment_token: 'token-123', payment_id: 'pid-1' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));

    const service = new PaymentService({
      supabaseClient: createSupabaseMock(),
      fetch: fetchMock,
      logger: createLogger(),
    });

    const response = await service.createPayment(baseRequest);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/create-payment',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(response).toEqual({
      success: true,
      payment_url: 'https://pay.example',
      payment_token: 'token-123',
      payment_id: 'pid-1',
    });
  });

  it('throws a descriptive error when the payment function responds with failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    ));

    const service = new PaymentService({
      supabaseClient: createSupabaseMock(),
      fetch: fetchMock,
      logger: createLogger(),
    });

    await expect(service.createPayment(baseRequest)).rejects.toThrow('Échec de la création du paiement: invalid request');
  });

  it('verifies payments, saves masked card details, and triggers notifications', async () => {
    const supabaseMock = createSupabaseMock();
    const ordersBuilder: any = {};
    ordersBuilder.select = vi.fn().mockReturnValue(ordersBuilder);
    ordersBuilder.eq = vi.fn().mockReturnValue(ordersBuilder);
    ordersBuilder.single = vi.fn().mockResolvedValue({
      data: {
        id: 'order-1',
        user_id: 'user-1',
        total: 2000,
        currency: 'XOF',
        events: { title: 'Concert' },
        order_items: [{ quantity: 2 }],
      },
      error: null,
    });

    (supabaseMock.functions as any).invoke = vi.fn().mockResolvedValue({
      data: { success: true, status: 'completed', payment_id: 'pid-1', order_id: 'order-1', message: 'done' },
      error: null,
    });

    (supabaseMock.from as any) = vi.fn().mockImplementation((table: string) => {
      if (table === 'orders') {
        return ordersBuilder;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const paymentMethodSpy = vi.spyOn(paymentMethodService, 'savePaymentMethod').mockResolvedValue(undefined as any);
    const notificationSpy = vi.spyOn(notificationTriggers, 'onOrderCreated').mockResolvedValue();

    const service = new PaymentService({
      supabaseClient: supabaseMock,
      fetch: vi.fn(),
      logger: createLogger(),
    });

    const result = await service.verifyPayment('4111111111111111', 'order-1', true, {
      method: 'credit_card',
      cardNumber: '4111 1111 1111 1111',
      cardholderName: 'Tester',
    });

    expect(result).toMatchObject({
      success: true,
      status: 'completed',
      payment_id: 'pid-1',
      order_id: 'order-1',
    });

    expect(paymentMethodSpy).toHaveBeenCalledWith({
      method_type: 'credit_card',
      provider: 'Visa',
      account_number: '****1111',
      account_name: 'Tester',
      is_default: false,
    });

    expect(notificationSpy).toHaveBeenCalledWith(expect.objectContaining({
      order_id: 'order-1',
      user_id: 'user-1',
      ticket_count: 2,
    }));
  });
});
