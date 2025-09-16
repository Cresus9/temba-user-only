import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventProvider, useEvents } from '../EventContext';
import type { EventService } from '../../services/eventService';
import type { Event } from '../../types/event';

const { toastErrorMock } = vi.hoisted(() => ({ toastErrorMock: vi.fn() }));

vi.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: toastErrorMock,
  },
}));

type EventServiceMock = {
  fetchPublishedEvents: ReturnType<typeof vi.fn>;
  subscribeToEventChanges: ReturnType<typeof vi.fn>;
  triggerChange: () => void;
};

const createServiceMock = (
  events: Event[],
  overrides: Partial<EventServiceMock> = {},
): EventServiceMock => {
  const fetchPublishedEvents =
    overrides.fetchPublishedEvents ?? vi.fn().mockResolvedValue(events);
  let changeHandler: (() => void) | undefined;
  const unsubscribe = vi.fn().mockResolvedValue('ok');
  const subscribeToEventChanges =
    overrides.subscribeToEventChanges ??
    vi.fn().mockImplementation((handler: () => void) => {
      changeHandler = handler;
      return {
        unsubscribe,
      };
    });

  const triggerChange = overrides.triggerChange ?? (() => {
    changeHandler?.();
  });

  return {
    fetchPublishedEvents,
    subscribeToEventChanges,
    triggerChange,
  };
};

const wrapperFactory = (service: EventServiceMock) => ({ children }: { children: React.ReactNode }) => (
  <EventProvider service={service as unknown as EventService}>
    {children}
  </EventProvider>
);

const createEvent = (overrides: Partial<Event>): Event => ({
  id: `event-${Math.random().toString(36).slice(2)}`,
  title: 'Sample',
  description: 'Sample description',
  date: '2024-06-01',
  time: '18:00',
  location: 'Paris',
  image_url: 'https://example.com/image.jpg',
  price: 42,
  currency: 'EUR',
  capacity: 100,
  tickets_sold: 10,
  status: 'PUBLISHED',
  featured: false,
  ticket_types: [],
  ...overrides,
});

describe('EventContext', () => {
  beforeEach(() => {
    toastErrorMock.mockReset();
  });

  const createDeferred = <T,>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it('loads events on mount, filters featured events, and exposes helpers', async () => {
    const featuredEvent = createEvent({ id: 'a', featured: true });
    const duplicateEvent = createEvent({ id: 'a', featured: true });
    const regularEvent = createEvent({ id: 'b', featured: false });

    const service = createServiceMock([featuredEvent, duplicateEvent, regularEvent]);

    const { result } = renderHook(() => useEvents(), { wrapper: wrapperFactory(service) });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(service.fetchPublishedEvents).toHaveBeenCalledTimes(1);
    expect(result.current.events).toHaveLength(2); // duplicate removed
    expect(result.current.featuredEvents).toEqual([featuredEvent]);
    expect(result.current.getEvent('a')).toEqual(featuredEvent);
  });

  it('refreshes events when fetchEvents is called or when realtime changes occur', async () => {
    const service = createServiceMock([createEvent({ id: 'a' })]);

    const { result } = renderHook(() => useEvents(), { wrapper: wrapperFactory(service) });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(service.fetchPublishedEvents).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.fetchEvents();
    });

    expect(service.fetchPublishedEvents).toHaveBeenCalledTimes(2);

    await act(async () => {
      service.triggerChange();
    });

    await waitFor(() => expect(service.fetchPublishedEvents).toHaveBeenCalledTimes(3));
  });

  it('surfaces errors from the service and shows a toast', async () => {
    const error = new Error('network down');
    const service = createServiceMock([]);
    service.fetchPublishedEvents.mockRejectedValueOnce(error);
    service.fetchPublishedEvents.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useEvents(), { wrapper: wrapperFactory(service) });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network down');
    expect(toastErrorMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.fetchEvents();
    });

    expect(result.current.error).toBeNull();
    expect(service.fetchPublishedEvents).toHaveBeenCalledTimes(2);
  });

  it('ignores stale responses to keep the freshest event list', async () => {
    const firstDeferred = createDeferred<Event[]>();
    const secondDeferred = createDeferred<Event[]>();
    const fetchPublishedEvents = vi
      .fn<[], Promise<Event[]>>()
      .mockReturnValueOnce(firstDeferred.promise)
      .mockReturnValueOnce(secondDeferred.promise);

    const service = createServiceMock([], { fetchPublishedEvents });
    const { result } = renderHook(() => useEvents(), { wrapper: wrapperFactory(service) });

    await waitFor(() => expect(fetchPublishedEvents).toHaveBeenCalledTimes(1));

    await act(async () => {
      service.triggerChange();
    });

    await waitFor(() => expect(fetchPublishedEvents).toHaveBeenCalledTimes(2));

    const freshEvent = createEvent({ id: 'fresh' });
    await act(async () => {
      secondDeferred.resolve([freshEvent]);
      await secondDeferred.promise;
    });

    await waitFor(() => expect(result.current.events).toEqual([freshEvent]));

    const staleEvent = createEvent({ id: 'stale' });
    await act(async () => {
      firstDeferred.resolve([staleEvent]);
      await firstDeferred.promise;
    });

    expect(result.current.events).toEqual([freshEvent]);
  });
});

