import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { OrderService } from '../orderService';

type SupabaseAuthMock = {
  getUser: ReturnType<typeof vi.fn>;
};

type SupabaseFromMock = ReturnType<typeof vi.fn>;

type SupabaseRpcMock = ReturnType<typeof vi.fn>;

interface SupabaseMock {
  supabase: SupabaseClient;
  auth: SupabaseAuthMock;
  from: SupabaseFromMock;
  rpc: SupabaseRpcMock;
  ticketIn: ReturnType<typeof vi.fn>;
  ordersInsert: ReturnType<typeof vi.fn>;
  ordersDeleteEq: ReturnType<typeof vi.fn>;
}

const createSupabaseMock = (): SupabaseMock => {
  const auth = {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
  };

  const profileSingle = vi.fn().mockResolvedValue({
    data: { name: 'User', email: 'user@example.com', phone: '  +229 123 456 ' },
    error: null,
  });

  const profilesQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: profileSingle,
  };

  const ticketIn = vi.fn().mockResolvedValue({
    data: [
      { id: 'ticket-1', price: 100, event_id: 'event-1' },
      { id: 'ticket-2', price: 50, event_id: 'event-1' },
    ],
    error: null,
  });

  const ticketQuery = {
    select: vi.fn().mockReturnThis(),
    in: ticketIn,
  };

  const eventSingle = vi.fn().mockResolvedValue({
    data: { title: 'Event', currency: 'XOF', status: 'PUBLISHED' },
    error: null,
  });

  const eventsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: eventSingle,
  };

  const orderSingle = vi.fn().mockResolvedValue({ data: { id: 'order-1' }, error: null });
  const orderSelectBuilder = {
    single: orderSingle,
  };

  const ordersInsert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue(orderSelectBuilder),
    single: orderSingle,
  });

  const ordersDeleteEq = vi.fn().mockResolvedValue({ error: null });
  const ordersDelete = vi.fn().mockReturnValue({ eq: ordersDeleteEq });

  const ordersBuilder = {
    insert: ordersInsert,
    delete: ordersDelete,
  };

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'profiles':
        return profilesQuery;
      case 'ticket_types':
        return ticketQuery;
      case 'events':
        return eventsQuery;
      case 'orders':
        return ordersBuilder;
      default:
        throw new Error(`Unexpected table ${table}`);
    }
  });

  const rpc = vi.fn();

  return {
    supabase: { auth, from, rpc } as unknown as SupabaseClient,
    auth,
    from,
    rpc,
    ticketIn,
    ordersInsert,
    ordersDeleteEq,
  };
};

describe('OrderService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates an order and forwards sanitized payment data', async () => {
    const supabaseMock = createSupabaseMock();
    const paymentClient = {
      createPayment: vi.fn().mockResolvedValue({
        success: true,
        payment_url: 'https://pay.example',
        payment_token: 'token-123',
      }),
    };

    vi.stubGlobal('window', { location: { origin: 'https://app.example' } } as unknown as Window);
    vi.stubGlobal('location', { origin: 'https://app.example' } as unknown as Location);

    const service = new OrderService({
      supabaseClient: supabaseMock.supabase,
      paymentClient,
    });

    const result = await service.createOrder({
      eventId: 'event-1',
      ticketQuantities: { 'ticket-1': 2, 'ticket-2': 0 },
      paymentMethod: 'MOBILE_MONEY',
      paymentDetails: { provider: ' Orange ', phone: ' +229 123 456 ' },
    });

    expect(result).toEqual({
      orderId: 'order-1',
      paymentUrl: 'https://pay.example',
      paymentToken: 'token-123',
      success: true,
    });

    expect(paymentClient.createPayment).toHaveBeenCalledTimes(1);
    const paymentRequest = paymentClient.createPayment.mock.calls[0][0];
    expect(paymentRequest.phone).toBe('+229123456');
    expect(paymentRequest.provider).toBe('orange');
    expect(paymentRequest.ticket_lines).toEqual([
      {
        ticket_type_id: 'ticket-1',
        quantity: 2,
        price_major: 100,
        currency: 'XOF',
      },
    ]);
    expect(paymentRequest.return_url).toBe('https://app.example/payment/success');

    expect(supabaseMock.ordersInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      event_id: 'event-1',
      total: 200,
      status: 'PENDING',
      payment_method: 'MOBILE_MONEY',
      ticket_quantities: { 'ticket-1': 2 },
    });
  });

  it('rejects ticket types that do not belong to the event', async () => {
    const supabaseMock = createSupabaseMock();
    supabaseMock.ticketIn.mockResolvedValue({
      data: [{ id: 'ticket-1', price: 100, event_id: 'other-event' }],
      error: null,
    });

    const paymentClient = { createPayment: vi.fn() };
    const service = new OrderService({
      supabaseClient: supabaseMock.supabase,
      paymentClient,
    });

    await expect(service.createOrder({
      eventId: 'event-1',
      ticketQuantities: { 'ticket-1': 1 },
      paymentMethod: 'MOBILE_MONEY',
      paymentDetails: { provider: 'orange', phone: '0700000000' },
    })).rejects.toThrow('Certains billets ne correspondent pas à cet événement');
  });

  it('rolls back the order when payment creation fails', async () => {
    const supabaseMock = createSupabaseMock();
    const paymentClient = {
      createPayment: vi.fn().mockRejectedValue(new Error('payment down')),
    };

    vi.stubGlobal('window', { location: { origin: 'https://app.example' } } as unknown as Window);
    vi.stubGlobal('location', { origin: 'https://app.example' } as unknown as Location);

    const service = new OrderService({
      supabaseClient: supabaseMock.supabase,
      paymentClient,
    });

    await expect(service.createOrder({
      eventId: 'event-1',
      ticketQuantities: { 'ticket-1': 1 },
      paymentMethod: 'MOBILE_MONEY',
      paymentDetails: { provider: 'orange', phone: '0700000000' },
    })).rejects.toThrow('payment down');

    expect(supabaseMock.ordersDeleteEq).toHaveBeenCalledWith('id', 'order-1');
  });

  it('rejects negative ticket quantities', async () => {
    const supabaseMock = createSupabaseMock();
    const paymentClient = { createPayment: vi.fn() };
    const service = new OrderService({
      supabaseClient: supabaseMock.supabase,
      paymentClient,
    });

    await expect(service.createOrder({
      eventId: 'event-1',
      ticketQuantities: { 'ticket-1': -1 },
      paymentMethod: 'MOBILE_MONEY',
      paymentDetails: { provider: 'orange', phone: '0700000000' },
    })).rejects.toThrow('La quantité de billets ne peut pas être négative');
  });
});
