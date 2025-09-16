import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const responses = {
    profile: { data: { name: 'Test User', email: 'user@example.com', phone: '+221234567890' }, error: null as any },
    ticketTypes: { data: [] as any[], error: null as any },
    event: { data: { title: 'Concert Test', currency: 'XOF' }, error: null as any },
    orderInsert: { data: { id: 'order-123' }, error: null as any },
    orderDelete: { error: null as any },
  };

  const createListQuery = (getResponse: () => any) => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.in = vi.fn(() => query);
    query.then = (resolve: any, reject: any) => Promise.resolve(getResponse()).then(resolve, reject);
    query.single = vi.fn(() => Promise.resolve(getResponse()));
    return query;
  };

  const createSingleQuery = (getResponse: () => any) => {
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.single = vi.fn(() => Promise.resolve(getResponse()));
    query.then = (resolve: any, reject: any) => Promise.resolve(getResponse()).then(resolve, reject);
    return query;
  };

  const createOrdersBuilder = () => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve(responses.orderInsert)),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve(responses.orderDelete)),
    })),
  });

  let profileBuilder = createSingleQuery(() => responses.profile);
  let ticketTypesBuilder = createListQuery(() => responses.ticketTypes);
  let eventBuilder = createSingleQuery(() => responses.event);
  let ordersBuilder = createOrdersBuilder();

  const fromMock = vi.fn((table: string) => {
    if (table === 'profiles') return profileBuilder;
    if (table === 'ticket_types') return ticketTypesBuilder;
    if (table === 'events') return eventBuilder;
    if (table === 'orders') return ordersBuilder;
    throw new Error(`Unexpected table: ${table}`);
  });

  const reset = () => {
    profileBuilder = createSingleQuery(() => responses.profile);
    ticketTypesBuilder = createListQuery(() => responses.ticketTypes);
    eventBuilder = createSingleQuery(() => responses.event);
    ordersBuilder = createOrdersBuilder();
    fromMock.mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder;
      if (table === 'ticket_types') return ticketTypesBuilder;
      if (table === 'events') return eventBuilder;
      if (table === 'orders') return ordersBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });
  };

  reset();

  const getBuilders = () => ({ profileBuilder, ticketTypesBuilder, eventBuilder, ordersBuilder });

  const authMock = {
    getUser: vi.fn(),
  };

  const rpcMock = vi.fn();

  const paymentMock = {
    createPayment: vi.fn(),
  };

  return {
    responses,
    reset,
    getBuilders,
    authMock,
    rpcMock,
    paymentMock,
    fromMock,
  };
});

vi.mock('../../lib/supabase-client', () => ({
  supabase: {
    auth: mocks.authMock,
    from: mocks.fromMock,
    rpc: mocks.rpcMock,
  },
}));

vi.mock('../paymentService', () => ({
  paymentService: mocks.paymentMock,
}));

import { orderService } from '../orderService';

const EVENT_ID = '22222222-2222-2222-2222-222222222222';
const TICKET_ID = '11111111-1111-1111-1111-111111111111';

describe('orderService.createOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.responses.profile = { data: { name: 'Test User', email: 'user@example.com', phone: '+221234567890' }, error: null };
    mocks.responses.ticketTypes = {
      data: [
        {
          id: TICKET_ID,
          event_id: EVENT_ID,
          name: 'Standard',
          price: 5000,
          available: 10,
          max_per_order: 5,
          sales_enabled: true,
          is_paused: false,
          on_sale: true,
          is_active: true,
          status: 'AVAILABLE',
        },
      ],
      error: null,
    };
    mocks.responses.event = { data: { title: 'Concert Test', currency: 'XOF' }, error: null };
    mocks.responses.orderInsert = { data: { id: 'order-123' }, error: null };
    mocks.responses.orderDelete = { error: null };
    mocks.authMock.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mocks.paymentMock.createPayment.mockResolvedValue({ success: true, payment_url: 'https://pay', payment_token: 'token-1' });
    mocks.reset();
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      getRandomValues: vi.fn((arr: Uint8Array) => arr.fill(1)),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects invalid payment method', async () => {
    await expect(orderService.createOrder({
      eventId: EVENT_ID,
      ticketQuantities: { [TICKET_ID]: 1 },
      paymentMethod: 'CASH',
    } as any)).rejects.toThrow('Méthode de paiement invalide');

    expect(mocks.paymentMock.createPayment).not.toHaveBeenCalled();
  });

  it('rejects when requested quantity exceeds availability', async () => {
    mocks.responses.ticketTypes.data[0].available = 1;

    await expect(orderService.createOrder({
      eventId: EVENT_ID,
      ticketQuantities: { [TICKET_ID]: 2 },
      paymentMethod: 'CARD',
    } as any)).rejects.toThrow('La quantité demandée pour « Standard » dépasse le stock disponible');
  });

  it('rejects when ticket sales are paused', async () => {
    mocks.responses.ticketTypes.data[0].sales_enabled = false;

    await expect(orderService.createOrder({
      eventId: EVENT_ID,
      ticketQuantities: { [TICKET_ID]: 1 },
      paymentMethod: 'CARD',
    } as any)).rejects.toThrow('Les billets « Standard » ne sont plus en vente');
  });

  it('creates the order and payment payload with sanitized values', async () => {
    const result = await orderService.createOrder({
      eventId: EVENT_ID,
      ticketQuantities: { [TICKET_ID]: 2 },
      paymentMethod: 'MOBILE_MONEY',
      paymentDetails: { provider: 'orange', phone: ' 0777000000 ' },
    });

    expect(result.success).toBe(true);
    const { ordersBuilder } = mocks.getBuilders();
    expect(ordersBuilder.insert).toHaveBeenCalledTimes(1);
    const insertedPayload = ordersBuilder.insert.mock.calls[0]?.[0];
    expect(insertedPayload).toMatchObject({
      user_id: 'user-1',
      event_id: EVENT_ID,
      ticket_quantities: { [TICKET_ID]: 2 },
    });

    expect(mocks.paymentMock.createPayment).toHaveBeenCalledTimes(1);
    const paymentRequest = mocks.paymentMock.createPayment.mock.calls[0]?.[0];
    expect(paymentRequest.ticket_lines).toEqual([
      {
        ticket_type_id: TICKET_ID,
        quantity: 2,
        price_major: 5000,
        currency: 'XOF',
      },
    ]);
    expect(paymentRequest.phone).toBe('0777000000');
  });
});

describe('orderService.createGuestOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpcMock.mockResolvedValue({ data: { success: true }, error: null });
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      getRandomValues: vi.fn((arr: Uint8Array) => arr.fill(1)),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects invalid ticket quantities before calling the RPC', async () => {
    await expect(orderService.createGuestOrder({
      email: 'guest@example.com',
      name: 'Guest',
      eventId: EVENT_ID,
      ticketQuantities: { [TICKET_ID]: 0 },
      paymentMethod: 'CARD',
      paymentDetails: { cardNumber: '4111111111111111', expiryDate: '12/25', cvv: '123' },
    })).rejects.toThrow('La quantité de billets doit être positive');

    expect(mocks.rpcMock).not.toHaveBeenCalled();
  });
});

