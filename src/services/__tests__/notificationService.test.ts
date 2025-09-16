import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const authMock = {
    getUser: vi.fn(),
  };

  const fromMock = vi.fn();
  const channelMock = vi.fn();
  const removeChannelMock = vi.fn();

  const createSelectBuilder = (response: any, thenResponse: any = response) => {
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => Promise.resolve(response)),
      range: vi.fn(() => Promise.resolve(response)),
    };
    builder.then = (resolve: any, reject: any) => Promise.resolve(thenResponse).then(resolve, reject);
    return builder;
  };

  const createUpdateBuilder = (selectResponse: any, thenResponse: any) => {
    const builder: any = {
      eq: vi.fn(() => builder),
      select: vi.fn(() => Promise.resolve(selectResponse)),
    };
    builder.then = (resolve: any, reject: any) => Promise.resolve(thenResponse).then(resolve, reject);
    return builder;
  };

  const createDeleteBuilder = (response: any) => {
    const builder: any = {
      eq: vi.fn(() => builder),
    };
    builder.then = (resolve: any, reject: any) => Promise.resolve(response).then(resolve, reject);
    return builder;
  };

  return {
    authMock,
    fromMock,
    channelMock,
    removeChannelMock,
    createSelectBuilder,
    createUpdateBuilder,
    createDeleteBuilder,
  };
});

vi.mock('../../lib/supabase-client', () => ({
  supabase: {
    auth: mocks.authMock,
    from: mocks.fromMock,
    channel: mocks.channelMock,
    removeChannel: mocks.removeChannelMock,
  },
}));

import { notificationService } from '../notificationService';

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authMock.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('fetches sanitized notifications scoped to the authenticated user', async () => {
    const notificationRows = [
      {
        id: 'notif-1',
        user_id: 'user-1',
        type: ' order_confirmation ',
        title: '  Confirmation  ',
        message: ' Thanks for your order ',
        read: 'false',
        read_at: null,
        created_at: '2024-04-01T10:00:00.000Z',
        updated_at: null,
        priority: 'HIGH',
        action_url: ' javascript:alert(1) ',
        action_text: '  Voir  ',
        metadata: {
          action_url: 'https://example.com/orders/1',
          order_id: 'order-1',
          nested: { blocked: true },
        },
      },
    ];
    const selectBuilder = mocks.createSelectBuilder({ data: notificationRows, error: null });

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return selectBuilder;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await notificationService.getUserNotifications(150);

    expect(mocks.authMock.getUser).toHaveBeenCalled();
    expect(selectBuilder.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(selectBuilder.limit).toHaveBeenCalledWith(100);
    expect(result).toHaveLength(1);
    const [notification] = result;
    expect(notification.read).toBe(false);
    expect(notification.title).toBe('Confirmation');
    expect(notification.action_url).toBeNull();
    expect(notification.metadata?.action_url).toBe('https://example.com/orders/1');
    expect(notification.priority).toBe('high');
  });

  it('marks notifications as read with sanitized identifiers and user scoping', async () => {
    const updateBuilder = mocks.createUpdateBuilder({ data: [{ id: 'notif-1' }], error: null }, { error: null });

    const updateMock = vi.fn(() => updateBuilder);
    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return { update: updateMock } as any;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const updated = await notificationService.markAsRead('  notif-1  ');

    expect(updated).toBe(true);
    expect(updateBuilder.eq).toHaveBeenNthCalledWith(1, 'id', 'notif-1');
    expect(updateBuilder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-1');
    expect(updateBuilder.select).toHaveBeenCalledWith('id');
  });

  it('returns false when no notification is updated', async () => {
    const updateBuilder = mocks.createUpdateBuilder({ data: [], error: null }, { error: null });
    const updateMock = vi.fn(() => updateBuilder);
    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return { update: updateMock } as any;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const updated = await notificationService.markAsRead('notif-404');
    expect(updated).toBe(false);
  });

  it('sanitizes notification preferences before persisting and when returning the result', async () => {
    let upsertPayload: any;
    const upsertMock = vi.fn((payload: any) => {
      upsertPayload = payload;
      return {
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { email: 'true', push: 'false', types: ['  ALERT  '] },
              error: null,
            }),
          ),
        })),
      } as any;
    });

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'notification_preferences') {
        return { upsert: upsertMock } as any;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await notificationService.updatePreferences({ email: true, push: false, types: [' alert ', 'ALERT'] });

    expect(upsertPayload).toMatchObject({
      user_id: 'user-1',
      email: true,
      push: false,
      types: ['ALERT'],
    });
    expect(result).toEqual({ email: true, push: false, types: ['ALERT'] });
  });

  it('deletes notifications scoped to the authenticated user', async () => {
    const deleteBuilder = mocks.createDeleteBuilder({ error: null });
    const deleteMock = vi.fn(() => deleteBuilder);

    mocks.fromMock.mockImplementation((table: string) => {
      if (table === 'notifications') {
        return { delete: deleteMock } as any;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    await notificationService.deleteNotification(' notif-2 ');

    expect(deleteBuilder.eq).toHaveBeenNthCalledWith(1, 'id', 'notif-2');
    expect(deleteBuilder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'user-1');
  });
});
