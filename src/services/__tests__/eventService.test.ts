import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventService } from '../eventService';

type QueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
  data: any;
  error: any;
};

const createQueryBuilder = (): QueryBuilder => {
  const builder: QueryBuilder = {
    data: null,
    error: null,
    select: vi.fn(),
    eq: vi.fn(),
    ilike: vi.fn(),
    contains: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    then: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.ilike.mockReturnValue(builder);
  builder.contains.mockReturnValue(builder);
  builder.or.mockReturnValue(builder);
  builder.order.mockImplementation(() => Promise.resolve({ data: builder.data, error: builder.error }));
  builder.then.mockImplementation((resolve) => Promise.resolve(resolve({ data: builder.data, error: builder.error })));

  return builder;
};

interface SupabaseMock {
  from: ReturnType<typeof vi.fn>;
  channel: ReturnType<typeof vi.fn>;
  builders: QueryBuilder[];
  enqueueResponse: (response: { data: any; error: any }) => void;
  client: SupabaseClient;
}

const createSupabaseMock = (): SupabaseMock => {
  const builders: QueryBuilder[] = [];
  const responseQueue: Array<{ data: any; error: any }> = [];

  const from = vi.fn().mockImplementation(() => {
    const builder = createQueryBuilder();
    const response = responseQueue.shift() ?? { data: null, error: null };
    builder.data = response.data;
    builder.error = response.error;
    builders.push(builder);
    return builder;
  });

  const channel = vi.fn().mockImplementation(() => {
    const subscription = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({
        unsubscribe: vi.fn().mockResolvedValue('ok'),
      }),
    };
    return subscription;
  });

  const enqueueResponse = (response: { data: any; error: any }) => {
    responseQueue.push(response);
  };

  return {
    from,
    channel,
    builders,
    enqueueResponse,
    client: { from, channel } as unknown as SupabaseClient,
  };
};

describe('EventService', () => {
  const logger = { error: vi.fn(), warn: vi.fn() };
  let supabaseMock: SupabaseMock;
  let service: EventService;

  beforeEach(() => {
    supabaseMock = createSupabaseMock();
    service = new EventService({ supabaseClient: supabaseMock.client, logger });
    logger.error.mockReset();
    logger.warn.mockReset();
  });

  it('fetches published events and normalises tickets and categories', async () => {
    supabaseMock.enqueueResponse({
      data: [
        {
          id: 'event-1',
          title: 'Event One',
          featured: true,
          categories: ['Music', '  Music  '],
          ticket_types: [
            { id: 'ticket-1', event_id: 'event-1', name: 'VIP', description: '', price: 100, quantity: 10, available: 10, max_per_order: 2 },
            null,
          ],
        },
        {
          id: 'event-2',
          title: 'Event Two',
          featured: false,
          categories: [],
          ticket_types: null,
        },
      ],
      error: null,
    });

    const events = await service.fetchPublishedEvents({ search: 'Concert%', location: 'Paris', category: 'Music' });

    expect(supabaseMock.builders).toHaveLength(1);
    const builder = supabaseMock.builders[0];
    expect(builder.select).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('status', 'PUBLISHED');
    expect(builder.or).toHaveBeenCalledWith('title.ilike.%Concert\\%%,description.ilike.%Concert\\%%');
    expect(builder.ilike).toHaveBeenCalledWith('location', '%Paris%');
    expect(builder.contains).toHaveBeenCalledWith('categories', ['Music']);

    expect(events).toEqual([
      expect.objectContaining({
        id: 'event-1',
        featured: true,
        categories: ['Music'],
        ticket_types: [
          expect.objectContaining({ id: 'ticket-1' }),
        ],
      }),
      expect.objectContaining({
        id: 'event-2',
        categories: undefined,
        ticket_types: [],
      }),
    ]);
  });

  it('sanitises filter values before querying Supabase', async () => {
    supabaseMock.enqueueResponse({ data: [], error: null });

    await service.fetchPublishedEvents({
      search: '  Concert%,)DROP TABLE  ',
      location: '  %Paris_\\  ',
      category: '  Music  ',
      date: '2024-06-01',
    });

    const builder = supabaseMock.builders[0];
    expect(builder.or).toHaveBeenCalledWith(
      'title.ilike.%Concert\\% DROP TABLE%,description.ilike.%Concert\\% DROP TABLE%',
    );
    expect(builder.ilike).toHaveBeenCalledWith('location', '%\\%Paris\\_\\\\%');
    expect(builder.contains).toHaveBeenCalledWith('categories', ['Music']);
    expect(builder.eq).toHaveBeenCalledWith('date', '2024-06-01');
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('ignores invalid date filters and logs a warning', async () => {
    supabaseMock.enqueueResponse({ data: [], error: null });

    await service.fetchPublishedEvents({ date: 'not-a-date' });

    const builder = supabaseMock.builders[0];
    expect(builder.eq).not.toHaveBeenCalledWith('date', expect.anything());
    expect(logger.warn).toHaveBeenCalledWith('Ignoring invalid date filter', { date: 'not-a-date' });
  });

  it('throws a user friendly error when the query fails', async () => {
    const failure = { message: 'database error' };
    supabaseMock.enqueueResponse({ data: null, error: failure });

    await expect(service.fetchPublishedEvents()).rejects.toThrow('Failed to load events');
    expect(logger.error).toHaveBeenCalledWith('Failed to fetch events:', failure);
  });

  it('returns distinct locations and categories for filters', async () => {
    supabaseMock.enqueueResponse({
      data: [
        { location: ' Paris ', categories: ['Music', 'Art'] },
        { location: 'Abidjan', categories: ['Music', 'Tech', 'Music'] },
        { location: 'Paris', categories: [null, 'Tech', '  Art  '] },
      ],
      error: null,
    });

    const metadata = await service.fetchFilterMetadata();
    expect(metadata.locations).toEqual(['Abidjan', 'Paris']);
    expect(metadata.categories).toEqual(['Art', 'Music', 'Tech']);
  });

  it('throws when fetching filter metadata fails', async () => {
    const failure = { message: 'timeout' };
    supabaseMock.enqueueResponse({ data: null, error: failure });

    await expect(service.fetchFilterMetadata()).rejects.toThrow('Failed to load event filters');
    expect(logger.error).toHaveBeenCalledWith('Failed to fetch event filter metadata:', failure);
  });

  it('subscribes to realtime changes and returns the channel', () => {
    const handler = vi.fn();
    const channel = service.subscribeToEventChanges(handler);

    expect(supabaseMock.channel).toHaveBeenCalledWith('events_channel');
    const subscription = supabaseMock.channel.mock.results[0].value;
    expect(subscription.on).toHaveBeenCalled();
    expect(subscription.subscribe).toHaveBeenCalled();
    expect(channel).toBe(subscription.subscribe.mock.results[0].value);
  });
});

