import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const eventInsertMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'event-id' }, error: null });
  const eventInsertSelect = vi.fn(() => ({ maybeSingle: eventInsertMaybeSingle }));
  const eventsInsert = vi.fn(() => ({ select: eventInsertSelect }));
  const eventsUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const eventsUpdate = vi.fn(() => ({ eq: eventsUpdateEq }));
  const eventsDeleteEq = vi.fn().mockResolvedValue({ error: null });
  const eventsDelete = vi.fn(() => ({ eq: eventsDeleteEq }));

  const ticketInsert = vi.fn().mockResolvedValue({ error: null });
  const ticketUpsert = vi.fn().mockResolvedValue({ error: null });
  const ticketDeleteIn = vi.fn().mockResolvedValue({ error: null });
  const ticketDelete = vi.fn(() => ({ in: ticketDeleteIn }));

  const eventsBuilder = {
    insert: eventsInsert,
    update: eventsUpdate,
    delete: eventsDelete,
  };

  const ticketTypesBuilder = {
    insert: ticketInsert,
    upsert: ticketUpsert,
    delete: ticketDelete,
  };

  const fromMock = vi.fn((table: string) => {
    if (table === 'events') return eventsBuilder;
    if (table === 'ticket_types') return ticketTypesBuilder;
    throw new Error(`Unexpected table ${table}`);
  });

  const reset = () => {
    eventsInsert.mockClear();
    eventInsertSelect.mockClear();
    eventInsertMaybeSingle.mockClear();
    eventsUpdate.mockClear();
    eventsUpdateEq.mockClear();
    eventsDelete.mockClear();
    eventsDeleteEq.mockClear();
    ticketInsert.mockClear();
    ticketUpsert.mockClear();
    ticketDelete.mockClear();
    ticketDeleteIn.mockClear();
    fromMock.mockClear();

    eventInsertMaybeSingle.mockResolvedValue({ data: { id: 'event-id' }, error: null });
    eventsUpdateEq.mockResolvedValue({ error: null });
    eventsDeleteEq.mockResolvedValue({ error: null });
    ticketInsert.mockResolvedValue({ error: null });
    ticketUpsert.mockResolvedValue({ error: null });
    ticketDeleteIn.mockResolvedValue({ error: null });
  };

  return {
    eventsBuilder,
    ticketTypesBuilder,
    eventInsertSelect,
    eventInsertMaybeSingle,
    eventsUpdateEq,
    eventsDeleteEq,
    ticketInsert,
    ticketUpsert,
    ticketDeleteIn,
    fromMock,
    reset,
  };
});

vi.mock('../../lib/supabase-client', () => ({
  supabase: {
    from: mocks.fromMock,
  },
}));

import {
  ADMIN_EVENT_CURRENCIES,
  adminEventSchema,
  createAdminEvent,
  updateAdminEvent,
} from '../eventAdminService';

const { reset, ticketInsert, ticketUpsert, ticketDeleteIn, eventsBuilder, eventsUpdateEq, eventsDeleteEq } = mocks;

const baseInput = {
  title: '  Sample Event  ',
  description: 'A wonderful event',
  date: '2024-01-01',
  time: '12:00',
  location: 'Main hall',
  image_url: 'https://example.com/event.jpg',
  price: 25,
  currency: ADMIN_EVENT_CURRENCIES[0],
  capacity: 150,
  status: 'DRAFT' as const,
  featured: false,
  organizer_id: null as string | null,
  categories: [] as string[],
  ticket_types: [
    {
      name: 'General',
      description: 'Access to the main floor',
      price: 25,
      quantity: 100,
      available: 100,
      max_per_order: 5,
    },
  ],
};

describe('adminEventSchema', () => {
  beforeEach(() => {
    reset();
  });

  it('rejects ticket configurations where available exceeds quantity', () => {
    const result = adminEventSchema.safeParse({
      ...baseInput,
      ticket_types: [
        {
          name: 'VIP',
          description: 'Exclusive access',
          price: 120,
          quantity: 10,
          available: 15,
          max_per_order: 2,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('Available tickets cannot exceed total quantity');
    }
  });

  it('rejects unknown categories', () => {
    const result = adminEventSchema.safeParse({
      ...baseInput,
      categories: ['unknown-category'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('Unknown category');
    }
  });

  it('enforces HTTPS image URLs', () => {
    const result = adminEventSchema.safeParse({
      ...baseInput,
      image_url: 'http://example.com/event.jpg',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.message.includes('Image URL must use HTTPS'))).toBe(true);
    }
  });

  it('rejects non-finite monetary values for events and tickets', () => {
    const result = adminEventSchema.safeParse({
      ...baseInput,
      price: Number.POSITIVE_INFINITY,
      ticket_types: [
        {
          ...baseInput.ticket_types[0],
          price: Number.POSITIVE_INFINITY,
        },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(issue => issue.message.includes('Event price must be a valid amount'))).toBe(true);
      expect(result.error.issues.some(issue => issue.message.includes('Ticket price must be a valid amount'))).toBe(true);
    }
  });
});

describe('createAdminEvent', () => {
  beforeEach(() => {
    reset();
  });

  it('persists a new event and ticket types with sanitized values', async () => {
    const payload = { ...baseInput };

    const eventId = await createAdminEvent(payload);

    expect(eventId).toBe('event-id');
    expect(eventsBuilder.insert).toHaveBeenCalledTimes(1);
    const insertedEvent = eventsBuilder.insert.mock.calls[0]?.[0]?.[0];
    expect(insertedEvent.title).toBe('Sample Event');
    expect(insertedEvent.categories).toEqual([]);

    expect(ticketInsert).toHaveBeenCalledTimes(1);
    const insertedTickets = ticketInsert.mock.calls[0]?.[0];
    expect(insertedTickets).toEqual([
      {
        event_id: 'event-id',
        name: 'General',
        description: 'Access to the main floor',
        price: 25,
        quantity: 100,
        available: 100,
        max_per_order: 5,
      },
    ]);
  });

  it('rolls back the event record when ticket creation fails', async () => {
    ticketInsert.mockResolvedValueOnce({ error: { message: 'ticket error' } });

    await expect(createAdminEvent(baseInput)).rejects.toThrow('ticket error');

    expect(eventsDeleteEq).toHaveBeenCalledWith('id', 'event-id');
  });
});

describe('updateAdminEvent', () => {
  beforeEach(() => {
    reset();
  });

  it('updates the event, synchronizes existing ticket types, and removes stale ones', async () => {
    const payload = {
      ...baseInput,
      status: 'PUBLISHED' as const,
      ticket_types: [
        {
          id: '8b8c42a8-9895-4d7f-855c-0b1ed257a7f1',
          name: 'General',
          description: 'Access to the main floor',
          price: 35,
          quantity: 120,
          available: 110,
          max_per_order: 6,
        },
        {
          name: 'VIP',
          description: 'Exclusive balcony seats',
          price: 150,
          quantity: 20,
          available: 20,
          max_per_order: 2,
        },
      ],
    };

    await updateAdminEvent('event-id', payload, [
      '8b8c42a8-9895-4d7f-855c-0b1ed257a7f1',
      'f2fe3c6d-a0c0-4e6c-9b71-4c6e97ec5d9a',
    ]);

    expect(eventsUpdateEq).toHaveBeenCalledWith('id', 'event-id');
    expect(ticketUpsert).toHaveBeenCalledWith(
      [
        {
          id: '8b8c42a8-9895-4d7f-855c-0b1ed257a7f1',
          event_id: 'event-id',
          name: 'General',
          description: 'Access to the main floor',
          price: 35,
          quantity: 120,
          available: 110,
          max_per_order: 6,
        },
      ],
      { onConflict: 'id' },
    );

    expect(ticketInsert).toHaveBeenCalledWith([
      {
        event_id: 'event-id',
        name: 'VIP',
        description: 'Exclusive balcony seats',
        price: 150,
        quantity: 20,
        available: 20,
        max_per_order: 2,
      },
    ]);

    expect(ticketDeleteIn).toHaveBeenCalledWith('id', ['f2fe3c6d-a0c0-4e6c-9b71-4c6e97ec5d9a']);
  });
});
